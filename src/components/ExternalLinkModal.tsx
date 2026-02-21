import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExternalLinkModalProps {
  isOpen: boolean;
  url: string;
  onClose: () => void;
}

export function ExternalLinkModal({ isOpen, url, onClose }: ExternalLinkModalProps) {
  let displayUrl = url;
  try {
    const parsed = new URL(url);
    displayUrl = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
  } catch { /* keep raw */ }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-surface border border-border rounded-xl max-w-sm w-full p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
              <h3 className="text-base font-semibold">Leaving Stack Tracker</h3>
            </div>
            <p className="text-sm text-text-muted mb-1">You're about to visit an external site:</p>
            <p className="text-sm text-gold font-medium break-all mb-5">{displayUrl}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-lg bg-background border border-border hover:bg-surface-hover text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.open(url, '_blank', 'noopener,noreferrer');
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gold text-background font-medium text-sm hover:bg-gold-hover transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Hook to manage external link modal state */
export function useExternalLink() {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const openExternal = useCallback((url: string) => {
    // mailto links open directly — no warning needed
    if (url.startsWith('mailto:')) {
      window.location.href = url;
      return;
    }
    setPendingUrl(url);
  }, []);

  const close = useCallback(() => setPendingUrl(null), []);

  return { pendingUrl, isOpen: pendingUrl !== null, openExternal, close };
}
