import RequireAuth from "@/features/auth/components/RequireAuth";

export default function DashboardLayout({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}
