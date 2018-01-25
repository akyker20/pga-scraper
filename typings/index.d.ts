import { IPlayer } from './models';
import { IPerformance } from './models';
/**
 * 1. Scrape all the tournaments the player has played in.
 * 2. Check the database to see what tournaments we have already scraped data for for the player.
 * 3a. If there are no new tournaments, tell the user this and finish.
 * 3b. If there are new tournaments, for each new tournament, scrape the HTML table
 * 4. For each tournament, convert the HTML to structured data with numerical values.
 * 5. Write the new tournament data (performances) to the database.
 * @param player
 */
export declare function pullMissingPlayerStats(player: IPlayer): Promise<null | undefined>;
/**
 * Sometimes there is no data for a player's tournament even though
 * that tournament exists in the dropdown of tournaments the player played in.
 * @param player
 * @param tourneyName
 */
export declare function getPerformanceForPlayer(player: IPlayer, tourneyName: string): Promise<IPerformance | null>;
export declare function getTournamentsPlayedInByPlayer(player: IPlayer): Promise<string[]>;
export declare function getRawDataForPerformance(player: IPlayer, tournamentName: string): Promise<{
    html: string;
    dateRange: string;
} | null>;
/**
 * Takes the scraped HTML table, and creates a stats object of
 * string key-value pairs
 * @param html
 */
export declare function getStructuredDataFromHTML(html: string): any;
/**
 * After raw HTML is converted to structured data,
 * this method is called and removes many of the unecessary statistics
 * @param stats after data has been structured
 */
export declare function filterStats(stats: any): any;
/**
 * After HTML has been converted to structured data and uneccessary stats
 * have been removed, this method converts the values to numbers before
 * they are stored in database.
 * @param stats
 */
export declare function parseNumbers(stats: any): any;
