import { IData, ITimes } from "./index";
import { IPerformance } from "../models";
export declare class MongoData implements IData {
    private performances;
    constructor(mongoConnectionStr: string);
    insertPerformances(performances: IPerformance[]): Promise<IPerformance[]>;
    private getQueryObjForTimes(times?);
    getPeformancesByPlayer(playerName: string, times?: ITimes): Promise<IPerformance[]>;
    getPerformancesBetween(times: ITimes): Promise<IPerformance[]>;
    getAllPerformances(): Promise<IPerformance[]>;
}
