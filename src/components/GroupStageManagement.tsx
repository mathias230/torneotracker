
"use client";
import React, { useState, useMemo, useRef } from 'react';
import { useTournamentState, useTournamentDispatch, useIsClient } from '@/components/TournamentContext';
import type { Group, Team, Match, GroupTeamStats, LeagueZoneSetting } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Users, ListChecks, Swords, Save, XCircle, Repeat, Palette, Edit3, Camera } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { exportElementAsImageWithTheme } from '@/lib/exportToImage';
import { Checkbox } from '@/components/ui/checkbox';


interface MatchScoreInput {
  [matchId: string]: { team1Score: string; team2Score: string };
}

interface ZoneFormState {
  id?: string;
  name: string;
  startPosition: string;
  endPosition: string;
  color: string;
}

export default function GroupStageManagement() {
  const { teams, groups } = useTournamentState();
  const dispatch = useTournamentDispatch();
  const [groupName, setGroupName] = useState('');
  const [numRandomGroups, setNumRandomGroups] = useState('2');
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState<{ [groupId: string]: string }>({});
  const [matchScores, setMatchScores] = useState<MatchScoreInput>({});
  const isClient = useIsClient();

  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [currentZone, setCurrentZone] = useState<ZoneFormState>({ name: '', startPosition: '1', endPosition: '1', color: '#4CAF50' });
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [activeGroupIdForZoneModal, setActiveGroupIdForZoneModal] = useState<string | null>(null);

  const groupTableRefs = useRef<{ [groupId: string]: HTMLDivElement | null }>({});
  const [selectedGroupsForExport, setSelectedGroupsForExport] = useState<string[]>([]);


  const handleCreateGroup = () => {
    if (groupName.trim() === '') {
      toast({ title: "Error", description: "El nombre del grupo no puede estar vacío.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'CREATE_GROUP', payload: { name: groupName.trim() } });
    setGroupName('');
    toast({ title: "Éxito", description: `Grupo "${groupName.trim()}" creado.` });
  };

  const handleDeleteGroup = (groupId: string) => {
    dispatch({ type: 'DELETE_GROUP', payload: { groupId } });
    setSelectedGroupsForExport(prev => prev.filter(id => id !== groupId)); // Deselect if deleted
    toast({ title: "Éxito", description: "Grupo eliminado." });
  };

  const handleAddTeamToGroup = (groupId: string) => {
    const teamId = selectedTeamToAdd[groupId];
    if (!teamId) {
      toast({ title: "Error", description: "Por favor, selecciona un equipo para añadir.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'ADD_TEAM_TO_GROUP', payload: { groupId, teamId } });
    setSelectedTeamToAdd(prev => ({ ...prev, [groupId]: '' }));
    toast({ title: "Éxito", description: "Equipo añadido al grupo." });
  };

  const handleRemoveTeamFromGroup = (groupId: string, teamId: string) => {
    dispatch({ type: 'REMOVE_TEAM_FROM_GROUP', payload: { groupId, teamId } });
    toast({ title: "Éxito", description: "Equipo eliminado del grupo." });
  };

  const handleGenerateMatches = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group && group.teamIds.length < 2) {
      toast({ title: "Error", description: "Un grupo necesita al menos 2 equipos para generar partidos.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'GENERATE_GROUP_MATCHES', payload: { groupId } });
    toast({ title: "Éxito", description: "Partidos generados (orden aleatorio) para el grupo." });
  };

  const handleScoreChange = (groupId: string, matchId: string, team: 'team1' | 'team2', value: string) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === 'team1' ? 'team1Score' : 'team2Score']: value,
      },
    }));
  };

  const handleUpdateMatchResult = (groupId: string, matchId: string) => {
    const scores = matchScores[matchId];
    if (!scores || scores.team1Score === undefined || scores.team2Score === undefined) {
      toast({ title: "Error", description: "Por favor, ingresa puntuaciones para ambos equipos.", variant: "destructive" });
      return;
    }
    const team1Score = parseInt(scores.team1Score, 10);
    const team2Score = parseInt(scores.team2Score, 10);

    if (isNaN(team1Score) || isNaN(team2Score) || team1Score < 0 || team2Score < 0) {
      toast({ title: "Error", description: "Las puntuaciones deben ser números válidos no negativos.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'UPDATE_GROUP_MATCH_RESULT', payload: { groupId, matchId, team1Score, team2Score } });
    toast({ title: "Éxito", description: "Resultado del partido actualizado." });
  };

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Equipo Desconocido';

  const getGroupStandings = useMemo(() => (groupId: string): GroupTeamStats[] => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];

    const statsMap = new Map<string, GroupTeamStats>();
    group.teamIds.forEach(teamId => {
      statsMap.set(teamId, {
        teamId,
        teamName: getTeamName(teamId),
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0,
      });
    });

    group.matches.forEach(match => {
      if (match.played && match.team1Score !== null && match.team2Score !== null) {
        const team1Stats = statsMap.get(match.team1Id)!;
        const team2Stats = statsMap.get(match.team2Id)!;

        team1Stats.played++; team2Stats.played++;
        team1Stats.gf += match.team1Score; team1Stats.ga += match.team2Score;
        team2Stats.gf += match.team2Score; team2Stats.ga += match.team1Score;

        if (match.team1Score > match.team2Score) {
          team1Stats.won++; team1Stats.points += 3; team2Stats.lost++;
        } else if (match.team1Score < match.team2Score) {
          team2Stats.won++; team2Stats.points += 3; team1Stats.lost++;
        } else {
          team1Stats.drawn++; team2Stats.drawn++;
          team1Stats.points += 1; team1Stats.points += 1;
        }
      }
    });

    const standings = Array.from(statsMap.values());
    standings.forEach(stat => stat.gd = stat.gf - stat.ga);
    return standings.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.teamName.localeCompare(b.teamName));
  }, [groups, teams]);

  const handleCreateRandomGroups = () => {
    const count = parseInt(numRandomGroups, 10);
    if (isNaN(count) || count <= 0) {
      toast({ title: "Error", description: "Por favor, ingresa un número válido de grupos.", variant: "destructive" });
      return;
    }
    if (teams.length === 0) {
       toast({ title: "Error", description: "No hay equipos disponibles para crear grupos. Por favor, añade equipos primero.", variant: "destructive" });
      return;
    }
     if (teams.length < count) {
      toast({ title: "Error", description: `No hay suficientes equipos (tienes ${teams.length}, se necesitan al menos ${count}) para crear ${count} grupos.`, variant: "destructive" });
      return;
    }
    dispatch({ type: 'RANDOMLY_CREATE_GROUPS_AND_ASSIGN_TEAMS', payload: { numGroups: count, groupNamePrefix: "Grupo Aleatorio" } });
    toast({ title: "Éxito", description: `${count} grupos aleatorios creados y equipos asignados.` });
    setNumRandomGroups('2');
  };

  const openZoneModalForGroupNew = (groupId: string) => {
    setActiveGroupIdForZoneModal(groupId);
    setEditingZoneId(null);
    setCurrentZone({ name: '', startPosition: '1', endPosition: '1', color: '#4CAF50' });
    setIsZoneModalOpen(true);
  };

  const openZoneModalForGroupEdit = (groupId: string, zone: LeagueZoneSetting) => {
    setActiveGroupIdForZoneModal(groupId);
    setEditingZoneId(zone.id);
    setCurrentZone({
      id: zone.id,
      name: zone.name,
      startPosition: zone.startPosition.toString(),
      endPosition: zone.endPosition.toString(),
      color: zone.color
    });
    setIsZoneModalOpen(true);
  };

  const handleSaveGroupZone = () => {
    if (!activeGroupIdForZoneModal) return;

    const { name, startPosition: startStr, endPosition: endStr, color } = currentZone;
    const startPosNum = parseInt(startStr, 10);
    let endPosNum = parseInt(endStr, 10);

    if (name.trim() === '') {
      toast({ title: "Error", description: "El nombre de la zona no puede estar vacío.", variant: "destructive" });
      return;
    }
    if (isNaN(startPosNum) || startPosNum <= 0) {
      toast({ title: "Error", description: "La posición inicial debe ser un número positivo válido.", variant: "destructive" });
      return;
    }
     if (endStr.trim() === '' || isNaN(endPosNum)) {
      endPosNum = startPosNum;
    } else if (endPosNum <= 0) {
        toast({ title: "Error", description: "La posición final debe ser un número positivo válido si se especifica.", variant: "destructive" });
        return;
    }
    if (startPosNum > endPosNum) {
      toast({ title: "Error", description: "La posición inicial no puede ser mayor que la posición final.", variant: "destructive" });
      return;
    }

    const zoneData = { name: name.trim(), startPosition: startPosNum, endPosition: endPosNum, color };

    if (editingZoneId) {
      dispatch({ type: 'EDIT_GROUP_ZONE', payload: { groupId: activeGroupIdForZoneModal, zone: { id: editingZoneId, ...zoneData } } });
      toast({ title: "Éxito", description: "Zona de clasificación del grupo actualizada." });
    } else {
      dispatch({ type: 'ADD_GROUP_ZONE', payload: { groupId: activeGroupIdForZoneModal, ...zoneData } });
      toast({ title: "Éxito", description: "Zona de clasificación añadida al grupo." });
    }
    setIsZoneModalOpen(false);
    setEditingZoneId(null);
    setActiveGroupIdForZoneModal(null);
  };

  const handleDeleteGroupZone = (groupId: string, zoneId: string) => {
    dispatch({ type: 'DELETE_GROUP_ZONE', payload: { groupId, zoneId } });
    toast({ title: "Éxito", description: "Zona de clasificación del grupo eliminada." });
  };

  const getZoneForGroupPosition = (group: Group, position: number): LeagueZoneSetting | undefined => {
    if (!group.zoneSettings) return undefined;
    const sortedZones = [...group.zoneSettings].sort((a,b) => {
      if (a.startPosition !== b.startPosition) {
        return a.startPosition - b.startPosition;
      }
      return a.endPosition - b.endPosition;
    });
    return sortedZones.find(zone => position >= zone.startPosition && position <= zone.endPosition);
  };

  const handleGroupTableExport = (group: Group) => {
    const groupElement = groupTableRefs.current[group.id];
    if (groupElement) {
      exportElementAsImageWithTheme(groupElement, `grupo_${group.name}_clasificacion`);
    } else {
       toast({
        title: "Error al Exportar",
        description: `No se pudo encontrar la tabla del grupo ${group.name} para exportar.`,
        variant: "destructive",
      });
    }
  };

  const handleToggleGroupForExport = (groupId: string) => {
    setSelectedGroupsForExport(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleExportSelectedGroups = async () => {
    if (selectedGroupsForExport.length === 0) {
      toast({ title: "Nada que exportar", description: "Por favor, selecciona al menos un grupo para exportar.", variant: "default" });
      return;
    }

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px'; 
    tempContainer.style.width = 'auto'; 
    tempContainer.style.padding = '20px'; 
    tempContainer.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('background-color').trim() || '#ffffff';


    const clonedElementsPromises = selectedGroupsForExport.map(async groupId => {
      const groupElement = groupTableRefs.current[groupId];
      if (groupElement) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '20px'; 
        wrapper.style.border = '1px solid #e0e0e0'; 
        wrapper.style.padding = '10px'; 
        
        const clone = groupElement.cloneNode(true) as HTMLElement;
        clone.style.width = `${groupElement.scrollWidth}px`; 
        wrapper.appendChild(clone);
        return wrapper;
      }
      return null;
    });

    const resolvedClonedElements = (await Promise.all(clonedElementsPromises)).filter(el => el !== null) as HTMLElement[];

    if (resolvedClonedElements.length === 0) {
        toast({ title: "Error", description: "No se pudieron encontrar los elementos de los grupos seleccionados.", variant: "destructive"});
        return;
    }
    
    resolvedClonedElements.forEach(el => tempContainer.appendChild(el));
    document.body.appendChild(tempContainer);

    try {
      await exportElementAsImageWithTheme(tempContainer, `multi_grupos_export`);
      setSelectedGroupsForExport([]); 
    } catch (error) {
      console.error("Error al exportar grupos seleccionados:", error);
      toast({ title: "Error de Exportación", description: "Ocurrió un problema al generar la imagen combinada.", variant: "destructive" });
    } finally {
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  };


  if (!isClient) {
     return <Card className="w-full max-w-4xl mx-auto mt-6">
      <CardHeader><CardTitle>Cargando Fase de Grupos...</CardTitle></CardHeader>
      <CardContent><div className="animate-pulse h-20 bg-muted rounded-md w-full"></div></CardContent>
    </Card>;
  }

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-xl sm:text-2xl">
            <Repeat className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Crear Grupos Aleatorios
          </CardTitle>
          <CardDescription>
            Crea automáticamente un número específico de grupos y asigna equipos disponibles aleatoriamente. Los partidos también se generarán aleatoriamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Input
              type="number"
              value={numRandomGroups}
              onChange={(e) => setNumRandomGroups(e.target.value)}
              placeholder="Número de grupos"
              min="1"
            />
            <Button onClick={handleCreateRandomGroups} aria-label="Crear grupos aleatorios">
              <Repeat className="mr-2 h-4 w-4" /> Generar Grupos Aleatorios
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-xl sm:text-2xl">
            <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Crear Nuevo Grupo Manualmente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ingresa el nombre del grupo (ej., Grupo A)"
              className="flex-grow"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <Button onClick={handleCreateGroup} aria-label="Crear grupo" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Crear
            </Button>
          </div>
        </CardContent>
      </Card>

      {groups.length > 0 && (
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Exportar Múltiples Grupos</CardTitle>
            <CardDescription>
              Selecciona los grupos que deseas incluir en una sola imagen. Se apilarán verticalmente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportSelectedGroups}
              disabled={selectedGroupsForExport.length === 0}
              className="w-full"
            >
              <Camera className="mr-2 h-4 w-4" />
              Exportar {selectedGroupsForExport.length > 0 ? `${selectedGroupsForExport.length} Grupo(s) Seleccionado(s)` : 'Grupos Seleccionados'}
            </Button>
            {selectedGroupsForExport.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Grupos seleccionados para exportar: {selectedGroupsForExport.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
                </p>
            )}
          </CardContent>
        </Card>
      )}

      {groups.length === 0 && (
        <p className="text-muted-foreground text-center mt-6">Aún no se han creado grupos. Crea un grupo para gestionar equipos y partidos.</p>
      )}

      {groups.map((group) => (
        <Card key={group.id} className="w-full max-w-4xl mx-auto shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex-grow">
              <div className="flex items-center gap-3 mb-1">
                <Checkbox
                  id={`select-group-export-${group.id}`}
                  checked={selectedGroupsForExport.includes(group.id)}
                  onCheckedChange={() => handleToggleGroupForExport(group.id)}
                  aria-label={`Seleccionar grupo ${group.name} para exportación múltiple`}
                />
                <Label htmlFor={`select-group-export-${group.id}`} className="cursor-pointer flex-grow">
                    <CardTitle className="font-headline text-xl sm:text-2xl text-primary hover:underline">{group.name}</CardTitle>
                </Label>
              </div>
              <CardDescription className="ml-9 sm:ml-0">Gestiona equipos, partidos y clasificaciones para este grupo.</CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                 <Button variant="destructive" size="sm" aria-label={`Eliminar grupo ${group.name}`} className="w-full sm:w-auto self-start sm:self-center">
                  <Trash2 className="mr-1 h-4 w-4" /> Eliminar Grupo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro de que quieres eliminar el grupo "{group.name}"? Todos sus equipos y partidos serán eliminados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border rounded-md bg-background">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Users className="h-5 w-5 text-accent" /> Equipos en el Grupo</h3>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <Select
                  value={selectedTeamToAdd[group.id] || ''}
                  onValueChange={(value) => setSelectedTeamToAdd(prev => ({ ...prev, [group.id]: value }))}
                >
                  <SelectTrigger className="flex-grow">
                    <SelectValue placeholder="Selecciona equipo para añadir" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.filter(t => !group.teamIds.includes(t.id)).map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                     {teams.filter(t => !group.teamIds.includes(t.id)).length === 0 && <p className="p-2 text-sm text-muted-foreground">No hay más equipos para añadir.</p>}
                  </SelectContent>
                </Select>
                <Button onClick={() => handleAddTeamToGroup(group.id)} size="sm" aria-label="Añadir equipo seleccionado al grupo" className="w-full sm:w-auto">Añadir Equipo</Button>
              </div>
              {group.teamIds.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {group.teamIds.map(teamId => (
                    <li key={teamId} className="flex justify-between items-center p-1.5 bg-secondary/30 rounded">
                      {getTeamName(teamId)}
                      <Button onClick={() => handleRemoveTeamFromGroup(group.id, teamId)} variant="ghost" size="icon" className="h-6 w-6" aria-label={`Eliminar equipo ${getTeamName(teamId)} del grupo`}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-muted-foreground">Aún no hay equipos en este grupo.</p>}
            </div>

            <div className="p-4 border rounded-md bg-background">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Swords className="h-5 w-5 text-accent" /> Partidos (Orden Aleatorio)</h3>
              {group.teamIds.length >= 2 && (
                 <Button onClick={() => handleGenerateMatches(group.id)} className="w-full mb-3" variant="outline" aria-label="Generar o Re-generar partidos para el grupo">
                  {group.matches.length > 0 ? "Re-generar Partidos (Orden Aleatorio)" : "Generar Partidos (Orden Aleatorio)"}
                </Button>
              )}
              {group.matches.length > 0 ? (
                <ScrollArea className="h-[200px] pr-3">
                  <ul className="space-y-2">
                    {group.matches.map(match => (
                      <li key={match.id} className="p-2.5 border rounded-md bg-secondary/30 text-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1.5">
                          <span className="break-all"><strong>{getTeamName(match.team1Id)}</strong> vs <strong>{getTeamName(match.team2Id)}</strong></span>
                          {match.played && <span className="text-xs px-1.5 py-0.5 bg-green-200 text-green-800 rounded-full mt-1 sm:mt-0">Jugado</span>}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Input
                            type="number"
                            min="0"
                            placeholder="Res. 1"
                            value={matchScores[match.id]?.team1Score ?? match.team1Score ?? ''}
                            onChange={(e) => handleScoreChange(group.id, match.id, 'team1', e.target.value)}
                            className="w-20 h-8 text-xs"
                            disabled={match.played && (matchScores[match.id] === undefined)}
                          />
                          <span>-</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Res. 2"
                            value={matchScores[match.id]?.team2Score ?? match.team2Score ?? ''}
                            onChange={(e) => handleScoreChange(group.id, match.id, 'team2', e.target.value)}
                            className="w-20 h-8 text-xs"
                            disabled={match.played && (matchScores[match.id] === undefined)}
                          />
                          <Button onClick={() => handleUpdateMatchResult(group.id, match.id)} size="sm" variant="outline" className="h-8 text-xs" aria-label="Guardar resultado del partido">
                            <Save className="mr-1 h-3 w-3" /> Guardar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : <p className="text-xs text-muted-foreground">No hay partidos generados o los equipos son insuficientes.</p>}
            </div>

            <div className="p-4 border rounded-md bg-background" ref={el => groupTableRefs.current[group.id] = el}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2"><ListChecks className="h-5 w-5 text-accent" /> Clasificación del Grupo</h3>
                 <Button 
                    onClick={() => handleGroupTableExport(group)} 
                    variant="outline" 
                    size="sm"
                    data-html2canvas-ignore="true"
                  >
                  <Camera className="mr-2 h-4 w-4" /> Tomar Foto (Individual)
                </Button>
              </div>
              {getGroupStandings(group.id).length > 0 ? (
                <>
                  <ScrollArea className="max-w-full">
                    <Table className="min-w-[600px] sm:min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold w-[60px] text-center">#</TableHead>
                          <TableHead className="font-bold">Equipo</TableHead>
                          <TableHead className="text-center">PJ</TableHead>
                          <TableHead className="text-center">PG</TableHead>
                          <TableHead className="text-center">PE</TableHead>
                          <TableHead className="text-center">PP</TableHead>
                          <TableHead className="text-center">GF</TableHead>
                          <TableHead className="text-center">GC</TableHead>
                          <TableHead className="text-center">DG</TableHead>
                          <TableHead className="text-center font-bold">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getGroupStandings(group.id).map((stat, index) => {
                          const position = index + 1;
                          const zone = getZoneForGroupPosition(group, position);
                          return (
                            <TableRow key={stat.teamId}>
                              <TableCell className="text-center font-medium relative pl-6">
                                 {zone && (
                                  <span
                                    className="absolute left-0 top-0 bottom-0 w-1.5"
                                    style={{ backgroundColor: zone.color }}
                                    aria-hidden="true"
                                  ></span>
                                )}
                                {position}.
                              </TableCell>
                              <TableCell className="truncate max-w-[100px] sm:max-w-xs">{stat.teamName}</TableCell>
                              <TableCell className="text-center">{stat.played}</TableCell>
                              <TableCell className="text-center">{stat.won}</TableCell>
                              <TableCell className="text-center">{stat.drawn}</TableCell>
                              <TableCell className="text-center">{stat.lost}</TableCell>
                              <TableCell className="text-center">{stat.gf}</TableCell>
                              <TableCell className="text-center">{stat.ga}</TableCell>
                              <TableCell className="text-center">{stat.gd}</TableCell>
                              <TableCell className="text-center font-bold">{stat.points}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {group.zoneSettings && group.zoneSettings.length > 0 && (
                    <div className="mt-4 p-3 border rounded-md bg-secondary/30">
                      <h4 className="text-md font-semibold mb-2 text-secondary-foreground">Clasificaciones:</h4>
                      <ul className="space-y-1">
                        {group.zoneSettings.map(zone => (
                          <li key={`legend-group-${group.id}-${zone.id}`} className="flex items-center gap-2 text-sm text-secondary-foreground">
                            <span
                              className="h-3 w-3 rounded-sm inline-block border border-border"
                              style={{ backgroundColor: zone.color }}
                              aria-hidden="true"
                            ></span>
                            <span>{zone.name} (Pos. {zone.startPosition}{zone.startPosition !== zone.endPosition ? `-${zone.endPosition}` : ''})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : <p className="text-xs text-muted-foreground">No hay clasificaciones para mostrar. Añade equipos y registra resultados de partidos.</p>}
            </div>

            <div className="p-4 border rounded-md bg-background">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Palette className="h-5 w-5 text-accent" /> Zonas de Clasificación del Grupo</h3>
                <Button size="sm" onClick={() => openZoneModalForGroupNew(group.id)}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Zona al Grupo</Button>
              </div>
              {(group.zoneSettings || []).length > 0 ? (
                <div className="space-y-2">
                  {(group.zoneSettings || []).map(zone => (
                    <div key={zone.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-sm border border-border" style={{ backgroundColor: zone.color }}></span>
                        <span>{zone.name} (Pos. {zone.startPosition}{zone.startPosition !== zone.endPosition ? `-${zone.endPosition}` : ''})</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openZoneModalForGroupEdit(group.id, zone)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que quieres eliminar la zona "{zone.name}" de este grupo?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteGroupZone(group.id, zone.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No se han configurado zonas de clasificación para este grupo.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

       <Dialog open={isZoneModalOpen} onOpenChange={(isOpen) => {
        setIsZoneModalOpen(isOpen);
        if (!isOpen) setActiveGroupIdForZoneModal(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingZoneId ? 'Editar Zona de Clasificación del Grupo' : 'Añadir Nueva Zona al Grupo'}</DialogTitle>
            <DialogDescription>
              Define un nombre, el rango de posiciones (inicio y fin), y un color para esta zona específica del grupo.
              Para marcar una sola posición, puedes dejar "Pos. Final" vacío o ingresar el mismo número que en "Pos. Inicial".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupZoneName" className="text-right">
                Nombre
              </Label>
              <Input
                id="groupZoneName"
                value={currentZone.name}
                onChange={(e) => setCurrentZone({ ...currentZone, name: e.target.value })}
                className="col-span-3"
                placeholder="Ej: Clasifica a Octavos"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupZoneStartPosition" className="text-right">
                Pos. Inicial
              </Label>
              <Input
                id="groupZoneStartPosition"
                type="number"
                min="1"
                value={currentZone.startPosition}
                onChange={(e) => setCurrentZone({ ...currentZone, startPosition: e.target.value })}
                className="col-span-3"
                placeholder="Ej: 1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupZoneEndPosition" className="text-right">
                Pos. Final
              </Label>
              <Input
                id="groupZoneEndPosition"
                type="number"
                min="1"
                value={currentZone.endPosition}
                onChange={(e) => setCurrentZone({ ...currentZone, endPosition: e.target.value })}
                className="col-span-3"
                placeholder="Ej: 2 (o dejar vacío)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupZoneColor" className="text-right">
                Color
              </Label>
              <Input
                id="groupZoneColor"
                type="color"
                value={currentZone.color}
                onChange={(e) => setCurrentZone({ ...currentZone, color: e.target.value })}
                className="col-span-3 h-10 p-1"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setActiveGroupIdForZoneModal(null)}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveGroupZone}>Guardar Zona</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

