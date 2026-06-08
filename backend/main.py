"""
VibeMatch FastAPI Backend
- Developer matchmaking via objective + workstyle compatibility
- Real GitHub API proxy (user profiles + hackathon project search)
- SQLite user registry for persistence
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json
import os
import random
import time
import httpx
import aiosqlite
from contextlib import asynccontextmanager

# ── Paths ─────────────────────────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DB_PATH = "/tmp/vibematch.db"
    src_db = os.path.join(os.path.dirname(__file__), "vibematch.db")
    if os.path.exists(src_db) and not os.path.exists(DB_PATH):
        import shutil
        try:
            shutil.copy(src_db, DB_PATH)
        except Exception:
            pass
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "vibematch.db")

# ── In-memory cache for GitHub search results ─────────────────────────────────
_github_projects_cache: dict = {"data": None, "fetched_at": 0}
CACHE_TTL = 600  # 10 minutes

# ── GitHub API headers ────────────────────────────────────────────────────────
GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "VibeMatch/1.0",
}

# ── Lifespan: create DB tables on startup ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                github_username TEXT PRIMARY KEY,
                linkedin_id     TEXT,
                objective       TEXT,
                workstyle       TEXT,
                github_data     TEXT,
                created_at      REAL,
                last_seen_at    REAL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS thoughts (
                id           TEXT PRIMARY KEY,
                title        TEXT,
                author       TEXT,
                handle       TEXT,
                avatar       TEXT,
                discussion   TEXT,
                github_url   TEXT,
                languages    TEXT, -- JSON list
                phase        TEXT,
                stars        INTEGER DEFAULT 0,
                tags         TEXT, -- JSON list
                created_at   TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS vibes (
                github_username TEXT,
                thought_id      TEXT,
                PRIMARY KEY (github_username, thought_id)
            )
        """)
        await db.commit()

        # Database Migration: Check if new columns exist, and add them if not
        async with db.execute("PRAGMA table_info(thoughts)") as cursor:
            columns = [row[1] for row in await cursor.fetchall()]
        if "images" not in columns:
            await db.execute("ALTER TABLE thoughts ADD COLUMN images TEXT")
        if "cover_image" not in columns:
            await db.execute("ALTER TABLE thoughts ADD COLUMN cover_image TEXT")
        await db.commit()
    yield

app = FastAPI(title="VibeMatch API", version="2.0.0", lifespan=lifespan)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Data Loading ─────────────────────────────────────────────────────────────
def load_json(filename: str):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r") as f:
        return json.load(f)

profiles_db = load_json("profiles.json")
projects_db = load_json("projects.json")  # fallback if GitHub API fails

# ── Pydantic Models ───────────────────────────────────────────────────────────
class OnboardingPayload(BaseModel):
    github_url:  str
    linkedin_id: str
    objective:   str
    workstyle:   str
    github_data: Optional[dict] = None   # real profile fetched on the frontend

class UpsertUserPayload(BaseModel):
    github_username: str
    linkedin_id:     str
    objective:       str
    workstyle:       str
    github_data:     Optional[dict] = None

class ThoughtPayload(BaseModel):
    id:          str
    title:       str
    author:      str
    handle:      str
    avatar:      str
    discussion:  str
    github_url:  str
    languages:   List[str]
    phase:       str
    stars:       Optional[int] = 0
    tags:        List[str]
    created_at:  str
    images:      Optional[List[str]] = []
    cover_image: Optional[str] = ""


# ── Skill Summary Generator ───────────────────────────────────────────────────
SKILL_SUMMARIES = {
    "python":     "Backend wizard with strong data-engineering instincts",
    "typescript": "Type-safety advocate who ships production-grade frontends",
    "javascript": "Full-stack craftsman with deep JS ecosystem knowledge",
    "react":      "UI craftsman with a keen eye for component architecture",
    "rust":       "Systems hacker who optimizes for performance and correctness",
    "solidity":   "Web3 builder versed in smart contract security patterns",
    "swift":      "iOS artisan delivering polished native experiences",
    "go":         "Infrastructure engineer building resilient distributed services",
    "java":       "Enterprise architect who scales systems to millions",
    "kotlin":     "Modern Android developer with clean architecture instincts",
    "c++":        "Performance engineer who thinks in cycles and bytes",
    "ruby":       "Pragmatic product builder shipping value fast",
    "php":        "Web platform veteran with deep CMS and API expertise",
    "dart":       "Cross-platform mobile developer shipping on every screen",
}

def generate_skill_summary(skills: List[str]) -> str:
    for skill in skills:
        key = skill.lower()
        for k, summary in SKILL_SUMMARIES.items():
            if k in key:
                return summary
    return f"Versatile engineer proficient in {', '.join(skills[:3])}"

# ── Helpers ───────────────────────────────────────────────────────────────────
def hackathon_color_for(name: str) -> str:
    """Deterministic accent color based on hackathon name."""
    colors = ["#22c55e", "#6366f1", "#ef4444", "#3b82f6", "#f59e0b",
              "#8b5cf6", "#06b6d4", "#84cc16", "#f97316", "#a855f7",
              "#ec4899", "#14b8a6"]
    idx = sum(ord(c) for c in name) % len(colors)
    return colors[idx]

def repo_to_project(repo: dict, hackathon_tag: str) -> dict:
    """Convert a GitHub repo dict into a VibeMatch project card."""
    languages = []
    if repo.get("language"):
        languages.append(repo["language"])
    topics = repo.get("topics", [])[:4]
    return {
        "id":               f"gh_{repo['id']}",
        "name":             repo["name"],
        "description":      repo.get("description") or "No description provided.",
        "hackathon":        hackathon_tag,
        "hackathon_color":  hackathon_color_for(hackathon_tag),
        "stars":            repo["stargazers_count"],
        "languages":        languages,
        "repo_url":         repo["html_url"],
        "topics":           topics,
        "owner":            repo["owner"]["login"],
        "avatar":           repo["owner"]["avatar_url"],
        "forks":            repo.get("forks_count", 0),
        "updated_at":       repo.get("updated_at", ""),
    }

# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"message": "VibeMatch API v2.0 — Find your perfect hackathon teammates!"}


# ── GitHub Proxy: User Profile ────────────────────────────────────────────────
@app.get("/api/github/user/{username}")
async def github_user_profile(username: str):
    """
    Proxy a GitHub user profile + extract top languages from their repos.
    Avoids browser CORS issues and adds a consistent User-Agent.
    """
    async with httpx.AsyncClient(headers=GITHUB_HEADERS, timeout=8.0) as client:
        user_res  = await client.get(f"https://api.github.com/users/{username}")
        if user_res.status_code == 404:
            raise HTTPException(status_code=404, detail=f"GitHub user '{username}' not found")
        if user_res.status_code != 200:
            raise HTTPException(status_code=502, detail="GitHub API error")

        user  = user_res.json()
        repos_res = await client.get(
            f"https://api.github.com/users/{username}/repos",
            params={"sort": "pushed", "per_page": 10, "type": "owner"},
        )
        repos = repos_res.json() if repos_res.status_code == 200 else []

    # Tally languages
    lang_counts: dict[str, int] = {}
    for r in repos:
        if r.get("language"):
            lang_counts[r["language"]] = lang_counts.get(r["language"], 0) + 1

    top_languages = [lang for lang, _ in
                     sorted(lang_counts.items(), key=lambda x: -x[1])[:6]]

    total_stars = sum(r.get("stargazers_count", 0) for r in repos)

    return {
        "username":     user["login"],
        "name":         user.get("name") or user["login"],
        "avatar":       user["avatar_url"],
        "bio":          user.get("bio") or "",
        "public_repos": user.get("public_repos", 0),
        "followers":    user.get("followers", 0),
        "html_url":     user["html_url"],
        "languages":    top_languages,
        "company":      user.get("company"),
        "location":     user.get("location"),
        "total_stars":  total_stars,
        "skill_summary": generate_skill_summary(top_languages),
    }


# ── GitHub Proxy: Hackathon Project Search ────────────────────────────────────
HACKATHON_QUERIES = [
    ("hackathon",           "Hackathon"),
    ("topic:hackathon",     "Hackathon OSS"),
    ("treehacks",           "TreeHacks"),
    ("hackmit",             "HackMIT"),
    ("calhacks",            "Cal Hacks"),
    ("pennapps",            "PennApps"),
    ("hackharvard",         "HackHarvard"),
    ("mhacks",              "MHacks"),
    ("hackgtx",             "HackGT"),
    ("ethglobal",           "ETHGlobal"),
]

@app.get("/api/github/projects")
async def github_hackathon_projects(limit: int = Query(12, ge=1, le=30)):
    """
    Search GitHub for real hackathon open-source projects.
    Results are cached for 10 minutes to stay within rate limits.
    """
    global _github_projects_cache
    now = time.time()

    # Return cached data if still fresh
    if _github_projects_cache["data"] and (now - _github_projects_cache["fetched_at"]) < CACHE_TTL:
        data = _github_projects_cache["data"][:limit]
        return {"count": len(data), "projects": data, "source": "cache"}

    projects = []
    seen_ids = set()

    async with httpx.AsyncClient(headers=GITHUB_HEADERS, timeout=10.0) as client:
        for query, tag in HACKATHON_QUERIES[:6]:   # limit queries to avoid rate limits
            try:
                res = await client.get(
                    "https://api.github.com/search/repositories",
                    params={
                        "q":         f"{query} is:public stars:>5",
                        "sort":      "stars",
                        "order":     "desc",
                        "per_page":  4,
                    },
                )
                if res.status_code != 200:
                    continue
                items = res.json().get("items", [])
                for repo in items:
                    if repo["id"] not in seen_ids:
                        seen_ids.add(repo["id"])
                        projects.append(repo_to_project(repo, tag))
            except Exception:
                continue

    # If GitHub API returned nothing (rate-limited etc.) fall back to local data
    if not projects:
        return {"count": len(projects_db), "projects": projects_db, "source": "fallback"}

    # Sort by stars and cache
    projects.sort(key=lambda x: x["stars"], reverse=True)
    _github_projects_cache = {"data": projects, "fetched_at": now}

    return {"count": len(projects[:limit]), "projects": projects[:limit], "source": "github"}


# ── Onboarding ────────────────────────────────────────────────────────────────
@app.post("/api/onboard")
async def onboard_user(payload: OnboardingPayload):
    """Accept profile, upsert user record, return top peer matches."""
    # Upsert to DB
    username = payload.github_url.rstrip("/").split("/")[-1]
    async with aiosqlite.connect(DB_PATH) as db:
        now = time.time()
        await db.execute("""
            INSERT INTO users (github_username, linkedin_id, objective, workstyle, github_data, created_at, last_seen_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(github_username) DO UPDATE SET
                linkedin_id  = excluded.linkedin_id,
                objective    = excluded.objective,
                workstyle    = excluded.workstyle,
                github_data  = excluded.github_data,
                last_seen_at = excluded.last_seen_at
        """, (
            username,
            payload.linkedin_id,
            payload.objective,
            payload.workstyle,
            json.dumps(payload.github_data or {}),
            now, now,
        ))
        await db.commit()

    matches = await get_db_matches(objective=payload.objective, workstyle=payload.workstyle, exclude=username, limit=8)
    return {
        "status":   "success",
        "username": username,
        "message":  f"Welcome, {username}! Found {len(matches)} potential teammates.",
        "matches":  matches,
    }


# ── Peer Matchmaking ──────────────────────────────────────────────────────────
async def get_db_matches(objective: Optional[str] = None, workstyle: Optional[str] = None, exclude: Optional[str] = None, limit: int = 8):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users")
        rows = await cursor.fetchall()

    peers = []
    for row in rows:
        data = dict(row)
        username = data["github_username"]
        if exclude and username.lower() == exclude.lower():
            continue

        gh = json.loads(data.get("github_data") or "{}")
        skills = gh.get("languages") or []
        
        score = 70
        if objective and data["objective"] == objective:
            score += 15
        if workstyle and data["workstyle"] == workstyle:
            score += 15

        peers.append({
            "id": f"real_{username}",
            "name": gh.get("name") or username,
            "avatar": gh.get("avatar") or f"https://avatars.githubusercontent.com/{username}",
            "github_url": gh.get("html_url") or f"https://github.com/{username}",
            "linkedin_id": data.get("linkedin_id") or "",
            "objective": data["objective"],
            "workstyle": data["workstyle"],
            "skills": skills,
            "bio": gh.get("bio") or f"Developer on VibeMatch — @{username}",
            "github_stars": gh.get("total_stars") or 0,
            "repos": gh.get("public_repos") or 0,
            "match_score": score,
            "skill_summary": generate_skill_summary(skills) if skills else "Real VibeMatch platform member",
            "is_real": True,
        })

    peers.sort(key=lambda x: x["match_score"], reverse=True)
    return peers[:limit]


@app.get("/api/matches")
async def get_matches(
    objective: Optional[str] = Query(None),
    workstyle: Optional[str] = Query(None),
    exclude: Optional[str] = Query(None),
    limit: int = Query(8, ge=1, le=20),
):
    result = await get_db_matches(objective=objective, workstyle=workstyle, exclude=exclude, limit=limit)
    return {"count": len(result), "matches": result}


# ── Projects (Showroom) ──
@app.get("/api/projects")
async def get_projects(limit: int = Query(15, ge=1, le=50)):
    """Compatibility endpoint mapping projects to thoughts."""
    return await get_thoughts()


# ── Project Thoughts ──
@app.get("/api/thoughts")
async def get_thoughts():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM thoughts ORDER BY stars DESC, created_at DESC")
        rows = await cursor.fetchall()
    
    thoughts_list = []
    for r in rows:
        d = dict(r)
        d["languages"] = json.loads(d.get("languages") or "[]")
        d["tags"] = json.loads(d.get("tags") or "[]")
        d["images"] = json.loads(d.get("images") or "[]")
        d["cover_image"] = d.get("cover_image") or ""
        thoughts_list.append(d)
    return thoughts_list


@app.post("/api/thoughts")
async def create_thought(payload: ThoughtPayload):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO thoughts (id, title, author, handle, avatar, discussion, github_url, languages, phase, stars, tags, created_at, images, cover_image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                discussion = excluded.discussion,
                github_url = excluded.github_url,
                languages = excluded.languages,
                phase = excluded.phase,
                tags = excluded.tags,
                images = excluded.images,
                cover_image = excluded.cover_image
        """, (
            payload.id,
            payload.title,
            payload.author,
            payload.handle,
            payload.avatar,
            payload.discussion,
            payload.github_url,
            json.dumps(payload.languages),
            payload.phase,
            payload.stars or 0,
            json.dumps(payload.tags),
            payload.created_at,
            json.dumps(payload.images or []),
            payload.cover_image or ""
        ))
        await db.commit()
    return {"status": "success", "thought_id": payload.id}


# ── User Registry ─────────────────────────────────────────────────────────────
@app.get("/api/users/peers")
async def get_peer_users(
    exclude: Optional[str] = Query(None, description="github_username to exclude (the current user)"),
    limit: int = Query(20, le=50),
):
    """
    Return all registered platform users formatted as peer cards.
    These are REAL users who have completed onboarding.
    Exclude the current user by their github_username.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM users ORDER BY last_seen_at DESC LIMIT ?", (limit + 1,)
        )
        rows = await cursor.fetchall()

    peers = []
    for row in rows:
        data = dict(row)
        username = data["github_username"]

        # Exclude the requesting user
        if exclude and username.lower() == exclude.lower():
            continue

        gh = json.loads(data.get("github_data") or "{}")
        skills = gh.get("languages") or []

        peer = {
            "id": f"real_{username}",
            "name": gh.get("name") or username,
            "avatar": gh.get("avatar") or f"https://avatars.githubusercontent.com/{username}",
            "github_url": gh.get("html_url") or f"https://github.com/{username}",
            "linkedin_id": data.get("linkedin_id") or "",
            "objective": data["objective"],
            "workstyle": data["workstyle"],
            "skills": skills,
            "bio": gh.get("bio") or f"Developer on VibeMatch — @{username}",
            "github_stars": gh.get("total_stars") or 0,
            "repos": gh.get("public_repos") or 0,
            "match_score": 95,          # real users always shown prominently
            "skill_summary": generate_skill_summary(skills) if skills else "Real VibeMatch platform member",
            "is_real": True,            # frontend uses this for the "Live" badge
        }
        peers.append(peer)

    return {"count": len(peers), "peers": peers}


@app.get("/api/users")
async def list_users(limit: int = Query(20, le=100)):
    """List all registered users (admin view)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT github_username, objective, workstyle, last_seen_at FROM users ORDER BY last_seen_at DESC LIMIT ?",
            (limit,)
        )
        rows = await cursor.fetchall()
    return {"count": len(rows), "users": [dict(r) for r in rows]}


@app.get("/api/users/{github_username}")
async def get_user(github_username: str):
    """Fetch a single registered user by their GitHub username."""
    if github_username == "peers":
        raise HTTPException(status_code=404, detail="Use /api/users/peers endpoint")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM users WHERE github_username = ?", (github_username,)
        )
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    data = dict(row)
    data["github_data"] = json.loads(data.get("github_data") or "{}")
    return data



# ── Vibe ──────────────────────────────────────────────────────────────────────
@app.get("/api/vibe")
async def vibe_with_project(project_id: str = Query(...), username: Optional[str] = Query(None)):
    """Vibe (upvote) with a project thought."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        # Check if thought exists
        cursor = await db.execute("SELECT stars FROM thoughts WHERE id = ?", (project_id,))
        row = await cursor.fetchone()
        if not row:
            return {"status": "error", "message": "Project thought not found in database"}
        
        current_stars = row["stars"]
        
        if username:
            cursor = await db.execute(
                "SELECT 1 FROM vibes WHERE github_username = ? AND thought_id = ?",
                (username, project_id)
            )
            already_vibed = await cursor.fetchone()
            if already_vibed:
                await db.execute(
                    "DELETE FROM vibes WHERE github_username = ? AND thought_id = ?",
                    (username, project_id)
                )
                new_stars = max(0, current_stars - 1)
                await db.execute("UPDATE thoughts SET stars = ? WHERE id = ?", (new_stars, project_id))
                await db.commit()
                return {"status": "unvibed", "message": "Vibe removed!", "stars": new_stars}
            else:
                await db.execute(
                    "INSERT INTO vibes (github_username, thought_id) VALUES (?, ?)",
                    (username, project_id)
                )
                new_stars = current_stars + 1
                await db.execute("UPDATE thoughts SET stars = ? WHERE id = ?", (new_stars, project_id))
                await db.commit()
                return {"status": "vibed", "message": "You are vibing with this thought! 🚀", "stars": new_stars}
        else:
            new_stars = current_stars + 1
            await db.execute("UPDATE thoughts SET stars = ? WHERE id = ?", (new_stars, project_id))
            await db.commit()
            return {"status": "vibed", "message": "You are vibing with this thought! 🚀", "stars": new_stars}


@app.delete("/api/thoughts/{thought_id}")
async def delete_thought(thought_id: str, username: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT author FROM thoughts WHERE id = ?", (thought_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project thought not found")
        if row["author"].lower() != username.lower():
            raise HTTPException(status_code=403, detail="You can only delete your own project thoughts")
        
        await db.execute("DELETE FROM thoughts WHERE id = ?", (thought_id,))
        await db.execute("DELETE FROM vibes WHERE thought_id = ?", (thought_id,))
        await db.commit()
    return {"status": "success", "message": "Project thought deleted successfully"}

