import { IData, IQuery } from "./index";
import { IPerformance } from "../models";
export declare class MongoData implements IData {
    private performances;
    constructor(mongoConnectionStr: string);
    insertPerformances(performances: IPerformance[]): Promise<IPerformance[]>;
    private getQueryObjForTimes(times?);
    getPerformances(queryConfig: IQuery): Promise<IPerformance[]>;
    getAllPerformances(): Promise<IPerformance[]>;
}
