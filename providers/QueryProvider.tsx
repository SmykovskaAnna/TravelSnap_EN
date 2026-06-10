import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { queryClient } from '@/lib/queryClient';
import { persister } from '@/utils/persister';

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

function useAppStateFocus() {
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        focusManager.setFocused(state === 'active');
      }
    );
    return () => subscription.remove();
  }, []);
}

export function QueryProvider({ children }: { children: ReactNode }) {
  useAppStateFocus();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: SEVEN_DAYS }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
