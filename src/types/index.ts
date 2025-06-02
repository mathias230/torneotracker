export interface Team {
  id: string;
  name: string;
}

export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Name?: string; // For display purposes
  team2Name?: string; // For display purposes
  team1Score: number | null;
  team2Score: number | null;
  played: boolean;
}

export interface GroupTeamStats {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // Goals For
  ga: number; // Goals Against
  gd: number; // Goal Difference
  points: number;
}

export interface Group {
  id: string;
  name: string;
  teamIds: string[];
  matches: Match[];
  // standings will be calculated on the fly or stored if performance becomes an issue
}

export interface KnockoutMatch extends Match {
  roundIndex: number;
  matchIndexInRound: number; 
  nextMatchId?: string; // Used internally to link matches
  nextRoundIndex?: number;
  nextMatchIndexInRound?: number;
  placeholder?: string; // e.g., "Winner of Match A"
}

export interface TournamentState {
  teams: Team[];
  groups: Group[];
  knockoutRounds: KnockoutMatch[][];
  isInitialized: boolean; // To track if state has been loaded from localStorage
}

export type TournamentAction =
  | { type: 'INITIALIZE_STATE'; payload: TournamentState }
  | { type: 'ADD_TEAM'; payload: { name: string } }
  | { type: 'DELETE_TEAM'; payload: { teamId: string } }
  | { type: 'EDIT_TEAM_NAME'; payload: { teamId: string; newName: string } }
  | { type: 'CREATE_GROUP'; payload: { name: string } }
  | { type: 'DELETE_GROUP'; payload: { groupId: string } }
  | { type: 'ADD_TEAM_TO_GROUP'; payload: { groupId: string; teamId: string } }
  | { type: 'REMOVE_TEAM_FROM_GROUP'; payload: { groupId: string; teamId: string } }
  | { type: 'GENERATE_GROUP_MATCHES'; payload: { groupId: string } }
  | { type: 'UPDATE_GROUP_MATCH_RESULT'; payload: { groupId: string; matchId: string; team1Score: number; team2Score: number } }
  | { type: 'CREATE_KNOCKOUT_STAGE'; payload: { numTeams: number, selectedTeamIds: string[] } }
  | { type: 'UPDATE_KNOCKOUT_MATCH_RESULT'; payload: { roundIndex: number; matchIndexInRound: number; team1Score: number; team2Score: number } }
  | { type: 'RESET_TOURNAMENT' };
