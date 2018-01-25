import { IPerformance } from '../models';

export interface ITimes {
  before?: string;
  after?: string;
}

export interface IData {

  insertPerformances(performances: IPerformance[]): Promise<IPerformance[]>;

  getPeformancesByPlayer(playerName: string, times: ITimes): Promise<IPerformance[]>;
  getPerformancesBetween(times: ITimes): Promise<IPerformance[]>;
  getAllPerformances(): Promise<IPerformance[]>;

}