
"use client";
import React, { useState } from 'react';
import { useTournamentState, useTournamentDispatch, useIsClient } from '@/components/TournamentContext';
import type { KnockoutMatch } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitFork, Save, Trophy } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';

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
  const { teams, knockoutRounds } = useTournamentState();
  const dispatch = useTournamentDispatch();
  const [startingRoundValue, setStartingRoundValue] = useState<string>('8'); // Default to Quarter-Finals (8 teams)
  const [selectedTeamsForBracket, setSelectedTeamsForBracket] = useState<string[]>([]);
  const [matchScores, setMatchScores] = useState<KnockoutScoreInput>({});
  const isClient = useIsClient();

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
    const selectedRoundLabel = roundOptions.find(opt => opt.value === startingRoundValue)?.label || `${numTeams}-team`;
    toast({ title: "Success", description: `Cuadro de eliminatorias (${selectedRoundLabel}) creado.` });
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
    toast({ title: "Success", description: "Resultado del partido de eliminación actualizado." });
  };
  
  const getTeamName = (teamId: string | undefined, defaultName: string = 'TBD'): string => {
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

  // Calculate effective number of playable rounds for title logic
  let numEffectiveRounds = 0;
  if (knockoutRounds.length > 0) {
    // If the last round in the array is structured like a champion slot (1 match, no team2Id),
    // then the number of playable rounds is one less than the total length.
    // Otherwise, all rounds are considered playable (e.g., a 2-team bracket where the final *is* the championship).
    const lastRoundData = knockoutRounds[knockoutRounds.length - 1];
    if (knockoutRounds.length > 1 && lastRoundData.length === 1 && lastRoundData[0].team2Id === undefined) {
      numEffectiveRounds = knockoutRounds.length - 1;
    } else {
      numEffectiveRounds = knockoutRounds.length;
    }
  }
  const finalPlayableRoundIndex = numEffectiveRounds > 0 ? numEffectiveRounds - 1 : -1;


  if (!isClient) {
    return <Card className="w-full mx-auto mt-6">
      <CardHeader><CardTitle>Cargando Fase de Eliminatorias...</CardTitle></CardHeader>
      <CardContent><div className="animate-pulse h-20 bg-muted rounded-md w-full"></div></CardContent>
    </Card>;
  }

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <GitFork className="h-6 w-6 text-primary" /> Configurar Cuadro de Eliminatorias
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
            <div className="max-h-48 overflow-y-auto space-y-2 p-2 border rounded-md">
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
             {selectedTeamsForBracket.length > 0 && (
              <p className="text-xs mt-1 text-muted-foreground">Seleccionados {selectedTeamsForBracket.length} de {currentRequiredTeams} equipos.</p>
            )}
          </div>

          <Button onClick={handleCreateBracket} className="w-full" aria-label="Crear o Recrear Cuadro de Eliminatorias">
            Crear / Recrear Cuadro
          </Button>
        </CardContent>
      </Card>

      {knockoutRounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-primary">Cuadro de Eliminatorias</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto pb-6 pt-2">
            <div className="flex items-start space-x-8 min-w-max">
              {knockoutRounds.map((round, roundIndex) => {
                
                let roundTitle = `Ronda ${roundIndex + 1}`; // Default title
                const currentMatchForTitle = round.length > 0 ? round[0] : null;

                // Determine if this round is the designated champion display slot
                const isDesignatedChampionSlot = 
                    numEffectiveRounds > 0 &&
                    roundIndex === finalPlayableRoundIndex + 1 && // This is the round *after* the last playable one
                    knockoutRounds.length === numEffectiveRounds + 1 && // Bracket has a dedicated champion slot
                    round.length === 1 &&
                    currentMatchForTitle?.team2Id === undefined;

                if (isDesignatedChampionSlot) {
                    roundTitle = 'Campeón del Torneo';
                } else if (roundIndex === finalPlayableRoundIndex) {
                    // This is the final playable round
                    if (currentMatchForTitle && currentMatchForTitle.played && 
                        currentMatchForTitle.team1Score !== null && currentMatchForTitle.team2Score !== null && 
                        currentMatchForTitle.team1Score !== currentMatchForTitle.team2Score &&
                        numEffectiveRounds === 1 // Final match decided the champ, and it's a 2-team bracket
                        ) {
                      roundTitle = 'Campeón del Torneo'; 
                    } else {
                      roundTitle = "Final";
                    }
                } else if (finalPlayableRoundIndex >=0 && roundIndex === finalPlayableRoundIndex - 1) {
                    roundTitle = "Semifinales";
                } else if (finalPlayableRoundIndex >=0 && roundIndex === finalPlayableRoundIndex - 2) {
                    roundTitle = "Cuartos de Final";
                } else if (finalPlayableRoundIndex >=0 && roundIndex === finalPlayableRoundIndex - 3) {
                    roundTitle = "Octavos de Final";
                } else if (finalPlayableRoundIndex >=0 && roundIndex === finalPlayableRoundIndex - 4) {
                    roundTitle = "Dieciseisavos de Final";
                }
                
                const isVisuallyChampionRound = (isDesignatedChampionSlot || (roundTitle === 'Campeón del Torneo' && roundIndex === finalPlayableRoundIndex && numEffectiveRounds === 1));

                return (
                  <div key={`round-${roundIndex}`} className="flex flex-col space-y-12 min-w-[280px] pt-10 relative">
                    <h3 className="text-lg font-semibold text-center text-accent absolute -top-0 left-0 right-0 whitespace-nowrap">
                       {roundTitle}
                    </h3>
                    
                    <div className="space-y-16">
                      {round.map((match, matchIndex) => {
                        const isFinalWinnerDisplay = isVisuallyChampionRound && match.played && match.team1Id && !match.team2Id ;
                      
                        const team1IsPlaceholder = !match.team1Id || match.team1Id.startsWith('winner-') || match.team1Id.startsWith('placeholder-');
                        const team2IsPlaceholder = !match.team2Id || match.team2Id.startsWith('winner-') || match.team2Id.startsWith('placeholder-');
                        const canEditScores = (!match.played || matchScores[match.id] !== undefined) && !team1IsPlaceholder && !team2IsPlaceholder;

                        const winnerId = match.played && match.team1Score !== null && match.team2Score !== null ? (match.team1Score > match.team2Score ? match.team1Id : match.team2Score > match.team1Score ? match.team2Id : null) : null;

                        return (
                          <div key={match.id} className="bg-card rounded-lg shadow-md relative isolate">
                            
                            {isFinalWinnerDisplay ? (
                              <div className="text-center py-8 px-4">
                                <Trophy className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                                <p className="text-2xl font-bold text-primary">{getTeamName(winnerId)}</p>
                                <p className="text-md text-muted-foreground">¡Es el Campeón!</p>
                              </div>
                            ) : (
                              <div className="p-3 space-y-2">
                                {/* Team 1 */}
                                <div className="flex items-stretch">
                                  <span 
                                    className={cn(
                                      "flex-1 py-2 px-3 text-sm font-medium truncate rounded-l-md",
                                      winnerId === match.team1Id ? "bg-primary text-primary-foreground" : "bg-muted",
                                      team1IsPlaceholder && "italic text-foreground/50",
                                      !team1IsPlaceholder && winnerId !== match.team1Id && "text-foreground",
                                      !team1IsPlaceholder && winnerId === match.team1Id && "font-bold"
                                    )}
                                  >
                                    {getTeamName(match.team1Id, match.placeholder || (match.roundIndex === 0 ? `Equipo ${match.matchIndexInRound * 2 + 1}`: `Ganador Partido ${String.fromCharCode(65 + match.matchIndexInRound * 2)}`))}
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="-"
                                    value={matchScores[match.id]?.team1Score ?? match.team1Score ?? ''}
                                    onChange={(e) => handleScoreChange(match.id, 'team1', e.target.value)}
                                    className="w-16 h-auto text-sm text-center rounded-l-none rounded-r-md border-l-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    disabled={team1IsPlaceholder || (match.played && matchScores[match.id] === undefined)}
                                  />
                                </div>

                                {/* Team 2 */}
                                {(!match.team2Id && match.team1Id && !team1IsPlaceholder && isVisuallyChampionRound) ? null : ( 
                                <div className="flex items-stretch">
                                   <span 
                                    className={cn(
                                      "flex-1 py-2 px-3 text-sm font-medium truncate rounded-l-md",
                                      winnerId === match.team2Id ? "bg-primary text-primary-foreground" : "bg-muted",
                                      team2IsPlaceholder && "italic text-foreground/50",
                                      !team2IsPlaceholder && winnerId !== match.team2Id && "text-foreground",
                                      !team2IsPlaceholder && winnerId === match.team2Id && "font-bold"
                                    )}
                                   >
                                     {getTeamName(match.team2Id, match.placeholder || (match.roundIndex === 0 ? `Equipo ${match.matchIndexInRound * 2 + 2}`: `Ganador Partido ${String.fromCharCode(65 + match.matchIndexInRound * 2 + 1)}`))}
                                   </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="-"
                                    value={matchScores[match.id]?.team2Score ?? match.team2Score ?? ''}
                                    onChange={(e) => handleScoreChange(match.id, 'team2', e.target.value)}
                                    className="w-16 h-auto text-sm text-center rounded-l-none rounded-r-md border-l-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    disabled={team2IsPlaceholder || (match.played && matchScores[match.id] === undefined)}
                                  />
                                </div>
                                )}


                                {(team1IsPlaceholder || (team2IsPlaceholder && match.team2Id)) && !isFinalWinnerDisplay && (
                                    <p className="text-xs text-muted-foreground text-center pt-1">Esperando equipos...</p>
                                  )}
                                
                                {!team1IsPlaceholder && (!team2IsPlaceholder && match.team2Id) && !isFinalWinnerDisplay && (
                                    <Button
                                      onClick={() => handleUpdateMatchResult(roundIndex, matchIndex, match.id)}
                                      size="sm"
                                      variant="outline"
                                      className="w-full mt-2 h-9 text-xs"
                                      disabled={!canEditScores}
                                      aria-label="Guardar resultado del partido de eliminación"
                                    >
                                      <Save className="mr-1 h-3 w-3" /> {match.played && matchScores[match.id] === undefined ? 'Actualizar Resultado' : 'Guardar Resultado'}
                                    </Button>
                                  )
                                }
                              </div>
                            )}
                            {/* Connector lines (simplified) */}
                            {!isVisuallyChampionRound && ( 
                              <>
                                <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 w-4 h-px bg-border -z-10"></div>
                                { (roundIndex < knockoutRounds.length -1 && knockoutRounds[roundIndex+1][Math.floor(matchIndex/2)]) &&
                                  (matchIndex % 2 === 0 ? ( 
                                    <div className="absolute top-1/2 -right-4 transform  w-px bg-border -z-10" style={{height: 'calc(50% + 4rem)' , bottom: '0%'}}></div>
                                  ) : ( 
                                    <div className="absolute bottom-1/2 -right-4 transform w-px bg-border -z-10" style={{height: 'calc(50% + 4rem)' , top: '0%'}}></div>
                                  ))
                                }
                              </>
                            )}
                             {roundIndex > 0 && !isVisuallyChampionRound && ( 
                               <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 w-4 h-px bg-border -z-10"></div>
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
      {knockoutRounds.length === 0 && (
        <p className="text-muted-foreground text-center mt-6">Aún no se ha generado un cuadro de eliminatorias. Configura y crea uno arriba.</p>
      )}
    </div>
  );
}

