import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { HiringFlowCard } from '@/components/dashboard/HiringFlowCard';
import { CandidatesTable } from '@/components/dashboard/CandidatesTable';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { AgentPanel } from '@/components/chat/AgentPanel';
import { useDashboard } from '@/hooks/useDashboard';
import { useAgent } from '@/hooks/useAgent';
import { currentUser } from '@/data/mockData';
import {
  Users, GitBranch, Mail, TrendingUp, Plus, Inbox, Workflow,
  BarChart2, FileText, Settings, Send,
} from 'lucide-react';
import Onboarding from '@/components/Onboarding';
import Chat from '@/components/Chat';

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('sk_session'));

  if (!sessionId) {
    return <Onboarding onComplete={(sid) => setSessionId(sid)} />;
  }

  return <AppShell sessionId={sessionId} />;
}

function PlaceholderPage({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-16">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}

function AppShell({ sessionId }: { sessionId: string }) {
  const { candidates, hiringFlows, activityItems, metrics, isLoading } = useDashboard();
  const agent = useAgent();
  const [currentPage, setCurrentPage] = useState('chat');

  const metricCards = [
    { label: 'Total Candidates', value: metrics.totalCandidates, change: metrics.candidatesChange, icon: <Users size={14} /> },
    { label: 'Active Flows',     value: metrics.activeFlows,     change: metrics.flowsChange,      icon: <GitBranch size={14} /> },
    { label: 'Outreach Sent',    value: metrics.outreachSent,    change: metrics.outreachChange,   icon: <Mail size={14} /> },
    { label: 'Response Rate',    value: metrics.responseRate,    change: metrics.rateChange,       icon: <TrendingUp size={14} />, suffix: '%' },
  ] as const;

  function renderPage() {
    switch (currentPage) {
      case 'chat':
        return <Chat sessionId={sessionId} />;

      case 'dashboard':
        return (
          <div className="p-5 max-w-[1200px] mx-auto space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {metricCards.map((card) => (
                <MetricCard key={card.label} {...card} isLoading={isLoading} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Hiring Flows</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isLoading ? '\u2014' : `${hiringFlows.filter((f) => f.status === 'active').length} active`}
                    </p>
                  </div>
                  <button
                    onClick={agent.openAgent}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors"
                  >
                    <Plus size={12} />
                    New flow
                  </button>
                </div>
                {!isLoading && hiringFlows.length === 0 ? (
                  <EmptyState
                    icon={<Workflow size={20} />}
                    title="No hiring flows yet"
                    description="Create your first hiring flow to start sourcing and evaluating candidates."
                    action={{ label: 'Create hiring flow', onClick: agent.openAgent }}
                  />
                ) : (
                  <div className="space-y-3">
                    {isLoading
                      ? Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />
                        ))
                      : hiringFlows.map((flow) => <HiringFlowCard key={flow.id} flow={flow} />)}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-xl border border-border p-5">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-foreground">Activity</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Recent updates</p>
                </div>
                <ActivityFeed items={activityItems} isLoading={isLoading} />
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Top Candidates</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Sorted by AI match score</p>
                </div>
                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all
                </button>
              </div>
              {!isLoading && candidates.length === 0 ? (
                <EmptyState
                  icon={<Inbox size={20} />}
                  title="No candidates yet"
                  description="Candidates appear here once your hiring flows are active and sourcing begins."
                />
              ) : (
                <CandidatesTable candidates={candidates} isLoading={isLoading} />
              )}
            </div>

            <div className="bg-accent/20 rounded-xl border border-accent/40 p-5">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{currentUser.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground mb-1">Your hiring style, reflected</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Based on your interest in{' '}
                    <span className="text-accent-foreground font-medium">
                      {currentUser.personality.hobbies.slice(0, 2).join(' and ')}
                    </span>{' '}
                    and your focus on{' '}
                    <span className="text-accent-foreground font-medium">
                      {currentUser.personality.motivations[0].toLowerCase()}
                    </span>
                    , we're surfacing candidates who thrive in{' '}
                    {currentUser.personality.teamPreference.toLowerCase()} environments.
                  </p>
                  <div className="flex gap-1.5 mt-2.5 flex-wrap">
                    {currentUser.personality.hobbies.map((h) => (
                      <span key={h} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                        {h}
                      </span>
                    ))}
                    <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full text-primary font-medium">
                      {currentUser.personality.workStyle}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'candidates':
        return (
          <div className="p-5 max-w-[1200px] mx-auto">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Candidates</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">All tracked candidates</p>
                </div>
              </div>
              {!isLoading && candidates.length === 0 ? (
                <EmptyState
                  icon={<Inbox size={20} />}
                  title="No candidates yet"
                  description="Candidates appear here once your hiring flows are active and sourcing begins."
                />
              ) : (
                <CandidatesTable candidates={candidates} isLoading={isLoading} />
              )}
            </div>
          </div>
        );

      case 'flows':
        return (
          <div className="p-5 max-w-[1200px] mx-auto">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Hiring Flows</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isLoading ? '\u2014' : `${hiringFlows.filter((f) => f.status === 'active').length} active`}
                  </p>
                </div>
                <button
                  onClick={agent.openAgent}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors"
                >
                  <Plus size={12} />
                  New flow
                </button>
              </div>
              {!isLoading && hiringFlows.length === 0 ? (
                <EmptyState
                  icon={<Workflow size={20} />}
                  title="No hiring flows yet"
                  description="Create your first hiring flow to start sourcing and evaluating candidates."
                  action={{ label: 'Create hiring flow', onClick: agent.openAgent }}
                />
              ) : (
                <div className="space-y-3">
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />
                      ))
                    : hiringFlows.map((flow) => <HiringFlowCard key={flow.id} flow={flow} />)}
                </div>
              )}
            </div>
          </div>
        );

      case 'outreach':
        return <PlaceholderPage icon={<Send size={20} />} title="Outreach" description="Manage and track outreach campaigns. Coming soon." />;

      case 'analytics':
        return <PlaceholderPage icon={<BarChart2 size={20} />} title="Analytics" description="In-depth hiring and outreach analytics. Coming soon." />;

      case 'templates':
        return <PlaceholderPage icon={<FileText size={20} />} title="Templates" description="Reusable message and flow templates. Coming soon." />;

      case 'settings':
        return <PlaceholderPage icon={<Settings size={20} />} title="Settings" description="Account and workspace settings. Coming soon." />;

      default:
        return null;
    }
  }

  const isFullscreen = currentPage === 'chat';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenAgent={agent.toggleAgent}
        isAgentOpen={agent.isOpen}
        userName={currentUser.name}
        userRole={currentUser.role}
        userInitials={currentUser.initials}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {!isFullscreen && (
          <Header user={currentUser} onOpenAgent={agent.toggleAgent} isAgentOpen={agent.isOpen} />
        )}

        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>

      {!isFullscreen && (
        <AgentPanel
          isOpen={agent.isOpen}
          onClose={agent.closeAgent}
          messages={agent.messages}
          isProcessing={agent.isProcessing}
          onSendMessage={agent.sendMessage}
          onClearMessages={agent.clearMessages}
        />
      )}
    </div>
  );
}
