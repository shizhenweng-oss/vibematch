import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const CACHE = new Map()

/**
 * Extract GitHub username from a URL or raw string.
 * Handles: full URLs, "github.com/user", "user"
 */
export function extractGithubUsername(input) {
  if (!input) return ''
  const trimmed = input.trim().replace(/\/$/, '')
  // Full URL: https://github.com/username or http://github.com/username
  const urlMatch = trimmed.match(/github\.com\/([^/?#\s]+)/)
  if (urlMatch) return urlMatch[1]
  // Raw username (no slashes, no dots)
  if (!trimmed.includes('/') && !trimmed.includes('.')) return trimmed
  return trimmed.split('/').pop() || trimmed
}

/**
 * Custom hook: fetch a real GitHub user profile given a URL or username.
 * Caches results in memory for the session.
 *
 * @param {string} githubUrl - Full GitHub URL or username string
 * @returns {{ profile: object|null, loading: boolean, error: string|null }}
 */
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

    // Return cached result immediately
    if (CACHE.has(username)) {
      setProfile(CACHE.get(username))
      setLoading(false)
      setError(null)
      return
    }

    // Cancel any in-flight request
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        // Try backend proxy first (avoids rate limiting), fall back to direct GitHub API
        let data
        try {
          const res = await axios.get(`/api/github/user/${username}`, {
            timeout: 5000,
            signal: controllerRef.current.signal,
          })
          data = res.data
        } catch {
          // Backend unavailable — call GitHub directly
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

          // Extract top languages from repos
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
          }
        }

        CACHE.set(username, data)
        setProfile(data)
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError') return
        setError(err.message || 'Failed to load GitHub profile')
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    // Debounce: wait 600ms after user stops typing before fetching
    const timer = setTimeout(fetchProfile, 600)
    return () => {
      clearTimeout(timer)
      controllerRef.current?.abort()
    }
  }, [githubUrl])

  return { profile, loading, error }
}
