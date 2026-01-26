import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/holdings', label: 'Holdings', icon: '📦' },
  { to: '/add', label: 'Add', icon: '➕' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-border">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold">
            <span className="text-gold">Stack Tracker</span> Gold
          </h1>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-gold text-background font-semibold'
                        : 'text-text-muted hover:bg-surface-hover hover:text-text'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border">
        <ul className="flex justify-around">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center py-3 transition-colors ${
                    isActive
                      ? 'text-gold'
                      : 'text-text-muted'
                  }`
                }
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs mt-1">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
