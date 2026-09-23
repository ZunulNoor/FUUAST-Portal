'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const ConfirmContext = createContext(() => Promise.resolve(false));

export function useConfirm() {
  return useContext(ConfirmContext);
}

export default function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        tone: options.tone || 'primary',
      });
    });
  }, []);

  const settle = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <Modal
          size="sm"
          title={state.title}
          onClose={() => settle(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => settle(false)}>
                Cancel
              </Button>
              <Button
                variant={state.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => settle(true)}
              >
                {state.confirmLabel}
              </Button>
            </>
          }
        >
          <div className="px-5 py-5 text-sm text-muted sm:px-6">
            {state.message || 'This action cannot be undone.'}
          </div>
        </Modal>
      ) : null}
    </ConfirmContext.Provider>
  );
}