import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "VALEN TOOLS — AI Workspace", description: "Personal AI chat workspace powered by VannAPI.", applicationName: "VALEN TOOLS" };
export const viewport: Viewport = { themeColor: "#090b10", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
