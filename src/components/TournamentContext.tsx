"use client";
import type { Dispatch } from 'react';
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { TournamentState, TournamentAction, Team, Group, Match, GroupTeamStats, KnockoutMatch } from '@/types';
import { toast } from "@/hooks/use-toast";

const initialState: TournamentState = {
  teams: [],
  groups: [],
  knockoutRounds: [],
  isInitialized: false,
};

function generateMatchesForGroup(teamIds: string[], allTeams: Team[]): Match[] {
  const matches: Match[] = [];
  if (teamIds.length < 2) return matches;

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({
        id: `match-${Date.now()}-${Math.random()}`,
        team1Id: teamIds[i],
        team2Id: teamIds[j],
        team1Name: allTeams.find(t => t.id === teamIds[i])?.name,
        team2Name: allTeams.find(t => t.id === teamIds[j])?.name,
        team1Score: null,
        team2Score: null,
        played: false,
      });
    }
  }
  return matches;
}

function calculateGroupStandings(group: Group, allTeams: Team[]): GroupTeamStats[] {
  const statsMap = new Map<string, GroupTeamStats>();

  group.teamIds.forEach(teamId => {
    const team = allTeams.find(t => t.id === teamId);
    statsMap.set(teamId, {
      teamId,
      teamName: team?.name || 'Unknown Team',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    });
  });

  group.matches.forEach(match => {
    if (match.played && match.team1Score !== null && match.team2Score !== null) {
      const team1Stats = statsMap.get(match.team1Id)!;
      const team2Stats = statsMap.get(match.team2Id)!;

      team1Stats.played++;
      team2Stats.played++;
      team1Stats.gf += match.team1Score;
      team1Stats.ga += match.team2Score;
      team2Stats.gf += match.team2Score;
      team2Stats.ga += match.team1Score;

      if (match.team1Score > match.team2Score) {
        team1Stats.won++;
        team1Stats.points += 3;
        team2Stats.lost++;
      } else if (match.team1Score < match.team2Score) {
        team2Stats.won++;
        team2Stats.points += 3;
        team1Stats.lost++;
      } else {
        team1Stats.drawn++;
        team2Stats.drawn++;
        team1Stats.points += 1;
        team2Stats.points += 1;
      }
    }
  });

  const standings = Array.from(statsMap.values());
  standings.forEach(stat => stat.gd = stat.gf - stat.ga);

  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.teamName.localeCompare(b.teamName);
  });
}


const tournamentReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  switch (action.type) {
    case 'INITIALIZE_STATE':
      return { ...action.payload, isInitialized: true };
    case 'ADD_TEAM':
      const newTeam: Team = { id: `team-${Date.now()}`, name: action.payload.name };
      return { ...state, teams: [...state.teams, newTeam] };
    case 'DELETE_TEAM':
      // Also remove team from groups and potentially invalidate knockout matches
      const teamIdToDelete = action.payload.teamId;
      return {
        ...state,
        teams: state.teams.filter(team => team.id !== teamIdToDelete),
        groups: state.groups.map(group => ({
          ...group,
          teamIds: group.teamIds.filter(id => id !== teamIdToDelete),
          matches: group.matches.filter(match => match.team1Id !== teamIdToDelete && match.team2Id !== teamIdToDelete)
        })),
        // Knockout stage implications are complex, for now, just filter teams
      };
    case 'EDIT_TEAM_NAME':
      return {
        ...state,
        teams: state.teams.map(team =>
          team.id === action.payload.teamId ? { ...team, name: action.payload.newName } : team
        ),
        // Update names in matches if cached there
        groups: state.groups.map(group => ({
          ...group,
          matches: group.matches.map(match => ({
            ...match,
            team1Name: match.team1Id === action.payload.teamId ? action.payload.newName : match.team1Name,
            team2Name: match.team2Id === action.payload.teamId ? action.payload.newName : match.team2Name,
          }))
        })),
        knockoutRounds: state.knockoutRounds.map(round => round.map(match => ({
          ...match,
            team1Name: match.team1Id === action.payload.teamId ? action.payload.newName : match.team1Name,
            team2Name: match.team2Id === action.payload.teamId ? action.payload.newName : match.team2Name,
        })))
      };
    case 'CREATE_GROUP':
      const newGroup: Group = {
        id: `group-${Date.now()}`,
        name: action.payload.name,
        teamIds: [],
        matches: [],
      };
      return { ...state, groups: [...state.groups, newGroup] };
    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(group => group.id !== action.payload.groupId)
      };
    case 'ADD_TEAM_TO_GROUP':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? { ...group, teamIds: [...new Set([...group.teamIds, action.payload.teamId])] }
            : group
        ),
      };
    case 'REMOVE_TEAM_FROM_GROUP':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? { ...group, teamIds: group.teamIds.filter(id => id !== action.payload.teamId) }
            : group
        ),
      };
    case 'GENERATE_GROUP_MATCHES':
      return {
        ...state,
        groups: state.groups.map(group => {
          if (group.id === action.payload.groupId) {
            const newMatches = generateMatchesForGroup(group.teamIds, state.teams);
            return { ...group, matches: newMatches };
          }
          return group;
        }),
      };
    case 'UPDATE_GROUP_MATCH_RESULT': {
      const { groupId, matchId, team1Score, team2Score } = action.payload;
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === groupId
            ? {
                ...group,
                matches: group.matches.map(match =>
                  match.id === matchId
                    ? { ...match, team1Score, team2Score, played: true }
                    : match
                ),
              }
            : group
        ),
      };
    }
    case 'CREATE_KNOCKOUT_STAGE': {
      const { numTeams, selectedTeamIds } = action.payload;
      if (numTeams < 2 || (numTeams & (numTeams - 1)) !== 0) { // Must be a power of 2
        toast({ title: "Error", description: "Number of teams for knockout must be a power of 2 (e.g., 2, 4, 8, 16).", variant: "destructive" });
        return state;
      }
      
      const rounds: KnockoutMatch[][] = [];
      let currentRoundTeams = selectedTeamIds.slice(0, numTeams);
      
      // Pad with placeholder teams if not enough selected
      while(currentRoundTeams.length < numTeams) {
        currentRoundTeams.push(`placeholder-${currentRoundTeams.length}`);
      }

      let roundIndex = 0;
      let teamsInCurrentRound = numTeams;

      while (teamsInCurrentRound >= 1) {
        const roundMatches: KnockoutMatch[] = [];
        for (let i = 0; i < teamsInCurrentRound / 2; i++) {
          const team1Id = currentRoundTeams[i*2];
          const team2Id = currentRoundTeams[i*2+1];
          const team1 = state.teams.find(t => t.id === team1Id);
          const team2 = state.teams.find(t => t.id === team2Id);

          roundMatches.push({
            id: `ko-r${roundIndex}-m${i}-${Date.now()}`,
            team1Id: team1Id,
            team2Id: team2Id,
            team1Name: team1?.name || (team1Id.startsWith('placeholder') ? `Team ${i*2+1}`: 'TBD'),
            team2Name: team2?.name || (team2Id.startsWith('placeholder') ? `Team ${i*2+2}`: 'TBD'),
            team1Score: null,
            team2Score: null,
            played: false,
            roundIndex,
            matchIndexInRound: i,
            placeholder: !team1 || !team2 ? "Waiting for teams" : undefined,
          });
        }
        rounds.push(roundMatches);
        if (teamsInCurrentRound === 1) break; // Final (winner display)
        
        const nextRoundPlaceholders: string[] = [];
        for(let i = 0; i < teamsInCurrentRound / 2; i++) {
          nextRoundPlaceholders.push(`winner-r${roundIndex}-m${i}`);
        }
        currentRoundTeams = nextRoundPlaceholders;
        teamsInCurrentRound /= 2;
        roundIndex++;
      }
      return { ...state, knockoutRounds: rounds };
    }
    case 'UPDATE_KNOCKOUT_MATCH_RESULT': {
      const { roundIndex, matchIndexInRound, team1Score, team2Score } = action.payload;
      const newKnockoutRounds = state.knockoutRounds.map(r => r.map(m => ({...m}))); // Deep copy

      const match = newKnockoutRounds[roundIndex]?.[matchIndexInRound];
      if (!match) return state;

      match.team1Score = team1Score;
      match.team2Score = team2Score;
      match.played = true;

      // Advance winner to next round
      if (roundIndex < newKnockoutRounds.length - 1) {
        const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;
        const winner = state.teams.find(t => t.id === winnerId) || { id: winnerId, name: winnerId.startsWith('winner-') || winnerId.startsWith('placeholder-') ? 'TBD' : `Winner of ${match.team1Name} vs ${match.team2Name}`};
        
        const nextRoundMatchIndex = Math.floor(matchIndexInRound / 2);
        const nextMatch = newKnockoutRounds[roundIndex + 1]?.[nextRoundMatchIndex];

        if (nextMatch) {
          if (matchIndexInRound % 2 === 0) { // This match is the first in a pair for the next round match
            nextMatch.team1Id = winner.id;
            nextMatch.team1Name = winner.name;
          } else { // This match is the second in a pair
            nextMatch.team2Id = winner.id;
            nextMatch.team2Name = winner.name;
          }
          if (nextMatch.team1Id && !nextMatch.team1Id.startsWith('winner-') && !nextMatch.team1Id.startsWith('placeholder-') && nextMatch.team2Id && !nextMatch.team2Id.startsWith('winner-') && !nextMatch.team2Id.startsWith('placeholder-')) {
            nextMatch.placeholder = undefined;
          }
        }
      }
      return { ...state, knockoutRounds: newKnockoutRounds };
    }
    case 'RESET_TOURNAMENT':
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tournamentState');
      }
      return { ...initialState, isInitialized: true }; // Reset to initial but mark as initialized
    default:
      return state;
  }
};


const TournamentStateContext = createContext<TournamentState | undefined>(undefined);
const TournamentDispatchContext = createContext<Dispatch<TournamentAction> | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('tournamentState');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          dispatch({ type: 'INITIALIZE_STATE', payload: parsedState });
        } catch (error) {
          console.error("Failed to parse saved state from localStorage", error);
          dispatch({ type: 'INITIALIZE_STATE', payload: initialState }); // fallback
        }
      } else {
        dispatch({ type: 'INITIALIZE_STATE', payload: initialState }); // No saved state
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && state.isInitialized) { // Only save if initialized
      localStorage.setItem('tournamentState', JSON.stringify(state));
    }
  }, [state]);

  if (!state.isInitialized) {
     // You could return a loading spinner here
    return <div className="flex justify-center items-center h-screen"><p>Loading tournament data...</p></div>;
  }

  return (
    <TournamentStateContext.Provider value={state}>
      <TournamentDispatchContext.Provider value={dispatch}>
        {children}
      </TournamentDispatchContext.Provider>
    </TournamentStateContext.Provider>
  );
};

export const useTournamentState = () => {
  const context = useContext(TournamentStateContext);
  if (context === undefined) {
    throw new Error('useTournamentState must be used within a TournamentProvider');
  }
  // Expose helper functions or selectors here if needed, e.g., for calculating standings
  const getTeamById = (teamId: string): Team | undefined => context.teams.find(t => t.id === teamId);
  
  const getGroupStandings = (groupId: string): GroupTeamStats[] => {
    const group = context.groups.find(g => g.id === groupId);
    if (!group) return [];
    return calculateGroupStandings(group, context.teams);
  };

  return { ...context, getTeamById, getGroupStandings };
};

export const useTournamentDispatch = () => {
  const context = useContext(TournamentDispatchContext);
  if (context === undefined) {
    throw new Error('useTournamentDispatch must be used within a TournamentProvider');
  }
  return context;
};

// Helper to ensure component using this does not render SSR if it depends on localStorage state
export const useIsClient = () => {
  const [isClient, setIsClient] = React.useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
}
