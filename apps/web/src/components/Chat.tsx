import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plus, MessageSquare, Sparkles } from 'lucide-react'
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

const MOCK_RESPONSES = [
  "I've analyzed **TechCorp Inc.** — they're a Series B SaaS company (~450 employees). Key signals: recent EMEA expansion, 3 new engineering hires in the last 30 days, and their CTO posted about infrastructure scaling challenges. This suggests a buying window for developer tools. ICP score: **91/100**.",
  "Found **14 matching leads** in your target segment. The highest-intent prospect is **Sarah Chen** at Dataflow Systems — she viewed your pricing page twice and compared enterprise tiers. I'd recommend reaching out within 48 hours before the intent signal cools.",
  "I can enrich this lead with **LinkedIn signals**, **firmographic data**, **technographic stack**, and **intent signals** from 3rd-party sources. Based on their job postings and tech stack (`Salesforce`, `Segment`, `dbt`), they're actively scaling their data infrastructure.",
  "Based on the company's recent **Series A announcement** ($15M from Sequoia), they're likely hiring aggressively and evaluating new tooling. Their stack includes Salesforce, Slack, and Notion — they value integrated SaaS solutions. I'd lead with ROI framing rather than feature comparison.",
]

let mockIdx = 0

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
  // Bold: **text**
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

export default function Chat() {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [input])

  const submit = useCallback(() => {
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

    // Simulate API latency
    const delay = 900 + Math.random() * 700
    setTimeout(() => {
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: MOCK_RESPONSES[mockIdx++ % MOCK_RESPONSES.length],
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
      setIsLoading(false)
    }, delay)
  }, [input, isLoading])

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
      {/* ── Sidebar ── */}
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

      {/* ── Main ── */}
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

        {/* Messages */}
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
                <div
                  key={msg.id}
                  className={cn('message-row', msg.role)}
                >
                  {msg.role === 'assistant' && (
                    <div className="message-avatar ai">
                      <Sparkles size={11} />
                    </div>
                  )}

                  <div className={cn('message-bubble', msg.role)}>
                    <div className="message-content">
                      {renderContent(msg.content)}
                    </div>
                    <div className="message-time">{relativeTime(msg.timestamp)}</div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="message-avatar user">U</div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="message-row assistant">
                  <div className="message-avatar ai">
                    <Sparkles size={11} />
                  </div>
                  <div className="message-bubble assistant">
                    <div className="message-content" style={{ padding: '0.75rem 0.9375rem' }}>
                      <div className="typing-indicator">
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about a lead, company, or prospect…"
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
          <div className="input-hint">⌘ Return to send</div>
        </div>
      </main>
    </div>
  )
}
