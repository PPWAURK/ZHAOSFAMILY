import { mobileApiClient, mobileAuthStore } from '@/lib/api';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useStore } from 'zustand';

const HEARTBEAT_INTERVAL_MS = 30_000;

function isForeground(state: AppStateStatus): boolean {
  return state === 'active';
}

/**
 * Reports only authenticated, foreground mobile sessions. Redis expires the
 * server-side marker when this interval stops because of backgrounding, a
 * network loss, or the operating system closing the app.
 */
export function useMobilePresence(): void {
  const authStatus = useStore(mobileAuthStore, (state) => state.status);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return undefined;
    }

    let isActive = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    const sendHeartbeat = (): void => {
      if (!isActive || !isForeground(AppState.currentState)) {
        return;
      }

      void mobileApiClient.post('/presence/mobile/heartbeat').catch(() => {
        // Presence is best-effort. The next interval restores the marker after
        // transient network failures without interrupting the employee's work.
      });
    };

    const startHeartbeats = (): void => {
      if (interval) {
        return;
      }

      sendHeartbeat();
      interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    };

    const stopHeartbeats = (): void => {
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (isForeground(nextState)) {
        startHeartbeats();
        return;
      }

      stopHeartbeats();
    });

    if (isForeground(AppState.currentState)) {
      startHeartbeats();
    }

    return () => {
      isActive = false;
      stopHeartbeats();
      subscription.remove();
    };
  }, [authStatus]);
}
