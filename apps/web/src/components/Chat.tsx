import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plus, MessageSquare, Sparkles, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Session {
  id: string
  title: string
  createdAt: Date
}

const INITIAL_SESSIONS: Session[] = [
  { id: '1', title: 'TechCorp lead analysis', createdAt: new Date(Date.now() - 86_400_000) },
  { id: '2', title: 'Series A fintech prospects', createdAt: new Date(Date.now() - 172_800_000) },
  { id: '3', title: 'EMEA expansion targets', createdAt: new Date(Date.now() - 259_200_000) },
]

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function renderContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>
    }
    return part
  })
}

interface ChatProps {
  sessionId: string
}

export default function Chat({ sessionId }: ChatProps) {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, toolStatus])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [input])

  const submit = useCallback(async () => {
    const content = input.trim()
    if (!content || isLoading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    setToolStatus(null)

    const aiId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '', timestamp: new Date() }])

    try {
      const history = messages
        .filter(m => m.content)
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: content, history }),
      })

      if (!res.ok || !res.body) throw new Error(await res.text())

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6))
          if (event.type === 'text') {
            setMessages(prev =>
              prev.map(m => (m.id === aiId ? { ...m, content: m.content + event.text } : m))
            )
          } else if (event.type === 'tool_start') {
            setToolStatus('Searching Google Maps\u2026')
          } else if (event.type === 'tool_result' || event.type === 'done') {
            setToolStatus(null)
          }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId ? { ...m, content: 'Something went wrong. Please try again.' } : m
        )
      )
    } finally {
      setIsLoading(false)
      setToolStatus(null)
    }
  }, [input, isLoading, messages, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  const newChat = () => {
    const session: Session = {
      id: crypto.randomUUID(),
      title: 'New conversation',
      createdAt: new Date(),
    }
    setSessions(prev => [session, ...prev])
    setActiveId(session.id)
    setMessages([])
  }

  const selectSession = (id: string) => {
    setActiveId(id)
    setMessages([])
  }

  const isEmpty = messages.length === 0
  const canSend = input.trim().length > 0 && !isLoading

  return (
    <div className="chat-root">
      <aside className="chat-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Sparkles size={13} />
          </div>
          <span className="brand-name">SoftKnock</span>
        </div>

        <div className="sidebar-body">
          <button className="new-chat-btn" onClick={newChat}>
            <Plus size={13} />
            New conversation
          </button>

          <div className="sessions-label">Recent</div>

          <nav className="sessions-list">
            {sessions.map(s => (
              <button
                key={s.id}
                className={cn('session-item', activeId === s.id && 'active')}
                onClick={() => selectSession(s.id)}
              >
                <MessageSquare size={12} className="session-icon" />
                <div className="session-info">
                  <span className="session-title">{s.title}</span>
                  <span className="session-time">{relativeTime(s.createdAt)}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <div className="header-title">
            {isEmpty ? 'Lead Intelligence' : 'Active Research'}
          </div>
          <div className="header-badge">
            <span className="status-dot" />
            AI Ready
          </div>
        </header>

        <div className="messages-container">
          {isEmpty ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Sparkles size={26} />
              </div>
              <h2 className="empty-title">Lead Intelligence</h2>
              <p className="empty-subtitle">
                Research prospects, enrich contacts, and surface intent signals. Ask me anything about your pipeline.
              </p>
              <div className="empty-prompts">
                {[
                  'Analyze TechCorp Inc. as a potential lead',
                  'Find Series B companies in fintech hiring engineers',
                  'Enrich this contact: sarah@dataflow.io',
                ].map(prompt => (
                  <button
                    key={prompt}
                    className="prompt-chip"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map(msg => (
                <div key={msg.id} className={cn('message-row', msg.role)}>
                  {msg.role === 'assistant' && (
                    <div className="message-avatar ai">
                      <Sparkles size={11} />
                    </div>
                  )}
                  <div className={cn('message-bubble', msg.role)}>
                    <div className="message-content">
                      {msg.content ? renderContent(msg.content) : (
                        <div className="typing-indicator"><span /><span /><span /></div>
                      )}
                    </div>
                    {msg.content && (
                      <div className="message-time">{relativeTime(msg.timestamp)}</div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="message-avatar user">U</div>
                  )}
                </div>
              ))}

              {toolStatus && (
                <div className="message-row assistant">
                  <div className="message-avatar ai">
                    <MapPin size={11} />
                  </div>
                  <div className="message-bubble assistant">
                    <div className="message-content tool-status">
                      <span className="tool-status-dot" />
                      {toolStatus}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="input-area">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about a lead, company, or prospect\u2026"
              rows={1}
            />
            <button
              className={cn('send-btn', canSend && 'ready')}
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
            >
              <Send size={13} />
            </button>
          </div>
          <div className="input-hint">\u2318 Return to send</div>
        </div>
      </main>
    </div>
  )
}
