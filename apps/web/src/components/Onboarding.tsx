import { useState } from 'react'
import { Upload, ArrowRight, Sparkles } from 'lucide-react'

interface OnboardingProps {
  onComplete: (sessionId: string, name: string) => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !company || !cvFile) return
    setLoading(true)
    setError('')

    const fd = new FormData()
    fd.append('name', name)
    fd.append('company_email', email)
    fd.append('company_name', company)
    fd.append('cv', cvFile)

    try {
      const res = await fetch('/api/onboard', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { session_id, name: userName } = await res.json()
      localStorage.setItem('sk_session', session_id)
      localStorage.setItem('sk_name', userName)
      onComplete(session_id, userName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && !!name && !!email && !!company && !!cvFile

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles size={15} className="text-primary-foreground" />
          </div>
          <span className="text-base font-semibold text-foreground tracking-tight">SoftKnock</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">Get started</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Upload your CV and we'll personalise your lead research experience.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Alex Johnson"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Work email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Company name</label>
            <input
              type="text"
              required
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Upload CV (PDF)</label>
            <label className="flex flex-col items-center gap-2 w-full border border-dashed border-border rounded-lg px-4 py-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <Upload size={20} className="text-muted-foreground" />
              {cvFile ? (
                <span className="text-sm font-medium text-primary">{cvFile.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Click to upload PDF</span>
              )}
              <input
                type="file"
                accept=".pdf"
                required
                className="hidden"
                onChange={e => setCvFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up…' : 'Start researching'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>
      </div>
    </div>
  )
}
