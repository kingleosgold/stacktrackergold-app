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
  const {
    user,
    isConfigured,
    signOut,
    linkWithGoogle,
    linkWithApple,
    updateEmailPassword,
    getLinkedProviders,
    hasEmailPassword,
  } = useAuth();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showEmailPasswordForm, setShowEmailPasswordForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const linkedProviders = user ? getLinkedProviders() : [];
  const hasEmail = user ? hasEmailPassword() : false;

  const handleSignOut = async () => {
    await signOut();
    setImportStatus('Signed out successfully');
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleLinkGoogle = async () => {
    setLinkingProvider('google');
    const { error } = await linkWithGoogle();
    if (error) {
      setImportStatus(`Failed to link Google: ${error.message}`);
      setTimeout(() => setImportStatus(null), 5000);
    }
    setLinkingProvider(null);
  };

  const handleLinkApple = async () => {
    setLinkingProvider('apple');
    const { error } = await linkWithApple();
    if (error) {
      setImportStatus(`Failed to link Apple: ${error.message}`);
      setTimeout(() => setImportStatus(null), 5000);
    }
    setLinkingProvider(null);
  };

  const handleUpdateEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmNewPassword) {
      setImportStatus('Passwords do not match');
      setTimeout(() => setImportStatus(null), 3000);
      return;
    }

    const { error } = await updateEmailPassword(newEmail, newPassword);
    if (error) {
      setImportStatus(`Failed to update: ${error.message}`);
      setTimeout(() => setImportStatus(null), 5000);
    } else {
      setImportStatus('Account updated successfully');
      setTimeout(() => setImportStatus(null), 3000);
      setShowEmailPasswordForm(false);
      setNewEmail('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
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
                <p className="text-sm text-text-muted mt-0.5">{user.email || 'No email set'}</p>
              </div>

              {/* Linked Providers */}
              <div className="py-4 px-4 border-t border-border">
                <p className="text-text font-medium mb-3">Sign-in Methods</p>
                <div className="space-y-3">
                  {/* Google */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <span className="text-text">Google</span>
                    </div>
                    {linkedProviders.includes('google') ? (
                      <span className="flex items-center gap-1 text-green-500 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                        Linked
                      </span>
                    ) : (
                      <button
                        onClick={handleLinkGoogle}
                        disabled={linkingProvider === 'google'}
                        className="px-3 py-1 text-sm bg-gold text-background font-medium rounded-lg hover:bg-gold-hover transition-colors disabled:opacity-50"
                      >
                        {linkingProvider === 'google' ? 'Linking...' : 'Link'}
                      </button>
                    )}
                  </div>

                  {/* Apple */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                      </div>
                      <span className="text-text">Apple</span>
                    </div>
                    {linkedProviders.includes('apple') ? (
                      <span className="flex items-center gap-1 text-green-500 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                        Linked
                      </span>
                    ) : (
                      <button
                        onClick={handleLinkApple}
                        disabled={linkingProvider === 'apple'}
                        className="px-3 py-1 text-sm bg-gold text-background font-medium rounded-lg hover:bg-gold-hover transition-colors disabled:opacity-50"
                      >
                        {linkingProvider === 'apple' ? 'Linking...' : 'Link'}
                      </button>
                    )}
                  </div>

                  {/* Email/Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-surface-hover rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      <span className="text-text">Email & Password</span>
                    </div>
                    {hasEmail ? (
                      <span className="flex items-center gap-1 text-green-500 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                        Set
                      </span>
                    ) : (
                      <button
                        onClick={() => setShowEmailPasswordForm(true)}
                        className="px-3 py-1 text-sm bg-gold text-background font-medium rounded-lg hover:bg-gold-hover transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Email/Password Form */}
              {showEmailPasswordForm && (
                <div className="py-4 px-4 border-t border-border">
                  <form onSubmit={handleUpdateEmailPassword} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder={user.email || 'Enter email'}
                        className="w-full p-2 rounded-lg bg-background border border-border focus:border-gold focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        minLength={6}
                        className="w-full p-2 rounded-lg bg-background border border-border focus:border-gold focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm new password"
                        minLength={6}
                        className="w-full p-2 rounded-lg bg-background border border-border focus:border-gold focus:outline-none text-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmailPasswordForm(false);
                          setNewEmail('');
                          setNewPassword('');
                          setConfirmNewPassword('');
                        }}
                        className="flex-1 py-2 px-3 text-sm bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 px-3 text-sm bg-gold text-background font-medium rounded-lg hover:bg-gold-hover transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Change Email/Password for existing users */}
              {hasEmail && !showEmailPasswordForm && (
                <SettingsRow
                  label="Change Email or Password"
                  description="Update your sign-in credentials"
                  onClick={() => setShowEmailPasswordForm(true)}
                />
              )}

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
