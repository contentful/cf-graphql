'use strict';

const test = require('tape');

const {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  getNamedType
} = require('graphql');

const {AssetType, EntryType, LocationType} = require('../src/base-types.js');
const map = require('../src/field-config.js');

const entities = {
  asset: {foo: {}, bar: {}},
  entry: {baz: {}, qux: {}}
};

const ctx = {
  entryLoader: {
    getIncludedAsset: id => entities.asset[id],
    get: id => entities.entry[id],
    getMany: ids => Promise.resolve(ids.map(id => entities.entry[id]))
  }
};

test('field-config: simple types', function (t) {
  const tests = [
    ['String', GraphQLString, ['hello', '']],
    ['Int', GraphQLInt, [1, 0, -1]],
    ['Float', GraphQLFloat, [1, 1.1, 0, 0.1, -0.1, 2]],
    ['Bool', GraphQLBoolean, [false, true]]
  ];

  tests.forEach(([key, Type, vals]) => {
    const config = map[key]({id: 'test'});
    t.equal(config.type, Type);
    t.equal(config.resolve({fields: {}}), undefined);

    vals.concat([null, undefined]).forEach(val => {
      const resolved = config.resolve({fields: {test: val}});
      t.equal(resolved, val);
    });
  });

  t.end();
});

test('field-config: object', function (t) {
  const config = map.Object({id: 'test'});
  t.equal(config.type, GraphQLString);
  t.equal(config.resolve({fields: {}}), undefined);

  const value = {test: true, test2: false, nested: [123, 'xyz']};
  const resolved = config.resolve({fields: {test: value}});
  t.equal(typeof resolved, 'string');
  t.deepEqual(JSON.parse(resolved), value);

  t.end();
});

test('field-config: location', function (t) {
  const config = map.Location({id: 'test'});
  t.equal(config.type, LocationType);
  t.equal(config.resolve({fields: {}}), undefined);

  const location = {lon: 11.1, lat: -22.2};
  const resolved = config.resolve({fields: {test: location}});
  t.equal(typeof resolved, 'object');
  t.deepEqual(resolved, {lon: 11.1, lat: -22.2});

  t.end();
});

test('field-config: array of strings', function (t) {
  const config = map['Array<String>']({id: 'test'});
  t.ok(config.type instanceof GraphQLList);
  t.equal(getNamedType(config.type), GraphQLString);
  t.equal(config.resolve({fields: {}}), undefined);

  [[], ['x'], ['x', 'y'], null, undefined].forEach(val => {
    const resolved = config.resolve({fields: {test: val}});
    t.equal(resolved, val);
  });

  t.end();
});

test('field-config: links', function (t) {
  const assetConfig = map['Link<Asset>']({id: 'test'});
  t.equal(assetConfig.type, AssetType);
  t.equal(assetConfig.resolve({fields: {}}, null, ctx), undefined);

  const entryConfig = map['Link<Entry>']({id: 'test'});
  t.equal(entryConfig.type, EntryType);
  t.equal(entryConfig.resolve({fields: {}}, null, ctx), undefined);

  const tests = [
    [assetConfig, {sys: {id: 'foo'}}, entities.asset.foo],
    [assetConfig, {sys: {id: 'bar'}}, entities.asset.bar],
    [assetConfig, {sys: {id: 'poop'}}, undefined],
    [assetConfig, null, undefined],
    [entryConfig, {sys: {id: 'baz'}}, entities.entry.baz],
    [entryConfig, {sys: {id: 'qux'}}, entities.entry.qux],
    [entryConfig, {sys: {id: 'lol'}}, undefined],
    [entryConfig, null, undefined]
  ];

  tests.forEach(([config, link, val]) => {
    const resolved = config.resolve({fields: {test: link}}, null, ctx);
    t.equal(resolved, val);
  });

  t.end();
});

test('field-config: type for linked entry', function (t) {
  const types = {ct1: {}, ct2: {}};
  const tests = [
    [{}, undefined, EntryType],
    [{linkedCt: 'ct1'}, undefined, EntryType],
    [{linkedCt: 'ct2'}, {ct1: types.ct1, ct2: types.ct2}, types.ct2],
    [{linkedCt: 'ct3'}, {ct1: types.ct1, ct2: types.ct2}, EntryType]
  ];

  tests.forEach(([field, ctIdToType, Type]) => {
    const config = map['Link<Entry>'](field, ctIdToType);
    t.equal(config.type, Type);
  });

  t.end();
});

test('field-config: arrays of links', function (t) {
  const assetConfig = map['Array<Link<Asset>>']({id: 'test'});
  const entryConfig = map['Array<Link<Entry>>']({id: 'test'});

  [[assetConfig, AssetType], [entryConfig, EntryType]].forEach(([config, Type]) => {
    t.ok(config.type instanceof GraphQLList);
    t.equal(getNamedType(config.type), Type);
    t.equal(config.resolve({fields: {}}), undefined);
    t.equal(config.resolve({fields: {test: null}}), undefined);
    t.deepEqual(config.resolve({fields: {test: []}}, null, ctx), []);
  });

  const links = [
    {sys: {id: 'poop'}},
    {sys: {id: 'bar'}},
    {sys: {id: 'qux'}},
    null,
    {sys: {id: 'foo'}},
    {sys: {id: 'baz'}}
  ];

  const resolvedAssets = assetConfig.resolve({fields: {test: links}}, null, ctx);
  t.deepEqual(resolvedAssets, [entities.asset.bar, entities.asset.foo]);

  entryConfig.resolve({fields: {test: links}}, null, ctx)
  .then(resolvedEntries => {
    t.deepEqual(resolvedEntries, [entities.entry.qux, entities.entry.baz]);
  });

  t.end();
});
