export declare function getStatsForPlayer(playerUrl: string, playerName: string): Promise<void>;
export declare function getTournamentsPlayedInByPlayer(playerUrl: string): Promise<string[]>;
export declare function getStatsTableHtmlForPerformance(playerUrl: string, tournamentName: string): Promise<string>;
export declare function convertTableHTMLToPerformance(html: string): any;
