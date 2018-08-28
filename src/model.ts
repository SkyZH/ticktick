import * as Moment from 'moment';
import * as _ from 'lodash';
import { extendMoment } from 'moment-range';
const moment = extendMoment(Moment);

export interface IReport<T> {
  data: T;
  id: string;
  table: string;
}
const TABLE_MAP = [
  'minute',
  'hour',
  'day',
  'month',
] as Moment.unitOfTime.Base[];
const SUMMARY_FROM: { [unit: string]: Moment.unitOfTime.Base } = {
  minute: 'second',
  hour: 'minute',
  day: 'hour',
  month: 'day',
};

export class Model<T> {
  constructor(
    private name: string,
    private summurizer: (a: T[]) => T,
    private querier: (table: string, id: string) => Promise<T | null>,
    private latestReport?: { [unit: string]: Moment.Moment }
  ) {
    this.latestReport = this.latestReport || {};
  }
  public async report(
    data: T,
    forTime: Moment.Moment
  ): Promise<Array<IReport<T>>> {
    const mForTime = moment(forTime);
    const secondData: IReport<T> = {
      data,
      id: `${mForTime.unix()}`,
      table: 'second',
    };
    return [secondData].concat((await Promise.all(
      _.map(TABLE_MAP, (unit: Moment.unitOfTime.Base) =>
        this.summary(unit, moment(mForTime).subtract(unit, 1))
      )
    )).filter(d => d != null) as Array<IReport<T>>);
  }
  private requireSummary(
    unit: Moment.unitOfTime.Base,
    forTime: Moment.Moment
  ): boolean {
    const cmpForTime = moment(forTime).startOf(unit);
    return this.latestReport![unit].isBefore(cmpForTime);
  }
  private async summary(
    unit: Moment.unitOfTime.Base,
    forTime: Moment.Moment
  ): Promise<IReport<T> | null> {
    const start = moment(forTime).startOf(unit);
    if (!(unit in this.latestReport!)) {
      this.latestReport![unit] = moment(start);
      return null;
    }
    if (!this.requireSummary(unit, start)) {
      return null;
    }
    const parentUnit = SUMMARY_FROM[unit] as Moment.unitOfTime.Base;
    const end = moment(start).endOf(unit);
    const range = moment.range(start, end);
    const allDate = Array.from(range.by(parentUnit));
    const allData = (await Promise.all(
      allDate.map(d => this.querier(parentUnit, `${d.unix()}`))
    )).filter(d => !_.isNull(d) && !_.isUndefined(d)) as T[];
    if (allData.length === 0) {
      return null;
    }
    const summurizedData = this.summurizer(allData);
    this.latestReport![unit] = start;
    return {
      data: summurizedData,
      id: `${start.unix()}`,
      table: unit,
    };
  }
}
