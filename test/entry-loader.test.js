'use strict';

const test = require('tape');
const sinon = require('sinon');

const createEntryLoader = require('../src/entry-loader.js');

const ITEMS = [
  {sys: {id: 'xyz'}},
  {sys: {id: 'abc', contentType: {sys: {id: 'ctid'}}}}
];

const prepare = () => {
  const getStub = sinon.stub();
  const httpStub = {get: getStub};
  getStub.resolves({items: ITEMS, total: ITEMS.length});
  return {httpStub, loader: createEntryLoader(httpStub)};
};

test('entry-loader: getting one entry', function (t) {
  t.plan(5);
  const {httpStub, loader} = prepare();

  const p1 = loader.get('xyz')
  .then(entry => t.deepEqual(entry, {sys: {id: 'xyz'}}));

  const p2 = loader.get('xyz', 'ctid')
  .catch(err => t.ok(err.message.match(/forced content type/i)));

  const p3 = loader.get('abc', 'ctid')
  .then(entry => t.equal(entry.sys.id, 'abc'));

  Promise.all([p1, p2, p3])
  .then(() => {
    const {args} = httpStub.get.firstCall;
    t.equal(args[0], '/entries');
    t.deepEqual(args[1]['sys.id[in]'].split(',').sort(), ['abc', 'xyz']);
  });
});

test('entry-loader: getting many entries', function (t) {
  t.plan(1);
  const {loader} = prepare();

  loader.getMany(['xyz', 'lol', 'abc'])
  .then(items => t.deepEqual(items, [ITEMS[0], undefined, ITEMS[1]]));
});

test('entry-loader: querying entries', function (t) {
  t.plan(3);
  const {httpStub, loader} = prepare();

  loader.query('ctid', {q: 'fields.someNum=123&fields.test[exists]=true'})
  .then(res => {
    t.deepEqual(res, ITEMS);
    t.equal(httpStub.get.callCount, 1);
    t.deepEqual(httpStub.get.lastCall.args, ['/entries', {
      skip: 0,
      limit: 50,
      include: 1,
      content_type: 'ctid',
      'fields.someNum': '123',
      'fields.test[exists]': 'true'
    }]);
  });
});

test('entry-loader: counting entries', function (t) {
  t.plan(3);
  const {httpStub, loader} = prepare();

  loader.count('ctid', {q: 'fields.test=hello'})
  .then(count => {
    t.equal(count, ITEMS.length);
    t.equal(httpStub.get.callCount, 1);
    t.equal(httpStub.get.lastCall.args[1]['fields.test'], 'hello');
  });
});

test('entry-loader: querying entries with custom skip/limit', function (t) {
  t.plan(2);
  const {httpStub, loader} = prepare();

  loader.query('ctid', {skip: 1, limit: 2, q: 'x=y'})
  .then(() => {
    t.equal(httpStub.get.callCount, 1);
    t.deepEqual(httpStub.get.lastCall.args, ['/entries', {
      skip: 1,
      limit: 2,
      include: 1,
      content_type: 'ctid',
      x: 'y'
    }]);
  });
});

test('entry-loader: using forbidden query parameters in QS', function (t) {
  const {httpStub, loader} = prepare();
  ['skip', 'limit', 'include', 'content_type', 'locale'].forEach(key => {
    t.throws(
      () => loader.query('ctid', {q: `x=y&${key}=value`}),
      /query param named/i
    );
  });
  t.equal(httpStub.get.callCount, 0);
  t.end();
});

test('entry-loader: getting all entries of a content type', function (t) {
  t.plan(7);
  const {httpStub, loader} = prepare();

  const ids = Array.apply(null, {length: 3001}).map((_, i) => `e${i+1}`);
  const entries = ids.map(id => ({sys: {id}}));

  // the last slice checks if we remove duplicates
  [[0, 1000], [1000, 2000], [2000, 3000], [2999]].forEach((slice, n) => {
    const items = entries.slice.apply(entries, slice);
    httpStub.get.onCall(n).resolves({total: 3001, items});
  });

  loader.queryAll('ctid')
  .then(items => {
    const callParams = n => httpStub.get.getCall(n).args[1];
    const pageParams = n => ({limit: callParams(n).limit, skip: callParams(n).skip});

    [0, 1, 2, 3].forEach(n => t.deepEqual(pageParams(n), {limit: 1000, skip: n*1000}));
    t.equal(httpStub.get.callCount, 4);

    t.equal(items.length, 3001);
    t.deepEqual(items.map(i => i.sys.id), ids);
  });
});

test('entry-loader: including assets', function (t) {
  t.plan(5);
  const {httpStub, loader} = prepare();

  const includesValues = [
    {Asset: [{sys: {id: 'a1'}}]},
    undefined,
    {Asset: [{sys: {id: 'a2'}}, {sys: {id: 'a3'}}]}
  ];

  includesValues.forEach((includes, n) => {
    httpStub.get.onCall(n).resolves({items: [], includes});
  });

  Promise.all([loader.get('e1'), loader.query('ctid'), loader.queryAll('ctid2')])
  .then(() => {
    t.equal(httpStub.get.callCount, 3);
    ['a1', 'a2', 'a3'].forEach(id => {
      t.deepEqual(loader.getIncludedAsset(id), {sys: {id}});
    });
    t.equal(loader.getIncludedAsset('e1', undefined));
  });
});

test('entry-loader: timeline', function (t) {
  const {httpStub, loader} = prepare();
  const tl = {};
  httpStub.timeline = tl;
  t.equal(loader.getTimeline(), tl);
  t.end();
});
