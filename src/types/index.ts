
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

export interface GroupTeamStats { // Also used for League standings
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

export interface LeagueZoneSetting { // Reused for Group zones
  id: string;
  name: string;
  startPosition: number;
  endPosition: number;
  color: string; // CSS color string
}

export interface Group {
  id: string;
  name: string;
  teamIds: string[];
  matches: Match[];
  zoneSettings?: LeagueZoneSetting[];
}

export interface League {
  id: string;
  name: string;
  teamIds: string[];
  matches: Match[];
  playEachTeamTwice?: boolean;
  zoneSettings: LeagueZoneSetting[];
}

export interface KnockoutMatch extends Match {
  roundIndex: number;
  matchIndexInRound: number;
  nextMatchId?: string;
  nextRoundIndex?: number;
  nextMatchIndexInRound?: number;
  placeholder?: string;
}

export interface TournamentState {
  teams: Team[];
  groups: Group[];
  league: League | null;
  knockoutRounds: KnockoutMatch[][];
  isInitialized: boolean;
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
  | { type: 'RESET_TOURNAMENT' }
  | { type: 'RANDOMLY_CREATE_GROUPS_AND_ASSIGN_TEAMS'; payload: { numGroups: number; groupNamePrefix?: string } }
  | { type: 'SETUP_LEAGUE'; payload: { name: string; teamIds: string[]; playEachTeamTwice: boolean; } }
  | { type: 'CLEAR_LEAGUE' }
  | { type: 'GENERATE_LEAGUE_MATCHES' }
  | { type: 'UPDATE_LEAGUE_MATCH_RESULT'; payload: { matchId: string; team1Score: number; team2Score: number } }
  | { type: 'ADD_LEAGUE_ZONE'; payload: { name: string; startPosition: number; endPosition: number; color: string } }
  | { type: 'EDIT_LEAGUE_ZONE'; payload: LeagueZoneSetting }
  | { type: 'DELETE_LEAGUE_ZONE'; payload: { zoneId: string } }
  | { type: 'ADD_GROUP_ZONE'; payload: { groupId: string; name: string; startPosition: number; endPosition: number; color: string } }
  | { type: 'EDIT_GROUP_ZONE'; payload: { groupId: string; zone: LeagueZoneSetting } }
  | { type: 'DELETE_GROUP_ZONE'; payload: { groupId: string; zoneId: string } };

