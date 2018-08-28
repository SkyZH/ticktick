import { Model, IReport } from '../src/model';
import * as moment from 'moment';
import * as _ from 'lodash';

test('Should initialize', () => {
  const model = new Model<number>(
    'test',
    d => _.sum(d),
    (table, id) => Promise.resolve(0)
  );
  expect(model.name).toBe('test');
});

test('Should report realtime', async () => {
  const model = new Model<number>(
    'test',
    d => _.sum(d),
    (table, id) => Promise.resolve(0)
  );
  const reports = await model.report(233, moment(Date.now()));
  expect(reports[0].data).toBe(233);
  expect(reports[0].table).toBe('second');
});

test('Should access querier', async () => {
  let called = 0;
  const model = new Model<number>(
    'test',
    d => _.sum(d),
    (table, id) => {
      called += 1;
      return Promise.resolve(0);
    }
  );
  await model.report(233, moment('2018/08/01 09:00:00'));
  called = 0;
  await model.report(233, moment('2018/08/01 09:01:00'));
  expect(called).toBe(60);
});

test('Should not summarize', async () => {
  const model = new Model<number>(
    'test',
    d => _.sum(d),
    (table, id) => Promise.resolve(0)
  );
  await model.report(233, moment('2018/08/01 09:00:01'));
  await model.report(233, moment('2018/08/01 09:00:02'));
  expect(model.requireSummary('minute', moment('2018/08/01 08:59:00'))).toBe(
    false
  );
  expect(model.requireSummary('minute', moment('2018/08/01 09:00:00'))).toBe(
    true
  );
  expect(model.requireSummary('minute', moment('2018/08/01 09:30:00'))).toBe(
    true
  );
  expect(model.requireSummary('hour', moment('2018/08/01 09:00:00'))).toBe(
    true
  );
});
test('Should report various forms of data', async () => {
  const model = new Model<number>(
    'test',
    d => _.mean(d),
    (table, id) => Promise.resolve(2333)
  );
  await model.report(233, moment('2018/08/01 09:00:00'));
  const reports = await model.report(233, moment('2018/08/01 10:00:00'));
  expect(reports[0].data).toBe(233);
  expect(reports[1].data).toBe(2333);
});

test('Should have sum when first reported and not reject', async () => {
  const model = new Model<number>(
    'test',
    d => {
      expect(_.size(d)).toBe(1);
      return _.sum(d);
    },
    (table, id) => Promise.resolve(null)
  );
  const reports = await model.report(233, moment(Date.now()));
});

test('Should report correct data', async () => {
  const data: any = {};
  const model = new Model<string>(
    'test',
    d => d.join(','),
    (table, id) => Promise.resolve(data && data[table] && data[table][id]),
    {
      day: moment('2018/06/01 0:00:00'),
      hour: moment('2018/06/01 0:00:00'),
      minute: moment('2018/06/01 0:00:00'),
      month: moment('2018/06/01 0:00:00'),
    }
  );
  const pushData = (result: Array<IReport<string>>) =>
    result.forEach(v => {
      if (!(v.table in data)) {
        data[v.table] = {};
      }
      data[v.table][v.id] = v.data;
    });
  pushData(await model.report('1', moment('2018/07/03 10:03:04')));
  pushData(await model.report('2', moment('2018/08/01 09:01:00')));
  pushData(await model.report('3', moment('2018/08/01 09:01:01')));
  pushData(await model.report('4', moment('2018/08/01 09:02:01')));
  pushData(await model.report('5', moment('2018/08/01 09:03:03')));
  pushData(await model.report('6', moment('2018/08/01 10:01:02')));
  pushData(await model.report('7', moment('2018/08/02 10:02:03')));
  expect(data).toMatchObject({
    day: { '1533052800': '2,3,4' },
    hour: { '1533085200': '2,3,4' },
    minute: { '1533085260': '2,3', '1533085320': '4' },
    second: {
      '1530583384': '1',
      '1533085260': '2',
      '1533085261': '3',
      '1533085321': '4',
      '1533085383': '5',
      '1533088862': '6',
      '1533175323': '7',
    },
  });
});
