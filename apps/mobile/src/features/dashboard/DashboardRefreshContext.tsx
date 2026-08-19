import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

const DashboardRefreshContext = createContext(0);

type DashboardRefreshOptions = {
  deferMs?: number;
  isActive?: boolean;
};

export function DashboardRefreshProvider({
  children,
  onForegroundRefresh,
}: {
  children: ReactNode;
  onForegroundRefresh?: () => void;
}): ReactNode {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasInactive = appStateRef.current === "background" || appStateRef.current === "inactive";

      appStateRef.current = nextState;

      if (wasInactive && nextState === "active") {
        setRefreshVersion((currentVersion) => currentVersion + 1);
        onForegroundRefresh?.();
      }
    });

    return () => subscription.remove();
  }, [onForegroundRefresh]);

  return (
    <DashboardRefreshContext.Provider value={refreshVersion}>
      {children}
    </DashboardRefreshContext.Provider>
  );
}

export function useDashboardRefreshVersion({
  deferMs = 0,
  isActive = true,
}: DashboardRefreshOptions = {}): number {
  const refreshVersion = useContext(DashboardRefreshContext);
  const [scheduledVersion, setScheduledVersion] = useState(refreshVersion);

  useEffect(() => {
    if (isActive || deferMs === 0) {
      setScheduledVersion(refreshVersion);
      return undefined;
    }

    const timeout = setTimeout(() => setScheduledVersion(refreshVersion), deferMs);

    return () => clearTimeout(timeout);
  }, [deferMs, isActive, refreshVersion]);

  return scheduledVersion;
}
