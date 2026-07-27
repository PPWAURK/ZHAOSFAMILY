import { createContext, useContext, useState, type ReactNode } from "react";
import { SplashScreen } from "@/features/splash/SplashScreen";

const SplashCompletionContext = createContext(true);

type SplashCompletionProviderProps = {
  children: ReactNode;
};

export function SplashCompletionProvider({
  children,
}: SplashCompletionProviderProps): ReactNode {
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  return (
    <SplashCompletionContext.Provider value={isSplashComplete}>
      {children}
      <SplashScreen onFinish={() => setIsSplashComplete(true)} />
    </SplashCompletionContext.Provider>
  );
}

export function useSplashCompletion(): boolean {
  return useContext(SplashCompletionContext);
}
