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
