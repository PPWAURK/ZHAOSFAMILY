import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { SplashScreen } from "@/features/splash/SplashScreen";
import { mobileAuthStore } from "@/lib/api";

const SplashCompletionContext = createContext(true);

type SplashCompletionProviderProps = {
  children: ReactNode;
};

export function SplashCompletionProvider({
  children,
}: SplashCompletionProviderProps): ReactNode {
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const authStatus = useStore(mobileAuthStore, (state) => state.status);

  useEffect(() => {
    if (authStatus === "authenticated" || authStatus === "offline" || authStatus === "anonymous") {
      setIsSplashComplete(true);
    }
  }, [authStatus]);

  return (
    <SplashCompletionContext.Provider value={isSplashComplete}>
      {children}
      {!isSplashComplete ? <SplashScreen onFinish={() => setIsSplashComplete(true)} /> : null}
    </SplashCompletionContext.Provider>
  );
}

export function useSplashCompletion(): boolean {
  return useContext(SplashCompletionContext);
}
