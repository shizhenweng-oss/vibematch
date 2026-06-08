const SESSION_KEY = 'vibematch_session'

/**
 * Read the stored session from localStorage.
 * Returns null if no session exists or if data is malformed.
 */
export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Save a user session to localStorage.
 * @param {object} session - { userProfile, githubProfile }
 */
export function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...session,
      savedAt: new Date().toISOString(),
    }))
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
}

/**
 * Clear the current session (sign out).
 */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore
  }
}
