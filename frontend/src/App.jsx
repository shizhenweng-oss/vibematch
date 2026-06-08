import React, { useState, useEffect, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Users, Sparkles, Search, Github, LogOut, Zap, Code2, TrendingUp,
  ExternalLink, CheckCircle2, RotateCcw, PanelLeftClose, PanelLeftOpen,
  MessageSquare, UserPlus, Star, Tag, Link2, Flame, ChevronLeft,
  ChevronRight, Plus, X, Send, Check, UserCheck, AlertCircle, Loader2,
  MapPin, BookOpen, WifiOff, ArrowLeft, Linkedin, Trash2
} from 'lucide-react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { readSession, saveSession, clearSession } from './hooks/useSession.js'
import {
  loadVibes, saveVibes, loadConnections, saveConnections, loadMessages, saveMessages,
  getLocalUsers, saveLocalUser, getLocalThoughts, saveLocalThought, deleteLocalThought, getLocalMessages, saveLocalMessage
} from './hooks/usePersistence.js'

// ── Deterministic tag color generator ───────────────────────────────────────
export function getTagColor(str) {
  if (!str) return { from: '#7c3aed', to: '#4f46e5', text: '#d8b4fe' }
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return {
    from: `hsl(${h}, 70%, 45%)`,
    to: `hsl(${h}, 70%, 35%)`,
    text: `hsl(${h}, 90%, 85%)`
  }
}

// ── GitHub Username Parser ──────────────────────────────────────────────────
export function extractGithubUsername(input) {
  if (!input) return ''
  const trimmed = input.trim().replace(/\/$/, '')
  const urlMatch = trimmed.match(/github\.com\/([^/?#\s]+)/)
  if (urlMatch) return urlMatch[1]
  if (!trimmed.includes('/') && !trimmed.includes('.')) return trimmed
  return trimmed.split('/').pop() || trimmed
}

// ── GitHub Profile Hook ─────────────────────────────────────────────────────
const GITHUB_CACHE = new Map()
export function useGitHubProfile(githubUrl) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const controllerRef = useRef(null)

  useEffect(() => {
    const username = extractGithubUsername(githubUrl)
    if (!username || username.length < 2) {
      setProfile(null)
      setError(null)
      return
    }

    if (GITHUB_CACHE.has(username)) {
      setProfile(GITHUB_CACHE.get(username))
      setLoading(false)
      setError(null)
      return
    }

    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        let data
        try {
          const res = await axios.get(`/api/github/user/${username}`, {
            timeout: 5000,
            signal: controllerRef.current.signal,
          })
          data = res.data
        } catch {
          const [userRes, reposRes] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`, {
              signal: controllerRef.current.signal,
            }),
            fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=8`, {
              signal: controllerRef.current.signal,
            }),
          ])

          if (!userRes.ok) throw new Error(`GitHub user not found: ${username}`)

          const user = await userRes.json()
          const repos = reposRes.ok ? await reposRes.json() : []

          const langCounts = {}
          repos.forEach(r => {
            if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1
          })
          const topLanguages = Object.entries(langCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([lang]) => lang)

          data = {
            username: user.login,
            name: user.name || user.login,
            avatar: user.avatar_url,
            bio: user.bio || '',
            public_repos: user.public_repos,
            followers: user.followers,
            html_url: user.html_url,
            languages: topLanguages,
            company: user.company,
            location: user.location,
            total_stars: repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0)
          }
        }

        GITHUB_CACHE.set(username, data)
        setProfile(data)
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError') return
        setError(err.message || 'Failed to load GitHub profile')
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchProfile, 500)
    return () => {
      clearTimeout(timer)
      controllerRef.current?.abort()
    }
  }, [githubUrl])

  return { profile, loading, error }
}

// ── Configuration Options ───────────────────────────────────────────────────
const OBJECTIVE_OPTIONS = [
  {
    id: 'win',
    label: 'Win',
    emoji: '🏆',
    description: 'Compete to place top 3 and take home prizes',
    color: 'from-amber-500/20 to-yellow-500/10',
    borderColor: 'border-amber-500/40',
    activeBorder: 'border-amber-400',
    textColor: 'text-amber-300',
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    emoji: '✨',
    description: 'Build something beautiful to showcase your skills',
    color: 'from-violet-500/20 to-indigo-500/10',
    borderColor: 'border-violet-500/40',
    activeBorder: 'border-violet-400',
    textColor: 'text-violet-300',
  },
  {
    id: 'learn',
    label: 'Learn',
    emoji: '🧠',
    description: 'Explore new tech and grow alongside great peers',
    color: 'from-cyan-500/20 to-blue-500/10',
    borderColor: 'border-cyan-500/40',
    activeBorder: 'border-cyan-400',
    textColor: 'text-cyan-300',
  },
]

const WORKSTYLE_OPTIONS = [
  {
    id: 'tickets',
    label: 'Ticket System',
    emoji: '🎫',
    description: 'Structured GitHub Issues / Linear tasks with clear ownership',
    color: 'from-blue-500/20 to-indigo-500/10',
    borderColor: 'border-blue-500/40',
    activeBorder: 'border-blue-400',
    textColor: 'text-blue-300',
  },
  {
    id: 'delegation',
    label: 'Delegation',
    emoji: '🤝',
    description: 'Assign features to team leads, trust the process',
    color: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/40',
    activeBorder: 'border-emerald-400',
    textColor: 'text-emerald-300',
  },
  {
    id: 'merge-at-end',
    label: 'Merge at End',
    emoji: '🔀',
    description: 'Hack solo branches, merge everything before the deadline',
    color: 'from-pink-500/20 to-rose-500/10',
    borderColor: 'border-pink-500/40',
    activeBorder: 'border-pink-400',
    textColor: 'text-pink-300',
  },
]

const PHASE_CONFIG = {
  ideation: { label: 'Ideation', bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-300' },
  building: { label: 'Building', bg: 'bg-violet-500/15', border: 'border-violet-500/30', text: 'text-violet-300' },
  testing: { label: 'Testing', bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-300' },
  launched: { label: 'Launched', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300' },
  paused: { label: 'Paused', bg: 'bg-slate-500/15', border: 'border-slate-500/30', text: 'text-slate-400' },
}

const PHASES = Object.keys(PHASE_CONFIG)

const SIMULATED_PEER_TEMPLATES = [
  {
    username: 'aria-chen-dev',
    name: 'Aria Chen',
    avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=AriaC&backgroundColor=b6e3f4',
    linkedin_id: 'aria-chen-dev',
    objective: 'win',
    workstyle: 'tickets',
    languages: ['React', 'TypeScript', 'GraphQL', 'Docker'],
    bio: 'Full-stack engineer obsessed with clean APIs. 3x hackathon winner.',
    total_stars: 1840,
    public_repos: 42,
  },
  {
    username: 'mrivera-builds',
    name: 'Marcus Rivera',
    avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=MarcusR&backgroundColor=c0aede',
    linkedin_id: 'marcus-rivera-eng',
    objective: 'win',
    workstyle: 'delegation',
    languages: ['Python', 'FastAPI', 'ML', 'LangChain', 'PostgreSQL'],
    bio: 'ML engineer who loves shipping AI products at speed.',
    total_stars: 3210,
    public_repos: 67,
  },
  {
    username: 'sofia-builds',
    name: 'Sofia Okafor',
    avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=SofiaO&backgroundColor=ffd5dc',
    linkedin_id: 'sofia-okafor',
    objective: 'portfolio',
    workstyle: 'merge-at-end',
    languages: ['Vue.js', 'Nuxt', 'Figma', 'GSAP', 'Tailwind'],
    bio: 'Creative frontend dev focused on motion design and stellar UX.',
    total_stars: 890,
    public_repos: 28,
  },
  {
    username: 'liam-park-io',
    name: 'Liam Park',
    avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=LiamP&backgroundColor=d1f4cc',
    linkedin_id: 'liam-park-dev',
    objective: 'learn',
    workstyle: 'tickets',
    languages: ['Rust', 'WebAssembly', 'C++', 'LLVM'],
    bio: 'Systems programmer diving into web runtimes. Love debugging impossible bugs.',
    total_stars: 512,
    public_repos: 19,
  }
]

// ── REUSABLE UI BADGES ──
function LanguageBadge({ language }) {
  const c = getTagColor(language)
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0"
      style={{
        backgroundColor: `${c.from}15`,
        borderColor: `${c.from}40`,
        color: c.text,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.from }} />
      {language}
    </span>
  )
}

function ObjectiveBadge({ objective }) {
  const config = {
    win: { label: '🏆 Win', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
    portfolio: { label: '✨ Portfolio', cls: 'bg-violet-500/15 border-violet-500/30 text-violet-300' },
    learn: { label: '🧠 Learn', cls: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' },
  }
  const { label, cls } = config[objective] ?? config.learn
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls} shrink-0`}>
      {label}
    </span>
  )
}

function WorkStyleBadge({ workstyle }) {
  const config = {
    tickets: { label: '🎫 Tickets', cls: 'bg-blue-500/15 border-blue-500/30 text-blue-300' },
    delegation: { label: '🤝 Delegation', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
    'merge-at-end': { label: '🔀 Merge at End', cls: 'bg-pink-500/15 border-pink-500/30 text-pink-300' },
  }
  const { label, cls } = config[workstyle] ?? {}
  if (!label) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls} shrink-0`}>
      {label}
    </span>
  )
}

function MatchRing({ score }) {
  const circumference = 2 * Math.PI * 14
  const offset = circumference - ((score ?? 80) / 100) * circumference
  const color = score >= 90 ? '#06b6d4' : score >= 75 ? '#7c3aed' : '#f59e0b'
  return (
    <div className="relative w-8 h-8 shrink-0">
      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#2a2a3e" strokeWidth="2.5" />
        <circle
          cx="18" cy="18" r="14" fill="none"
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-black" style={{ color }}>{score ?? '—'}</span>
      </div>
    </div>
  )
}

function CardSkeleton({ color }) {
  return (
    <div className="mt-3 space-y-1.5 opacity-20 pointer-events-none select-none" aria-hidden="true">
      <div className="h-1.5 rounded-full bg-current w-full" style={{ color }} />
      <div className="h-1.5 rounded-full bg-current w-4/5" style={{ color }} />
      <div className="h-1.5 rounded-full bg-current w-2/3 mt-2" style={{ color }} />
      <div className="flex gap-2 mt-3">
        <div className="h-6 rounded-lg bg-current flex-1" style={{ color }} />
        <div className="h-6 rounded-lg bg-current w-8" style={{ color }} />
      </div>
    </div>
  )
}

// ── PEER CARD COMPONENT (FIXED: Detached metadata row to prevent overlaps) ──
function PeerCard({ profile, isConnected = false, onConnect, onOpenMessage, index = 0 }) {
  const [connecting, setConnecting] = useState(false)
  const handleConnect = async () => {
    window.open(`https://www.linkedin.com/in/${profile.linkedin_id}`, '_blank', 'noopener noreferrer')
    if (!isConnected) {
      setConnecting(true)
      setTimeout(() => {
        onConnect?.(profile)
        setConnecting(false)
      }, 400)
    }
  }

  return (
    <article className="group relative flex flex-col glass rounded-2xl border border-white/5 p-5 card-lift overflow-hidden cursor-default transition-all duration-300">
      {/* Detached Metadata Row (Completely isolated at the top) */}
      <div className="flex items-center justify-between text-[10px] text-text-faint mb-3 select-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {profile.is_real && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          {isConnected && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <UserCheck className="w-2.5 h-2.5 text-cyan-400" />
              Connected
            </span>
          )}
          {profile.is_me && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold">
              You
            </span>
          )}
        </div>
        <MatchRing score={profile.match_score} />
      </div>

      {/* Avatar & Name container (Detached and never overlapping) */}
      <div className="flex items-center gap-3 mb-3 min-w-0">
        <div className="relative shrink-0">
          <img
            src={profile.avatar}
            alt={`${profile.name} avatar`}
            className="w-12 h-12 rounded-xl bg-surface object-cover border border-white/10"
            onError={(e) => { e.target.src = `https://api.dicebear.com/8.x/initials/svg?seed=${profile.name}` }}
          />
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-base" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-text-primary text-sm truncate">{profile.name}</h4>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <ObjectiveBadge objective={profile.objective} />
            <WorkStyleBadge workstyle={profile.workstyle} />
          </div>
        </div>
      </div>

      {/* AI Skill Summary */}
      {profile.skill_summary && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-violet-500/8 border border-violet-500/15">
          <div className="flex items-center gap-1.5 mb-1 select-none">
            <Zap className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">AI Summary</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed italic">"{profile.skill_summary}"</p>
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <p className="text-xs text-text-muted leading-relaxed mb-3 line-clamp-2">{profile.bio}</p>
      )}

      {/* Skills */}
      {profile.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {profile.skills.slice(0, 4).map((skill) => (
            <LanguageBadge key={skill} language={skill} />
          ))}
          {profile.skills.length > 4 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-white/5 border border-white/10 text-text-faint">
              +{profile.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Repos & github link */}
      <div className="flex items-center gap-4 mb-4 text-text-faint">
        {profile.repos && (
          <button
            onClick={() => window.open(profile.github_url, '_blank', 'noopener noreferrer')}
            className="flex items-center gap-1.5 text-[11px] hover:text-text-muted transition-colors group/gh"
          >
            <Github className="w-3.5 h-3.5 group-hover/gh:text-violet-400 transition-colors" />
            <span>{profile.repos} repos</span>
          </button>
        )}
        {profile.github_stars && (
          <div className="flex items-center gap-1 text-[11px]">
            <Star className="w-3 h-3 text-amber-400" />
            <span>{profile.github_stars.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="flex gap-2 mt-auto">
        <button
          id={`connect-${profile.id}`}
          onClick={handleConnect}
          disabled={connecting}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
            isConnected
              ? 'bg-transparent border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5'
              : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40'
          }`}
        >
          {isConnected ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Linkedin className="w-3.5 h-3.5 text-cyan-300" />}
          <span>{isConnected ? 'Connected' : 'Connect'}</span>
        </button>
        {isConnected && (
          <button
            id={`message-${profile.id}`}
            onClick={() => onOpenMessage?.(profile)}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 transition-all shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>
    </article>
  )
}

// ── PROJECT CARD COMPONENT (UPDATED: Media pipeline, cover image, thumbnail grid) ──
function ProjectCard({ project, isVibed = false, onVibe, onDelete, currentUsername, onOpenMessage, onOpenProjectChat, registeredUsers, index = 0 }) {
  const [isHovered, setIsHovered] = useState(false)
  const primaryTech = project.languages?.[0] || 'Tech'
  const accent = getTagColor(primaryTech)
  const popularityScore = project.stars || 0
  const isHighlyPopular = popularityScore >= 5

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative rounded-2xl border border-white/6 overflow-hidden flex flex-col transition-all duration-500 ease-in-out cursor-default"
      style={{
        background: 'rgba(18, 18, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        boxShadow: isHovered ? '0 12px 36px rgba(124, 58, 237, 0.15)' : 'none',
      }}
    >
      {/* Tech color accent bar */}
      <div
        className="h-0.5 w-full shrink-0"
        style={{
          background: `linear-gradient(90deg, ${accent.from}cc, ${accent.to}30, transparent)`,
        }}
      />

      {/* Cover Image */}
      {project.cover_image && (
        <div className="w-full h-32 overflow-hidden border-b border-white/6 bg-surface shrink-0 relative">
          <img
            src={project.cover_image}
            alt={`${project.title || project.name} cover`}
            className="w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105"
          />
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-bold text-text-primary text-sm leading-snug truncate flex-1">
              {project.title || project.name}
            </h3>
            {/* Popularity Badge */}
            <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${
              isHighlyPopular
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-white/4 border-white/8 text-text-faint'
            }`}>
              {isHighlyPopular ? (
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              ) : (
                <TrendingUp className="w-3 h-3 text-text-faint" />
              )}
              <span>Vibes: {popularityScore}</span>
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-2 mb-3 select-none">
            <img
              src={project.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${project.author || 'dev'}`}
              alt={project.author || 'dev'}
              className="w-5 h-5 rounded-full border border-white/10 shrink-0"
              onError={(e) => { e.target.src = `https://api.dicebear.com/8.x/initials/svg?seed=${project.author || 'dev'}` }}
            />
            <span className="text-[10px] text-text-faint font-semibold truncate">
              {project.handle || `@${project.author || 'builder'}`}
            </span>
          </div>

          {/* Compact horizontal grid of project thumbnails */}
          {project.images && project.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-1 mb-3 scrollbar-none select-none">
              {project.images.map((img, idx) => (
                <div
                  key={idx}
                  className={`w-16 h-12 rounded-lg overflow-hidden border shrink-0 bg-surface transition-all ${
                    project.cover_image === img ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-white/10'
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`thumbnail-${idx}`} />
                </div>
              ))}
            </div>
          )}

          {/* Stack Tagging */}
          <div className="flex flex-wrap gap-1 mb-2">
            {(project.languages || []).map((lang) => {
              const c = getTagColor(lang)
              return (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                  style={{
                    backgroundColor: `${c.from}15`,
                    borderColor: `${c.from}40`,
                    color: c.text,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.from }} />
                  {lang}
                </span>
              )
            })}
          </div>
        </div>

        {/* Collapsed skeleton vs Expanded view transitioning with Tailwind transition utilities */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            isHovered ? 'max-h-96 opacity-100 mt-3 pt-3 border-t border-white/6' : 'max-h-0 opacity-0'
          }`}
        >
          {/* Discussion Header */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1">Conceptual discussion</p>
          <p className="text-[11px] text-text-muted leading-relaxed mb-3">
            {project.discussion || project.description}
          </p>

          {/* Custom tag tokens */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] bg-white/4 border border-white/6 text-text-faint"
                >
                  <Tag className="w-2 h-2" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Repository Link */}
          {(project.github_url || project.repo_url) && (
            <a
              href={project.github_url || project.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-[11px] font-bold text-white transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                boxShadow: `0 4px 12px ${accent.from}35`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Github className="w-3.5 h-3.5" />
              GitHub Repo
              <Link2 className="w-3.5 h-3.5 ml-auto" />
            </a>
          )}

          {/* Real-time Collaboration Chat Shortcuts */}
          <div className="grid grid-cols-2 gap-2 mt-2 select-none">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenProjectChat?.(project)
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[10px] font-bold border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-all duration-200"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Discuss
            </button>
            
            {project.author && project.author.toLowerCase() !== currentUsername?.toLowerCase() && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const authorProfile = registeredUsers?.find(u => u.id.replace('real_', '').toLowerCase() === project.author.toLowerCase()) || {
                    id: `real_${project.author}`,
                    name: project.author,
                    avatar: project.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${project.author}`,
                    github_url: project.github_url || `https://github.com/${project.author}`,
                    linkedin_id: '',
                    objective: '',
                    workstyle: '',
                    skills: project.languages || [],
                    bio: `Developer on VibeMatch — @${project.author}`,
                    github_stars: 0,
                    repos: 0,
                    match_score: 90,
                    is_real: true,
                  }
                  onOpenMessage?.(authorProfile)
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[10px] font-bold border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 transition-all duration-200"
              >
                <Users className="w-3.5 h-3.5" />
                Message
              </button>
            )}
          </div>
        </div>

        {/* Collapsed skeleton bar */}
        {(!project.images || project.images.length === 0) && (
          <div
            className={`transition-all duration-300 overflow-hidden ${
              isHovered ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'
            }`}
          >
            <CardSkeleton color={accent.from} />
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-white/4 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onVibe?.(project)
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-bold border transition-all duration-200 ${
              isVibed
                ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300'
                : 'bg-white/4 border-white/10 text-text-muted hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-300'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isVibed ? 'fill-violet-400 text-violet-300' : ''}`} />
            <span>{isVibed ? 'Vibed! ✓' : 'Vibe'}</span>
          </button>

          {currentUsername && project.author && project.author.toLowerCase() === currentUsername.toLowerCase() && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('Are you sure you want to delete this project thought?')) {
                  onDelete?.(project.id)
                }
              }}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all shrink-0"
              title="Delete thought"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// ── ONBOARDING WIZARD VIEW ──
function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ github_url: '', linkedin_id: '', objective: '', workstyle: '' })

  const { profile: githubProfile } = useGitHubProfile(form.github_url)

  const canProceed = useMemo(() => {
    if (step === 1) return form.github_url.length > 0 && form.linkedin_id.length > 0
    if (step === 2) return form.objective !== ''
    if (step === 3) return form.workstyle !== ''
    return false
  }, [step, form])

  const handleNext = () => { if (step < 3) setStep(s => s + 1) }
  const handleBack = () => { if (step > 1) setStep(s => s - 1) }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = { ...form, github_data: githubProfile ?? null }
      let apiMatches = null
      try {
        const res = await axios.post('/api/onboard', payload, { timeout: 5000 })
        apiMatches = res.data?.matches ?? null
      } catch {}
      saveSession({ userProfile: form, githubProfile: githubProfile ?? null })
      onComplete(form, apiMatches, githubProfile ?? null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight gradient-text">VibeMatch</span>
          </div>
          <p className="text-text-faint text-sm">Find your perfect teammate matches</p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-card border border-white/6">
          {/* Progress bar */}
          <div className="mb-8 select-none">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-faint">Step {step} of 3</span>
              <span className="text-xs font-semibold text-violet-400">{Math.round((step / 3) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          <div key={step}>
            {step === 1 && (
              <div className="space-y-4 animate-fade-up">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/20 mb-3">
                    <Github className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">Dev Identity</h3>
                  <p className="text-xs text-text-muted mt-1">Connect your profiles to fetch repository stacks</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-text-muted">GitHub Profile URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={form.github_url}
                    onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-xs text-text-primary placeholder-text-faint focus:outline-none focus:border-violet-500/50"
                  />
                  {githubProfile && (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                      <img src={githubProfile.avatar} className="w-8 h-8 rounded-full border border-emerald-500/30" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">{githubProfile.name}</p>
                        <p className="text-[10px] text-text-faint truncate">{githubProfile.bio}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-text-muted">LinkedIn ID / Username</label>
                  <input
                    type="text"
                    placeholder="linkedin-username"
                    value={form.linkedin_id}
                    onChange={e => setForm(f => ({ ...f, linkedin_id: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-xs text-text-primary placeholder-text-faint focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-up">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-text-primary">What's Your Objective?</h3>
                  <p className="text-xs text-text-muted mt-1">Select the goal that fits your hack style</p>
                </div>
                <div className="space-y-2">
                  {OBJECTIVE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setForm(f => ({ ...f, objective: opt.id }))}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        form.objective === opt.id
                          ? `bg-gradient-to-r ${opt.color} ${opt.activeBorder}`
                          : 'border-border bg-surface/50 hover:border-border-bright'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <div>
                        <h4 className="font-bold text-xs text-text-primary">{opt.label}</h4>
                        <p className="text-[10px] text-text-faint mt-0.5">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-up">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-text-primary">Select Collaboration Style</h3>
                  <p className="text-xs text-text-muted mt-1">This sets match score alignments</p>
                </div>
                <div className="space-y-2">
                  {WORKSTYLE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setForm(f => ({ ...f, workstyle: opt.id }))}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        form.workstyle === opt.id
                          ? `bg-gradient-to-r ${opt.color} ${opt.activeBorder}`
                          : 'border-border bg-surface/50 hover:border-border-bright'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <div>
                        <h4 className="font-bold text-xs text-text-primary">{opt.label}</h4>
                        <p className="text-[10px] text-text-faint mt-0.5">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-xs font-bold text-text-muted border border-white/10 hover:border-white/20 rounded-xl transition-all"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-500 disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || loading}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-500 disabled:opacity-40"
              >
                {loading ? 'Entering Roster...' : 'Find Teammates'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── LEFT SIDEBAR MESSAGING & VIBES ──
const LeftSidebar = forwardRef(function LeftSidebar({ vibedProjects, onUnvibe, connections, onDisconnect, myName }, ref) {
  const [activeTab, setActiveTab] = useState('vibes')
  const [activeThread, setActiveThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const bottomRef = useRef(null)

  useImperativeHandle(ref, () => ({
    openThread: (peerId) => {
      setActiveTab('connections')
      setActiveThread(peerId)
    }
  }))

  useEffect(() => {
    if (activeThread) {
      setMessages(loadMessages(activeThread))
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [activeThread])

  const handleSendMessage = () => {
    const text = messageInput.trim()
    if (!text || !activeThread) return
    const newMsg = { id: Date.now(), text, from: 'me', at: new Date().toISOString() }
    const updated = [...messages, newMsg]
    setMessages(updated)
    saveMessages(activeThread, updated)
    setMessageInput('')
  }

  const peer = useMemo(() => connections.find(c => c.id === activeThread), [connections, activeThread])

  return (
    <aside className="w-full h-full flex flex-col glass border-r border-white/6 overflow-hidden">
      {/* Thread Message Window */}
      {activeThread && peer ? (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/6 shrink-0">
            <button
              onClick={() => setActiveThread(null)}
              className="p-1 rounded-lg text-text-faint hover:text-text-muted hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <img src={peer.avatar} className="w-7 h-7 rounded-full object-cover border border-white/15" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{peer.name}</p>
              <p className="text-[9px] text-emerald-400">Live chat</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-2xl">👋</span>
                <p className="text-[10px] text-text-faint mt-1">Connect and say hello to {peer.name}!</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.from === 'me' ? 'items-end' : 'items-start'} gap-0.5`}>
                  <div className={`max-w-[85%] px-3 py-1.5 rounded-xl text-xs ${
                    msg.from === 'me' ? 'bg-violet-600 text-white' : 'bg-surface border border-white/8 text-text-primary'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-text-faint px-1">
                    {new Date(msg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 border-t border-white/6 flex gap-1.5 items-center shrink-0">
            <input
              type="text"
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }}
              placeholder={`Message ${peer.name}...`}
              className="flex-1 bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary outline-none focus:border-violet-500/50"
            />
            <button
              onClick={handleSendMessage}
              className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center hover:bg-violet-500"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Tab selector */}
          <div className="flex border-b border-white/6 shrink-0 select-none">
            <button
              onClick={() => setActiveTab('vibes')}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold border-b-2 transition-all ${
                activeTab === 'vibes' ? 'text-violet-400 border-violet-500 bg-violet-500/5' : 'text-text-faint border-transparent hover:bg-white/3'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>VIBES ({vibedProjects.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold border-b-2 transition-all ${
                activeTab === 'connections' ? 'text-cyan-400 border-cyan-500 bg-cyan-500/5' : 'text-text-faint border-transparent hover:bg-white/3'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>CHATS ({connections.length})</span>
            </button>
          </div>

          {/* Tab contents */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'vibes' ? (
              <div className="p-3 space-y-2">
                {vibedProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[10px] text-text-faint leading-relaxed">No projects vibed yet. Tap "Vibe" in the showroom to save items here!</p>
                  </div>
                ) : (
                  vibedProjects.map(proj => (
                    <div key={proj.id} className="relative p-3 rounded-xl bg-surface border border-white/5 flex flex-col gap-1 hover:border-violet-500/30 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-text-primary truncate">{proj.title || proj.name}</span>
                        <button onClick={() => onUnvibe(proj.id)} className="text-text-faint hover:text-red-400 text-xs">✕</button>
                      </div>
                      <div className="flex gap-2 items-center text-[10px] text-text-faint">
                        <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{proj.stars || 0}</span>
                        <span>{proj.languages?.[0]}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {connections.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[10px] text-text-faint leading-relaxed">No connection messages yet. Match and connect with other roster devs!</p>
                  </div>
                ) : (
                  connections.map(conn => (
                    <div
                      key={conn.id}
                      onClick={() => setActiveThread(conn.id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/4 cursor-pointer transition-all"
                    >
                      <img src={conn.avatar} className="w-8 h-8 rounded-full border border-white/10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">{conn.name}</p>
                        <p className="text-[9px] text-text-faint truncate">Click to message builder</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); onDisconnect(conn.id) }}
                        className="text-text-faint hover:text-red-400 p-1 rounded hover:bg-white/5 shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
})

// ── USER HEADER VIEW ──
function UserHeader({ userProfile, githubProfile, onSignOut, sidebarOpen, onToggleSidebar, onGoToFeed }) {
  const myUsername = extractGithubUsername(userProfile.github_url)
  return (
    <header className="glass-strong sticky top-0 z-40 border-b border-white/6 select-none shrink-0">
      <div className="max-w-[1800px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-text-faint hover:text-text-muted hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-black tracking-tight gradient-text hidden sm:block">VibeMatch</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img
            src={githubProfile?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${myUsername}`}
            alt="My Avatar"
            className="w-7 h-7 rounded-full border border-white/15 object-cover"
          />
          <span className="text-xs font-bold text-text-muted hidden md:inline">{githubProfile?.name || myUsername}</span>
          <ObjectiveBadge objective={userProfile.objective} />
          <WorkStyleBadge workstyle={userProfile.workstyle} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onGoToFeed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-violet-300 bg-violet-500/10 border border-violet-500/25 hover:bg-violet-500/20"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Project Feed
          </button>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-text-faint hover:text-text-muted hover:bg-white/5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  )
}

// ── PROJECT FEED CREATION FORM ──
function ProjectFeedView({ userProfile, githubProfile, onBack, thoughts, onPublish, onVibe, onDelete, currentUsername, vibedIds }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPhase, setFilterPhase] = useState('all')
  const [errors, setErrors] = useState({})
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  const authorName = githubProfile?.name || userProfile?.github_url?.split('/').pop() || 'developer'
  const authorHandle = `@${userProfile?.github_url?.split('/').pop() || 'you'}`

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (form.discussion.trim().length < 30) e.discussion = 'Write at least 30 characters of discussion'
    if (!form.github_url.trim().match(/github\.com\//)) e.github_url = 'Must be a valid GitHub URL'
    if (form.languages.length === 0) e.languages = 'Enter at least one stack tool/language'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setPublishing(true)

    const thought = {
      id: `thought_${Date.now()}`,
      title: form.title.trim(),
      author: userProfile?.github_url?.split('/').pop() || 'you',
      handle: authorHandle,
      avatar: githubProfile?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${authorName}`,
      discussion: form.discussion.trim(),
      github_url: form.github_url.trim(),
      languages: form.languages,
      phase: form.phase,
      stars: 0,
      tags: form.tags,
      created_at: new Date().toISOString(),
      images: form.images || [],
      cover_image: form.cover_image || '',
    }

    try {
      await onPublish(thought)
      setPublished(true)
      setTimeout(() => {
        setForm(EMPTY_FORM)
        setPublished(false)
        setShowForm(false)
      }, 800)
    } finally {
      setPublishing(false)
    }
  }

  const filteredThoughts = useMemo(() => {
    return thoughts.filter(t => {
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.discussion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.languages.some(lang => lang.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesPhase = filterPhase === 'all' || t.phase === filterPhase
      return matchesSearch && matchesPhase
    })
  }, [thoughts, searchQuery, filterPhase])

  return (
    <div className="min-h-screen mesh-bg pb-12">
      <header className="glass-strong sticky top-0 z-40 border-b border-white/6 select-none shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-text-faint hover:text-text-muted hover:bg-white/5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-sm font-black gradient-text">Project Feed</h1>
              <p className="text-[10px] text-text-faint">Real-time developer synchronization</p>
            </div>
          </div>

          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 transition-all shadow-md"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? 'Cancel' : 'New Thought'}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Form Container */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="relative rounded-2xl border border-white/8 bg-surface-strong/95 backdrop-blur-xl p-6 shadow-2xl mb-8"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">Project Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. VibeMatch — AI Teammate Core"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-violet-500/50"
                  />
                  {errors.title && <p className="text-[10px] text-red-400 mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">Discussion / Tech Insights *</label>
                  <textarea
                    value={form.discussion}
                    onChange={e => setForm(f => ({ ...f, discussion: e.target.value }))}
                    placeholder="What conceptual insight or technical hurdle are you hacking through?"
                    rows={3}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary resize-none focus:outline-none focus:border-violet-500/50"
                  />
                  {errors.discussion && <p className="text-[10px] text-red-400 mt-1">{errors.discussion}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Tech Stack (comma separated) *</label>
                    <input
                      type="text"
                      value={form.languagesInput}
                      onChange={e => {
                        const val = e.target.value
                        setForm(f => ({
                          ...f,
                          languagesInput: val,
                          languages: val.split(',').map(l => l.trim()).filter(Boolean)
                        }))
                      }}
                      placeholder="e.g. React, C++, Tailwind v4, pythonocc-core"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-violet-500/50"
                    />
                    {errors.languages && <p className="text-[10px] text-red-400 mt-1">{errors.languages}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Project Phase</label>
                    <select
                      value={form.phase}
                      onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-violet-500/50"
                    >
                      {PHASES.map(p => (
                        <option key={p} value={p}>{PHASE_CONFIG[p].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">GitHub Repo URL *</label>
                    <input
                      type="url"
                      value={form.github_url}
                      onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))}
                      placeholder="https://github.com/username/repo"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-violet-500/50"
                    />
                    {errors.github_url && <p className="text-[10px] text-red-400 mt-1">{errors.github_url}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Custom Tags (comma separated)</label>
                    <input
                      type="text"
                      value={form.tagsInput}
                      onChange={e => {
                        const val = e.target.value
                        setForm(f => ({
                          ...f,
                          tagsInput: val,
                          tags: val.split(',').map(t => t.trim()).filter(Boolean)
                        }))
                      }}
                      placeholder="e.g. AI, Ansys, SimScale"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Image Upload Gallery */}
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <label className="block text-xs font-bold text-text-muted mb-2">Image upload gallery</label>
                  
                  {/* File picker */}
                  <div className="flex items-center justify-center w-full mb-3">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-violet-500/50 bg-surface/50 hover:bg-violet-500/5 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Plus className="w-5 h-5 text-text-faint mb-1" />
                        <p className="text-[10px] text-text-muted">Click to upload CAD, CFD, or UI screenshots</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const promises = files.map(file => {
                            return new Promise((resolve) => {
                              const reader = new FileReader();
                              reader.onload = (event) => resolve(event.target.result);
                              reader.readAsDataURL(file);
                            });
                          });
                          Promise.all(promises).then(uploadedImages => {
                            setForm(f => {
                              const newImages = [...(f.images || []), ...uploadedImages];
                              // Set first image as cover image by default if none is set
                              const newCover = f.cover_image || newImages[0] || '';
                              return { ...f, images: newImages, cover_image: newCover };
                            });
                          });
                        }}
                      />
                    </label>
                  </div>

                  {/* Thumbnail grid */}
                  {form.images && form.images.length > 0 && (
                    <div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                        {form.images.map((img, idx) => {
                          const isCover = form.cover_image === img;
                          return (
                            <div
                              key={idx}
                              onClick={() => setForm(f => ({ ...f, cover_image: img }))}
                              className={`relative aspect-square rounded-lg overflow-hidden border cursor-pointer group hover:border-violet-500 transition-all ${
                                isCover ? 'border-violet-500 ring-2 ring-violet-500/40' : 'border-white/10'
                              }`}
                            >
                              <img src={img} className="w-full h-full object-cover" alt={`Upload ${idx}`} />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-text-faint select-none">
                        <input type="radio" checked={!!form.cover_image} readOnly className="accent-violet-500" />
                        <span>Select picture (click thumbnail to set cover image)</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={publishing || published}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-500 disabled:opacity-50"
                >
                  {published ? 'Published ✓' : publishing ? 'Publishing...' : 'Publish Thought'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint" />
            <input
              type="text"
              placeholder="Search stack, title, creators..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-primary placeholder-text-faint focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterPhase('all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                filterPhase === 'all' ? 'bg-violet-600/20 border-violet-500/40 text-violet-300' : 'bg-white/4 border-white/10 text-text-faint hover:border-white/15'
              }`}
            >
              All Phases
            </button>
            {PHASES.map(p => (
              <button
                key={p}
                onClick={() => setFilterPhase(p)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                  filterPhase === p ? `${PHASE_CONFIG[p].bg} ${PHASE_CONFIG[p].border} ${PHASE_CONFIG[p].text}` : 'bg-white/4 border-white/10 text-text-faint hover:border-white/15'
                }`}
              >
                {PHASE_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* List thoughts */}
        {filteredThoughts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredThoughts.map((thought, i) => (
              <ProjectCard
                key={thought.id}
                project={thought}
                index={i}
                isVibed={vibedIds.has(thought.id)}
                onVibe={onVibe}
                onDelete={onDelete}
                currentUsername={currentUsername}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-surface/20 border border-white/5 rounded-2xl">
            <div className="text-3xl mb-2">💭</div>
            <p className="text-text-muted text-xs">No project thoughts match your query.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  title: '',
  discussion: '',
  github_url: '',
  languagesInput: '',
  languages: [],
  phase: 'building',
  tagsInput: '',
  tags: [],
  images: [],
  cover_image: '',
}

const RealtimeSyncContext = React.createContext(null)

export function useRealtimeSync() {
  return React.useContext(RealtimeSyncContext)
}

// ── ROOT APP MVP WORKSPACE (Real-Time Synced) ──
export default function App() {
  const [view, setView] = useState('loading')
  const [userProfile, setUserProfile] = useState(null)
  const [githubProfile, setGithubProfile] = useState(null)
  const [isReturning, setIsReturning] = useState(false)

  // Real-time reactive data states
  const [registeredUsers, setRegisteredUsers] = useState([])
  const [projectThoughts, setProjectThoughts] = useState([])

  // Live Chat and WS Synced States
  const [messages, setMessages] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const sidebarRef = useRef(null)

  // Layout & sidebar panels states
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePanel, setActivePanel] = useState('peers')
  const [searchQuery, setSearchQuery] = useState('')
  const [objectiveFilter, setObjectiveFilter] = useState('all')
  const [workstyleFilter, setWorkstyleFilter] = useState('all')
  const [isSimulating, setIsSimulating] = useState(false)

  // Showroom direct project creation state
  const [showroomForm, setShowroomForm] = useState({
    title: '',
    discussion: '',
    github_url: '',
    languagesInput: '',
    languages: [],
    tagsInput: '',
    tags: [],
    images: [],
    cover_image: '',
  })
  const [isPublishingFromShowroom, setIsPublishingFromShowroom] = useState(false)

  // Vibes & Connections persistence
  const [vibedProjects, setVibedProjects] = useState(() => loadVibes())
  const [connections, setConnections] = useState(() => loadConnections())

  const myUsername = useMemo(() => userProfile ? extractGithubUsername(userProfile.github_url) : '', [userProfile])

  // Me profile memo
  const meProfile = useMemo(() => {
    if (!userProfile) return null
    return {
      id: `me_${myUsername}`,
      name: githubProfile?.name || myUsername || 'Me',
      avatar: githubProfile?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${myUsername}`,
      github_url: userProfile.github_url,
      linkedin_id: userProfile.linkedin_id,
      objective: userProfile.objective,
      workstyle: userProfile.workstyle,
      skills: githubProfile?.languages || ['React', 'JavaScript'],
      bio: githubProfile?.bio || 'Full-Stack Developer on VibeMatch!',
      github_stars: githubProfile?.total_stars || 0,
      repos: githubProfile?.public_repos || 0,
      match_score: 100,
      skill_summary: 'You — The logged-in builder',
      is_me: true,
      is_real: true,
    }
  }, [userProfile, githubProfile, myUsername])

  // Unified Synchronization Hook: SQLite DB fetch + BroadcastChannel subscriptions
  const syncRegistry = useCallback(async () => {
    let hasLoadedPeers = false
    try {
      const peersRes = await axios.get(`/api/users/peers?exclude=${encodeURIComponent(myUsername)}&limit=40`)
      if (peersRes.data?.peers) {
        setRegisteredUsers(peersRes.data.peers)
        hasLoadedPeers = true
      }
    } catch {}

    if (!hasLoadedPeers) {
      const localUsers = getLocalUsers().filter(u => u.id.replace('real_', '').toLowerCase() !== myUsername.toLowerCase())
      setRegisteredUsers(localUsers)
    }

    let hasLoadedThoughts = false
    try {
      const thoughtsRes = await axios.get('/api/thoughts')
      if (thoughtsRes.data) {
        setProjectThoughts(thoughtsRes.data)
        hasLoadedThoughts = true
      }
    } catch {}

    if (!hasLoadedThoughts) {
      setProjectThoughts(getLocalThoughts())
    }
  }, [myUsername])

  const handleSyncEvent = useCallback((type, payload) => {
    if (type === 'USER_REGISTERED') {
      setRegisteredUsers(prev => {
        if (prev.some(u => u.id === payload.id)) {
          return prev.map(u => u.id === payload.id ? payload : u)
        }
        return [payload, ...prev]
      })
    } else if (type === 'THOUGHT_POSTED') {
      setProjectThoughts(prev => {
        if (prev.some(t => t.id === payload.id)) {
          return prev.map(t => t.id === payload.id ? payload : t)
        }
        return [payload, ...prev]
      })
    } else if (type === 'THOUGHT_DELETED') {
      setProjectThoughts(prev => prev.filter(t => t.id !== payload.thoughtId))
      setVibedProjects(prev => {
        const updated = prev.filter(t => t.id !== payload.thoughtId)
        saveVibes(updated)
        return updated
      })
    } else if (type === 'THOUGHT_VIBED') {
      setProjectThoughts(prev => prev.map(t => t.id === payload.thoughtId ? { ...t, stars: payload.stars } : t))
      setVibedProjects(prev => {
        const updated = prev.map(t => t.id === payload.thoughtId ? { ...t, stars: payload.stars } : t)
        saveVibes(updated)
        return updated
      })
    } else if (type === 'MESSAGE_RECEIVED') {
      setMessages(prev => {
        if (prev.some(m => m.id === payload.id)) return prev
        return [...prev, payload]
      })
    }
  }, [])

  const connectWebSocket = useCallback(() => {
    if (!myUsername) return
    if (wsRef.current) return
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsHost = host.includes('5173') ? 'localhost:8000' : host
    const wsUrl = `${protocol}//${wsHost}/api/ws/${myUsername}`
    
    console.log(`Connecting to WebSocket: ${wsUrl}`)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    
    ws.onopen = () => {
      console.log('WebSocket Connected!')
      setIsConnected(true)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
    
    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data)
        console.log('WS Msg received:', type, payload)
        
        const channel = new BroadcastChannel('vibematch_broadcast')
        channel.postMessage({ type, payload })
        channel.close()
        
        handleSyncEvent(type, payload)
      } catch (err) {
        console.error('Error handling WebSocket message:', err)
      }
    }
    
    ws.onclose = (event) => {
      console.log('WebSocket Closed:', event)
      setIsConnected(false)
      wsRef.current = null
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket()
      }, 3000)
    }
    
    ws.onerror = (err) => {
      console.error('WebSocket Error:', err)
      ws.close()
    }
  }, [myUsername, handleSyncEvent])

  useEffect(() => {
    if (myUsername) {
      connectWebSocket()
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [myUsername, connectWebSocket])

  useEffect(() => {
    if (!myUsername || !activeConversation) return
    
    const loadHistory = async () => {
      let loadedHistory = false
      try {
        let url = '/api/messages?'
        if (activeConversation.type === 'project') {
          url += `project_id=${encodeURIComponent(activeConversation.project.id)}`
        } else if (activeConversation.type === 'dm') {
          url += `sender=${encodeURIComponent(myUsername)}&recipient=${encodeURIComponent(activeConversation.peer.id.replace('real_', ''))}`
        }
        
        const res = await axios.get(url)
        if (res.data) {
          setMessages(prev => {
            const incoming = res.data
            const existingIds = new Set()
            const merged = []
            prev.forEach(m => {
              existingIds.add(m.id)
              merged.push(m)
            })
            incoming.forEach(m => {
              if (!existingIds.has(m.id)) {
                merged.push(m)
              }
            })
            merged.sort((a, b) => a.timestamp - b.timestamp)
            return merged
          })
          loadedHistory = true
        }
      } catch (err) {
        console.error('Failed to load message history from backend:', err)
      }

      if (!loadedHistory) {
        const allLocal = getLocalMessages()
        let filtered = []
        if (activeConversation.type === 'project') {
          filtered = allLocal.filter(m => m.project_id === activeConversation.project.id)
        } else if (activeConversation.type === 'dm') {
          const peerUser = activeConversation.peer.id.replace('real_', '').toLowerCase()
          filtered = allLocal.filter(m => 
            !m.project_id && (
              (m.sender_id.toLowerCase() === myUsername.toLowerCase() && m.recipient_id?.toLowerCase() === peerUser) ||
              (m.sender_id.toLowerCase() === peerUser && m.recipient_id?.toLowerCase() === myUsername.toLowerCase())
            )
          )
        }
        
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const merged = [...prev]
          filtered.forEach(m => {
            if (!existingIds.has(m.id)) {
              merged.push(m)
            }
          })
          merged.sort((a, b) => a.timestamp - b.timestamp)
          return merged
        })
      }
    }
    
    loadHistory()
  }, [myUsername, activeConversation])

  useEffect(() => {
    if (!myUsername) return
    
    const syncShowcase = async () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return
      
      try {
        const peersRes = await axios.get(`/api/users/peers?exclude=${encodeURIComponent(myUsername)}&limit=40`)
        if (peersRes.data?.peers) {
          setRegisteredUsers(peersRes.data.peers)
        }
      } catch {}
      
      try {
        const thoughtsRes = await axios.get('/api/thoughts')
        if (thoughtsRes.data) {
          setProjectThoughts(thoughtsRes.data)
        }
      } catch {}
    }
    
    const syncActiveChat = async () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return
      if (!activeConversation) return
      
      try {
        let url = '/api/messages?'
        if (activeConversation.type === 'project') {
          url += `project_id=${encodeURIComponent(activeConversation.project.id)}`
        } else if (activeConversation.type === 'dm') {
          url += `sender=${encodeURIComponent(myUsername)}&recipient=${encodeURIComponent(activeConversation.peer.id.replace('real_', ''))}`
        }
        
        const res = await axios.get(url)
        if (res.data) {
          setMessages(prev => {
            const incoming = res.data
            const existingIds = new Set(prev.map(m => m.id))
            const newMsgs = incoming.filter(m => !existingIds.has(m.id))
            if (newMsgs.length > 0) {
              return [...prev, ...newMsgs]
            }
            return prev
          })
        }
      } catch {}
    }

    const showcaseInterval = setInterval(syncShowcase, 5000)
    const chatInterval = setInterval(syncActiveChat, 3000)
    
    if (activeConversation) {
      syncActiveChat()
    }
    
    return () => {
      clearInterval(showcaseInterval)
      clearInterval(chatInterval)
    }
  }, [myUsername, activeConversation, isConnected])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || !myUsername || !activeConversation) return
    
    const messageId = `msg_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
    const payload = {
      id: messageId,
      sender_id: myUsername,
      message_text: text,
      timestamp: Date.now() / 1000,
    }
    
    if (activeConversation.type === 'project') {
      payload.project_id = activeConversation.project.id
    } else if (activeConversation.type === 'dm') {
      payload.recipient_id = activeConversation.peer.id.replace('real_', '')
    }
    
    // Save to local cache fallback immediately
    saveLocalMessage(payload)

    // Insert locally immediately for zero-latency UI
    setMessages(prev => {
      if (prev.some(m => m.id === payload.id)) return prev
      return [...prev, payload]
    })

    try {
      const channel = new BroadcastChannel('vibematch_broadcast')
      channel.postMessage({ type: 'MESSAGE_RECEIVED', payload })
      channel.close()
    } catch {}

    try {
      await axios.post('/api/messages', payload)
    } catch (err) {
      console.error('Failed to send message to backend:', err)
    }
  }, [myUsername, activeConversation])

  useEffect(() => {
    const session = readSession()
    if (session?.userProfile) {
      setUserProfile(session.userProfile)
      setGithubProfile(session.githubProfile ?? null)
      setIsReturning(true)
      setView('dashboard')
    } else {
      setView('onboarding')
    }
  }, [])

  // Setup broadcast synchronization across tabs
  useEffect(() => {
    if (userProfile) {
      syncRegistry()
    }

    const channel = new BroadcastChannel('vibematch_broadcast')
    channel.onmessage = (event) => {
      const { type, payload } = event.data
      handleSyncEvent(type, payload)
    }

    return () => {
      channel.close()
    }
  }, [userProfile, syncRegistry, handleSyncEvent])

  // Onboarding registration handler
  const handleOnboardingComplete = async (profile, matches, ghProfile) => {
    setUserProfile(profile)
    setGithubProfile(ghProfile ?? null)
    setIsReturning(false)
    setView('dashboard')

    const userObj = {
      id: `real_${extractGithubUsername(profile.github_url)}`,
      name: ghProfile?.name || extractGithubUsername(profile.github_url),
      avatar: ghProfile?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${extractGithubUsername(profile.github_url)}`,
      github_url: profile.github_url,
      linkedin_id: profile.linkedin_id,
      objective: profile.objective,
      workstyle: profile.workstyle,
      skills: ghProfile?.languages || ['React', 'JavaScript'],
      bio: ghProfile?.bio || 'Full-Stack Developer on VibeMatch!',
      github_stars: ghProfile?.total_stars || 0,
      repos: ghProfile?.public_repos || 0,
      match_score: 100,
      skill_summary: 'You — The logged-in builder',
      is_me: true,
      is_real: true,
    }

    // Save user profile to local storage cache for fallbacks
    saveLocalUser(userObj)

    // Post to db and broadcast
    try {
      const channel = new BroadcastChannel('vibematch_broadcast')
      channel.postMessage({ type: 'USER_REGISTERED', payload: userObj })
      channel.close()
    } catch {}

    syncRegistry()
  }

  // Peer simulation handler
  const handleSimulateRegistration = async () => {
    setIsSimulating(true)
    const existingUsernames = new Set(registeredUsers.map(p => p.id.replace('real_', '')))
    let template = SIMULATED_PEER_TEMPLATES.find(t => !existingUsernames.has(t.username))

    if (!template) {
      const base = SIMULATED_PEER_TEMPLATES[Math.floor(Math.random() * SIMULATED_PEER_TEMPLATES.length)]
      const rand = Math.floor(Math.random() * 1000)
      template = {
        ...base,
        username: `${base.username}-${rand}`,
        name: `${base.name} #${rand}`,
        linkedin_id: `${base.linkedin_id}-${rand}`,
      }
    }

    const peerObj = {
      id: `real_${template.username}`,
      name: template.name,
      avatar: template.avatar,
      github_url: `https://github.com/${template.username}`,
      linkedin_id: template.linkedin_id,
      objective: template.objective,
      workstyle: template.workstyle,
      skills: template.languages,
      bio: template.bio,
      github_stars: template.total_stars,
      repos: template.public_repos,
      match_score: 90,
      skill_summary: `AI Match: Versatile engineer skilled in ${template.languages.slice(0, 3).join(', ')}`,
      is_real: true,
    }

    const payload = {
      github_url: peerObj.github_url,
      linkedin_id: peerObj.linkedin_id,
      objective: peerObj.objective,
      workstyle: peerObj.workstyle,
      github_data: {
        username: template.username,
        name: template.name,
        avatar: template.avatar,
        bio: template.bio,
        public_repos: template.public_repos,
        followers: Math.floor(Math.random() * 100) + 12,
        html_url: peerObj.github_url,
        languages: template.languages,
        total_stars: template.total_stars,
      }
    }

    saveLocalUser(peerObj)

    try {
      await axios.post('/api/onboard', payload)
      // Broadcast registration
      const channel = new BroadcastChannel('vibematch_broadcast')
      channel.postMessage({ type: 'USER_REGISTERED', payload: peerObj })
      channel.close()

      setRegisteredUsers(prev => {
        if (prev.some(u => u.id === peerObj.id)) return prev
        return [peerObj, ...prev]
      })
    } catch (err) {
      console.error('Simulation post failed:', err)
      // Fallback
      setRegisteredUsers(prev => [peerObj, ...prev])
    } finally {
      setIsSimulating(false)
    }
  }

  // Publish thought from the feed
  const handlePublishThought = async (newThought) => {
    // Save thought to local storage fallback cache
    saveLocalThought(newThought)

    try {
      await axios.post('/api/thoughts', newThought)
      const channel = new BroadcastChannel('vibematch_broadcast')
      channel.postMessage({ type: 'THOUGHT_POSTED', payload: newThought })
      channel.close()

      setProjectThoughts(prev => {
        if (prev.some(t => t.id === newThought.id)) {
          return prev.map(t => t.id === newThought.id ? newThought : t)
        }
        return [newThought, ...prev]
      })
    } catch (err) {
      console.error('Publish thought failed:', err)
      // Fallback
      setProjectThoughts(prev => {
        if (prev.some(t => t.id === newThought.id)) {
          return prev.map(t => t.id === newThought.id ? newThought : t)
        }
        return [newThought, ...prev]
      })
    }
  }

  // Handle direct creation from the showroom card
  const handleCreateFromShowroom = async () => {
    if (!showroomForm.title.trim()) return alert('Title is required')
    if (showroomForm.discussion.trim().length < 30) return alert('Discussion needs to be at least 30 characters')
    if (!showroomForm.github_url.trim().match(/github\.com\//)) return alert('Must be a valid GitHub URL')
    if (showroomForm.languages.length === 0) return alert('Please enter at least one stack tool/language')

    setIsPublishingFromShowroom(true)
    const authorName = githubProfile?.name || userProfile?.github_url?.split('/').pop() || 'developer'
    const authorHandle = `@${myUsername || 'you'}`

    const newThought = {
      id: `thought_${Date.now()}`,
      title: showroomForm.title.trim(),
      author: myUsername || 'you',
      handle: authorHandle,
      avatar: githubProfile?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${authorName}`,
      discussion: showroomForm.discussion.trim(),
      github_url: showroomForm.github_url.trim(),
      languages: showroomForm.languages,
      phase: 'building',
      stars: 0,
      tags: showroomForm.tags,
      created_at: new Date().toISOString(),
      images: showroomForm.images || [],
      cover_image: showroomForm.cover_image || '',
    }

    try {
      await handlePublishThought(newThought)
      setShowroomForm({
        title: '',
        discussion: '',
        github_url: '',
        languagesInput: '',
        languages: [],
        tagsInput: '',
        tags: [],
        images: [],
        cover_image: '',
      })
    } finally {
      setIsPublishingFromShowroom(false)
    }
  }

  // Delete a project thought
  const handleDeleteThought = async (thoughtId) => {
    // Permanent deletion in local cache fallback
    deleteLocalThought(thoughtId)

    try {
      await axios.delete(`/api/thoughts/${thoughtId}?username=${encodeURIComponent(myUsername)}`)
      const channel = new BroadcastChannel('vibematch_broadcast')
      channel.postMessage({ type: 'THOUGHT_DELETED', payload: { thoughtId } })
      channel.close()

      setProjectThoughts(prev => prev.filter(t => t.id !== thoughtId))
      setVibedProjects(prev => {
        const updated = prev.filter(p => p.id !== thoughtId)
        saveVibes(updated)
        return updated
      })
    } catch (err) {
      console.error('Delete thought failed:', err)
      // Fallback
      setProjectThoughts(prev => prev.filter(t => t.id !== thoughtId))
      setVibedProjects(prev => {
        const updated = prev.filter(p => p.id !== thoughtId)
        saveVibes(updated)
        return updated
      })
    }
  }

  // Toggle upvote/vibe logic
  const handleVibe = async (project) => {
    let newStars = (project.stars ?? 0) + 1
    const alreadyVibed = vibedProjects.some(p => p.id === project.id)
    if (alreadyVibed) {
      newStars = Math.max(0, (project.stars ?? 0) - 1)
    }

    // Save/update to local cache fallback immediately
    saveLocalThought({ ...project, stars: newStars })

    try {
      const res = await axios.get(`/api/vibe?project_id=${project.id}&username=${encodeURIComponent(myUsername)}`)
      if (res.data?.stars !== undefined) {
        newStars = res.data.stars
        saveLocalThought({ ...project, stars: newStars })
      }
    } catch {}

    setVibedProjects(prev => {
      const updated = alreadyVibed
        ? prev.filter(p => p.id !== project.id)
        : [project, ...prev]
      saveVibes(updated)
      return updated
    })

    try {
      const channel = new BroadcastChannel('vibematch_broadcast')
      channel.postMessage({
        type: 'THOUGHT_VIBED',
        payload: { thoughtId: project.id, stars: newStars }
      })
      channel.close()
    } catch {}

    setProjectThoughts(prev => {
      return prev.map(t => {
        if (t.id === project.id) {
          return { ...t, stars: newStars }
        }
        return t
      })
    })
  }

  const handleUnvibe = (projectId) => {
    const proj = projectThoughts.find(t => t.id === projectId)
    if (proj) {
      handleVibe(proj)
    } else {
      setVibedProjects(prev => {
        const updated = prev.filter(p => p.id !== projectId)
        saveVibes(updated)
        return updated
      })
    }
  }

  // Connections
  const handleConnect = useCallback((profile) => {
    setConnections(prev => {
      if (prev.some(c => c.id === profile.id)) return prev
      const updated = [profile, ...prev]
      saveConnections(updated)
      setSidebarOpen(true)
      return updated
    })
  }, [])

  const handleDisconnect = useCallback((peerId) => {
    setConnections(prev => {
      const updated = prev.filter(c => c.id !== peerId)
      saveConnections(updated)
      return updated
    })
  }, [])

  const handleOpenMessage = useCallback((profile) => {
    setActiveConversation({ type: 'dm', peer: profile })
  }, [])

  const handleOpenProjectChat = useCallback((project) => {
    setActiveConversation({ type: 'project', project })
  }, [])

  const handleSignOut = () => {
    clearSession()
    setUserProfile(null)
    setGithubProfile(null)
    setIsReturning(false)
    setRegisteredUsers([])
    setProjectThoughts([])
    setView('onboarding')
  }

  // Filter peers
  const filteredPeers = useMemo(() => {
    let list = [...registeredUsers]
    if (objectiveFilter !== 'all') list = list.filter(p => p.objective === objectiveFilter)
    if (workstyleFilter !== 'all') list = list.filter(p => p.workstyle === workstyleFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.skills?.some(s => s.toLowerCase().includes(q)) ||
        p.bio?.toLowerCase().includes(q)
      )
    }

    let finalPeers = []
    if (meProfile) {
      const matchesObj = objectiveFilter === 'all' || meProfile.objective === objectiveFilter
      const matchesWs = workstyleFilter === 'all' || meProfile.workstyle === workstyleFilter
      const matchesSearch = !searchQuery ||
        meProfile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meProfile.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meProfile.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))

      if (matchesObj && matchesWs && matchesSearch) {
        finalPeers.push(meProfile)
      }
    }

    list.forEach(p => {
      if (p.id !== `real_${myUsername}` && p.id !== `me_${myUsername}`) {
        finalPeers.push(p)
      }
    })

    return finalPeers.sort((a, b) => {
      if (a.is_me) return -1
      if (b.is_me) return 1
      return (b.match_score ?? 0) - (a.match_score ?? 0)
    })
  }, [registeredUsers, meProfile, objectiveFilter, workstyleFilter, searchQuery, myUsername])

  // Filter showroom thoughts (Sorted STRICTLY in descending order based on popularity vibes stars)
  const filteredProjectsShowroom = useMemo(() => {
    let list = [...projectThoughts]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        (p.title || p.name || '').toLowerCase().includes(q) ||
        (p.discussion || p.description || '').toLowerCase().includes(q) ||
        (p.languages && p.languages.some(l => l.toLowerCase().includes(q))) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      )
    }
    // Strict popularity sorting descending
    return list.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
  }, [projectThoughts, searchQuery])

  const vibedIdSet = useMemo(() => new Set(vibedProjects.map(p => p.id)), [vibedProjects])
  const connectedIdSet = useMemo(() => new Set(connections.map(c => c.id)), [connections])

  const syncValue = useMemo(() => ({
    registeredUsers,
    projectThoughts,
    messages,
    activeConversation,
    setActiveConversation,
    isConnected,
    sendMessage,
    handlePublishThought,
    handleDeleteThought,
    handleVibe
  }), [registeredUsers, projectThoughts, messages, activeConversation, isConnected, sendMessage, handlePublishThought, handleDeleteThought, handleVibe])

  if (view === 'loading') {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center animate-pulse-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <p className="text-text-faint text-sm animate-pulse">Initializing Real-Time Sync...</p>
        </div>
      </div>
    )
  }

  return (
    <RealtimeSyncContext.Provider value={syncValue}>
      <>
      {view === 'onboarding' && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}

      {view === 'dashboard' && userProfile && (
        <div className="min-h-screen mesh-bg flex flex-col overflow-hidden">
          <UserHeader
            userProfile={userProfile}
            githubProfile={githubProfile}
            onSignOut={handleSignOut}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(v => !v)}
            onGoToFeed={() => setView('feed')}
          />

          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar */}
            {sidebarOpen && (
              <div className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-white/6 h-[calc(100vh-57px)] sticky top-[57px] overflow-hidden">
                <LeftSidebar
                  ref={sidebarRef}
                  vibedProjects={vibedProjects}
                  onUnvibe={handleUnvibe}
                  connections={connections}
                  onDisconnect={handleDisconnect}
                  myName={githubProfile?.name || myUsername}
                />
              </div>
            )}

            {/* Split dashboard workspace */}
            <div className="flex-1 min-w-0 overflow-auto">
              <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 pb-12">
                
                {/* Hero section */}
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6 select-none">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                      <span className="gradient-text">Your Teammate Matchmaker</span> 🚀
                    </h1>
                    <p className="text-text-muted text-xs mt-1">
                      {filteredPeers.length} active roster profiles · {filteredProjectsShowroom.length} project thoughts live
                      <span className="ml-2 text-emerald-400 font-medium text-[10px]">· Tab Broadcast Active</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Peers Network panel (Left side, narrow) */}
                  <section className="w-full lg:w-[320px] xl:w-[360px] shrink-0" aria-label="Developer Match Roster">
                    <div className="glass rounded-2xl border border-white/6 p-4 mb-4">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2 select-none">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                            <Users className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-text-primary">Developer Roster</h2>
                            <p className="text-[10px] text-text-faint">Only active registered profiles</p>
                          </div>
                        </div>

                        <button
                          onClick={handleSimulateRegistration}
                          disabled={isSimulating}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-all"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {isSimulating ? 'Simulating...' : 'Simulate Registered Profile'}
                        </button>
                      </div>

                      {/* Search & filters */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint" />
                        <input
                          type="text"
                          placeholder="Search dev stack, bio description..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary placeholder-text-faint focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all"
                        />
                      </div>

                      <div className="space-y-1.5 select-none">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] text-text-faint font-semibold uppercase mr-1">Goal:</span>
                          <button
                            onClick={() => setObjectiveFilter('all')}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] border transition-all ${
                              objectiveFilter === 'all' ? 'bg-violet-600/25 border-violet-500/50 text-violet-300' : 'bg-white/4 border-white/10 text-text-faint'
                            }`}
                          >
                            All
                          </button>
                          {OBJECTIVE_OPTIONS.map(o => (
                            <button
                              key={o.id}
                              onClick={() => setObjectiveFilter(o.id)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] border transition-all ${
                                objectiveFilter === o.id ? 'bg-violet-600/25 border-violet-500/50 text-violet-300' : 'bg-white/4 border-white/10 text-text-faint'
                              }`}
                            >
                              {o.emoji} {o.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] text-text-faint font-semibold uppercase mr-1">Style:</span>
                          <button
                            onClick={() => setWorkstyleFilter('all')}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] border transition-all ${
                              workstyleFilter === 'all' ? 'bg-violet-600/25 border-violet-500/50 text-violet-300' : 'bg-white/4 border-white/10 text-text-faint'
                            }`}
                          >
                            All
                          </button>
                          {WORKSTYLE_OPTIONS.map(w => (
                            <button
                              key={w.id}
                              onClick={() => setWorkstyleFilter(w.id)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] border transition-all ${
                                workstyleFilter === w.id ? 'bg-violet-600/25 border-violet-500/50 text-violet-300' : 'bg-white/4 border-white/10 text-text-faint'
                              }`}
                            >
                              {w.emoji} {w.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {filteredPeers.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {filteredPeers.map((profile, i) => (
                          <PeerCard
                            key={profile.id}
                            profile={profile}
                            index={i}
                            isConnected={connectedIdSet.has(profile.id)}
                            onConnect={handleConnect}
                            onOpenMessage={handleOpenMessage}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-surface/20 border border-white/5 rounded-2xl">
                        <span className="text-2xl">🔍</span>
                        <p className="text-text-muted text-xs mt-1">No registered roster peers match your filter selection.</p>
                      </div>
                    )}
                  </section>

                  {/* Showroom Projects Panel (Right side, wide, grid of 2 columns) */}
                  <section className="flex-1 min-w-0" aria-label="Project Showroom">
                    <div className="glass rounded-2xl border border-white/6 p-4 mb-4 select-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <Code2 className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-text-primary">Project Showroom</h2>
                            <p className="text-[10px] text-text-faint">Real-time upvotes ranking</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-cyan-400 bg-cyan-500/15 px-2 py-1 rounded-lg border border-cyan-500/20">
                          {filteredProjectsShowroom.length} ideas
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-5">
                      {filteredProjectsShowroom.map((project, i) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          index={i}
                          isVibed={vibedIdSet.has(project.id)}
                          onVibe={handleVibe}
                          onDelete={handleDeleteThought}
                          currentUsername={myUsername}
                          onOpenMessage={handleOpenMessage}
                          onOpenProjectChat={handleOpenProjectChat}
                          registeredUsers={registeredUsers}
                        />
                      ))}

                      {/* Direct Create Card in Showroom */}
                      <article className="rounded-2xl border border-white/6 p-5 flex flex-col justify-between bg-surface-strong/95 backdrop-blur-xl relative">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 select-none">
                              <Plus className="w-4 h-4 text-violet-400" />
                              Create
                            </h3>
                            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-white/8 bg-white/4 text-[10px] font-bold text-text-faint select-none">
                              <TrendingUp className="w-3 h-3" />
                              <span>Vibes: 3</span>
                            </div>
                          </div>

                          {/* Form inputs */}
                          <div className="space-y-3 mb-4">
                            <input
                              type="text"
                              placeholder="Project Title *"
                              value={showroomForm.title}
                              onChange={e => setShowroomForm(f => ({ ...f, title: e.target.value }))}
                              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-violet-500/50"
                            />
                            
                            <textarea
                              placeholder="What conceptual insight or technical hurdle are you hacking through? *"
                              value={showroomForm.discussion}
                              onChange={e => setShowroomForm(f => ({ ...f, discussion: e.target.value }))}
                              rows={2}
                              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary resize-none focus:outline-none focus:border-violet-500/50"
                            />

                            <div className="flex flex-col gap-3">
                              <input
                                type="text"
                                placeholder="Tech (comma sep) *"
                                value={showroomForm.languagesInput}
                                onChange={e => {
                                  const val = e.target.value
                                  setShowroomForm(f => ({
                                    ...f,
                                    languagesInput: val,
                                    languages: val.split(',').map(l => l.trim()).filter(Boolean)
                                  }))
                                }}
                                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-violet-500/50"
                              />
                              <input
                                type="url"
                                placeholder="GitHub URL *"
                                value={showroomForm.github_url}
                                onChange={e => setShowroomForm(f => ({ ...f, github_url: e.target.value }))}
                                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-violet-500/50"
                              />
                            </div>
                          </div>

                          {/* Image upload gallery */}
                          <div className="p-3.5 rounded-xl bg-surface border border-border">
                            <p className="text-[10px] text-text-muted font-bold mb-2 select-none">Image upload gallery</p>
                            
                            <div className="flex items-center justify-center w-full mb-2.5">
                              <label className="flex flex-col items-center justify-center w-full h-14 border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-violet-500/50 bg-surface/50 hover:bg-violet-500/5 transition-all">
                                <div className="flex flex-col items-center justify-center">
                                  <Plus className="w-4 h-4 text-text-faint mb-0.5" />
                                  <p className="text-[8px] text-text-muted">Upload project screenshots</p>
                                </div>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    const promises = files.map(file => {
                                      return new Promise((resolve) => {
                                        const reader = new FileReader();
                                        reader.onload = (event) => resolve(event.target.result);
                                        reader.readAsDataURL(file);
                                      });
                                    });
                                    Promise.all(promises).then(uploadedImages => {
                                      setShowroomForm(f => {
                                        const newImages = [...(f.images || []), ...uploadedImages];
                                        const newCover = f.cover_image || newImages[0] || '';
                                        return { ...f, images: newImages, cover_image: newCover };
                                      });
                                    });
                                  }}
                                />
                              </label>
                            </div>

                            {showroomForm.images && showroomForm.images.length > 0 && (
                              <div>
                                <div className="grid grid-cols-4 gap-1.5 mb-2">
                                  {showroomForm.images.map((img, idx) => {
                                    const isCover = showroomForm.cover_image === img;
                                    return (
                                      <div
                                        key={idx}
                                        onClick={() => setShowroomForm(f => ({ ...f, cover_image: img }))}
                                        className={`relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:border-violet-500 transition-all ${
                                          isCover ? 'border-violet-500 ring-2 ring-violet-500/25' : 'border-white/10'
                                        }`}
                                      >
                                        <img src={img} className="w-full h-full object-cover" alt={`thumbnail-${idx}`} />
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] text-text-faint mt-1.5 select-none">
                                  <input type="radio" checked={!!showroomForm.cover_image} readOnly className="accent-violet-500" />
                                  <span>Select picture</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/4">
                          <button
                            onClick={handleCreateFromShowroom}
                            disabled={isPublishingFromShowroom}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600 disabled:opacity-50 transition-all shadow-md"
                          >
                            {isPublishingFromShowroom ? 'Publishing...' : 'Create'}
                          </button>
                        </div>
                      </article>
                    </div>
                  </section>

                  {/* Right Sidebar Panel: Collaborator Communications */}
                  <section className="w-full lg:w-[320px] xl:w-[360px] shrink-0" aria-label="Collaborator Communications">
                    <CollaboratorChat
                      activeConversation={activeConversation}
                      setActiveConversation={setActiveConversation}
                      messages={messages}
                      sendMessage={sendMessage}
                      myUsername={myUsername}
                      registeredUsers={registeredUsers}
                      connections={connections}
                    />
                  </section>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'feed' && userProfile && (
        <ProjectFeedView
          userProfile={userProfile}
          githubProfile={githubProfile}
          thoughts={projectThoughts}
          onPublish={handlePublishThought}
          onVibe={handleVibe}
          onDelete={handleDeleteThought}
          currentUsername={myUsername}
          vibedIds={vibedIdSet}
          onBack={() => setView('dashboard')}
        />
      )}
      </>
    </RealtimeSyncContext.Provider>
  )
}


// ── COLLABORATOR COMMUNICATIONS CHAT PANEL ──
function CollaboratorChat({
  activeConversation,
  setActiveConversation,
  messages,
  sendMessage,
  myUsername,
  registeredUsers,
  connections
}) {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputText.trim()) return
    sendMessage(inputText)
    setInputText('')
  }

  const filteredMessages = useMemo(() => {
    if (!activeConversation) return []
    if (activeConversation.type === 'project') {
      return messages.filter(m => m.project_id === activeConversation.project.id)
    }
    if (activeConversation.type === 'dm') {
      const peerUsername = activeConversation.peer.id.replace('real_', '').toLowerCase()
      return messages.filter(m => 
        !m.project_id && (
          (m.sender_id.toLowerCase() === myUsername.toLowerCase() && m.recipient_id?.toLowerCase() === peerUsername) ||
          (m.sender_id.toLowerCase() === peerUsername && m.recipient_id?.toLowerCase() === myUsername.toLowerCase())
        )
      )
    }
    return []
  }, [messages, activeConversation, myUsername])

  const activeChatsList = useMemo(() => {
    const list = []
    connections.forEach(conn => {
      list.push(conn)
    })
    messages.forEach(msg => {
      if (msg.project_id) return
      const otherUser = msg.sender_id.toLowerCase() === myUsername.toLowerCase() ? msg.recipient_id : msg.sender_id
      if (otherUser && otherUser.toLowerCase() !== myUsername.toLowerCase()) {
        const peer = registeredUsers.find(u => u.id.replace('real_', '').toLowerCase() === otherUser.toLowerCase()) || {
          id: `real_${otherUser}`,
          name: otherUser,
          avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${otherUser}`,
          is_real: true
        }
        if (!list.some(item => item.id.replace('real_', '').toLowerCase() === otherUser.toLowerCase())) {
          list.push(peer)
        }
      }
    })
    return list
  }, [connections, messages, myUsername, registeredUsers])

  if (!activeConversation) {
    return (
      <div className="glass rounded-2xl border border-white/6 p-4 flex flex-col h-[500px] lg:h-[calc(100vh-170px)] select-none">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Collaborator Chat</h2>
            <p className="text-[10px] text-text-faint">Communications Mesh Active</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-surface/20 border border-white/5 rounded-2xl mb-4">
          <MessageSquare className="w-8 h-8 text-text-faint mb-2 animate-bounce" />
          <h4 className="text-xs font-bold text-text-primary mb-1">Start a Conversation</h4>
          <p className="text-[10px] text-text-muted max-w-[200px] leading-relaxed">
            Select "Message" on a developer roster card or click "Discuss Project" in the showroom.
          </p>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-text-faint uppercase tracking-wider mb-2">Recent Chats & Connections</h3>
          {activeChatsList.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {activeChatsList.map(peer => (
                <button
                  key={peer.id}
                  onClick={() => setActiveConversation({ type: 'dm', peer })}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-white/4 hover:bg-violet-500/10 border border-white/5 hover:border-violet-500/30 text-left transition-all group"
                >
                  <img
                    src={peer.avatar}
                    className="w-7 h-7 rounded-lg object-cover"
                    alt={peer.name}
                    onError={e => { e.target.src = `https://api.dicebear.com/8.x/initials/svg?seed=${peer.name}` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text-primary group-hover:text-violet-300 truncate transition-colors">{peer.name}</p>
                    <p className="text-[9px] text-text-faint truncate">@{peer.id.replace('real_', '')}</p>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:animate-ping" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-text-faint italic">No active conversations yet.</p>
          )}
        </div>
      </div>
    )
  }

  const isProject = activeConversation.type === 'project'
  const title = isProject ? activeConversation.project.title : activeConversation.peer.name
  const subtitle = isProject ? 'Project Public Stream' : `@${activeConversation.peer.id.replace('real_', '')}`
  const avatar = isProject
    ? (activeConversation.project.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${activeConversation.project.author}`)
    : activeConversation.peer.avatar

  return (
    <div className="glass rounded-2xl border border-white/6 p-4 flex flex-col h-[500px] lg:h-[calc(100vh-170px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={avatar}
            className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
            alt={title}
            onError={e => { e.target.src = `https://api.dicebear.com/8.x/initials/svg?seed=${title}` }}
          />
          <div className="min-w-0">
            <h3 className="text-xs font-black text-text-primary truncate">{title}</h3>
            <p className="text-[9px] text-text-faint truncate">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setActiveConversation(null)}
          className="px-2.5 py-1 text-[10px] font-bold bg-white/5 border border-white/10 text-text-muted hover:text-white rounded-lg transition-all"
        >
          Back
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3 scrollbar-thin">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((msg, idx) => {
            const isMe = msg.sender_id.toLowerCase() === myUsername.toLowerCase()
            return (
              <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {(!isMe || isProject) && (
                  <span className="text-[8px] text-text-faint font-semibold mb-0.5 ml-1">
                    @{msg.sender_id}
                  </span>
                )}
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                    isMe
                      ? 'bg-violet-600/80 border border-violet-500/35 text-white rounded-tr-none'
                      : 'bg-white/6 border border-white/8 text-text-primary rounded-tl-none'
                  }`}
                >
                  {msg.message_text}
                </div>
                <span className="text-[8px] text-text-faint mt-0.5 px-1">
                  {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 text-text-faint">
            <MessageSquare className="w-6 h-6 text-text-faint mb-1 opacity-40" />
            <p className="text-[10px] italic">No messages in this chat stream yet.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-white/6 shrink-0">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSend()
          }}
          className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-violet-500/50"
        />
        <button
          onClick={handleSend}
          className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all shadow-md shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

