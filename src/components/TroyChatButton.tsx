import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdvisorChat } from './AdvisorChat';
import { TroyCoinIcon } from './TroyCoinIcon';

interface TroyChatButtonProps {
  currentPage?: string;
}

export function TroyChatButton({ currentPage }: TroyChatButtonProps) {
  const [open, setOpen] = useState(false);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-gold/20"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open Troy chat"
      >
        <TroyCoinIcon size={56} />
      </motion.button>

      {/* Slide-in panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md z-[60] bg-sidebar border-l border-border flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <TroyCoinIcon size={32} />
                  <div>
                    <h2 className="text-sm font-semibold text-text">Troy</h2>
                    <p className="text-[11px] text-text-muted">Your Stack Analyst</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-text/5 transition-colors"
                  aria-label="Close Troy chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Chat body */}
              <div className="flex-1 overflow-hidden">
                <AdvisorChat currentPage={currentPage} isPanel />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
