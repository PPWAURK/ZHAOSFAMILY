import "@/app/globals.css";
import AppProviders from "@/app/providers";
import { AuthProvider } from "@/features/auth/context/AuthContext";

export const metadata = {
  title: "ZHAO‘s Family",
  description: "Plateforme interne ZHAO's Family",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Noto+Serif+SC:wght@400;500;600;700;900&family=Noto+Serif:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400;1,600&display=swap"
        />
      </head>
      <body>
        <AppProviders>
          <AuthProvider>{children}</AuthProvider>
        </AppProviders>
      </body>
    </html>
  );
}
