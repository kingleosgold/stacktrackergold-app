import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BarChart2,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Coins,
  FileText,
  Gem,
  Key,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Plus,
  Scale,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { PricingModal } from './PricingModal';
import {
  createConversation,
  deleteConversation,
  listConversations,
  type TroyConversationSummary,
} from '../services/troy';

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 60;
const COLLAPSED_STORAGE_KEY = 'troystack_sidebar_collapsed';
const MAX_RECENT_CONVERSATIONS = 8;
const TITLE_MAX_LEN = 30;

interface NavItemDef {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const PRIMARY_NAV: NavItemDef[] = [
  { to: '/', label: 'Troy Chat', icon: <MessageSquare size={18} />, end: true },
  { to: '/stack', label: 'My Stack', icon: <Package size={18} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart2 size={18} /> },
  { to: '/signal', label: 'Stack Signal', icon: <Zap size={18} /> },
  { to: '/vault', label: 'Vault Watch', icon: <Building2 size={18} /> },
  { to: '/dealers', label: 'Compare Dealers', icon: <Scale size={18} /> },
  { to: '/speculate', label: 'Speculation', icon: <TrendingUp size={18} /> },
  { to: '/junk-silver', label: 'Junk Silver', icon: <Coins size={18} /> },
];

const DEVELOPER_NAV: NavItemDef[] = [
  { to: '/developers', label: 'API Docs', icon: <FileText size={18} /> },
  { to: '/developers/keys', label: 'API Keys', icon: <Key size={18} /> },
];

function truncate(s: string, n: number): string {
  if (!s) return 'Untitled';
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsed(v: boolean) {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(v));
  } catch {
    // ignore
  }
}

interface SidebarNavLinkProps {
  item: NavItemDef;
  collapsed: boolean;
  onNavigate?: () => void;
}

function SidebarNavLink({ item, collapsed, onNavigate }: SidebarNavLinkProps) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          'relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200',
          collapsed ? 'justify-center px-0 py-2.5 mx-1.5' : 'gap-3 px-3 py-2',
          isActive
            ? 'text-[#C9A84C] bg-[rgba(201,168,76,0.08)]'
            : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.05]',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
              style={{ background: '#C9A84C' }}
            />
          )}
          <span className="shrink-0 flex items-center justify-center">{item.icon}</span>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

export default function ChatLayout() {
  const { user, isConfigured, signOut } = useAuth();
  const { tier, isGold } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ conversationId?: string }>();
  const activeConversationId = params.conversationId ?? null;

  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [conversations, setConversations] = useState<TroyConversationSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Persist collapsed state
  useEffect(() => {
    writeCollapsed(collapsed);
  }, [collapsed]);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close user menu on outside click
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
      // silent — list simply won't populate
    } finally {
      setLoadingList(false);
    }
  }, [user]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (activeConversationId) refreshConversations();
  }, [activeConversationId, refreshConversations]);

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

  const recentConvs = [...conversations]
    .sort((a, b) => {
      const ta = new Date(a.updated_at ?? a.created_at).getTime();
      const tb = new Date(b.updated_at ?? b.created_at).getTime();
      return tb - ta;
    })
    .slice(0, MAX_RECENT_CONVERSATIONS);

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  // --- Sidebar inner content (shared between desktop rail + mobile overlay) ---
  const renderSidebarBody = (isMobileOverlay: boolean) => {
    const effectiveCollapsed = isMobileOverlay ? false : collapsed;
    const closeIfMobile = isMobileOverlay ? () => setMobileOpen(false) : undefined;

    return (
      <div className="flex flex-col h-full">
        {/* Brand header — logo + New button + collapse toggle */}
        {effectiveCollapsed ? (
          <div className="flex flex-col items-center gap-2 px-0 py-3">
            <button
              onClick={() => { navigate('/'); closeIfMobile?.(); }}
              aria-label="TroyStack home"
              title="TroyStack"
            >
              <img src="/troy-avatar.png" alt="Troy" className="w-8 h-8 rounded-full shrink-0" />
            </button>
            {!isMobileOverlay && (
              <button
                onClick={() => setCollapsed((v) => !v)}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="w-7 h-7 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <ChevronsRight size={16} />
              </button>
            )}
            <button
              onClick={handleNewConversation}
              title="New conversation"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[rgba(201,168,76,0.3)] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.1)] transition-colors"
              aria-label="New conversation"
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => { navigate('/'); closeIfMobile?.(); }}
              className="flex items-center gap-2.5"
              aria-label="TroyStack home"
            >
              <img src="/troy-avatar.png" alt="Troy" className="w-8 h-8 rounded-full shrink-0" />
              <span className="text-[15px] font-semibold tracking-tight" style={{ color: '#C9A84C' }}>
                Troy
              </span>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { handleNewConversation(); closeIfMobile?.(); }}
                title="New conversation"
                className="w-7 h-7 flex items-center justify-center rounded-md border border-[rgba(201,168,76,0.3)] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.1)] transition-colors"
                aria-label="New conversation"
              >
                <Plus size={14} />
              </button>
              {!isMobileOverlay && (
                <button
                  onClick={() => setCollapsed((v) => !v)}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                  className="w-7 h-7 hidden lg:flex items-center justify-center rounded-md text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <ChevronsLeft size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable middle region: nav → recents → developer.
            min-h-0 is critical — without it flex-1 children refuse to
            shrink below their content height and the footer (collapse
            toggle) gets pushed below the viewport. */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
          {/* Navigation section (primary tools) */}
          <div className={effectiveCollapsed ? 'pt-2 pb-2 shrink-0' : 'px-2 pb-2 pt-1 shrink-0'}>
            {!effectiveCollapsed && (
              <div
                className="px-3 pt-2 pb-1 text-[11px] uppercase"
                style={{ color: 'rgba(148,163,184,0.5)', letterSpacing: '1px' }}
              >
                Navigation
              </div>
            )}
            <ul className="space-y-0.5">
              {PRIMARY_NAV.map((item) => (
                <li key={item.to}>
                  <SidebarNavLink item={item} collapsed={effectiveCollapsed} onNavigate={closeIfMobile} />
                </li>
              ))}
            </ul>
          </div>

          {/* Recents (expanded only, scrollable region inside the flex) */}
          {!effectiveCollapsed && (
            <div className="px-2 pb-2 flex-1 min-h-0 flex flex-col">
              <div
                className="px-3 pt-2 pb-1 text-[11px] uppercase shrink-0"
                style={{ color: 'rgba(148,163,184,0.5)', letterSpacing: '1px' }}
              >
                Recents
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {!user && isConfigured ? (
                  <div className="px-3 py-2 text-[12px] text-[#94A3B8]">Sign in to see conversations</div>
                ) : loadingList && recentConvs.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-[#94A3B8]">Loading…</div>
                ) : recentConvs.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-[#94A3B8]">No conversations yet.</div>
                ) : (
                  <ul className="space-y-0.5">
                    {recentConvs.map((c) => {
                      const isActive = c.id === activeConversationId;
                      return (
                        <li key={c.id}>
                          <div
                            className={`group relative flex items-center rounded-lg transition-colors ${
                              isActive ? 'bg-[rgba(201,168,76,0.08)]' : 'hover:bg-white/[0.05]'
                            }`}
                          >
                            <button
                              onClick={() => { handleSelectConversation(c.id); closeIfMobile?.(); }}
                              className={`flex-1 text-left px-3 py-1.5 text-[13px] truncate ${
                                isActive ? 'text-[#C9A84C]' : 'text-[#94A3B8] hover:text-white'
                              }`}
                              title={c.title || 'Untitled'}
                            >
                              {truncate(c.title || 'Untitled', TITLE_MAX_LEN)}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 mr-1 text-[#94A3B8] hover:text-[#EF4444]"
                              aria-label="Delete conversation"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Developer section */}
          <div className={effectiveCollapsed ? 'pt-2 pb-2 shrink-0 mt-auto' : 'px-2 pb-2 pt-1 shrink-0'}>
            {!effectiveCollapsed && (
              <div
                className="px-3 pt-2 pb-1 text-[11px] uppercase"
                style={{ color: 'rgba(148,163,184,0.5)', letterSpacing: '1px' }}
              >
                Developer
              </div>
            )}
            <ul className="space-y-0.5">
              {DEVELOPER_NAV.map((item) => (
                <li key={item.to}>
                  <SidebarNavLink item={item} collapsed={effectiveCollapsed} onNavigate={closeIfMobile} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer region: settings, upgrade, user, collapse toggle */}
        <div
          className="border-t shrink-0"
          style={{ borderColor: 'rgba(201,168,76,0.1)' }}
        >
          {/* Settings */}
          <div className={effectiveCollapsed ? 'pt-2' : 'px-2 pt-2'}>
            <SidebarNavLink
              item={{ to: '/settings', label: 'Settings', icon: <SettingsIcon size={18} /> }}
              collapsed={effectiveCollapsed}
              onNavigate={closeIfMobile}
            />
          </div>

          {/* Upgrade CTA */}
          {!isGold && (
            <div className={effectiveCollapsed ? 'px-1.5 py-2' : 'px-3 py-2'}>
              {effectiveCollapsed ? (
                <button
                  onClick={() => { setShowPricing(true); closeIfMobile?.(); }}
                  title="Upgrade to Gold"
                  className="w-full flex items-center justify-center py-2 rounded-lg text-[#0B1120] transition-colors"
                  style={{ background: '#C9A84C' }}
                >
                  <Sparkles size={16} />
                </button>
              ) : (
                <button
                  onClick={() => { setShowPricing(true); closeIfMobile?.(); }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-[#0B1120] hover:opacity-90 transition-opacity"
                  style={{ background: '#C9A84C' }}
                >
                  <Gem size={14} />
                  Upgrade to Gold
                </button>
              )}
            </div>
          )}

          {/* User row */}
          <div
            ref={userMenuRef}
            className={`relative ${effectiveCollapsed ? 'px-1.5 pt-1 pb-1' : 'px-2 pt-1 pb-1'}`}
          >
            {userMenuOpen && user && !effectiveCollapsed && (
              <div
                className="absolute bottom-full left-2 right-2 mb-2 rounded-lg overflow-hidden shadow-xl z-20"
                style={{ background: '#11172A', border: '1px solid rgba(201,168,76,0.15)' }}
              >
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
                  <p className="text-[12px] font-medium text-white truncate">{user.email}</p>
                  <span
                    className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full"
                    style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}
                  >
                    {tierLabel}
                  </span>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                  className="w-full text-left px-3 py-2 text-[12px] text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  Account Settings
                </button>
              </div>
            )}

            {isConfigured && user ? (
              <button
                onClick={() => {
                  if (effectiveCollapsed) {
                    setCollapsed(false);
                  } else {
                    setUserMenuOpen((v) => !v);
                  }
                }}
                title={effectiveCollapsed ? user.email ?? 'Account' : undefined}
                className={`w-full flex items-center rounded-lg hover:bg-white/[0.05] transition-colors ${
                  effectiveCollapsed ? 'justify-center py-2' : 'gap-2 px-2 py-2'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(201,168,76,0.15)' }}
                >
                  <span className="text-[11px] font-semibold" style={{ color: '#C9A84C' }}>
                    {userInitial}
                  </span>
                </div>
                {!effectiveCollapsed && (
                  <span className="text-[11px] text-[#94A3B8] truncate flex-1 text-left">{user.email}</span>
                )}
              </button>
            ) : isConfigured ? (
              <button
                onClick={() => { navigate('/auth'); closeIfMobile?.(); }}
                className={`w-full ${effectiveCollapsed ? 'text-center py-2' : 'text-left px-2 py-2'} text-[12px] text-[#C9A84C]`}
                title={effectiveCollapsed ? 'Sign in' : undefined}
              >
                {effectiveCollapsed ? '→' : 'Sign in to sync'}
              </button>
            ) : null}

            {isConfigured && user && (
              <button
                onClick={handleSignOut}
                title={effectiveCollapsed ? 'Sign Out' : undefined}
                className={`w-full flex items-center rounded-lg text-[12px] text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors ${
                  effectiveCollapsed ? 'justify-center py-2 mt-1' : 'gap-2 px-2 py-2 mt-0.5'
                }`}
              >
                <LogOut size={14} />
                {!effectiveCollapsed && <span>Sign Out</span>}
              </button>
            )}
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0E' }}>
      {/* Desktop sidebar (fixed, width animated) */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 h-screen z-40 transition-[width] duration-200 ease-in-out"
        style={{
          width: sidebarWidth,
          background: '#0B1120',
          borderRight: '1px solid rgba(201,168,76,0.1)',
        }}
      >
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile top bar */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 flex items-center justify-between px-3"
        style={{ background: '#0B1120', borderBottom: '1px solid rgba(201,168,76,0.1)' }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-[#94A3B8] hover:text-white"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <img src="/troy-avatar.png" alt="Troy" className="w-7 h-7 rounded-full" />
          <div className="leading-tight">
            <div className="text-sm font-semibold" style={{ color: '#C9A84C' }}>Troy</div>
            <div className="text-[10px] text-[#94A3B8]">Your Stack Analyst</div>
          </div>
        </div>
        <button
          onClick={() => user ? navigate('/settings') : navigate('/auth')}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(201,168,76,0.15)' }}
          aria-label="Account"
        >
          <span className="text-xs font-semibold" style={{ color: '#C9A84C' }}>{userInitial}</span>
        </button>
      </header>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 transition-opacity duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute top-0 left-0 h-full flex flex-col transition-transform duration-200"
            style={{
              width: EXPANDED_WIDTH,
              background: '#0B1120',
              borderRight: '1px solid rgba(201,168,76,0.1)',
            }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white z-10"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}

      {/* Main content — margin follows sidebar width on desktop, 0 on mobile */}
      <main
        className={`flex flex-col min-w-0 min-h-screen pt-14 lg:pt-0 transition-[margin-left] duration-200 ease-in-out ${
          collapsed ? 'lg:ml-[60px]' : 'lg:ml-[260px]'
        }`}
      >
        <Outlet context={{ refreshConversations }} />
      </main>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} currentTier={tier} />
    </div>
  );
}
