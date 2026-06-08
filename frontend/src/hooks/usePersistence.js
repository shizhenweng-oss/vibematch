// ── Vibed Projects — localStorage persistence ──────────────────────────────
const VIBES_KEY = 'vibematch_vibes'

export function loadVibes() {
  try {
    return JSON.parse(localStorage.getItem(VIBES_KEY) || '[]')
  } catch { return [] }
}

export function saveVibes(vibesList) {
  try {
    localStorage.setItem(VIBES_KEY, JSON.stringify(vibesList))
  } catch {}
}

// ── Connections — localStorage persistence ──────────────────────────────────
const CONNECTIONS_KEY = 'vibematch_connections'

export function loadConnections() {
  try {
    return JSON.parse(localStorage.getItem(CONNECTIONS_KEY) || '[]')
  } catch { return [] }
}

export function saveConnections(list) {
  try {
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(list))
  } catch {}
}

// ── Messages — localStorage persistence ────────────────────────────────────
// Keyed by peerId: vibematch_msgs_{peerId}
const MSG_PREFIX = 'vibematch_msgs_'

export function loadMessages(peerId) {
  try {
    return JSON.parse(localStorage.getItem(`${MSG_PREFIX}${peerId}`) || '[]')
  } catch { return [] }
}

export function saveMessages(peerId, messages) {
  try {
    localStorage.setItem(`${MSG_PREFIX}${peerId}`, JSON.stringify(messages))
  } catch {}
}


// ── Local User Cache ────────────────────────────────────────────────────────
const LOCAL_USERS_KEY = 'vibematch_local_users'

export function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]')
  } catch { return [] }
}

export function saveLocalUser(user) {
  try {
    const list = getLocalUsers()
    if (!list.some(u => u.id === user.id)) {
      list.push(user)
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list))
    }
  } catch {}
}

// ── Local Showcase Thought Cache ────────────────────────────────────────────
const LOCAL_THOUGHTS_KEY = 'vibematch_local_thoughts'

export function getLocalThoughts() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_THOUGHTS_KEY) || '[]')
  } catch { return [] }
}

export function saveLocalThought(thought) {
  try {
    const list = getLocalThoughts()
    const idx = list.findIndex(t => t.id === thought.id)
    if (idx >= 0) {
      list[idx] = thought
    } else {
      list.push(thought)
    }
    localStorage.setItem(LOCAL_THOUGHTS_KEY, JSON.stringify(list))
  } catch {}
}

export function deleteLocalThought(thoughtId) {
  try {
    const list = getLocalThoughts().filter(t => t.id !== thoughtId)
    localStorage.setItem(LOCAL_THOUGHTS_KEY, JSON.stringify(list))
  } catch {}
}

// ── Local Message Cache ─────────────────────────────────────────────────────
const LOCAL_MESSAGES_KEY = 'vibematch_local_messages'

export function getLocalMessages() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '[]')
  } catch { return [] }
}

export function saveLocalMessage(msg) {
  try {
    const list = getLocalMessages()
    if (!list.some(m => m.id === msg.id)) {
      list.push(msg)
      localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(list))
    }
  } catch {}
}

