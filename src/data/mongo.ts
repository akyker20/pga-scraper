import { IData, ITimes } from "./index";
import * as monk from 'monk';
import * as _ from 'lodash';
import { IPerformance } from "../models";

export class MongoData implements IData {

  private performances: monk.ICollection;

  constructor(mongoConnectionStr: string) {
    const db = monk.default(mongoConnectionStr);
    this.performances = db.get('performances', { castIds: false });
  }

  insertPerformances(performances: IPerformance[]): Promise<IPerformance[]> {
    return this.performances.insert(performances);
  }

  private getQueryObjForTimes(times?: ITimes) {
    
    if (_.isUndefined(times) || _.isEmpty(times)) return null;

    let query: any = null;
    if (!_.isEmpty(times.after)) {
      query = {
        $gte: times.after
      };
    }
    if (!_.isEmpty(times.before)) {
      if (_.isNull(query)) query = {};
      query.$lte = times.before;
    }
    return query;
  }

  getPeformancesByPlayer(playerName: string, times?: ITimes): Promise<IPerformance[]> {
    let query: any = { playerName };
    let timesQueryObj = this.getQueryObjForTimes(times);
    if (timesQueryObj !== null) {
      query.startDate = timesQueryObj;
    }
    return this.performances.find(query);
  }

  getPerformancesBetween(times: ITimes): Promise<IPerformance[]> {
    let query: any = {};
    let timesQueryObj = this.getQueryObjForTimes(times);
    if (timesQueryObj !== null) {
      query.startDate = timesQueryObj;
    }
    return this.performances.find(query);
  }

  getAllPerformances(): Promise<IPerformance[]> {
    return this.performances.find({});
  }

}