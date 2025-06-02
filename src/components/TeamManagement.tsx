"use client";
import React, { useState } from 'react';
import { useTournamentState, useTournamentDispatch, useIsClient } from '@/components/TournamentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Edit3, Save, XCircle } from 'lucide-react';
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
  const { teams } = useTournamentState();
  const dispatch = useTournamentDispatch();
  const [teamName, setTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const isClient = useIsClient();


  const handleAddTeam = () => {
    if (teamName.trim() === '') {
      toast({ title: "Error", description: "Team name cannot be empty.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'ADD_TEAM', payload: { name: teamName.trim() } });
    setTeamName('');
    toast({ title: "Success", description: `Team "${teamName.trim()}" added.` });
  };

  const handleDeleteTeam = (teamId: string) => {
    dispatch({ type: 'DELETE_TEAM', payload: { teamId } });
    toast({ title: "Success", description: "Team deleted." });
  };

  const handleEditTeam = (teamId: string, currentName: string) => {
    setEditingTeamId(teamId);
    setEditingTeamName(currentName);
  };

  const handleSaveEdit = () => {
    if (!editingTeamId || editingTeamName.trim() === '') {
      toast({ title: "Error", description: "Team name cannot be empty during edit.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'EDIT_TEAM_NAME', payload: { teamId: editingTeamId, newName: editingTeamName.trim() } });
    toast({ title: "Success", description: "Team name updated." });
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const handleCancelEdit = () => {
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  if (!isClient) {
    return <Card className="w-full max-w-md mx-auto mt-6">
      <CardHeader><CardTitle>Loading Teams...</CardTitle></CardHeader>
      <CardContent><div className="animate-pulse h-10 bg-muted rounded-md w-full"></div></CardContent>
    </Card>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <PlusCircle className="h-6 w-6 text-primary" /> Manage Teams
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name"
            className="flex-grow"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTeam()}
          />
          <Button onClick={handleAddTeam} aria-label="Add team">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Team
          </Button>
        </div>

        {teams.length === 0 ? (
          <p className="text-muted-foreground text-center">No teams added yet. Add some teams to get started!</p>
        ) : (
          <ul className="space-y-3">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-md shadow-sm hover:shadow-md transition-shadow"
              >
                {editingTeamId === team.id ? (
                  <div className="flex-grow flex items-center gap-2">
                    <Input 
                      value={editingTeamName} 
                      onChange={(e) => setEditingTeamName(e.target.value)}
                      className="flex-grow"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    />
                    <Button onClick={handleSaveEdit} size="icon" variant="ghost" aria-label="Save team name">
                      <Save className="h-5 w-5 text-green-500" />
                    </Button>
                    <Button onClick={handleCancelEdit} size="icon" variant="ghost" aria-label="Cancel edit">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-foreground font-medium">{team.name}</span>
                    <div className="flex gap-2">
                      <Button onClick={() => handleEditTeam(team.id, team.name)} variant="outline" size="sm" aria-label={`Edit team ${team.name}`}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" aria-label={`Delete team ${team.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete team "{team.name}"? This may affect existing groups and matches.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTeam(team.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
