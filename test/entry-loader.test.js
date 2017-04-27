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
