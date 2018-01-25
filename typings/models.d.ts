export interface IPlayer {
    scorecardUrl: string;
    name: string;
}
export interface ITournament {
    start: string;
    name: string;
}
export interface IPerformance {
    playerName: string;
    tourneyName: string;
    startDate: string;
    stats: any;
}
