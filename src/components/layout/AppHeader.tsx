
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTournamentDispatch } from '@/components/TournamentContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Zap, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';

export default function AppHeader() {
  const dispatch = useTournamentDispatch();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReset = () => {
    dispatch({ type: 'RESET_TOURNAMENT' });
  };

  const renderThemeToggleButton = () => {
    if (!mounted) {
      return <div className="w-10 h-10" />; 
    }
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        aria-label="Alternar tema"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-[1.2rem] w-[1.2rem]" />
        ) : (
          <Moon className="h-[1.2rem] w-[1.2rem]" />
        )}
      </Button>
    );
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-headline font-semibold text-primary hover:text-primary/80 transition-colors">
          <Zap className="h-6 w-6" />
          Gestor de Torneos
        </Link>
        <div className="flex items-center gap-2">
          {renderThemeToggleButton()}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Reiniciar Datos del Torneo</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente todos
                  los datos del torneo, incluyendo equipos, grupos y resultados de partidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Sí, reiniciar datos</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
