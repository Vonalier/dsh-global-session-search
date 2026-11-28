window.__ModuleLoader__.load({
  id: 'dsh-global-session-search',
  factory(require) {
    const React = require('react')
    const { useEffect, useMemo, useRef, useState } = React
    const h = React.createElement
    const NS = 'global-session-search'

    const zh = {
      nav: '全局搜索',
      title: '全局会话搜索',
      subtitle: '搜索所有工作区、所有会话里的用户、助手、系统和工具记录',
      placeholder: '输入关键词，例如：LPDM、秋冬入场式、岗位筛选',
      search: '搜索',
      searching: '搜索中…',
      hint: '输入关键词后按回车或点搜索；搜索是只读的，不会修改任何会话。',
      empty: '从一个关键词开始，翻出散落在不同对话里的记录。',
      noResults: '没有找到匹配记录',
      results: '找到 {n} 条记录',
      sessions: '来自 {n} 个会话',
      scanned: '已扫描 {n} 个会话',
      copy: '复制会话 ID',
      copied: '已复制',
      cwd: '工作目录',
      session: '会话',
      match: '命中',
      error: '搜索失败：{message}',
      limit: '每页',
      sort: '排序',
      sortNewest: '最新在前',
      sortOldest: '最早在前',
      filterType: '记录类型',
      filterAllTypes: '全部类型',
      filterTime: '时间范围',
      timeAll: '全部时间',
      timeToday: '今天',
      time7d: '近 7 天',
      time30d: '近 30 天',
      filterSession: '会话范围',
      allSessions: '全部会话',
      showing: '显示 {shown} / 共 {total} 条',
    }

    const en = {
      nav: 'Global Search',
      title: 'Global Session Search',
      subtitle: 'Search user, assistant, system and tool records across every workspace and session',
      placeholder: 'Enter a keyword, e.g. LPDM, launch, job search',
      search: 'Search',
      searching: 'Searching…',
      hint: 'Press Enter or click Search. Search is read-only and never changes a session.',
      empty: 'Start with a keyword to find records across conversations.',
      noResults: 'No matching records',
      results: '{n} records found',
      sessions: 'across {n} sessions',
      scanned: 'scanned {n} sessions',
      copy: 'Copy session ID',
      copied: 'Copied',
      cwd: 'Working directory',
      session: 'Session',
      match: 'Match',
      error: 'Search failed: {message}',
      limit: 'Limit',
      sort: 'Sort',
      sortNewest: 'Newest first',
      sortOldest: 'Oldest first',
      filterType: 'Record type',
      filterAllTypes: 'All types',
      filterTime: 'Time range',
      timeAll: 'All time',
      timeToday: 'Today',
      time7d: 'Last 7 days',
      time30d: 'Last 30 days',
      filterSession: 'Session',
      allSessions: 'All sessions',
      showing: 'Showing {shown} of {total}',
    }

    function interp(template, vars) {
      return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''))
    }

    function escapeRegExp(value) {
      return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    const TYPE_LABELS = {
      user: '用户',
      assistant: '助手',
      system: '系统',
      tool: '工具',
      'tool-result': '工具结果',
      'tool-call': '工具调用',
    }

    function typeLabel(type) {
      return TYPE_LABELS[type] || type || '记录'
    }

    function Highlight({ text, query }) {
      if (!query) return h(React.Fragment, null, text)
      const re = new RegExp(`(${escapeRegExp(query)})`, 'ig')
      const parts = String(text).split(re)
      return h(React.Fragment, null, parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? h('mark', { key: i, className: 'gss-mark' }, part)
          : h(React.Fragment, { key: i }, part),
      ))
    }

    function Icon({ size = 16 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        'aria-hidden': true,
      },
        h('circle', { cx: 11, cy: 11, r: 7 }),
        h('path', { d: 'm20 20-4.2-4.2' }),
      )
    }

    const CSS = `
      .gss-page { box-sizing:border-box; height:100%; min-height:0; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; padding:34px 40px 64px; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); }
      .gss-inner { max-width:980px; margin:0 auto; }
      .gss-kicker { display:flex; align-items:center; gap:10px; color:var(--dsw-alias-brand-primary); font-size:13px; font-weight:600; letter-spacing:.02em; }
      .gss-title { margin:10px 0 6px; font-size:30px; line-height:1.2; letter-spacing:-.02em; }
      .gss-sub { margin:0 0 26px; color:var(--dsw-alias-label-secondary); font-size:14px; line-height:1.7; }
      .gss-searchbar { display:flex; align-items:center; gap:10px; padding:8px; border:1px solid var(--dsw-alias-border-l2); border-radius:16px; background:var(--dsw-alias-bg-layer-1); box-shadow:0 8px 28px rgba(0,0,0,.06); }
      .gss-searchicon { display:flex; padding-left:10px; color:var(--dsw-alias-label-secondary); flex:0 0 auto; }
      .gss-input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--dsw-alias-label-primary); font:inherit; font-size:15px; padding:10px 4px; }
      .gss-input::placeholder { color:var(--dsw-alias-label-secondary); }
      .gss-limit { border:1px solid var(--dsw-alias-border-l1); border-radius:10px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); padding:8px; font:inherit; font-size:12px; }
      .gss-button { border:0; border-radius:11px; background:var(--dsw-alias-brand-primary); color:#fff; padding:11px 18px; font:inherit; font-weight:600; cursor:pointer; white-space:nowrap; }
      .gss-button:disabled { opacity:.55; cursor:default; }
      .gss-hint { color:var(--dsw-alias-label-secondary); font-size:12px; margin:12px 2px 24px; }
      .gss-meta { display:flex; flex-wrap:wrap; gap:12px; align-items:center; color:var(--dsw-alias-label-secondary); font-size:13px; margin:0 0 14px; }
      .gss-meta strong { color:var(--dsw-alias-label-primary); font-size:18px; }
      .gss-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:10px 16px; margin:0 0 18px; padding:10px 12px; border:1px solid var(--dsw-alias-border-l1); border-radius:12px; background:var(--dsw-alias-bg-layer-1); }
      .gss-control { display:flex; align-items:center; gap:7px; color:var(--dsw-alias-label-secondary); font-size:12px; white-space:nowrap; }
      .gss-select { max-width:220px; border:1px solid var(--dsw-alias-border-l1); border-radius:9px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); padding:6px 8px; font:inherit; font-size:12px; }
      .gss-list { display:flex; flex-direction:column; gap:14px; }
      .gss-group { border:1px solid var(--dsw-alias-border-l1); border-radius:16px; background:var(--dsw-alias-bg-layer-1); overflow:hidden; }
      .gss-group-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:16px 18px 13px; border-bottom:1px solid var(--dsw-alias-border-l1); }
      .gss-group-title { font-size:15px; font-weight:600; line-height:1.45; }
      .gss-group-sub { margin-top:5px; color:var(--dsw-alias-label-secondary); font-size:11px; line-height:1.5; word-break:break-all; }
      .gss-copy { flex:0 0 auto; border:1px solid var(--dsw-alias-border-l1); border-radius:9px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); padding:6px 9px; font:inherit; font-size:11px; cursor:pointer; }
      .gss-hit { display:grid; grid-template-columns:96px minmax(0,1fr); gap:14px; padding:13px 18px; border-top:1px solid var(--dsw-alias-border-l1); }
      .gss-hit:first-child { border-top:0; }
      .gss-hit-meta { color:var(--dsw-alias-label-secondary); font-size:11px; line-height:1.7; word-break:break-word; }
      .gss-hit-type { display:inline-block; color:var(--dsw-alias-brand-primary); background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l1); border-radius:999px; padding:1px 7px; font-size:10px; font-weight:600; }
      .gss-hit-text { font-size:13px; line-height:1.72; color:var(--dsw-alias-label-primary); word-break:break-word; white-space:pre-wrap; }
      .gss-mark { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent); color:inherit; border-radius:3px; padding:0 2px; }
      .gss-empty { margin-top:24px; border:1px dashed var(--dsw-alias-border-l2); border-radius:16px; padding:54px 24px; text-align:center; color:var(--dsw-alias-label-secondary); background:var(--dsw-alias-bg-layer-1); }
      .gss-empty-icon { display:inline-flex; margin-bottom:12px; color:var(--dsw-alias-brand-primary); }
      .gss-error { margin-top:18px; color:var(--dsw-alias-state-error-primary); font-size:13px; }
      @media (max-width:700px){ .gss-page{padding:24px 18px 48px;} .gss-title{font-size:24px;} .gss-hit{grid-template-columns:1fr;gap:6px;} }
    `


    function Page({ t }) {
      const [query, setQuery] = useState('')
      const [limit, setLimit] = useState(30)
      const [loading, setLoading] = useState(false)
      const [data, setData] = useState(null)
      const [error, setError] = useState('')
      const [copied, setCopied] = useState('')
      const [sortMode, setSortMode] = useState('newest')
      const [typeFilter, setTypeFilter] = useState('all')
      const [timeFilter, setTimeFilter] = useState('all')
      const [sessionFilter, setSessionFilter] = useState('all')
      const inputRef = useRef(null)

      useEffect(() => {
        inputRef.current?.focus()
      }, [])

      async function search() {
        const q = query.trim()
        if (!q || loading) return
        setLoading(true)
        setError('')
        setCopied('')
        try {
          const params = new URLSearchParams({ q, limit: String(limit) })
          const response = await fetch('/api/global-session-search/search?' + params.toString(), { cache: 'no-store' })
          const body = await response.json()
          if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`)
          setData(body)
          setSortMode('newest')
          setTypeFilter('all')
          setTimeFilter('all')
          setSessionFilter('all')
        } catch (err) {
          setData(null)
          setError(interp(t('error'), { message: err instanceof Error ? err.message : String(err) }))
        } finally {
          setLoading(false)
        }
      }

      async function copySession(sessionId) {
        try {
          await navigator.clipboard.writeText(sessionId)
          setCopied(sessionId)
          setTimeout(() => setCopied(''), 1600)
        } catch { /* clipboard may be unavailable */ }
      }

      const allHits = data?.hits || []
      const typeOptions = useMemo(() => Array.from(new Set(allHits.map(hit => hit.type).filter(Boolean))).sort(), [data])
      const sessionOptions = useMemo(() => {
        const map = new Map()
        for (const hit of allHits) {
          if (!map.has(hit.sessionId)) map.set(hit.sessionId, { sessionId: hit.sessionId, title: hit.title })
        }
        return Array.from(map.values())
      }, [data])
      const filteredHits = useMemo(() => {
        const now = Date.now()
        return allHits.filter(hit => {
          if (typeFilter !== 'all' && hit.type !== typeFilter) return false
          if (sessionFilter !== 'all' && hit.sessionId !== sessionFilter) return false
          if (timeFilter !== 'all') {
            const ts = Number(hit.time)
            if (!Number.isFinite(ts)) return false
            if (timeFilter === 'today') {
              const date = new Date(ts)
              const today = new Date()
              if (date.getFullYear() !== today.getFullYear() || date.getMonth() !== today.getMonth() || date.getDate() !== today.getDate()) return false
            } else {
              const days = timeFilter === '7d' ? 7 : 30
              if (now - ts > days * 24 * 60 * 60 * 1000) return false
            }
          }
          return true
        })
      }, [data, typeFilter, timeFilter, sessionFilter])
      const groups = useMemo(() => {
        const map = new Map()
        for (const hit of filteredHits) {
          if (!map.has(hit.sessionId)) {
            map.set(hit.sessionId, { sessionId: hit.sessionId, title: hit.title, cwd: hit.cwd, hits: [] })
          }
          map.get(hit.sessionId).hits.push(hit)
        }
        const direction = sortMode === 'oldest' ? 1 : -1
        const list = Array.from(map.values())
        for (const group of list) {
          group.hits.sort((a, b) => direction * ((Number(a.time) || 0) - (Number(b.time) || 0)))
        }
        list.sort((a, b) => {
          const at = Math.max(...a.hits.map(hit => Number(hit.time) || 0))
          const bt = Math.max(...b.hits.map(hit => Number(hit.time) || 0))
          return direction * (at - bt)
        })
        return list
      }, [filteredHits, sortMode])

      return h('div', { className: 'gss-page' },
        h('style', null, CSS),
        h('div', { className: 'gss-inner' },
          h('div', { className: 'gss-kicker' }, h(Icon, { size: 15 }), t('nav')),
          h('h1', { className: 'gss-title' }, t('title')),
          h('p', { className: 'gss-sub' }, t('subtitle')),
          h('div', { className: 'gss-searchbar' },
            h('span', { className: 'gss-searchicon' }, h(Icon, { size: 18 })),
            h('input', {
              ref: inputRef,
              className: 'gss-input',
              value: query,
              placeholder: t('placeholder'),
              onChange: event => setQuery(event.target.value),
              onKeyDown: event => { if (event.key === 'Enter') search() },
              'aria-label': t('placeholder'),
            }),
            h('select', {
              className: 'gss-limit',
              value: limit,
              onChange: event => setLimit(Number(event.target.value)),
              'aria-label': t('limit'),
            }, [20, 30, 50, 100].map(n => h('option', { key: n, value: n }, `${n}`))),
            h('button', {
              className: 'gss-button',
              type: 'button',
              disabled: loading || !query.trim(),
              onClick: search,
            }, loading ? t('searching') : t('search')),
          ),
          h('p', { className: 'gss-hint' }, t('hint')),
          error ? h('p', { className: 'gss-error' }, error) : null,
          data ? h('div', { className: 'gss-meta' },
            h('strong', null, interp(t('showing'), { shown: filteredHits.length, total: data.total })),
            h('span', null, interp(t('sessions'), { n: groups.length })),
            h('span', null, interp(t('scanned'), { n: data.scanned })),
          ) : null,
          data && data.total > 0 ? h('div', { className: 'gss-toolbar' },
            h('label', { className: 'gss-control' }, t('sort'),
              h('select', {
                className: 'gss-select', value: sortMode, onChange: event => setSortMode(event.target.value),
              }, [
                h('option', { key: 'newest', value: 'newest' }, t('sortNewest')),
                h('option', { key: 'oldest', value: 'oldest' }, t('sortOldest')),
              ]),
            ),
            h('label', { className: 'gss-control' }, t('filterType'),
              h('select', {
                className: 'gss-select', value: typeFilter, onChange: event => setTypeFilter(event.target.value),
              }, [
                h('option', { key: 'all', value: 'all' }, t('filterAllTypes')),
                ...typeOptions.map(type => h('option', { key: type, value: type }, typeLabel(type))),
              ]),
            ),
            h('label', { className: 'gss-control' }, t('filterTime'),
              h('select', {
                className: 'gss-select', value: timeFilter, onChange: event => setTimeFilter(event.target.value),
              }, [
                h('option', { key: 'all', value: 'all' }, t('timeAll')),
                h('option', { key: 'today', value: 'today' }, t('timeToday')),
                h('option', { key: '7d', value: '7d' }, t('time7d')),
                h('option', { key: '30d', value: '30d' }, t('time30d')),
              ]),
            ),
            h('label', { className: 'gss-control' }, t('filterSession'),
              h('select', {
                className: 'gss-select', value: sessionFilter, onChange: event => setSessionFilter(event.target.value),
              }, [
                h('option', { key: 'all', value: 'all' }, t('allSessions')),
                ...sessionOptions.map(session => h('option', { key: session.sessionId, value: session.sessionId }, session.title || session.sessionId)),
              ]),
            ),
          ) : null,
          !data && !loading && !error ? h('div', { className: 'gss-empty' },
            h('span', { className: 'gss-empty-icon' }, h(Icon, { size: 28 })),
            h('div', null, t('empty')),
          ) : null,
          data && data.total === 0 ? h('div', { className: 'gss-empty' },
            h('span', { className: 'gss-empty-icon' }, h(Icon, { size: 28 })),
            h('div', null, t('noResults')),
          ) : null,
          data && data.total > 0 && filteredHits.length === 0 ? h('div', { className: 'gss-empty' },
            h('span', { className: 'gss-empty-icon' }, h(Icon, { size: 28 })),
            h('div', null, t('noResults')),
          ) : null,
          data && data.total > 0 && groups.length > 0 ? h('div', { className: 'gss-list' }, groups.map(group =>
            h('section', { key: group.sessionId, className: 'gss-group' },
              h('div', { className: 'gss-group-head' },
                h('div', null,
                  h('div', { className: 'gss-group-title' }, group.title || `${t('session')} ${group.sessionId}`),
                  h('div', { className: 'gss-group-sub' }, `${t('session')} ${group.sessionId}${group.cwd ? ` · ${t('cwd')}: ${group.cwd}` : ''}`),
                ),
                h('button', {
                  className: 'gss-copy',
                  type: 'button',
                  onClick: () => copySession(group.sessionId),
                }, copied === group.sessionId ? t('copied') : t('copy')),
              ),
              group.hits.map((hit, index) => h('div', { key: `${hit.seq ?? index}-${index}`, className: 'gss-hit' },
                h('div', { className: 'gss-hit-meta' },
                  h('span', { className: `gss-hit-type gss-hit-type-${String(hit.type || '').toLowerCase().replace(/[^a-z0-9_-]/g, '')}` }, typeLabel(hit.type)),
                  h('div', null, hit.seq !== undefined ? `seq ${hit.seq}` : ''),
                  hit.time ? h('div', null, new Date(Number(hit.time)).toLocaleString('zh-CN', { hour12: false })) : null,
                ),
                h('div', { className: 'gss-hit-text' }, h(Highlight, { text: hit.snippet, query: data.query })),
              )),
            ),
          )) : null,
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'global-session-search:locale')
        const t = ctx.locale.bind(NS)
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'global-session-search',
          order: 42,
          label: () => t('nav'),
          locale: NS,
        }, owner => h(Icon, { size: owner?.size || 16 })))
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'global-session-search',
          locale: NS,
        }, () => h(Page, { t })))
      },
    }
  },
})
