import { IData, ITimes, IQuery } from "./index";
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

  getPerformances(queryConfig: IQuery): Promise<IPerformance[]> {
    let query: any = {};
    if (!_.isEmpty(queryConfig.after)) {
      query.startDate = {
        $gte: queryConfig.after
      };
    }
    if (!_.isEmpty(queryConfig.before)) {
      if (_.isUndefined(query.startDate)) query.startDate = {};
      query.startDate.$lte = queryConfig.before;
    }
    if (!_.isEmpty(queryConfig.tourney)) {
      query.tourneyName = queryConfig.tourney;
    }
    if (!_.isEmpty(queryConfig.player)) {
      query.playerName = queryConfig.player;
    }

    let options: any = {};
    if (!_.isUndefined(queryConfig.limit)) {
      options.limit = queryConfig.limit;
    }

    if (!_.isUndefined(queryConfig.sortBy)) {
      options.sort = {[queryConfig.sortBy]: queryConfig.sortOrder || 1 };
    }

    return this.performances.find(query, options);
  }

  getAllPerformances(): Promise<IPerformance[]> {
    return this.performances.find({});
  }

}