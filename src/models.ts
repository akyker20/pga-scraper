export interface IPlayer {
  scorecardUrl: string;
  name: string;
}

export interface ITournament {
  start: string; // iso string
  name: string;
}

export interface IPerformance {
  playerName: string;
  tourneyName: string;
  startDate: string; // iso string
  stats: any;
}