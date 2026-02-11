import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'signin' | 'signup';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, isConfigured, signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Auth Not Configured</h1>
          <p className="text-text-muted mb-4">
            Supabase credentials are not set up. Please configure your environment variables.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gold text-background font-medium rounded-lg hover:bg-gold-hover transition-colors"
          >
            Continue Without Auth
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for a confirmation link!');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    const { error } = await signInWithApple();
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold mb-2">Stack Tracker Gold</h1>
          <p className="text-text-muted">
            {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface border border-border rounded-lg p-6">
          {/* Mode Toggle */}
          <div className="flex mb-6 bg-background rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setMessage(null);
                setConfirmPassword('');
              }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                mode === 'signin'
                  ? 'bg-gold text-background font-medium'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                mode === 'signup'
                  ? 'bg-gold text-background font-medium'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-light text-text font-medium rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50 border border-border"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Apple Sign In */}
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface text-text font-medium rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50 border border-border"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-sm text-text-muted">or</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 rounded-lg bg-background border border-border focus:border-gold focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 rounded-lg bg-background border border-border focus:border-gold focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full p-3 rounded-lg bg-background border border-border focus:border-gold focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gold text-background font-medium rounded-lg hover:bg-gold-hover transition-colors disabled:opacity-50"
            >
              {submitting
                ? 'Loading...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Back to app link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-text-muted hover:text-text transition-colors text-sm"
          >
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  );
}
