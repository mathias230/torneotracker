
"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTournamentState, useTournamentDispatch, useIsClient } from '@/components/TournamentContext';
import type { KnockoutMatch } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitFork, Save, Trophy, Camera } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exportElementAsImageWithTheme } from '@/lib/exportToImage';


interface KnockoutScoreInput {
  [matchId: string]: { team1Score: string; team2Score: string };
}

const roundOptions = [
  { value: "2", label: "Final (2 Equipos)", teams: 2 },
  { value: "4", label: "Semifinales (4 Equipos)", teams: 4 },
  { value: "8", label: "Cuartos de Final (8 Equipos)", teams: 8 },
  { value: "16", label: "Octavos de Final (16 Equipos)", teams: 16 },
  { value: "32", label: "Dieciseisavos de Final (32 Equipos)", teams: 32 },
];

export default function KnockoutStageManagement() {
  const { teams, knockoutRounds: knockoutRoundsMap, isAdminMode } = useTournamentState();
  const dispatch = useTournamentDispatch();
  const [startingRoundValue, setStartingRoundValue] = useState<string>('8'); 
  const [selectedTeamsForBracket, setSelectedTeamsForBracket] = useState<string[]>([]);
  const [matchScores, setMatchScores] = useState<KnockoutScoreInput>({});
  const isClient = useIsClient();
  const bracketRef = useRef<HTMLDivElement>(null);

  const roundsAsArray: KnockoutMatch[][] = useMemo(() => {
    if (!knockoutRoundsMap || Object.keys(knockoutRoundsMap).length === 0) return [];
    return Object.keys(knockoutRoundsMap)
      .sort((a, b) => parseInt(a) - parseInt(b)) // Sort by round index (key)
      .map(key => knockoutRoundsMap[key]);
  }, [knockoutRoundsMap]);

  // Filter for rounds that actually have matches to display
  // The champion display (a match with team2Id: null) is considered a playable round
  const playableRounds: KnockoutMatch[][] = useMemo(() => {
    return roundsAsArray.filter(round => round.length > 0);
  }, [roundsAsArray]);


  const handleCreateBracket = () => {
    const numTeams = parseInt(startingRoundValue, 10);
    if (isNaN(numTeams) || numTeams < 2 || (numTeams & (numTeams - 1)) !== 0) {
      toast({ title: "Error", description: "El número de equipos para el cuadro debe ser una potencia de 2 (ej. 2, 4, 8, 16).", variant: "destructive" });
      return;
    }

    if (selectedTeamsForBracket.length === 0 && teams.length < numTeams) {
       toast({ title: "Error", description: `No hay suficientes equipos creados (${teams.length}) para formar un cuadro de ${numTeams} equipos. Añade más equipos o selecciónalos específicamente.`, variant: "destructive" });
      return;
    }
    if (selectedTeamsForBracket.length > 0 && selectedTeamsForBracket.length !== numTeams) {
      toast({ title: "Error", description: `Seleccionaste ${selectedTeamsForBracket.length} equipos, pero el cuadro requiere ${numTeams} equipos para la ronda inicial elegida.`, variant: "destructive" });
      return;
    }

    const teamIdsToUse = selectedTeamsForBracket.length > 0 ? selectedTeamsForBracket : teams.slice(0, numTeams).map(t => t.id);

    dispatch({ type: 'CREATE_KNOCKOUT_STAGE', payload: { numTeams, selectedTeamIds: teamIdsToUse } });
    const selectedRoundLabel = roundOptions.find(opt => opt.value === startingRoundValue)?.label || `Cuadro de ${numTeams} equipos`;
    toast({ title: "Éxito", description: `Cuadro de eliminatorias (${selectedRoundLabel}) creado.` });
  };

  const handleScoreChange = (matchId: string, team: 'team1' | 'team2', value: string) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === 'team1' ? 'team1Score' : 'team2Score']: value,
      },
    }));
  };

  const handleUpdateMatchResult = (roundIndex: number, matchIndexInRound: number, matchId: string) => {
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
    if (team1Score === team2Score) {
      toast({ title: "Error", description: "Los partidos de eliminación no pueden terminar en empate. Por favor, ingresa un ganador.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'UPDATE_KNOCKOUT_MATCH_RESULT', payload: { roundIndex, matchIndexInRound, team1Score, team2Score } });
    toast({ title: "Éxito", description: "Resultado del partido de eliminación actualizado." });
  };
  
  const getTeamName = (teamId: string | undefined | null, defaultName: string = 'A determinar'): string => {
    if (!teamId) return defaultName;
    if (teamId.startsWith('winner-') || teamId.startsWith('placeholder-')) return defaultName;
    return teams.find(t => t.id === teamId)?.name || defaultName;
  }

  const handleTeamSelectionChange = (teamId: string) => {
    setSelectedTeamsForBracket(prev => 
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const currentRequiredTeams = parseInt(startingRoundValue, 10);
  
  const numberOfPlayableRounds = playableRounds.length;

  const handleBracketExport = () => {
    if (bracketRef.current) {
      const roundName = roundOptions.find(opt => opt.value === startingRoundValue)?.label || "cuadro";
      exportElementAsImageWithTheme(bracketRef.current, `cuadro_eliminatorias_${roundName.toLowerCase().replace(/\s+/g, '_')}`);
    } else {
      toast({
        title: "Error al Exportar",
        description: "No se pudo encontrar el cuadro para exportar.",
        variant: "destructive",
      });
    }
  };


  if (!isClient) {
    return <Card className="w-full mx-auto mt-6">
      <CardHeader><CardTitle>Cargando Fase de Eliminatorias...</CardTitle></CardHeader>
      <CardContent><div className="animate-pulse h-20 bg-muted rounded-md w-full"></div></CardContent>
    </Card>;
  }
  
  return (
    <div className="space-y-8">
      {isAdminMode && (
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl sm:text-2xl">
              <GitFork className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Configurar Cuadro de Eliminatorias
            </CardTitle>
            <CardDescription>
              Selecciona la ronda inicial y los participantes para la fase de eliminación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="startingRoundSelect">Ronda Inicial del Cuadro</Label>
              <Select value={startingRoundValue} onValueChange={setStartingRoundValue}>
                <SelectTrigger id="startingRoundSelect">
                  <SelectValue placeholder="Selecciona la ronda inicial" />
                </SelectTrigger>
                <SelectContent>
                  {roundOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="font-semibold">Seleccionar Equipos (Opcional)</Label>
              <CardDescription className="text-xs mb-2">
                Si no seleccionas equipos, se usarán los primeros {currentRequiredTeams} equipos de la lista general. 
                Asegúrate de seleccionar exactamente {currentRequiredTeams} equipos si eliges esta opción.
              </CardDescription>
              <ScrollArea className="h-48 p-2 border rounded-md">
                <div className="space-y-2">
                  {teams.length > 0 ? teams.map(team => (
                    <div key={team.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`team-select-${team.id}`}
                        checked={selectedTeamsForBracket.includes(team.id)}
                        onCheckedChange={() => handleTeamSelectionChange(team.id)}
                      />
                      <Label htmlFor={`team-select-${team.id}`} className="text-sm font-normal">
                        {team.name}
                      </Label>
                    </div>
                  )) : <p className="text-xs text-muted-foreground">Aún no se han creado equipos.</p>}
                </div>
              </ScrollArea>
              {selectedTeamsForBracket.length > 0 && (
                <p className="text-xs mt-1 text-muted-foreground">Seleccionados {selectedTeamsForBracket.length} de {currentRequiredTeams} equipos.</p>
              )}
            </div>

            <Button onClick={handleCreateBracket} className="w-full" aria-label="Crear o Recrear Cuadro de Eliminatorias">
              Crear / Recrear Cuadro
            </Button>
          </CardContent>
        </Card>
      )}

      {playableRounds.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="font-headline text-xl sm:text-2xl text-primary">Cuadro de Eliminatorias</CardTitle>
            <Button 
                onClick={handleBracketExport} 
                variant="outline" 
                size="sm"
                data-html2canvas-ignore="true"
              >
              <Camera className="mr-2 h-4 w-4" /> Tomar Foto
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto pb-6 pt-2">
            <div className="flex items-start space-x-4 sm:space-x-8 min-w-max" ref={bracketRef}>
              {playableRounds.map((round, roundArrayIndex) => { // roundArrayIndex is the index in playableRounds
                 // The actual roundIndex for logic/titles comes from the first match in the round,
                 // as playableRounds is already sorted.
                const logicalRoundIndex = round[0]?.roundIndex ?? roundArrayIndex;

                let roundTitleText = `Ronda ${logicalRoundIndex + 1}`; 

                if (numberOfPlayableRounds === 1) { 
                    const match = round[0];
                    const championId = (match.played && match.team1Score !== null && match.team2Score !== null)
                        ? (match.team1Score > match.team2Score ? match.team1Id : match.team2Id)
                        : null;
                    if (championId) {
                        roundTitleText = `Campeón: ${getTeamName(championId, '')}`;
                    } else {
                        roundTitleText = "Final";
                    }
                } else { 
                    if (logicalRoundIndex === numberOfPlayableRounds - 1) roundTitleText = "Final";
                    else if (logicalRoundIndex === numberOfPlayableRounds - 2) roundTitleText = "Semifinales";
                    else if (logicalRoundIndex === numberOfPlayableRounds - 3) roundTitleText = "Cuartos de Final";
                    else if (logicalRoundIndex === numberOfPlayableRounds - 4) roundTitleText = "Octavos de Final";
                    else if (logicalRoundIndex === numberOfPlayableRounds - 5) roundTitleText = "Dieciseisavos de Final";

                    if (roundTitleText === "Final" && round.length === 1) {
                        const match = round[0];
                        const championId = (match.played && match.team1Score !== null && match.team2Score !== null)
                            ? (match.team1Score > match.team2Score ? match.team1Id : match.team2Id)
                            : null;
                        if (championId) {
                            roundTitleText = `Campeón: ${getTeamName(championId, '')}`;
                        }
                    }
                }
                
                const isActualFinalMatchAndWon = roundTitleText.startsWith("Campeón:") && round.length === 1;

                return (
                  <div key={`round-display-${logicalRoundIndex}`} className="flex flex-col space-y-12 min-w-[250px] sm:min-w-[280px] pt-10 relative">
                    <h3 className="text-md sm:text-lg font-semibold text-center text-accent absolute -top-0 left-0 right-0 whitespace-nowrap">
                       {roundTitleText}
                    </h3>
                    
                    <div className="space-y-16">
                      {round.map((match, matchIndexInCurrentVisualRound) => { // matchIndexInCurrentVisualRound is the index within this specific round array
                        const winnerId = match.played && match.team1Score !== null && match.team2Score !== null ? (match.team1Score > match.team2Score ? match.team1Id : match.team2Score > match.team1Score ? match.team2Id : null) : null;
                                              
                        const team1IsPlaceholder = !match.team1Id || match.team1Id.startsWith('winner-') || match.team1Id.startsWith('placeholder-');
                        const team2IsPlaceholder = !match.team2Id || match.team2Id.startsWith('winner-') || match.team2Id.startsWith('placeholder-');
                        const canEditScores = isAdminMode && (!match.played || matchScores[match.id] !== undefined) && !team1IsPlaceholder && !team2IsPlaceholder;

                        return (
                          <div key={match.id} className="bg-card rounded-lg shadow-md relative isolate">
                            
                            {isActualFinalMatchAndWon && winnerId ? ( 
                              <div className="text-center py-6 sm:py-8 px-4">
                                <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-amber-400 mx-auto mb-3 sm:mb-4" />
                                <p className="text-xl sm:text-2xl font-bold text-primary truncate px-2">{getTeamName(winnerId)}</p>
                                <p className="text-sm sm:text-md text-muted-foreground">¡Es el Campeón!</p>
                              </div>
                            ) : (
                              <div className="p-3 space-y-2">
                                <div className="flex items-stretch">
                                  <span 
                                    className={cn(
                                      "flex-1 py-2 px-3 text-xs sm:text-sm font-medium truncate rounded-l-md",
                                      winnerId === match.team1Id ? "bg-primary text-primary-foreground" : "bg-muted",
                                      team1IsPlaceholder && "italic text-foreground/50",
                                      !team1IsPlaceholder && winnerId !== match.team1Id && "text-foreground",
                                      !team1IsPlaceholder && winnerId === match.team1Id && "font-bold"
                                    )}
                                  >
                                    {getTeamName(match.team1Id, match.placeholder || (match.roundIndex === 0 ? `Equipo ${match.matchIndexInRound * 2 + 1}`: `Ganador Partido ${String.fromCharCode(65 + match.matchIndexInRound * 2)}`))}
                                  </span>
                                  {isAdminMode ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="-"
                                      value={matchScores[match.id]?.team1Score ?? match.team1Score ?? ''}
                                      onChange={(e) => handleScoreChange(match.id, 'team1', e.target.value)}
                                      className="w-12 sm:w-16 h-auto text-xs sm:text-sm text-center rounded-l-none rounded-r-md border-l-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                      disabled={team1IsPlaceholder || (match.played && matchScores[match.id] === undefined)}
                                    />
                                  ) : (
                                    <span className="w-12 sm:w-16 py-2 px-3 text-xs sm:text-sm text-center bg-muted rounded-r-md border-l border-border">
                                      {match.team1Score ?? '-'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-stretch">
                                   <span 
                                    className={cn(
                                      "flex-1 py-2 px-3 text-xs sm:text-sm font-medium truncate rounded-l-md",
                                      winnerId === match.team2Id ? "bg-primary text-primary-foreground" : "bg-muted",
                                      team2IsPlaceholder && "italic text-foreground/50",
                                      !team2IsPlaceholder && winnerId !== match.team2Id && "text-foreground",
                                      !team2IsPlaceholder && winnerId === match.team2Id && "font-bold"
                                    )}
                                   >
                                     {getTeamName(match.team2Id, match.placeholder || (match.roundIndex === 0 ? `Equipo ${match.matchIndexInRound * 2 + 2}`: `Ganador Partido ${String.fromCharCode(65 + match.matchIndexInRound * 2 + 1)}`))}
                                   </span>
                                  {isAdminMode ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="-"
                                      value={matchScores[match.id]?.team2Score ?? match.team2Score ?? ''}
                                      onChange={(e) => handleScoreChange(match.id, 'team2', e.target.value)}
                                      className="w-12 sm:w-16 h-auto text-xs sm:text-sm text-center rounded-l-none rounded-r-md border-l-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                      disabled={team2IsPlaceholder || (match.played && matchScores[match.id] === undefined)}
                                    />
                                  ) : (
                                     <span className="w-12 sm:w-16 py-2 px-3 text-xs sm:text-sm text-center bg-muted rounded-r-md border-l border-border">
                                      {match.team2Score ?? '-'}
                                    </span>
                                  )}
                                </div>

                                {isAdminMode && (team1IsPlaceholder || team2IsPlaceholder) && (
                                    <p className="text-xs text-muted-foreground text-center pt-1">Esperando equipos...</p>
                                  )}
                                
                                {isAdminMode && !team1IsPlaceholder && !team2IsPlaceholder && (
                                    <Button
                                      onClick={() => handleUpdateMatchResult(match.roundIndex, match.matchIndexInRound, match.id)}
                                      size="sm"
                                      variant="outline"
                                      className="w-full mt-2 h-8 sm:h-9 text-xs"
                                      disabled={!canEditScores}
                                      aria-label="Guardar resultado del partido de eliminación"
                                    >
                                      <Save className="mr-1 h-3 w-3" /> {match.played && matchScores[match.id] === undefined ? 'Actualizar Resultado' : 'Guardar Resultado'}
                                    </Button>
                                  )
                                }
                                 {!isAdminMode && match.played && !isActualFinalMatchAndWon && (
                                  <p className="text-xs text-muted-foreground text-center pt-1">
                                    Resultado: {match.team1Score} - {match.team2Score}
                                  </p>
                                )}
                                {!isAdminMode && !match.played && !team1IsPlaceholder && !team2IsPlaceholder && (
                                  <p className="text-xs text-muted-foreground text-center pt-1">Pendiente</p>
                                )}
                              </div>
                            )}
                            {/* Connector lines logic */}
                            {(logicalRoundIndex < numberOfPlayableRounds - 1) && ( 
                              <>
                                <div className="absolute top-1/2 -right-2 sm:-right-4 transform -translate-y-1/2 w-2 sm:w-4 h-px bg-border -z-10"></div>
                                {/* Check if there's a next round and a corresponding match to connect to */}
                                { ( playableRounds[logicalRoundIndex+1] && playableRounds[logicalRoundIndex+1][Math.floor(matchIndexInCurrentVisualRound/2)] ) &&
                                  (matchIndexInCurrentVisualRound % 2 === 0 ? ( 
                                    <div className="absolute top-1/2 -right-2 sm:-right-4 transform w-px bg-border -z-10" style={{height: 'calc(50% + 4rem)' , bottom: '0%'}}></div>
                                  ) : ( 
                                    <div className="absolute bottom-1/2 -right-2 sm:-right-4 transform w-px bg-border -z-10" style={{height: 'calc(50% + 4rem)' , top: '0%'}}></div>
                                  ))
                                }
                              </>
                            )}
                             {logicalRoundIndex > 0 && ( 
                               <div className="absolute top-1/2 -left-2 sm:-left-4 transform -translate-y-1/2 w-2 sm:w-4 h-px bg-border -z-10"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {playableRounds.length === 0 && (
        <p className="text-muted-foreground text-center mt-6">Aún no se ha generado un cuadro de eliminatorias. {isAdminMode && "Configura y crea uno arriba."}</p>
      )}
    </div>
  );
}
