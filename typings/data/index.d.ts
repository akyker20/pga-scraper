import { IPerformance } from '../models';
export interface ITimes {
    before?: string;
    after?: string;
}
export interface IQuery extends ITimes {
    player?: string;
    before?: string;
    after?: string;
    tourney?: string;
    limit?: number;
    sortOrder?: -1 | 1;
    sortBy?: string;
}
export interface ICommands extends IQuery {
    exclude: string[];
}
export interface IData {
    insertPerformances(performances: IPerformance[]): Promise<IPerformance[]>;
    getPerformances(query: IQuery): Promise<IPerformance[]>;
    getAllPerformances(): Promise<IPerformance[]>;
}
