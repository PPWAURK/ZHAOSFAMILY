import RequireAuth from "@/features/auth/components/RequireAuth";
import PlatformUsageTracker from "@/features/dashboard/components/PlatformUsageTracker";

export default function DashboardLayout({ children }) {
  return (
    <RequireAuth>
      <PlatformUsageTracker />
      {children}
    </RequireAuth>
  );
}
