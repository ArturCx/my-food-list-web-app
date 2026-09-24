import type { Metadata, Viewport } from "next";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import "./globals.css";
import { authEnabled } from "@/lib/auth";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "My Food List",
  description: "Lista pessoal de bares e restaurantes em Belo Horizonte",
};

export const viewport: Viewport = {
  themeColor: "#dbeafe",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${caveat.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {authEnabled() ? <ClerkProvider localization={ptBR} appearance={clerkAppearance}>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
