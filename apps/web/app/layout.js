import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

export const metadata = {
  title: "ZHAO · 常来长安",
  description: "Plateforme interne ZHAO's Family",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
