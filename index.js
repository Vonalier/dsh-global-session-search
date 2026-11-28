/**
 * Global session search for DeepSeek Harness.
 *
 * Searches every persisted DSH session file under the profile's sessions
 * directory and exposes the same result set through:
 * - the global_session_search Host tool
 * - GET /global-session-search/search for the sidebar page
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import os from 'node:os'

export const name = 'global-session-search'
export const inject = ['tools', 'connection']

const OUTPUT = {
  schema: { type: 'string' },
  render: (_args, value) => [{ type: 'text', text: value }],
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ defaultLimit?: number, sessionsRoot?: string } | undefined} config
 */
export function apply(ctx, config) {
  const defaultLimit = Number.isInteger(config?.defaultLimit) && config.defaultLimit > 0
    ? config.defaultLimit
    : 30

  ctx.tools.register({
    name: 'global_session_search',
    description: 'Search every persisted DSH conversation across all workspaces and all records, including user, assistant, system, and tool entries. Returns matching records with session ids, titles, working directories, timestamps, and snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Literal text to find. Case-insensitive; Chinese and punctuation are preserved.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: defaultLimit,
          description: 'Maximum number of matching records to return. Defaults to 30.',
        },
        session_id: {
          type: 'string',
          description: 'Optional session id. When set, searches all records in that one session instead of scanning every session.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 120000,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        return searchAll(resolveSessionsRoot(config), String(args.query ?? ''), {
          limit: Math.min(Math.max(Number(args.limit) || defaultLimit, 1), 100),
          sessionId: args.session_id ? String(args.session_id) : undefined,
        })
      } catch (error) {
        return `全局会话搜索失败：${error instanceof Error ? error.message : String(error)}`
      }
    },
  })

  // The browser page needs an authenticated HTTP endpoint; it cannot read
  // disk or call tools. Registering through Connection's exact Fetch route
  // keeps the request behind the same Host/Origin and browser/API admission
  // checks as every other /api request.
  ctx.connection.fetch.register({
    path: '/api/global-session-search/search',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        const url = new URL(request.url, 'http://localhost')
        const query = String(url.searchParams.get('q') || '').trim()
        if (!query) {
          return jsonResponse(400, { error: 'q is required' })
        }
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || defaultLimit, 1), 100)
        const sessionId = url.searchParams.get('session_id') || undefined
        return jsonResponse(200, searchRecords(resolveSessionsRoot(config), query, { limit, sessionId }))
      } catch (error) {
        return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function resolveSessionsRoot(config = {}) {
  const candidates = []
  if (config.sessionsRoot) candidates.push(path.resolve(config.sessionsRoot))
  if (process.env.DSH_SESSIONS_DIR) candidates.push(path.resolve(process.env.DSH_SESSIONS_DIR))
  if (process.env.DSH_PROFILE_DIR) {
    const dshHome = path.dirname(path.dirname(process.env.DSH_PROFILE_DIR))
    candidates.push(path.join(dshHome, 'sessions'))
  }
  if (process.env.DSH_HOME) candidates.push(path.join(process.env.DSH_HOME, 'sessions'))
  candidates.push(path.join(os.homedir(), '.dsh', 'sessions'))
  candidates.push(path.join(path.dirname(process.cwd()), '.dsh', 'sessions'))
  candidates.push('D:\\AI\\.dsh\\sessions')
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {}
  }
  return candidates[0] || path.join(os.homedir(), '.dsh', 'sessions')
}

export function searchRecords(root, keyword, options = {}) {
  const query = String(keyword ?? '').trim()
  if (!query) return { query: '', limit: 0, scanned: 0, total: 0, hits: [] }
  const limit = Math.min(Math.max(Number(options.limit) || 30, 1), 100)
  const lower = query.toLowerCase()
  const onlySession = options.sessionId ? String(options.sessionId) : undefined
  const files = walk(root)
    .map(file => ({ file, mtime: statMtime(file) }))
    .sort((a, b) => b.mtime - a.mtime)

  const hits = []
  let scanned = 0
  for (const { file } of files) {
    const { meta, records, title } = readSession(file)
    const id = String(meta.id || path.basename(path.dirname(file)))
    if (onlySession && id !== onlySession) continue
    scanned += 1
    for (const rec of records) {
      if (rec.type === 'session') continue
      const text = textOf(rec)
      if (!text) continue
      const at = text.toLowerCase().indexOf(lower)
      if (at < 0) continue
      hits.push({
        sessionId: id,
        title: title || '',
        cwd: String(meta.cwd || ''),
        type: String(rec.type || 'record'),
        seq: rec.seq,
        time: rec.time,
        snippet: makeSnippet(text, at, query.length),
      })
    }
  }

  hits.sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
  return { query, limit, scanned, total: hits.length, hits: hits.slice(0, limit) }
}

export function searchAll(root, keyword, options = {}) {
  const data = searchRecords(root, keyword, options)
  if (!data.query) return '请提供要搜索的关键词。'
  if (data.total === 0) return `没有找到包含「${data.query}」的记录。`
  const lines = [
    `全局会话搜索：「${data.query}」`,
    `扫描 ${data.scanned} 个会话，共命中 ${data.total} 条记录，显示最新 ${data.hits.length} 条。`,
    '',
  ]
  let current = ''
  for (const hit of data.hits) {
    if (hit.sessionId !== current) {
      current = hit.sessionId
      lines.push(`■ 会话 ${hit.sessionId}${hit.title ? ` · ${hit.title}` : ''}${hit.cwd ? `\n  工作目录：${hit.cwd}` : ''}`)
    }
    lines.push(`  [${hit.type}${hit.seq !== undefined ? ` · seq ${hit.seq}` : ''}${hit.time ? ` · ${formatTime(hit.time)}` : ''}] ...${hit.snippet}...`)
  }
  if (data.total > data.hits.length) lines.push(`\n（结果已截断到最新 ${data.hits.length} 条；可用 session_id 继续查看某一段对话。）`)
  return lines.join('\n')
}

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    let st
    try { st = fs.statSync(p) } catch { continue }
    if (st.isDirectory()) out.push(...walk(p))
    else if (name === 'session.v4.jsonl.zstd' || name === 'session.jsonl.zstd' || name === 'session.jsonl') out.push(p)
  }
  return out
}

function statMtime(file) {
  try { return fs.statSync(file).mtimeMs } catch { return 0 }
}

function readSession(file) {
  let meta = {}
  let title = ''
  const records = []
  const frames = file.endsWith('.zstd') ? readFrames(fs.readFileSync(file)) : [fs.readFileSync(file)]
  for (const frame of frames) {
    for (const line of frame.toString('utf8').split('\n')) {
      if (!line.trim()) continue
      try {
        const rec = JSON.parse(line)
        if (rec.type === 'session') meta = rec
        else {
          records.push(rec)
          if (rec.type === 'session/title' && rec.data?.title) title = rec.data.title
        }
      } catch {
        // Ignore malformed or non-JSON lines.
      }
    }
  }
  return { meta, records, title }
}

function readFrames(buffer) {
  const starts = []
  for (let i = 0; i < buffer.length - 3; i++) {
    if (buffer[i] === 0x28 && buffer[i + 1] === 0xb5 && buffer[i + 2] === 0x2f && buffer[i + 3] === 0xfd) starts.push(i)
  }
  const frames = []
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : buffer.length
    try { frames.push(zlib.zstdDecompressSync(buffer.subarray(starts[i], end))) } catch { /* skip corrupt frame */ }
  }
  return frames
}

function textOf(value, depth = 0) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(item => textOf(item, depth + 1)).join('\n')
  if (value && typeof value === 'object' && depth < 12) {
    if (value.type === 'reasoning') return ''
    return Object.values(value).map(item => textOf(item, depth + 1)).join('\n')
  }
  return ''
}

function makeSnippet(text, at, length) {
  const start = Math.max(0, at - 100)
  const end = Math.min(text.length, at + length + 160)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`
}

function formatTime(time) {
  const n = Number(time)
  if (!Number.isFinite(n) || n <= 0) return ''
  return new Date(n).toLocaleString('zh-CN', { hour12: false })
}
