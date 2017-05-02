'use strict';

const test = require('tape');
const sinon = require('sinon');

const DEFAULT_ITEMS = [
  {sys: {id: 'xyz'}},
  {sys: {id: 'abc', contentType: {sys: {id: 'ctid'}}}}
];

const prepareHttpStub = items => {
  const getStub = sinon.stub();
  getStub.resolves({items: items || DEFAULT_ITEMS});
  return {get: getStub};
};

const createEntryLoader = require('../src/entry-loader.js');

test('entry-loader: getting one entry', function (t) {
  t.plan(5);
  const httpStub = prepareHttpStub();
  const loader = createEntryLoader(httpStub);

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
  const httpStub = prepareHttpStub();
  const loader = createEntryLoader(httpStub);

  loader.getMany(['xyz', 'lol', 'abc'])
  .then(items => t.deepEqual(items, [
    DEFAULT_ITEMS[0], undefined, DEFAULT_ITEMS[1]
  ]));
});

test('entry-loader: getting all entries of a content type', function (t) {
  t.plan(7);
  const httpStub = prepareHttpStub();
  const loader = createEntryLoader(httpStub);

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
    t.deepEqual(items.map(i => i.sys.id).sort(), ids.sort());
  });
});
