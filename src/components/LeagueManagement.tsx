
"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTournamentState, useTournamentDispatch, useIsClient } from '@/components/TournamentContext';
import type { Team, Match, GroupTeamStats, LeagueZoneSetting } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Settings2, ListChecks, Repeat, ClipboardList, Palette, Edit3, Save, XCircle, Camera } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { exportElementAsImageWithTheme } from '@/lib/exportToImage';


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

export default function LeagueManagement() {
  const { teams, league, getLeagueStandings } = useTournamentState();
  const dispatch = useTournamentDispatch();
  const isClient = useIsClient();

  const [leagueName, setLeagueName] = useState('Mi Liga');
  const [selectedTeamIdsForLeague, setSelectedTeamIdsForLeague] = useState<string[]>([]);
  const [playEachTeamTwice, setPlayEachTeamTwice] = useState(false);
  const [matchScores, setMatchScores] = useState<MatchScoreInput>({});

  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [currentZone, setCurrentZone] = useState<ZoneFormState>({ name: '', startPosition: '1', endPosition: '1', color: '#4CAF50' });
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const leagueTableRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!league && teams.length > 0) {
      setSelectedTeamIdsForLeague(teams.map(t => t.id));
    }
    if (league) {
      setLeagueName(league.name);
      setSelectedTeamIdsForLeague(league.teamIds);
      setPlayEachTeamTwice(league.playEachTeamTwice || false);
    }
  }, [teams, league]);


  const handleSetupLeague = () => {
    if (leagueName.trim() === '') {
      toast({ title: "Error", description: "El nombre de la liga no puede estar vacío.", variant: "destructive" });
      return;
    }
    if (selectedTeamIdsForLeague.length < 2) {
      toast({ title: "Error", description: "Una liga requiere al menos 2 equipos.", variant: "destructive" });
      return;
    }
    dispatch({
        type: 'SETUP_LEAGUE',
        payload: {
            name: leagueName.trim(),
            teamIds: selectedTeamIdsForLeague,
            playEachTeamTwice: playEachTeamTwice
        }
    });
    toast({ title: "Éxito", description: `Liga "${leagueName.trim()}" iniciada y calendario generado.` });
  };

  const handleClearLeague = () => {
    dispatch({ type: 'CLEAR_LEAGUE' });
    toast({ title: "Éxito", description: "Los datos de la liga han sido borrados." });
    setLeagueName('Mi Liga');
    setSelectedTeamIdsForLeague(teams.map(t => t.id));
    setPlayEachTeamTwice(false);
  };

  const handleGenerateLeagueMatches = () => {
    if (!league) {
      toast({ title: "Error", description: "No hay ninguna liga activa para generar partidos.", variant: "destructive" });
      return;
    }
     if (league.teamIds.length < 2) {
      toast({ title: "Error", description: "La liga necesita al menos 2 equipos para (re)generar partidos.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'GENERATE_LEAGUE_MATCHES' });
    toast({ title: "Éxito", description: "Calendario de la liga (re)generado." });
  };

  const handleScoreChange = (matchId: string, team: 'team1' | 'team2', value: string) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { team1Score: '', team2Score: '' }),
        [team === 'team1' ? 'team1Score' : 'team2Score']: value,
      },
    }));
  };

  const handleUpdateMatchResult = (matchId: string) => {
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
    dispatch({ type: 'UPDATE_LEAGUE_MATCH_RESULT', payload: { matchId, team1Score, team2Score } });
    toast({ title: "Éxito", description: "Resultado del partido actualizado." });
  };

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Equipo Desconocido';

  const leagueStandings = useMemo(() => {
    if (!league) return [];
    return getLeagueStandings();
  }, [league, getLeagueStandings, teams]);

  const handleTeamSelectionChange = (teamId: string) => {
    setSelectedTeamIdsForLeague(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const openZoneModalForEdit = (zone: LeagueZoneSetting) => {
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

  const openZoneModalForNew = () => {
    setEditingZoneId(null);
    setCurrentZone({ name: '', startPosition: '1', endPosition: '1', color: '#4CAF50' }); // Default green
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = () => {
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

    const zoneData = { 
      name: name.trim(), 
      startPosition: startPosNum, 
      endPosition: endPosNum, 
      color 
    };

    if (editingZoneId) {
      dispatch({ type: 'EDIT_LEAGUE_ZONE', payload: { id: editingZoneId, ...zoneData } });
      toast({ title: "Éxito", description: "Zona de clasificación actualizada." });
    } else {
      dispatch({ type: 'ADD_LEAGUE_ZONE', payload: zoneData });
      toast({ title: "Éxito", description: "Zona de clasificación añadida." });
    }
    setIsZoneModalOpen(false);
    setEditingZoneId(null);
  };

  const handleDeleteZone = (zoneId: string) => {
    dispatch({ type: 'DELETE_LEAGUE_ZONE', payload: { zoneId } });
    toast({ title: "Éxito", description: "Zona de clasificación eliminada." });
  };

  const getZoneForPosition = (position: number): LeagueZoneSetting | undefined => {
    if (!league?.zoneSettings) return undefined;
    
    const sortedZones = [...league.zoneSettings].sort((a,b) => {
      if (a.startPosition !== b.startPosition) {
        return a.startPosition - b.startPosition;
      }
      return a.endPosition - b.endPosition; 
    });
    return sortedZones.find(zone => position >= zone.startPosition && position <= zone.endPosition);
  };

  const handleLeagueTableExport = () => {
    if (leagueTableRef.current && league) {
      exportElementAsImageWithTheme(leagueTableRef.current, `liga_${league.name}_clasificacion`);
    } else {
      toast({
        title: "Error al Exportar",
        description: "No se pudo encontrar la tabla de la liga para exportar.",
        variant: "destructive",
      });
    }
  };


  if (!isClient) {
     return <Card className="w-full max-w-4xl mx-auto mt-6">
      <CardHeader><CardTitle>Cargando Gestión de Liga...</CardTitle></CardHeader>
      <CardContent><div className="animate-pulse h-20 bg-muted rounded-md w-full"></div></CardContent>
    </Card>;
  }

  if (!league) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-xl sm:text-2xl">
            <Settings2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Configurar Nueva Liga
          </CardTitle>
          <CardDescription>Configura tu nueva liga seleccionando equipos y opciones. Se generará un calendario de todos contra todos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="leagueName">Nombre de la Liga</Label>
            <Input
              id="leagueName"
              type="text"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="Ej., Primera División"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Opciones de Liga</Label>
            <div className="flex items-center space-x-2 p-2 border rounded-md">
              <Checkbox
                id="playTwiceCheckbox"
                checked={playEachTeamTwice}
                onCheckedChange={(checked) => setPlayEachTeamTwice(Boolean(checked))}
              />
              <Label htmlFor="playTwiceCheckbox" className="font-normal cursor-pointer">
                Jugar contra cada equipo dos veces (ida y vuelta)
              </Label>
            </div>
          </div>

          <div>
            <Label className="font-semibold block mb-2">Seleccionar Equipos para la Liga</Label>
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay equipos creados aún. Por favor, añade equipos en la pestaña "Gestión de Equipos" primero.</p>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-3">
                <div className="space-y-2">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`league-team-${team.id}`}
                        checked={selectedTeamIdsForLeague.includes(team.id)}
                        onCheckedChange={() => handleTeamSelectionChange(team.id)}
                        aria-label={`Seleccionar equipo ${team.name}`}
                      />
                      <Label htmlFor={`league-team-${team.id}`} className="font-normal cursor-pointer">
                        {team.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
             <p className="text-xs text-muted-foreground mt-1">{selectedTeamIdsForLeague.length} equipo(s) seleccionado(s).</p>
          </div>
          <Button onClick={handleSetupLeague} className="w-full" disabled={teams.length < 2 || selectedTeamIdsForLeague.length < 2}>
            <PlusCircle className="mr-2 h-4 w-4" /> Iniciar Liga y Generar Calendario
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="font-headline text-xl sm:text-2xl text-primary flex items-center gap-2">
                <ClipboardList className="h-6 w-6" /> {league.name}
              </CardTitle>
              <CardDescription>Gestiona los partidos, la clasificación y las zonas de la liga.
                {league.playEachTeamTwice && " (Los equipos juegan entre sí dos veces)"}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={handleGenerateLeagueMatches} variant="outline" className="w-full sm:w-auto">
                <Repeat className="mr-2 h-4 w-4" /> Re-generar Calendario
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" /> Borrar Datos de Liga
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Borrado de Liga</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Estás seguro de que quieres borrar todos los datos de "{league.name}"? Esto eliminará todos los partidos, la clasificación y las zonas. Los datos de los equipos permanecerán.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearLeague}>Borrar Liga</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-4 border rounded-md bg-background">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><ListChecks className="h-5 w-5 text-accent" /> Partidos de Liga</h3>
              {league.matches.length > 0 ? (
                <ScrollArea className="h-[300px] pr-3">
                  <ul className="space-y-2">
                    {league.matches.map(match => (
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
                            aria-label={`Resultado para ${getTeamName(match.team1Id)}`}
                            value={matchScores[match.id]?.team1Score ?? match.team1Score ?? ''}
                            onChange={(e) => handleScoreChange(match.id, 'team1', e.target.value)}
                            className="w-20 h-8 text-xs"
                            disabled={match.played && (matchScores[match.id] === undefined)}
                          />
                          <span>-</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Res. 2"
                            aria-label={`Resultado para ${getTeamName(match.team2Id)}`}
                            value={matchScores[match.id]?.team2Score ?? match.team2Score ?? ''}
                            onChange={(e) => handleScoreChange(match.id, 'team2', e.target.value)}
                            className="w-20 h-8 text-xs"
                            disabled={match.played && (matchScores[match.id] === undefined)}
                          />
                          <Button onClick={() => handleUpdateMatchResult(match.id)} size="sm" variant="outline" className="h-8 text-xs" aria-label="Guardar resultado del partido">
                            <Save className="mr-1 h-3 w-3" /> Guardar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : <p className="text-xs text-muted-foreground">No hay partidos generados. Haz clic en "Re-generar Calendario" si tienes equipos en la liga.</p>}
            </div>

            <div className="p-4 border rounded-md bg-background" ref={leagueTableRef}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2"><ListChecks className="h-5 w-5 text-accent" /> Clasificación de Liga</h3>
                <Button 
                    onClick={handleLeagueTableExport} 
                    variant="outline" 
                    size="sm"
                    data-html2canvas-ignore="true"
                >
                  <Camera className="mr-2 h-4 w-4" /> Tomar Foto
                </Button>
              </div>
              {leagueStandings.length > 0 ? (
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
                        {leagueStandings.map((stat, index) => {
                          const position = index + 1;
                          const zone = getZoneForPosition(position);
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
                  {league.zoneSettings && league.zoneSettings.length > 0 && (
                    <div className="mt-4 p-3 border rounded-md bg-secondary/30">
                      <h4 className="text-md font-semibold mb-2 text-secondary-foreground">Clasificaciones:</h4>
                      <ul className="space-y-1">
                        {league.zoneSettings.map(zone => (
                          <li key={`legend-${zone.id}`} className="flex items-center gap-2 text-sm text-secondary-foreground">
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
              ) : <p className="text-xs text-muted-foreground">No hay clasificación para mostrar. Añade equipos, genera un calendario y registra resultados de partidos.</p>}
            </div>

            <div className="p-4 border rounded-md bg-background">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Palette className="h-5 w-5 text-accent" /> Zonas de Clasificación</h3>
                <Button size="sm" onClick={openZoneModalForNew}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Zona</Button>
              </div>
              {league.zoneSettings && league.zoneSettings.length > 0 ? (
                <div className="space-y-2">
                  {league.zoneSettings.map(zone => (
                    <div key={zone.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-sm border border-border" style={{ backgroundColor: zone.color }}></span>
                        <span>{zone.name} (Pos. {zone.startPosition}{zone.startPosition !== zone.endPosition ? `-${zone.endPosition}` : ''})</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openZoneModalForEdit(zone)}>
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
                                ¿Estás seguro de que quieres eliminar la zona "{zone.name}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteZone(zone.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No se han configurado zonas de clasificación. Puedes añadir zonas para marcar visualmente posiciones en la tabla (ej. clasificación a copas, descenso).</p>
              )}
            </div>
          </CardContent>
      </Card>

      <Dialog open={isZoneModalOpen} onOpenChange={setIsZoneModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingZoneId ? 'Editar Zona de Clasificación' : 'Añadir Nueva Zona de Clasificación'}</DialogTitle>
            <DialogDescription>
              Define un nombre, el rango de posiciones (inicio y fin), y un color para esta zona.
              Para marcar una sola posición, puedes dejar "Pos. Final" vacío o ingresar el mismo número que en "Pos. Inicial".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="zoneName" className="text-right">
                Nombre
              </Label>
              <Input
                id="zoneName"
                value={currentZone.name}
                onChange={(e) => setCurrentZone({ ...currentZone, name: e.target.value })}
                className="col-span-3"
                placeholder="Ej: Champions League"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="zoneStartPosition" className="text-right">
                Pos. Inicial
              </Label>
              <Input
                id="zoneStartPosition"
                type="number"
                min="1"
                value={currentZone.startPosition}
                onChange={(e) => setCurrentZone({ ...currentZone, startPosition: e.target.value })}
                className="col-span-3"
                placeholder="Ej: 1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="zoneEndPosition" className="text-right">
                Pos. Final
              </Label>
              <Input
                id="zoneEndPosition"
                type="number"
                min="1"
                value={currentZone.endPosition}
                onChange={(e) => setCurrentZone({ ...currentZone, endPosition: e.target.value })}
                className="col-span-3"
                placeholder="Ej: 4 (o dejar vacío si es igual a Pos. Inicial)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="zoneColor" className="text-right">
                Color
              </Label>
              <Input
                id="zoneColor"
                type="color"
                value={currentZone.color}
                onChange={(e) => setCurrentZone({ ...currentZone, color: e.target.value })}
                className="col-span-3 h-10 p-1"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveZone}>Guardar Zona</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    
