import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavBar } from "@/components/NavBar";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Productivity",
  description: "Calendar, Tasks & Skills, synced with Google",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-black dark:bg-neutral-950 dark:text-white font-sans">
        <AuthProvider>
          <ThemeProvider>
            <div className="flex flex-1 min-h-screen">
              <NavBar />
              <main className="flex-1 pb-16 md:pb-0 overflow-y-auto">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
