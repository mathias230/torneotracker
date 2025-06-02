"use client";
import React, { useState, useMemo } from 'react';
import { useTournamentState, useTournamentDispatch, useIsClient } from '@/components/TournamentContext';
import type { Group, Team, Match, GroupTeamStats } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Users, ListChecks, Swords, Save, XCircle } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface MatchScoreInput {
  [matchId: string]: { team1Score: string; team2Score: string };
}

export default function GroupStageManagement() {
  const { teams, groups } = useTournamentState();
  const dispatch = useTournamentDispatch();
  const [groupName, setGroupName] = useState('');
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState<{ [groupId: string]: string }>({});
  const [matchScores, setMatchScores] = useState<MatchScoreInput>({});
  const isClient = useIsClient();

  const handleCreateGroup = () => {
    if (groupName.trim() === '') {
      toast({ title: "Error", description: "Group name cannot be empty.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'CREATE_GROUP', payload: { name: groupName.trim() } });
    setGroupName('');
    toast({ title: "Success", description: `Group "${groupName.trim()}" created.` });
  };

  const handleDeleteGroup = (groupId: string) => {
    dispatch({ type: 'DELETE_GROUP', payload: { groupId } });
    toast({ title: "Success", description: "Group deleted." });
  };

  const handleAddTeamToGroup = (groupId: string) => {
    const teamId = selectedTeamToAdd[groupId];
    if (!teamId) {
      toast({ title: "Error", description: "Please select a team to add.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'ADD_TEAM_TO_GROUP', payload: { groupId, teamId } });
    setSelectedTeamToAdd(prev => ({ ...prev, [groupId]: '' })); // Reset select for this group
    toast({ title: "Success", description: "Team added to group." });
  };

  const handleRemoveTeamFromGroup = (groupId: string, teamId: string) => {
    dispatch({ type: 'REMOVE_TEAM_FROM_GROUP', payload: { groupId, teamId } });
    toast({ title: "Success", description: "Team removed from group." });
  };
  
  const handleGenerateMatches = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group && group.teamIds.length < 2) {
      toast({ title: "Error", description: "A group needs at least 2 teams to generate matches.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'GENERATE_GROUP_MATCHES', payload: { groupId } });
    toast({ title: "Success", description: "Matches generated for the group." });
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
      toast({ title: "Error", description: "Please enter scores for both teams.", variant: "destructive" });
      return;
    }
    const team1Score = parseInt(scores.team1Score, 10);
    const team2Score = parseInt(scores.team2Score, 10);

    if (isNaN(team1Score) || isNaN(team2Score) || team1Score < 0 || team2Score < 0) {
      toast({ title: "Error", description: "Scores must be valid non-negative numbers.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'UPDATE_GROUP_MATCH_RESULT', payload: { groupId, matchId, team1Score, team2Score } });
    toast({ title: "Success", description: "Match result updated." });
  };
  
  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Unknown Team';

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
          team1Stats.points += 1; team2Stats.points += 1;
        }
      }
    });
  
    const standings = Array.from(statsMap.values());
    standings.forEach(stat => stat.gd = stat.gf - stat.ga);
    return standings.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.teamName.localeCompare(b.teamName));
  }, [groups, teams]);


  if (!isClient) {
     return <Card className="w-full max-w-4xl mx-auto mt-6">
      <CardHeader><CardTitle>Loading Group Stage...</CardTitle></CardHeader>
      <CardContent><div className="animate-pulse h-20 bg-muted rounded-md w-full"></div></CardContent>
    </Card>;
  }

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <PlusCircle className="h-6 w-6 text-primary" /> Create New Group
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name (e.g., Group A)"
              className="flex-grow"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <Button onClick={handleCreateGroup} aria-label="Create group">
              <PlusCircle className="mr-2 h-4 w-4" /> Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {groups.length === 0 && (
        <p className="text-muted-foreground text-center mt-6">No groups created yet. Create a group to manage teams and matches.</p>
      )}

      {groups.map((group) => (
        <Card key={group.id} className="w-full max-w-4xl mx-auto shadow-lg">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="font-headline text-2xl text-primary">{group.name}</CardTitle>
              <CardDescription>Manage teams, matches, and standings for this group.</CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                 <Button variant="destructive" size="sm" aria-label={`Delete group ${group.name}`}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete Group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete group "{group.name}"? All its teams and matches will be removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Team Management for Group */}
            <div className="p-4 border rounded-md bg-background">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Users className="h-5 w-5 text-accent" /> Teams in Group</h3>
              <div className="flex gap-2 mb-3">
                <Select
                  value={selectedTeamToAdd[group.id] || ''}
                  onValueChange={(value) => setSelectedTeamToAdd(prev => ({ ...prev, [group.id]: value }))}
                >
                  <SelectTrigger className="flex-grow">
                    <SelectValue placeholder="Select team to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.filter(t => !group.teamIds.includes(t.id)).map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                     {teams.filter(t => !group.teamIds.includes(t.id)).length === 0 && <p className="p-2 text-sm text-muted-foreground">No more teams to add.</p>}
                  </SelectContent>
                </Select>
                <Button onClick={() => handleAddTeamToGroup(group.id)} size="sm" aria-label="Add selected team to group">Add Team</Button>
              </div>
              {group.teamIds.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {group.teamIds.map(teamId => (
                    <li key={teamId} className="flex justify-between items-center p-1.5 bg-secondary/30 rounded">
                      {getTeamName(teamId)}
                      <Button onClick={() => handleRemoveTeamFromGroup(group.id, teamId)} variant="ghost" size="icon" className="h-6 w-6" aria-label={`Remove team ${getTeamName(teamId)} from group`}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-muted-foreground">No teams in this group yet.</p>}
            </div>

            {/* Match Generation & List */}
            <div className="p-4 border rounded-md bg-background">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Swords className="h-5 w-5 text-accent" /> Matches</h3>
              {group.teamIds.length >= 2 && group.matches.length === 0 && (
                 <Button onClick={() => handleGenerateMatches(group.id)} className="w-full mb-3" variant="outline" aria-label="Generate matches for group">
                  Generate Matches
                </Button>
              )}
              {group.matches.length > 0 ? (
                <ScrollArea className="h-[200px] pr-3">
                  <ul className="space-y-2">
                    {group.matches.map(match => (
                      <li key={match.id} className="p-2.5 border rounded-md bg-secondary/30 text-sm">
                        <div className="flex justify-between items-center mb-1.5">
                          <span><strong>{getTeamName(match.team1Id)}</strong> vs <strong>{getTeamName(match.team2Id)}</strong></span>
                          {match.played && <span className="text-xs px-1.5 py-0.5 bg-green-200 text-green-800 rounded-full">Played</span>}
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            min="0"
                            placeholder="Score 1"
                            value={matchScores[match.id]?.team1Score ?? match.team1Score ?? ''}
                            onChange={(e) => handleScoreChange(group.id, match.id, 'team1', e.target.value)}
                            className="w-20 h-8 text-xs"
                            disabled={match.played && (matchScores[match.id] === undefined)}
                          />
                          <span>-</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Score 2"
                            value={matchScores[match.id]?.team2Score ?? match.team2Score ?? ''}
                            onChange={(e) => handleScoreChange(group.id, match.id, 'team2', e.target.value)}
                            className="w-20 h-8 text-xs"
                            disabled={match.played && (matchScores[match.id] === undefined)}
                          />
                          <Button onClick={() => handleUpdateMatchResult(group.id, match.id)} size="sm" variant="outline" className="h-8 text-xs" aria-label="Save match score">
                            <Save className="mr-1 h-3 w-3" /> Save
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : <p className="text-xs text-muted-foreground">No matches generated or teams insufficient.</p>}
            </div>

            {/* Standings Table */}
            <div className="p-4 border rounded-md bg-background">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><ListChecks className="h-5 w-5 text-accent" /> Standings</h3>
              {getGroupStandings(group.id).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">Team</TableHead>
                      <TableHead className="text-center">P</TableHead>
                      <TableHead className="text-center">W</TableHead>
                      <TableHead className="text-center">D</TableHead>
                      <TableHead className="text-center">L</TableHead>
                      <TableHead className="text-center">GF</TableHead>
                      <TableHead className="text-center">GA</TableHead>
                      <TableHead className="text-center">GD</TableHead>
                      <TableHead className="text-center font-bold">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getGroupStandings(group.id).map(stat => (
                      <TableRow key={stat.teamId}>
                        <TableCell>{stat.teamName}</TableCell>
                        <TableCell className="text-center">{stat.played}</TableCell>
                        <TableCell className="text-center">{stat.won}</TableCell>
                        <TableCell className="text-center">{stat.drawn}</TableCell>
                        <TableCell className="text-center">{stat.lost}</TableCell>
                        <TableCell className="text-center">{stat.gf}</TableCell>
                        <TableCell className="text-center">{stat.ga}</TableCell>
                        <TableCell className="text-center">{stat.gd}</TableCell>
                        <TableCell className="text-center font-bold">{stat.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-xs text-muted-foreground">No standings to display. Add teams and record match results.</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
