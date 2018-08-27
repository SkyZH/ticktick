import Moment from 'moment';
import _ from 'lodash';
import { extendMoment } from 'moment-range';

const moment = extendMoment(Moment);

export interface IReport<T> {
  data: T;
  id: string;
  table: string;
}
const TABLE_MAP = ["minute", "hour", "day", "month"] as Moment.unitOfTime.Base[];
const SUMMARY_FROM: { [unit: string]: Moment.unitOfTime.Base } = {
  "minute": "second",
  "hour": "minute",
  "day": "hour",
  "month": "day"
}

export class Model<T> {
  constructor(private name: string, 
    private summurizer: (a: T[]) => T, 
    private querier: (table: string, id: string) => T) {
  }
  public async report(data: T, forTime: Moment.Moment) : Promise<Array<IReport<T>>> {
    const secondData: IReport<T> = {
      data,
      id: `${forTime.unix()}`,
      table: "seconds"
    };
    return [secondData].concat(await Promise.all(_.map(TABLE_MAP, (table: Moment.unitOfTime.Base) => this.summary(table, secondData, forTime))));
  }
  private async summary(unit: Moment.unitOfTime.Base, latest: IReport<T>, forTime: Moment.Moment) : Promise<IReport<T>> {
    const start = moment(forTime).startOf(unit);
    const parentUnit = SUMMARY_FROM[unit] as Moment.unitOfTime.Base;
    const current = moment(forTime).startOf(parentUnit);
    const range = moment.range(start, current);
    const allDate = Array.from(range.by(parentUnit, { excludeEnd: true }));
    const allData = await Promise.all(allDate.map(d => this.querier(parentUnit, `${d.unix()}`)));
    const summurizedData = this.summurizer(allData.concat([latest.data]));
    return {
      data: summurizedData,
      id: `${start.unix()}`,
      table: unit
    }
  }
}
