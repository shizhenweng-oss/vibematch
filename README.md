# VibeMatch 🚀

> A high-velocity developer matchmaking and hackathon project discovery platform.

## Quick Start

### Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Backend (FastAPI — optional)
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000
# → API docs: http://localhost:8000/docs
```

> **Note:** The frontend works fully without the backend — it uses mock data by default and gracefully falls back when the API is unavailable.

## Project Structure

```
hackaplan26/
├── frontend/                    # React + Vite + Tailwind CSS
│   └── src/
│       ├── App.jsx              # Root view state manager
│       ├── components/
│       │   ├── onboarding/
│       │   │   └── OnboardingWizard.jsx   # 3-step onboarding form
│       │   ├── dashboard/
│       │   │   ├── Dashboard.jsx          # Split-panel dashboard
│       │   │   ├── PeerCard.jsx           # Developer match card
│       │   │   └── ProjectCard.jsx        # Hackathon project card
│       │   └── ui/
│       │       ├── Button.jsx             # Shared button component
│       │       └── Badge.jsx              # Shared badge components
│       └── data/
│           └── mockData.js                # All mock data + option configs
│
└── backend/                     # FastAPI Python API
    ├── main.py                  # All routes
    ├── requirements.txt
    └── data/
        ├── profiles.json        # 10 mock developer profiles
        └── projects.json        # 10 mock hackathon projects
```

## Features

### Onboarding Wizard
- **Step 1** — GitHub URL + LinkedIn ID inputs with live validation
- **Step 2** — Objective selection grid: Win / Portfolio / Learn
- **Step 3** — WorkStyle grid: Tickets / Delegation / Merge at End
- Progress bar + animated step transitions

### Dashboard — Left Panel (Peer Matchmaking)
- Developer cards with AI-generated skill summaries
- Circular match score ring (color-coded)
- Objective + WorkStyle badges
- Skill language pills with color coding
- GitHub repo/stars stats
- **"Connect on LinkedIn"** button → opens LinkedIn directly
- Filter by objective, workstyle, search by name/skill/bio

### Dashboard — Right Panel (Hackathon Showroom)
- Curated open-source hackathon project cards
- Hackathon origin tag with accent color
- Star count, language pills, topic tags
- **"Vibe with this Project"** button with toggle state
- GitHub link
- Sort by stars or recent

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/onboard` | Submit profile, get peer matches |
| GET | `/api/matches` | Get matches (filter by objective, workstyle) |
| GET | `/api/projects` | Get hackathon project feed |
| GET | `/api/github-summary` | Mock GitHub skill extraction |
| GET | `/api/vibe` | Mark a project as "vibed" |

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS 3, Lucide React, Axios
- **Backend**: FastAPI, Uvicorn, Pydantic, Python 3.11+
- **Design**: Dark glassmorphism, Inter font, violet/cyan accent palette
