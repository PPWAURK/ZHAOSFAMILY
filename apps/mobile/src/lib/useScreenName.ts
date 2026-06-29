import { useEffect } from "react";
import { setCurrentScreen } from "@/lib/currentScreen";

export function useScreenName(name: string): void {
  useEffect(() => {
    setCurrentScreen(name);
    return () => setCurrentScreen("");
  }, [name]);
}
