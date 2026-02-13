import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { PricingModal } from './PricingModal';
import { createCheckoutSession } from '../services/api';

const CHECKOUT_STORAGE_KEY = 'stg_checkout_redirect';
const PRICE_IDS: Record<string, string> = {
  monthly: import.meta.env.VITE_STRIPE_GOLD_MONTHLY_PRICE_ID || '',
  yearly: import.meta.env.VITE_STRIPE_GOLD_YEARLY_PRICE_ID || '',
  lifetime: import.meta.env.VITE_STRIPE_GOLD_LIFETIME_PRICE_ID || '',
};

const navItems = [
  {
    to: '/',
    label: 'Today',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    to: '/portfolio',
    label: 'Portfolio',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    to: '/tools',
    label: 'Tools',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 5.383a1.5 1.5 0 01-2.025.11l-.11-.1a1.5 1.5 0 01-.11-2.024l5.384-5.384m2.245 2.015L18.18 7.41a2.121 2.121 0 013 3l-5.77 5.77m-6.99-6.99l6.99 6.99" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Layout() {
  const { user, isConfigured, signOut } = useAuth();
  const { tier, isGold } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close desktop dropdown on click outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  // Close mobile dropdown on click outside
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileMenuOpen]);

  // Close all dropdowns on route change
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle OAuth return with checkout intent (user lands on / after OAuth)
  useEffect(() => {
    if (!user) return;
    try {
      const plan = localStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (!plan) return;
      localStorage.removeItem(CHECKOUT_STORAGE_KEY);
      const priceId = PRICE_IDS[plan];
      if (!priceId) return;
      createCheckoutSession(user.id, priceId)
        .then(({ url }) => { window.location.href = url; })
        .catch(() => { /* silently fail, user can retry from settings */ });
    } catch { /* ignore */ }
  }, [user]);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/auth');
  };

  const tierLabel = tier === 'lifetime' ? 'Lifetime' : tier === 'gold' ? 'Gold' : 'Free';
  const tierIsGold = tier === 'gold' || tier === 'lifetime';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] h-screen fixed top-0 left-0 bg-sidebar border-r border-border z-40">
        <div className="p-5 pb-6 shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/icon-512.png" alt="Stack Tracker Gold" className="w-8 h-8 rounded-lg" />
            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                <span className="text-gold">Stack Tracker</span>
              </h1>
              <p className="text-[10px] text-text-muted font-medium tracking-widest uppercase">Gold</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-gold bg-gold/8'
                        : 'text-text-muted hover:text-text-secondary hover:bg-text/[0.03]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-gold"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      {item.icon}
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Upgrade button for free users */}
        {!isGold && (
          <div className="px-3 pb-3 shrink-0">
            <button
              onClick={() => setShowPricing(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gold/30 bg-gold/5 text-gold text-xs font-semibold hover:bg-gold/10 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Try Gold Free
            </button>
          </div>
        )}

        {/* User section at bottom — always visible */}
        <div className="p-4 border-t border-border shrink-0 relative" ref={menuRef}>
          {/* Dropdown menu (pops upward) */}
          <AnimatePresence>
            {userMenuOpen && user && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-3 right-3 mb-2 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50"
              >
                {/* User info */}
                <div className="px-3.5 py-3 border-b border-border">
                  <p className="text-xs font-medium text-text truncate">{user.user_metadata?.full_name || user.email}</p>
                  {user.user_metadata?.full_name && (
                    <p className="text-[10px] text-text-muted truncate mt-0.5">{user.email}</p>
                  )}
                  <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    tierIsGold
                      ? 'bg-gold/15 text-gold'
                      : 'bg-text/10 text-text-muted'
                  }`}>
                    {tierLabel}
                  </span>
                </div>
                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:bg-text/[0.04] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isConfigured && user ? (
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-2.5 rounded-lg hover:bg-text/[0.04] transition-colors p-1 -m-1"
            >
              <div className="w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-semibold text-gold">
                  {(user.email?.[0] || 'U').toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-text-muted truncate flex-1 text-left" title={user.email || ''}>
                {user.email}
              </p>
              <svg className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
          ) : isConfigured ? (
            <Link
              to="/auth"
              className="flex items-center gap-2 text-[12px] text-gold hover:text-gold-hover transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Sign in to sync
            </Link>
          ) : null}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar/95 backdrop-blur-xl border-b border-border z-50 flex items-center justify-between px-4" ref={mobileMenuRef}>
        <Link to="/" className="flex items-center gap-2">
          <img src="/icon-512.png" alt="Stack Tracker Gold" className="w-8 h-8 rounded-lg" />
          <span className="text-sm font-semibold text-gold tracking-tight">Stack Tracker</span>
        </Link>

        {isConfigured && user ? (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center"
          >
            <span className="text-xs font-semibold text-gold">
              {(user.email?.[0] || 'U').toUpperCase()}
            </span>
          </button>
        ) : isConfigured ? (
          <Link
            to="/auth"
            className="px-3.5 py-1.5 text-xs font-semibold text-gold border border-gold/30 rounded-lg hover:bg-gold/10 transition-colors"
          >
            Sign In
          </Link>
        ) : null}

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && user && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-3 mt-1.5 w-56 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50"
            >
              {/* User info */}
              <div className="px-3.5 py-3 border-b border-border">
                <p className="text-xs font-medium text-text truncate">{user.user_metadata?.full_name || user.email}</p>
                {user.user_metadata?.full_name && (
                  <p className="text-[10px] text-text-muted truncate mt-0.5">{user.email}</p>
                )}
                <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                  tierIsGold
                    ? 'bg-gold/15 text-gold'
                    : 'bg-text/10 text-text-muted'
                }`}>
                  {tierLabel}
                </span>
              </div>

              {/* Nav links */}
              <div className="py-1 border-b border-border">
                {navItems.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => { setMobileMenuOpen(false); navigate(item.to); }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                      location.pathname === item.to || (item.to === '/' && location.pathname === '/')
                        ? 'text-gold bg-gold/5'
                        : 'text-text-secondary hover:bg-text/[0.04]'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Upgrade for free users */}
              {!isGold && (
                <div className="px-3.5 py-2.5 border-b border-border">
                  <button
                    onClick={() => { setMobileMenuOpen(false); setShowPricing(true); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gold/30 bg-gold/5 text-gold text-xs font-semibold hover:bg-gold/10 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Try Gold Free
                  </button>
                </div>
              )}

              {/* Sign out */}
              <div className="py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0 md:ml-[220px] overflow-y-auto min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar/95 backdrop-blur-xl border-t border-border z-50">
        <ul className="flex justify-around px-2">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative flex flex-col items-center py-2 pt-2.5 transition-colors ${
                    isActive ? 'text-gold' : 'text-text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="mobile-tab-active"
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-gold"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    {item.icon}
                    <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        currentTier={tier}
      />
    </div>
  );
}
