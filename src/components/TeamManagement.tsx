
"use client";
import React, { useState } from 'react';
import { useTournamentState, useTournamentDispatch, useIsClient } from '@/components/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Edit3, Save, XCircle, Users } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
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

export default function TeamManagement() {
  const { teams, isAdminMode } = useTournamentState();
  const dispatch = useTournamentDispatch();
  const [teamName, setTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const isClient = useIsClient();


  const handleAddTeam = () => {
    if (teamName.trim() === '') {
      toast({ title: "Error", description: "El nombre del equipo no puede estar vacío.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'ADD_TEAM', payload: { name: teamName.trim() } });
    setTeamName('');
    toast({ title: "Éxito", description: `Equipo "${teamName.trim()}" añadido.` });
  };

  const handleDeleteTeam = (teamId: string) => {
    dispatch({ type: 'DELETE_TEAM', payload: { teamId } });
    toast({ title: "Éxito", description: "Equipo eliminado." });
  };

  const handleEditTeam = (teamId: string, currentName: string) => {
    setEditingTeamId(teamId);
    setEditingTeamName(currentName);
  };

  const handleSaveEdit = () => {
    if (!editingTeamId || editingTeamName.trim() === '') {
      toast({ title: "Error", description: "El nombre del equipo no puede estar vacío durante la edición.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'EDIT_TEAM_NAME', payload: { teamId: editingTeamId, newName: editingTeamName.trim() } });
    toast({ title: "Éxito", description: "Nombre del equipo actualizado." });
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const handleCancelEdit = () => {
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  if (!isClient) {
    return <Card className="w-full max-w-2xl mx-auto mt-6">
      <CardHeader><CardTitle>Cargando Equipos...</CardTitle></CardHeader>
      <CardContent><div className="animate-pulse h-10 bg-muted rounded-md w-full"></div></CardContent>
    </Card>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-xl sm:text-2xl">
          {isAdminMode ? <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> : <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
          {isAdminMode ? "Gestionar Equipos" : "Equipos del Torneo"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAdminMode && (
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <Input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Ingresa el nombre del equipo"
              className="flex-grow"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTeam()}
            />
            <Button onClick={handleAddTeam} aria-label="Añadir equipo" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Equipo
            </Button>
          </div>
        )}

        {teams.length === 0 ? (
          <p className="text-muted-foreground text-center">No hay equipos añadidos aún. {isAdminMode && "¡Añade algunos equipos para empezar!"}</p>
        ) : (
          <ul className="space-y-3">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-secondary/50 rounded-md shadow-sm hover:shadow-md transition-shadow"
              >
                {isAdminMode && editingTeamId === team.id ? (
                  <div className="flex-grow flex w-full items-center gap-2 mb-2 sm:mb-0">
                    <Input 
                      value={editingTeamName} 
                      onChange={(e) => setEditingTeamName(e.target.value)}
                      className="flex-grow"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    />
                    <Button onClick={handleSaveEdit} size="icon" variant="ghost" aria-label="Guardar nombre del equipo">
                      <Save className="h-5 w-5 text-green-500" />
                    </Button>
                    <Button onClick={handleCancelEdit} size="icon" variant="ghost" aria-label="Cancelar edición">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-foreground font-medium mb-2 sm:mb-0 break-all">{team.name}</span>
                    {isAdminMode && (
                      <div className="flex gap-2 self-end sm:self-center">
                        <Button onClick={() => handleEditTeam(team.id, team.name)} variant="outline" size="sm" aria-label={`Editar equipo ${team.name}`}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" aria-label={`Eliminar equipo ${team.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que quieres eliminar el equipo "{team.name}"? Esto podría afectar a grupos y partidos existentes.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTeam(team.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
