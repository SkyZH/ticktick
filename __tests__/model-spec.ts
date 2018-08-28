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
    d => _.sum(d),
    (table, id) => Promise.resolve(0)
  );
  await model.report(233, moment('2018/08/01 09:00:00'));
  const reports = await model.report(233, moment('2018/08/01 10:00:00'));
  expect(reports[0].data).toBe(233);
  expect(reports[1].data).toBe(233);
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
    (table, id) => Promise.resolve(data && data[table] && data[table][id])
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
  pushData(await model.report('5', moment('2018/08/01 09:20:03')));
  pushData(await model.report('6', moment('2018/08/01 10:01:02')));
  pushData(await model.report('7', moment('2018/08/02 10:02:03')));
  expect(data).toMatchObject({
    day: {
      '1530460800': '1',
      '1532966400': '2',
      '1533052800': '2,2,2,3,4,5,6,7',
    },
    hour: {
      '1530579600': '1',
      '1533081600': '2',
      '1533085200': '2,2,3,4,5,6',
      '1533171600': '7',
    },
    minute: {
      '1530583320': '1',
      '1533085200': '2',
      '1533085260': '2,3,4',
      '1533086340': '5',
      '1533088800': '6',
      '1533175260': '7',
    },
    month: { '1527782400': '1', '1530374400': '1,2' },
    second: {
      '1530583384': '1',
      '1533085260': '2',
      '1533085261': '3',
      '1533085321': '4',
      '1533086403': '5',
      '1533088862': '6',
      '1533175323': '7',
    },
  });
});
