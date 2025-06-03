
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/layout/AppHeader';
import { TournamentProvider } from '@/components/TournamentContext';
import { ThemeProvider } from 'next-themes';

export const metadata: Metadata = {
  title: 'Gestor de Torneos',
  description: 'Administra tus propios cuadros y clasificaciones de torneos deportivos.',
  icons: {
    icon: '/favicon.ico', // Next.js buscará este archivo en la carpeta public/
    apple: '/apple-touch-icon.png', // Para dispositivos Apple
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TournamentProvider>
            <AppHeader />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <Toaster />
          </TournamentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
