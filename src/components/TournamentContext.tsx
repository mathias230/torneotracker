
"use client";
import type { Dispatch } from 'react';
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import type { TournamentState, TournamentAction, Team, Group, Match, GroupTeamStats, KnockoutMatch, League, LeagueZoneSetting } from '@/types';
import { toast } from "@/hooks/use-toast";
import { db } from '@/lib/firebaseConfig'; // Importar la instancia de Firestore
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const initialState: TournamentState = {
  teams: [],
  groups: [],
  league: null,
  knockoutRounds: [],
  isInitialized: false,
  isAdminMode: false, 
};

// Fisher-Yates Shuffle Algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function generateRoundRobinMatches(teamIds: string[], allTeams: Team[], playTwice: boolean): Match[] {
  const matches: Match[] = [];
  if (teamIds.length < 2) return matches;

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({
        id: `match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-1`,
        team1Id: teamIds[i],
        team2Id: teamIds[j],
        team1Name: allTeams.find(t => t.id === teamIds[i])?.name,
        team2Name: allTeams.find(t => t.id === teamIds[j])?.name,
        team1Score: null,
        team2Score: null,
        played: false,
      });

      if (playTwice) {
        matches.push({
          id: `match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-2`,
          team1Id: teamIds[j],
          team2Id: teamIds[i],
          team1Name: allTeams.find(t => t.id === teamIds[j])?.name,
          team2Name: allTeams.find(t => t.id === teamIds[i])?.name,
          team1Score: null,
          team2Score: null,
          played: false,
        });
      }
    }
  }
  return shuffleArray(matches);
}


function calculateStandings(
  entity: { teamIds: string[], matches: Match[], name?: string },
  allTeams: Team[]
): GroupTeamStats[] {
  const statsMap = new Map<string, GroupTeamStats>();

  entity.teamIds.forEach(teamId => {
    const team = allTeams.find(t => t.id === teamId);
    statsMap.set(teamId, {
      teamId,
      teamName: team?.name || 'Equipo Desconocido',
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

  entity.matches.forEach(match => {
    if (match.played && match.team1Score !== null && match.team2Score !== null) {
      const team1Stats = statsMap.get(match.team1Id);
      const team2Stats = statsMap.get(match.team2Id);

      if (!team1Stats || !team2Stats) return;


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

const TOURNAMENT_DOC_PATH = "tournaments_shared/default_tournament";

const saveTournamentStateToFirestore = async (state: TournamentState) => {
  try {
    // Destructure to exclude isInitialized if it's purely client-side and not meant for Firestore
    const { isInitialized, ...stateToSave } = state; 
    const tournamentDocRef = doc(db, TOURNAMENT_DOC_PATH);
    await setDoc(tournamentDocRef, stateToSave);
    console.log("Tournament state saved to Firestore");
  } catch (error) {
    console.error("Error saving tournament state to Firestore:", error);
    toast({
      title: "Error de Sincronización",
      description: "No se pudo guardar el estado del torneo en la nube.",
      variant: "destructive",
    });
  }
};


const tournamentReducer = (state: TournamentState, action: TournamentAction): TournamentState => {
  let newState = state;
  switch (action.type) {
    case 'INITIALIZE_STATE':
      return { ...action.payload, isInitialized: true };
    case 'ADD_TEAM': {
      const newTeam: Team = { id: `team-${Date.now()}`, name: action.payload.name };
      newState = { ...state, teams: [...state.teams, newTeam] };
      break;
    }
    case 'DELETE_TEAM': {
      const teamIdToDelete = action.payload.teamId;
      const updatedGroups = state.groups.map(group => ({
        ...group,
        teamIds: group.teamIds.filter(id => id !== teamIdToDelete),
        matches: group.matches.filter(match => match.team1Id !== teamIdToDelete && match.team2Id !== teamIdToDelete)
      })).filter(group => group.teamIds.length > 0);

      let updatedLeague = state.league;
      if (state.league && state.league.teamIds.includes(teamIdToDelete)) {
        const newLeagueTeamIds = state.league.teamIds.filter(id => id !== teamIdToDelete);
        if (newLeagueTeamIds.length < 2) {
          updatedLeague = null;
          // Toast for league deletion due to team removal should be handled in the component triggering DELETE_TEAM
        } else {
          updatedLeague = {
            ...state.league,
            teamIds: newLeagueTeamIds,
            matches: state.league.matches.filter(match => match.team1Id !== teamIdToDelete && match.team2Id !== teamIdToDelete)
          };
        }
      }
      newState = {
        ...state,
        teams: state.teams.filter(team => team.id !== teamIdToDelete),
        groups: updatedGroups,
        league: updatedLeague,
        isAdminMode: state.isAdminMode,
      };
      break;
    }
    case 'EDIT_TEAM_NAME': {
      const { teamId, newName } = action.payload;
      newState = {
        ...state,
        teams: state.teams.map(team =>
          team.id === teamId ? { ...team, name: newName } : team
        ),
        groups: state.groups.map(group => ({
          ...group,
          matches: group.matches.map(match => ({
            ...match,
            team1Name: match.team1Id === teamId ? newName : match.team1Name,
            team2Name: match.team2Id === teamId ? newName : match.team2Name,
          }))
        })),
        league: state.league ? {
          ...state.league,
          matches: state.league.matches.map(match => ({
            ...match,
            team1Name: match.team1Id === teamId ? newName : match.team1Name,
            team2Name: match.team2Id === teamId ? newName : match.team2Name,
          }))
        } : null,
        knockoutRounds: state.knockoutRounds.map(round => round.map(match => ({
          ...match,
            team1Name: match.team1Id === teamId ? newName : match.team1Name,
            team2Name: match.team2Id === teamId ? newName : match.team2Name,
        }))),
        isAdminMode: state.isAdminMode,
      };
      break;
    }
    case 'CREATE_GROUP': {
      const newGroupManual: Group = {
        id: `group-${Date.now()}`,
        name: action.payload.name,
        teamIds: [],
        matches: [],
        zoneSettings: [],
      };
      newState = { ...state, groups: [...state.groups, newGroupManual] };
      break;
    }
    case 'DELETE_GROUP': {
      newState = {
        ...state,
        groups: state.groups.filter(group => group.id !== action.payload.groupId)
      };
      break;
    }
    case 'ADD_TEAM_TO_GROUP': {
      newState = {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? { ...group, teamIds: [...new Set([...group.teamIds, action.payload.teamId])] }
            : group
        ),
      };
      break;
    }
    case 'REMOVE_TEAM_FROM_GROUP': {
      newState = {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? { ...group, teamIds: group.teamIds.filter(id => id !== action.payload.teamId) }
            : group
        ),
      };
      break;
    }
    case 'GENERATE_GROUP_MATCHES': {
      newState = {
        ...state,
        groups: state.groups.map(group => {
          if (group.id === action.payload.groupId) {
            const newMatches = generateRoundRobinMatches(group.teamIds, state.teams, false);
            return { ...group, matches: newMatches };
          }
          return group;
        }),
      };
      break;
    }
    case 'UPDATE_GROUP_MATCH_RESULT': {
      const { groupId, matchId, team1Score, team2Score } = action.payload;
      newState = {
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
      break;
    }
    case 'CREATE_KNOCKOUT_STAGE': {
      const { numTeams, selectedTeamIds } = action.payload;
      if (numTeams < 2 || (numTeams & (numTeams - 1)) !== 0) {
        // Toast for error should be handled in the component dispatching
        return state; 
      }

      const rounds: KnockoutMatch[][] = [];
      let currentRoundTeams = selectedTeamIds.slice(0, numTeams);

      while(currentRoundTeams.length < numTeams) {
        currentRoundTeams.push(`placeholder-${currentRoundTeams.length}`);
      }

      let roundIndex = 0;
      let teamsInCurrentRound = numTeams;

      while (teamsInCurrentRound >= 1) {
        const roundMatches: KnockoutMatch[] = [];
        const numberOfMatchesInThisRound = teamsInCurrentRound / 2;

        if (teamsInCurrentRound === 1 && numberOfMatchesInThisRound === 0.5) {
            const finalWinnerId = currentRoundTeams[0];
            const finalWinnerTeam = state.teams.find(t => t.id === finalWinnerId);
            const finalWinnerName = finalWinnerTeam?.name || (typeof finalWinnerId === 'string' && finalWinnerId.startsWith('winner-') ? `Campeón` : 'Campeón');

            roundMatches.push({
                id: `ko-r${roundIndex}-m-champion-${Date.now()}`,
                team1Id: finalWinnerId,
                team2Id: null,
                team1Name: finalWinnerName,
                team2Name: null,
                team1Score: null,
                team2Score: null,
                played: true,
                roundIndex,
                matchIndexInRound: 0,
                placeholder: !finalWinnerId || finalWinnerId.startsWith('winner-') ? "Campeón del Torneo" : undefined,
            });
            rounds.push(roundMatches);
            break;
        }

        for (let i = 0; i < numberOfMatchesInThisRound; i++) {
          const team1Id = currentRoundTeams[i*2];
          const team2Id = currentRoundTeams[i*2+1];
          const team1 = state.teams.find(t => t.id === team1Id);
          const team2 = state.teams.find(t => t.id === team2Id);

          roundMatches.push({
            id: `ko-r${roundIndex}-m${i}-${Date.now()}`,
            team1Id: team1Id,
            team2Id: team2Id,
            team1Name: team1?.name || (typeof team1Id === 'string' && team1Id.startsWith('placeholder-') ? `Equipo ${i*2+1}`: `A determinar`),
            team2Name: team2?.name || (typeof team2Id === 'string' && team2Id.startsWith('placeholder-') ? `Equipo ${i*2+2}`: `A determinar`),
            team1Score: null,
            team2Score: null,
            played: false,
            roundIndex,
            matchIndexInRound: i,
            placeholder: (!team1Id || team1Id.startsWith('winner-') || team1Id.startsWith('placeholder-') || !team2Id || team2Id.startsWith('winner-') || team2Id.startsWith('placeholder-')) ? "Esperando equipos" : undefined,
          });
        }
        if(roundMatches.length > 0) rounds.push(roundMatches);

        if (teamsInCurrentRound <= 1) break;

        const nextRoundPlaceholders: string[] = [];
        for(let i = 0; i < numberOfMatchesInThisRound; i++) {
          nextRoundPlaceholders.push(`winner-r${roundIndex}-m${i}`);
        }
        currentRoundTeams = nextRoundPlaceholders;
        teamsInCurrentRound /= 2;
        roundIndex++;
         if (roundIndex > 10) break; 
      }
      newState = { ...state, knockoutRounds: rounds };
      break;
    }
    case 'UPDATE_KNOCKOUT_MATCH_RESULT': {
      const { roundIndex, matchIndexInRound, team1Score, team2Score } = action.payload;
      const newKnockoutRounds = state.knockoutRounds.map(r => r.map(m => ({...m})));

      const match = newKnockoutRounds[roundIndex]?.[matchIndexInRound];
      if (!match || !match.team1Id || !match.team2Id) return state;

      match.team1Score = team1Score;
      match.team2Score = team2Score;
      match.played = true;

      if (roundIndex < newKnockoutRounds.length - 1) {
        const winnerId = team1Score > team2Score ? match.team1Id : match.team2Id;

        let winnerName = 'A determinar';
        const foundWinnerTeam = state.teams.find(t => t.id === winnerId);
        if (foundWinnerTeam) {
            winnerName = foundWinnerTeam.name;
        } else if (typeof winnerId === 'string' && (winnerId.startsWith('winner-') || winnerId.startsWith('placeholder-'))) {
             winnerName = (team1Score > team2Score ? match.team1Name : match.team2Name) || 'A determinar';
        } else {
            winnerName = `Ganador de ${match.team1Name || 'partido'} vs ${match.team2Name || 'partido'}`;
        }

        const nextRoundMatchIndex = Math.floor(matchIndexInRound / 2);
        const nextMatch = newKnockoutRounds[roundIndex + 1]?.[nextRoundMatchIndex];

        if (nextMatch) {
          if (matchIndexInRound % 2 === 0) {
            nextMatch.team1Id = winnerId;
            nextMatch.team1Name = winnerName;
          } else {
            nextMatch.team2Id = winnerId;
            nextMatch.team2Name = winnerName;
          }
           if (nextMatch.team1Id && !nextMatch.team1Id.startsWith('winner-') && !nextMatch.team1Id.startsWith('placeholder-') &&
               nextMatch.team2Id && !nextMatch.team2Id.startsWith('winner-') && !nextMatch.team2Id.startsWith('placeholder-')) {
            nextMatch.placeholder = undefined;
          } else {
            nextMatch.placeholder = "Esperando equipos";
          }
        }
      }
      newState = { ...state, knockoutRounds: newKnockoutRounds };
      break;
    }
     case 'RANDOMLY_CREATE_GROUPS_AND_ASSIGN_TEAMS': {
      const { numGroups, groupNamePrefix = "Grupo" } = action.payload;
      const { teams } = state;

      if (numGroups <= 0 || teams.length === 0 || teams.length < numGroups) {
        // Toast for error should be handled in the component dispatching
        return state;
      }

      const shuffledTeams = shuffleArray([...teams]);
      const newGroups: Group[] = [];
      const teamsPerGroupBase = Math.floor(shuffledTeams.length / numGroups);
      let remainderTeams = shuffledTeams.length % numGroups;
      let currentTeamIndex = 0;

      for (let i = 0; i < numGroups; i++) {
        const teamsInThisGroupCount = teamsPerGroupBase + (remainderTeams > 0 ? 1 : 0);
        if (remainderTeams > 0) {
          remainderTeams--;
        }

        const groupTeamIds = shuffledTeams.slice(currentTeamIndex, currentTeamIndex + teamsInThisGroupCount).map(t => t.id);
        currentTeamIndex += teamsInThisGroupCount;

        if (groupTeamIds.length === 0 && teams.length > 0) {
            continue;
        }

        const groupName = `${groupNamePrefix} ${String.fromCharCode(65 + i)}`;
        const groupMatches = generateRoundRobinMatches(groupTeamIds, state.teams, false);

        newGroups.push({
          id: `group-${Date.now()}-${Math.random()}`,
          name: groupName,
          teamIds: groupTeamIds,
          matches: groupMatches,
          zoneSettings: [],
        });
      }

      newState = {
        ...state,
        groups: [...state.groups, ...newGroups],
      };
      break;
    }
    case 'SETUP_LEAGUE': {
      const { name, teamIds, playEachTeamTwice } = action.payload;
      if (teamIds.length < 2) {
        // Toast for error should be handled in the component dispatching
        return state;
      }
      const leagueMatches = generateRoundRobinMatches(teamIds, state.teams, playEachTeamTwice);
      const newLeague: League = {
        id: `league-${Date.now()}`,
        name,
        teamIds,
        matches: leagueMatches,
        playEachTeamTwice,
        zoneSettings: [],
      };
      newState = { ...state, league: newLeague };
      break;
    }
    case 'CLEAR_LEAGUE': {
      newState = { ...state, league: null };
      break;
    }
    case 'GENERATE_LEAGUE_MATCHES': {
      if (!state.league || state.league.teamIds.length < 2) {
        // Toast for error should be handled in the component dispatching
        return state;
      }
      const leagueMatches = generateRoundRobinMatches(state.league.teamIds, state.teams, !!state.league.playEachTeamTwice);
      newState = {
        ...state,
        league: { ...state.league, matches: leagueMatches },
      };
      break;
    }
    case 'UPDATE_LEAGUE_MATCH_RESULT': {
      const { matchId, team1Score, team2Score } = action.payload;
      if (!state.league) return state;
      newState = {
        ...state,
        league: {
          ...state.league,
          matches: state.league.matches.map(match =>
            match.id === matchId
              ? { ...match, team1Score, team2Score, played: true }
              : match
          ),
        },
      };
      break;
    }
    case 'ADD_LEAGUE_ZONE': {
      if (!state.league) return state;
      const { name, startPosition, endPosition, color } = action.payload;
      const newZone: LeagueZoneSetting = {
        id: `zone-${Date.now()}`,
        name,
        startPosition,
        endPosition,
        color,
      };
      newState = {
        ...state,
        league: {
          ...state.league,
          zoneSettings: [...state.league.zoneSettings, newZone],
        },
      };
      break;
    }
    case 'EDIT_LEAGUE_ZONE': {
      if (!state.league) return state;
      newState = {
        ...state,
        league: {
          ...state.league,
          zoneSettings: state.league.zoneSettings.map(zone =>
            zone.id === action.payload.id ? { ...zone, ...action.payload } : zone
          ),
        },
      };
      break;
    }
    case 'DELETE_LEAGUE_ZONE': {
      if (!state.league) return state;
      newState = {
        ...state,
        league: {
          ...state.league,
          zoneSettings: state.league.zoneSettings.filter(zone => zone.id !== action.payload.zoneId),
        },
      };
      break;
    }
    case 'ADD_GROUP_ZONE': {
      const { groupId, name, startPosition, endPosition, color } = action.payload;
      const newZone: LeagueZoneSetting = {
        id: `zone-${Date.now()}`,
        name,
        startPosition,
        endPosition,
        color,
      };
      newState = {
        ...state,
        groups: state.groups.map(group =>
          group.id === groupId
            ? { ...group, zoneSettings: [...(group.zoneSettings || []), newZone] }
            : group
        ),
      };
      break;
    }
    case 'EDIT_GROUP_ZONE': {
      const { groupId, zone: updatedZone } = action.payload;
      newState = {
        ...state,
        groups: state.groups.map(group =>
          group.id === groupId
            ? {
                ...group,
                zoneSettings: (group.zoneSettings || []).map(zone =>
                  zone.id === updatedZone.id ? updatedZone : zone
                ),
              }
            : group
        ),
      };
      break;
    }
    case 'DELETE_GROUP_ZONE': {
      const { groupId, zoneId } = action.payload;
      newState = {
        ...state,
        groups: state.groups.map(group =>
          group.id === groupId
            ? {
                ...group,
                zoneSettings: (group.zoneSettings || []).filter(zone => zone.id !== zoneId),
              }
            : group
        ),
      };
      break;
    }
    case 'SET_ADMIN_MODE':
      newState = { ...state, isAdminMode: action.payload };
      console.log("TournamentContext [SET_ADMIN_MODE]: New isAdminMode:", action.payload, "Full new state:", newState);
      break;
    case 'RESET_TOURNAMENT': {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tournamentState');
      }
      newState = { ...initialState, isAdminMode: false, isInitialized: true };
      const tournamentDocRef = doc(db, TOURNAMENT_DOC_PATH);
      deleteDoc(tournamentDocRef).then(() => {
        console.log("Tournament data deleted from Firestore");
      }).catch(error => {
        console.error("Error deleting tournament data from Firestore:", error);
      });
      break; // Added missing break
    }
    default:
      return state;
  }
  return newState;
};


const TournamentStateContext = createContext<TournamentState | undefined>(undefined);
const TournamentDispatchContext = createContext<Dispatch<TournamentAction> | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStateString = localStorage.getItem('tournamentState');
      console.log("TournamentContext [LOAD]: Raw from localStorage:", savedStateString);
      let statePayload: TournamentState = { ...initialState, isInitialized: false };

      if (savedStateString) {
        try {
          const loadedSavedState = JSON.parse(savedStateString) as Partial<TournamentState>;
          console.log("TournamentContext [LOAD]: Parsed from localStorage:", loadedSavedState);
          
          statePayload = {
            teams: loadedSavedState.teams || initialState.teams,
            groups: (loadedSavedState.groups || initialState.groups).map(g => ({
              id: g.id || `group-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
              name: g.name || 'Grupo',
              matches: g.matches || [],
              teamIds: g.teamIds || [],
              zoneSettings: (g.zoneSettings || []).map(zs => ({ 
                id: zs.id || `zone-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                name: zs.name || 'Zona sin nombre',
                startPosition: typeof zs.startPosition === 'number' ? zs.startPosition : 1,
                endPosition: typeof zs.endPosition === 'number' ? zs.endPosition : 1,
                color: zs.color || '#000000',
                ...zs
              })),
              ...g
            })),
            knockoutRounds: loadedSavedState.knockoutRounds || initialState.knockoutRounds,
            league: loadedSavedState.league ? {
              id: loadedSavedState.league.id || `league-${Date.now()}`,
              name: loadedSavedState.league.name || 'Mi Liga',
              teamIds: loadedSavedState.league.teamIds || [],
              matches: loadedSavedState.league.matches || [],
              playEachTeamTwice: typeof loadedSavedState.league.playEachTeamTwice === 'boolean' ? loadedSavedState.league.playEachTeamTwice : false,
              zoneSettings: (loadedSavedState.league.zoneSettings || []).map(zs => ({
                id: zs.id || `zone-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                name: zs.name || 'Zona sin nombre',
                startPosition: typeof zs.startPosition === 'number' ? zs.startPosition : (typeof (zs as any).positions === 'number' ? 1 : 0), 
                endPosition: typeof zs.endPosition === 'number' ? zs.endPosition : (typeof (zs as any).positions === 'number' ? (zs as any).positions : 0), 
                color: zs.color || '#000000',
                ...zs
              })),
            } : initialState.league,
            isAdminMode: typeof loadedSavedState.isAdminMode === 'boolean' ? loadedSavedState.isAdminMode : initialState.isAdminMode,
            isInitialized: false, 
          };
          console.log("TournamentContext [LOAD]: isAdminMode after attempting to load:", statePayload.isAdminMode);
        } catch (error) {
          console.error("TournamentContext [LOAD]: Error parsing localStorage, using defaults.", error);
          statePayload = { ...initialState, isInitialized: false };
        }
      } else {
        console.log("TournamentContext [LOAD]: No state in localStorage, using defaults.");
        statePayload = { ...initialState, isInitialized: false, isAdminMode: initialState.isAdminMode };
      }
      dispatch({ type: 'INITIALIZE_STATE', payload: statePayload });
    }
  }, []);

  useEffect(() => {
    if (state.isInitialized) {
      console.log("TournamentContext [SAVE]: Saving to localStorage and Firestore. Current isAdminMode:", state.isAdminMode, "Full state:", state);
      localStorage.setItem('tournamentState', JSON.stringify(state));
      saveTournamentStateToFirestore(state); // Save to Firestore as a side effect
    }
  }, [state]); // This useEffect runs after every state change and after initialization

  if (!state.isInitialized) {
    return <div className="flex justify-center items-center h-screen"><p>Cargando datos del torneo...</p></div>;
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
    throw new Error('useTournamentState debe ser usado dentro de un TournamentProvider');
  }
  const getTeamById = (teamId: string): Team | undefined => context.teams.find(t => t.id === teamId);

  const getGroupStandings = (groupId: string): GroupTeamStats[] => {
    const group = context.groups.find(g => g.id === groupId);
    if (!group) return [];
    return calculateStandings(group, context.teams);
  };

  const getLeagueStandings = (): GroupTeamStats[] => {
    if (!context.league) return [];
    return calculateStandings(context.league, context.teams);
  };

  return { ...context, getTeamById, getGroupStandings, getLeagueStandings };
};

export const useTournamentDispatch = () => {
  const context = useContext(TournamentDispatchContext);
  if (context === undefined) {
    throw new Error('useTournamentDispatch debe ser usado dentro de un TournamentProvider');
  }
  return context;
};

export const useIsClient = () => {
  const [isClient, setIsClient] = React.useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
}
