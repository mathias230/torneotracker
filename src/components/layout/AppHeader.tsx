
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTournamentDispatch, useTournamentState } from '@/components/TournamentContext';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Zap, Sun, Moon, KeyRound, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "@/hooks/use-toast";


export default function AppHeader() {
  const dispatch = useTournamentDispatch();
  const { isAdminMode } = useTournamentState(); 
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const ADMIN_CODE = "may45456thttfdeddr"; // Updated Admin Code
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [isAdminCodeDialogOpen, setIsAdminCodeDialogOpen] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReset = () => {
    dispatch({ type: 'RESET_TOURNAMENT' });
     toast({
      title: "Datos Reiniciados",
      description: "Todos los datos del torneo han sido eliminados.",
    });
  };

  const handleAdminCodeCheck = () => {
    if (adminCodeInput === ADMIN_CODE) {
      dispatch({ type: 'SET_ADMIN_MODE', payload: true });
      toast({ title: 'Modo Admin Activado', description: 'Ahora tienes acceso a las funciones de administración.' });
      setIsAdminCodeDialogOpen(false);
      setAdminCodeInput('');
    } else {
      toast({ title: 'Código Incorrecto', description: 'El código de administrador no es válido.', variant: 'destructive' });
    }
  };

  const handleExitAdminMode = () => {
    dispatch({ type: 'SET_ADMIN_MODE', payload: false });
    toast({ title: 'Modo Admin Desactivado', description: 'Has salido del modo de administración.' });
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

          {isAdminMode ? (
            <Button variant="outline" size="sm" onClick={handleExitAdminMode}>
              <LogOut className="mr-2 h-4 w-4" /> Salir de Modo Admin
            </Button>
          ) : (
            <Dialog open={isAdminCodeDialogOpen} onOpenChange={(isOpen) => {
              setIsAdminCodeDialogOpen(isOpen);
              if (!isOpen) setAdminCodeInput(''); 
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <KeyRound className="mr-2 h-4 w-4" /> Acceder como Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Acceso de Administrador</DialogTitle>
                  <DialogDescription>
                    Ingresa el código secreto para acceder a las funciones de administración.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="admin-code" className="text-right">
                      Código
                    </Label>
                    <Input
                      id="admin-code"
                      type="password"
                      value={adminCodeInput}
                      onChange={(e) => setAdminCodeInput(e.target.value)}
                      className="col-span-3"
                      onKeyPress={(e) => e.key === 'Enter' && handleAdminCodeCheck()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                     <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="button" onClick={handleAdminCodeCheck}>Verificar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {isAdminMode && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Reiniciar Datos del Torneo</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estásolutamente seguro?</AlertDialogTitle>
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
          )}
        </div>
      </div>
    </header>
  );
}
