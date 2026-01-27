import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHoldings } from '../hooks/useHoldings';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { clearAllHoldings } from '../services/holdings';

const APP_VERSION = '1.0.0';

interface SettingsRowProps {
  label: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingsRow({ label, description, onClick, href, rightElement, danger }: SettingsRowProps) {
  const content = (
    <>
      <div className="flex-1">
        <p className={danger ? 'text-red-500' : 'text-text'}>{label}</p>
        {description && <p className="text-sm text-text-muted mt-0.5">{description}</p>}
      </div>
      {rightElement || (
        <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </>
  );

  const className = "flex items-center justify-between py-4 px-4 hover:bg-surface-hover transition-colors cursor-pointer";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={`${className} w-full text-left`}>
      {content}
    </button>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2 px-1">
        {title}
      </h2>
      <div className="rounded-lg bg-surface border border-border divide-y divide-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const options: { value: Theme; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <div className="flex bg-background rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            theme === opt.value
              ? 'bg-gold text-background font-medium'
              : 'text-text-muted hover:text-text'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  danger = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface border border-border rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-text-muted mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg bg-background border border-border hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              danger
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gold text-background hover:bg-gold-hover'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { holdings, exportCSV, importCSV, refresh } = useHoldings();
  const { theme, setTheme } = useTheme();
  const { user, isConfigured, signOut } = useAuth();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    await signOut();
    setImportStatus('Signed out successfully');
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleExportCSV = () => {
    const csv = exportCSV();
    if (!csv) {
      setImportStatus('No holdings to export');
      setTimeout(() => setImportStatus(null), 3000);
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stacktracker-holdings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setImportStatus('CSV exported successfully');
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleExportJSON = () => {
    if (holdings.length === 0) {
      setImportStatus('No holdings to export');
      setTimeout(() => setImportStatus(null), 3000);
      return;
    }
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      holdings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stacktracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setImportStatus('Backup exported successfully');
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = importCSV(text);
      setImportStatus(`Imported ${imported.length} holdings from CSV`);
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setImportStatus(null), 5000);
    }

    // Reset input
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.holdings || !Array.isArray(backup.holdings)) {
        throw new Error('Invalid backup file format');
      }

      // Clear existing and import
      clearAllHoldings();
      localStorage.setItem('stacktracker_holdings', JSON.stringify(backup.holdings));
      refresh();

      setImportStatus(`Restored ${backup.holdings.length} holdings from backup`);
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      setImportStatus(`Restore failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setImportStatus(null), 5000);
    }

    // Reset input
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const handleClearAll = () => {
    clearAllHoldings();
    refresh();
    setImportStatus('All data cleared');
    setTimeout(() => setImportStatus(null), 3000);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Status Message */}
      {importStatus && (
        <div className={`mb-4 p-3 rounded-lg border ${
          importStatus.includes('failed') || importStatus.includes('No holdings')
            ? 'bg-red-500/10 border-red-500/30 text-red-500'
            : 'bg-green-500/10 border-green-500/30 text-green-500'
        }`}>
          {importStatus}
        </div>
      )}

      {/* Account */}
      {isConfigured && (
        <SettingsSection title="Account">
          {user ? (
            <>
              <div className="py-4 px-4">
                <p className="text-text">Signed in as</p>
                <p className="text-sm text-text-muted mt-0.5">{user.email}</p>
              </div>
              <SettingsRow
                label="Sign Out"
                description="Sign out of your account"
                onClick={handleSignOut}
              />
            </>
          ) : (
            <SettingsRow
              label="Sign In"
              description="Sign in to sync your holdings across devices"
              onClick={() => navigate('/auth')}
              rightElement={
                <span className="text-gold text-sm font-medium">Sign In</span>
              }
            />
          )}
        </SettingsSection>
      )}

      {/* Appearance */}
      <SettingsSection title="Appearance">
        <div className="flex items-center justify-between py-4 px-4">
          <div>
            <p className="text-text">Theme</p>
            <p className="text-sm text-text-muted mt-0.5">Choose your preferred color scheme</p>
          </div>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </SettingsSection>

      {/* Data Management */}
      <SettingsSection title="Data Management">
        <SettingsRow
          label="Export as CSV"
          description="Download holdings as spreadsheet"
          onClick={handleExportCSV}
        />
        <SettingsRow
          label="Export as JSON"
          description="Full backup of all data"
          onClick={handleExportJSON}
        />
        <SettingsRow
          label="Import from CSV"
          description="Add holdings from spreadsheet"
          onClick={() => csvInputRef.current?.click()}
        />
        <SettingsRow
          label="Restore from Backup"
          description="Import JSON backup file"
          onClick={() => jsonInputRef.current?.click()}
        />
        <SettingsRow
          label="Clear All Data"
          description="Delete all holdings permanently"
          onClick={() => setShowClearConfirm(true)}
          danger
        />
      </SettingsSection>

      {/* Hidden file inputs */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportCSV}
        className="hidden"
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportJSON}
        className="hidden"
      />

      {/* About */}
      <SettingsSection title="About">
        <div className="flex items-center justify-between py-4 px-4">
          <p className="text-text">Version</p>
          <p className="text-text-muted">{APP_VERSION}</p>
        </div>
        <div className="py-4 px-4">
          <p className="text-text">Privacy-First Design</p>
          <p className="text-sm text-text-muted mt-0.5">
            Your data stays on your device. We don't have access to your holdings.
          </p>
        </div>
        <SettingsRow
          label="Privacy Policy"
          href="https://stacktrackergold.com/privacy"
        />
        <SettingsRow
          label="Terms of Use"
          href="https://stacktrackergold.com/terms"
        />
      </SettingsSection>

      {/* Links */}
      <SettingsSection title="Get the App">
        <SettingsRow
          label="Download for iOS"
          description="Track your stack on iPhone"
          href="https://apps.apple.com/app/stack-tracker-gold/id6740512854"
          rightElement={
            <span className="text-gold text-sm font-medium">App Store</span>
          }
        />
        <SettingsRow
          label="Download for Android"
          description="Coming soon"
          rightElement={
            <span className="text-text-muted text-sm">Coming Soon</span>
          }
        />
        <SettingsRow
          label="Visit Website"
          href="https://stacktrackergold.com"
        />
      </SettingsSection>

      {/* Support */}
      <SettingsSection title="Support">
        <SettingsRow
          label="Contact Support"
          description="Get help with the app"
          href="mailto:support@mancinitechsolutions.com"
        />
        <SettingsRow
          label="Rate the App"
          description="Leave a review"
          onClick={() => {
            setImportStatus('Thanks for your feedback!');
            setTimeout(() => setImportStatus(null), 3000);
          }}
        />
      </SettingsSection>

      {/* Footer */}
      <div className="text-center text-text-muted text-sm mt-8 mb-4">
        <p>Stack Tracker Gold v{APP_VERSION}</p>
        <p className="mt-1">Made with care for stackers everywhere</p>
      </div>

      {/* Clear Data Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="Clear All Data?"
        message="This will permanently delete all your holdings. This action cannot be undone."
        confirmText="Clear All Data"
        danger
      />
    </div>
  );
}
