
"use client";
import React, { useState } from 'react';
import { useTournamentState, useTournamentDispatch, useIsClient } from '@/components/TournamentContext';
import type { KnockoutMatch, Team } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitFork, Save, Users, Trophy } from 'lucide-react'; // Added Trophy
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface KnockoutScoreInput {
  [matchId: string]: { team1Score: string; team2Score: string };
}

export default function KnockoutStageManagement() {
  const { teams, knockoutRounds } = useTournamentState();
  const dispatch = useTournamentDispatch();
  const [numTeamsForBracket, setNumTeamsForBracket] = useState<string>('8');
  const [selectedTeamsForBracket, setSelectedTeamsForBracket] = useState<string[]>([]);
  const [matchScores, setMatchScores] = useState<KnockoutScoreInput>({});
  const isClient = useIsClient();

  const handleCreateBracket = () => {
    const numTeams = parseInt(numTeamsForBracket, 10);
    if (isNaN(numTeams) || numTeams < 2 || (numTeams & (numTeams - 1)) !== 0) {
      toast({ title: "Error", description: "Number of teams must be a power of 2 (e.g., 2, 4, 8, 16).", variant: "destructive" });
      return;
    }
    if (selectedTeamsForBracket.length === 0 && teams.length < numTeams) {
       toast({ title: "Error", description: `Not enough teams created to form a ${numTeams}-team bracket. Please add more teams or select specific ones.`, variant: "destructive" });
      return;
    }
    if (selectedTeamsForBracket.length > 0 && selectedTeamsForBracket.length !== numTeams) {
      toast({ title: "Error", description: `You selected ${selectedTeamsForBracket.length} teams, but the bracket requires ${numTeams} teams.`, variant: "destructive" });
      return;
    }

    const teamIdsToUse = selectedTeamsForBracket.length > 0 ? selectedTeamsForBracket : teams.slice(0, numTeams).map(t => t.id);

    dispatch({ type: 'CREATE_KNOCKOUT_STAGE', payload: { numTeams, selectedTeamIds: teamIdsToUse } });
    toast({ title: "Success", description: `${numTeams}-team knockout bracket created.` });
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
       toast({ title: "Error", description: "Please enter scores for both teams.", variant: "destructive" });
      return;
    }
    const team1Score = parseInt(scores.team1Score, 10);
    const team2Score = parseInt(scores.team2Score, 10);

    if (isNaN(team1Score) || isNaN(team2Score) || team1Score < 0 || team2Score < 0) {
      toast({ title: "Error", description: "Scores must be valid non-negative numbers.", variant: "destructive" });
      return;
    }
    if (team1Score === team2Score) {
      toast({ title: "Error", description: "Knockout matches cannot end in a draw. Please enter a winner.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'UPDATE_KNOCKOUT_MATCH_RESULT', payload: { roundIndex, matchIndexInRound, team1Score, team2Score } });
    toast({ title: "Success", description: "Knockout match result updated." });
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

  if (!isClient) {
    return <Card className="w-full mx-auto mt-6">
      <CardHeader><CardTitle>Loading Knockout Stage...</CardTitle></CardHeader>
      <CardContent><div className="animate-pulse h-20 bg-muted rounded-md w-full"></div></CardContent>
    </Card>;
  }

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <GitFork className="h-6 w-6 text-primary" /> Setup Knockout Bracket
          </CardTitle>
          <CardDescription>
            Configure the number of teams and select participants for the knockout stage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="numTeamsSelect">Number of Teams for Bracket</Label>
            <Select value={numTeamsForBracket} onValueChange={setNumTeamsForBracket}>
              <SelectTrigger id="numTeamsSelect">
                <SelectValue placeholder="Select number of teams" />
              </SelectTrigger>
              <SelectContent>
                {[2, 4, 8, 16, 32].map(num => (
                  <SelectItem key={num} value={String(num)}>{num} Teams</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="font-semibold">Select Teams (Optional - if fewer than total teams or specific seeding)</Label>
            <CardDescription className="text-xs mb-2">If no teams are selected, the first {numTeamsForBracket} teams from the general list will be used. Ensure you select exactly {numTeamsForBracket} teams if you choose this option.</CardDescription>
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
              )) : <p className="text-xs text-muted-foreground">No teams created yet.</p>}
            </div>
             {selectedTeamsForBracket.length > 0 && (
              <p className="text-xs mt-1 text-muted-foreground">Selected {selectedTeamsForBracket.length} of {numTeamsForBracket} teams.</p>
            )}
          </div>

          <Button onClick={handleCreateBracket} className="w-full" aria-label="Create or Re-create Knockout Bracket">
            Create / Re-create Bracket
          </Button>
        </CardContent>
      </Card>

      {knockoutRounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-primary">Knockout Bracket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 overflow-x-auto pb-4">
              {knockoutRounds.map((round, roundIndex) => {
                const isFinalRound = roundIndex === knockoutRounds.length - 1;
                return (
                  <div key={`round-${roundIndex}`} className="min-w-[300px] space-y-4 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-center text-accent">
                      {isFinalRound && round.length === 1 && round[0].team1Id && !round[0].team1Id.startsWith('winner-') && !round[0].team1Id.startsWith('placeholder-') && !round[0].team2Id ? 'Tournament Winner' : 
                       isFinalRound ? 'Final' : 
                       roundIndex === knockoutRounds.length - 2 ? 'Semi-Finals' : 
                       roundIndex === knockoutRounds.length - 3 ? 'Quarter-Finals' : 
                       `Round ${roundIndex + 1}`}
                    </h3>
                    {round.map((match, matchIndex) => {
                      const isFinalWinnerDisplay = isFinalRound && round.length === 1 && match.team1Id && !match.team1Id.startsWith('winner-') && !match.team1Id.startsWith('placeholder-') && !match.team2Id;
                      
                      const team1IsPlaceholder = !match.team1Id || match.team1Id.startsWith('winner-') || match.team1Id.startsWith('placeholder-');
                      const team2IsPlaceholder = !match.team2Id || match.team2Id.startsWith('winner-') || match.team2Id.startsWith('placeholder-');
                      const canEditScores = (!match.played || matchScores[match.id] !== undefined);

                      return (
                        <Card key={match.id} className={`p-4 shadow-md ${match.played ? 'bg-green-50 dark:bg-green-900/30' : 'bg-background'}`}>
                          {!isFinalWinnerDisplay && <p className="text-xs text-muted-foreground mb-2">Match {matchIndex + 1}</p>}
                          
                          {isFinalWinnerDisplay ? (
                            <div className="text-center py-4">
                              <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                              <p className="text-xl font-bold text-primary">{getTeamName(match.team1Id)}</p>
                              <p className="text-sm text-muted-foreground">Is the Champion!</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium text-sm truncate pr-2 ${match.played && match.team1Score !== null && match.team2Score !== null && match.team1Score > match.team2Score ? 'text-green-600 dark:text-green-400 font-bold' : 'text-foreground'}`}>
                                  {getTeamName(match.team1Id, match.placeholder || `Team A`)}
                                </span>
                                 <Input
                                  type="number"
                                  min="0"
                                  placeholder="-"
                                  value={matchScores[match.id]?.team1Score ?? match.team1Score ?? ''}
                                  onChange={(e) => handleScoreChange(match.id, 'team1', e.target.value)}
                                  className="w-14 h-8 text-xs text-center"
                                  disabled={!canEditScores || team1IsPlaceholder}
                                />
                              </div>
                              
                              <div className="text-center text-xs text-muted-foreground my-1">vs</div>
                              
                              <div className="flex items-center justify-between">
                                 <span className={`font-medium text-sm truncate pr-2 ${match.played && match.team1Score !== null && match.team2Score !== null && match.team2Score > match.team1Score ? 'text-green-600 dark:text-green-400 font-bold' : 'text-foreground'}`}>
                                   {getTeamName(match.team2Id, match.placeholder || `Team B`)}
                                 </span>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="-"
                                  value={matchScores[match.id]?.team2Score ?? match.team2Score ?? ''}
                                  onChange={(e) => handleScoreChange(match.id, 'team2', e.target.value)}
                                  className="w-14 h-8 text-xs text-center"
                                  disabled={!canEditScores || team2IsPlaceholder}
                                />
                              </div>

                              {(team1IsPlaceholder || team2IsPlaceholder) ? (
                                  <p className="text-xs text-muted-foreground text-center pt-2">Waiting for teams...</p>
                                ): (
                                  <Button
                                    onClick={() => handleUpdateMatchResult(roundIndex, matchIndex, match.id)}
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-3 h-8 text-xs"
                                    disabled={!canEditScores || team1IsPlaceholder || team2IsPlaceholder}
                                    aria-label="Save knockout match score"
                                  >
                                    <Save className="mr-1 h-3 w-3" /> {match.played && matchScores[match.id] === undefined ? 'Update Score' : 'Save Score'}
                                  </Button>
                                )
                              }
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
       {knockoutRounds.length === 0 && (
        <p className="text-muted-foreground text-center mt-6">No knockout bracket generated yet. Configure and create one above.</p>
      )}
    </div>
  );
}
