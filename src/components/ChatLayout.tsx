import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { PricingModal } from './PricingModal';
import { ConversationList } from './chat/ConversationList';
import {
  createConversation,
  deleteConversation,
  listConversations,
  type TroyConversationSummary,
} from '../services/troy';

const SIDEBAR_WIDTH = 260;

interface NavItemDef {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    to: '/stack',
    label: 'My Stack',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    to: '/signal',
    label: 'Stack Signal',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    to: '/dealers',
    label: 'Compare Dealers',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function ChatLayout() {
  const { user, isConfigured, signOut } = useAuth();
  const { tier, isGold } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ conversationId?: string }>();
  const activeConversationId = params.conversationId ?? null;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<TroyConversationSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const refreshConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      return;
    }
    setLoadingList(true);
    try {
      const list = await listConversations(user.id);
      setConversations(list);
    } catch {
      // silent — the list just won't populate
    } finally {
      setLoadingList(false);
    }
  }, [user]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Re-fetch when switching conversations (covers new-conv creation from chat page)
  useEffect(() => {
    if (activeConversationId) refreshConversations();
  }, [activeConversationId, refreshConversations]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [userMenuOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleNewConversation = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const conv = await createConversation(user.id);
      await refreshConversations();
      navigate(`/c/${conv.id}`);
    } catch {
      // If creation fails, just go to the empty chat state
      navigate('/');
    }
  };

  const handleSelectConversation = (id: string) => {
    navigate(`/c/${id}`);
  };

  const handleDeleteConversation = async (id: string) => {
    if (!user) return;
    try {
      await deleteConversation(id, user.id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) navigate('/');
    } catch {
      // silent
    }
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/auth');
  };

  const tierLabel = tier === 'lifetime' ? 'Lifetime' : tier === 'gold' ? 'Gold' : 'Free';
  const userInitial = (user?.email?.[0] || 'U').toUpperCase();

  const sidebarContent = useMemo(() => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center gap-2.5">
        <img src="/troy-avatar.png" alt="Troy" className="w-7 h-7 rounded-full" />
        <span className="text-sm font-semibold text-[#DAA520] flex-1">Troy</span>
        <button
          onClick={handleNewConversation}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#DAA520] border border-[#DAA520]/30 hover:bg-[#DAA520]/10 transition-colors"
          aria-label="New conversation"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-muted">Recents</div>
        <ConversationList
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          loading={loadingList}
        />
      </div>

      {/* Nav items */}
      <div className="border-t border-white/5 px-2 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'text-[#DAA520] bg-white/[0.05]' : 'text-text-secondary hover:bg-white/[0.03] hover:text-text'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Upgrade CTA */}
      {!isGold && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowPricing(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#DAA520]/30 bg-[#DAA520]/5 text-[#DAA520] text-xs font-semibold hover:bg-[#DAA520]/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Upgrade to Gold
          </button>
        </div>
      )}

      {/* User row */}
      <div className="border-t border-white/5 p-3 relative" ref={userMenuRef}>
        {userMenuOpen && user && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#141419] border border-white/10 rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-3 border-b border-white/5">
              <p className="text-xs font-medium text-text truncate">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#DAA520]/15 text-[#DAA520]">
                {tierLabel}
              </span>
            </div>
            <button
              onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
              className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-white/5"
            >
              Account Settings
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/10"
            >
              Sign Out
            </button>
          </div>
        )}
        {isConfigured && user ? (
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-2 rounded-lg hover:bg-white/[0.04] p-1.5 -m-1.5"
          >
            <div className="w-7 h-7 rounded-full bg-[#DAA520]/15 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-[#DAA520]">{userInitial}</span>
            </div>
            <span className="text-[11px] text-text-muted truncate flex-1 text-left">{user.email}</span>
          </button>
        ) : isConfigured ? (
          <button
            onClick={() => navigate('/auth')}
            className="w-full text-left text-xs text-[#DAA520] py-1.5"
          >
            Sign in to sync
          </button>
        ) : null}
      </div>
    </div>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [conversations, activeConversationId, loadingList, isGold, isConfigured, user, userMenuOpen, tierLabel, userInitial]);

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0A0E' }}>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-3 border-b border-white/5" style={{ background: '#0A0A0E' }}>
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-text"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <img src="/troy-avatar.png" alt="Troy" className="w-7 h-7 rounded-full" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[#DAA520]">Troy</div>
            <div className="text-[10px] text-text-muted">Your Stack Analyst</div>
          </div>
        </div>
        <button
          onClick={() => user ? setUserMenuOpen(!userMenuOpen) : navigate('/auth')}
          className="w-8 h-8 rounded-full bg-[#DAA520]/15 flex items-center justify-center"
          aria-label="User menu"
        >
          <span className="text-xs font-semibold text-[#DAA520]">{userInitial}</span>
        </button>
      </header>

      {/* Desktop persistent sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-screen border-r border-white/5"
        style={{ width: SIDEBAR_WIDTH, background: '#0B0B10' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <aside
            className="absolute top-0 left-0 h-full border-r border-white/5 flex flex-col"
            style={{ width: SIDEBAR_WIDTH, background: '#0B0B10' }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 text-text-muted hover:text-text"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content — sidebar is fixed so we offset with left margin on desktop */}
      <main className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0 lg:ml-[260px]">
        <Outlet context={{ refreshConversations }} />
      </main>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} currentTier={tier} />
    </div>
  );
}
