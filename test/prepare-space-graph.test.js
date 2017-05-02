'use strict';

const test = require('tape');

const prepareSpaceGraph = require('../src/prepare-space-graph.js');

const testCt = fields => ({sys: {id: 'ctid'}, name: 'test', fields});

test('prepare-space-graph: names', function (t) {
  const [p1, p2] = prepareSpaceGraph([
    {sys: {id: 'ctid'}, name: 'test entity', fields: []},
    {sys: {id: 'ctid2'}, name: 'BlogPost!', fields: []}
  ]);

  t.equal(p1.id, 'ctid');
  t.deepEqual(p1.names, {
    field: 'testEntity',
    collectionField: 'testEntities',
    type: 'TestEntity',
    backrefsType: 'TestEntityBackrefs'
  });
  t.deepEqual(p1.fields, []);

  t.equal(p2.id, 'ctid2');
  t.deepEqual(p2.names, {
    field: 'blogPost',
    collectionField: 'blogPosts',
    type: 'BlogPost',
    backrefsType: 'BlogPostBackrefs'
  });
  t.deepEqual(p2.fields, []);

  t.end();
});

test('prepare-space-graph: conflicing names', function (t) {
  const prepare1 = () => prepareSpaceGraph([
    {sys: {id: 'ctid1'}, name: 'Test-', fields: []},
    {sys: {id: 'ctid2'}, name: 'Test_', fields: []}
  ]);

  const prepare2 = () => prepareSpaceGraph([
    {sys: {id: 'ctid1'}, name: 'Test1', fields: []},
    {sys: {id: 'ctid2'}, name: 'Test2', fields: []}
  ]);

  t.throws(prepare1, /Conflicing name: "test"\. Type of name: "field"/);
  t.doesNotThrow(prepare2);

  t.end();
});

test('prepare-space-graph: skipping omitted fields', function (t) {
  const [p] = prepareSpaceGraph([testCt([
    {id: 'f1', type: 'Text', omitted: false},
    {id: 'f2', type: 'Text', omitted: true},
    {id: 'f3', type: 'Text'}
  ])]);

  t.equal(p.fields.length, 2);
  t.deepEqual(p.fields.map(f => f.id), ['f1', 'f3']);

  t.end();
});

test('prepare-space-graph: throws on unsupported field names', function (t) {
  ['sys', '_backrefs'].forEach(id => {
    const ct = testCt([{id, type: 'Text'}]);
    t.throws(() => prepareSpaceGraph([ct]), /are unsupported/);
  });

  t.end();
});

test('prepare-space-graph: array field types', function (t) {
  const [p] = prepareSpaceGraph([testCt([
    {id: 'f1', type: 'Array', items: {type: 'Symbol'}},
    {id: 'f2', type: 'Array', items: {type: 'Link', linkType: 'Entry'}},
    {id: 'f3', type: 'Array', items: {type: 'Link', linkType: 'Asset'}}
  ])]);

  t.deepEqual(p.fields.map(f => f.type), [
    'Array<String>',
    'Array<Link<Entry>>',
    'Array<Link<Asset>>'
  ]);

  [{type: 'x'}, {type: 'Link'}, {type: 'Link', linkType: 'x'}].forEach(items => {
    const ct = testCt([{id: 'fid', type: 'Array', items}]);
    t.throws(() => prepareSpaceGraph([ct]), /type "Array"/);
  });

  t.end();
});

test('prepare-space-graph: link field types', function (t) {
  const [p] = prepareSpaceGraph([testCt([
    {id: 'f1', type: 'Link', linkType: 'Entry'},
    {id: 'f2', type: 'Link', linkType: 'Asset'}
  ])]);

  t.deepEqual(p.fields.map(f => f.type), ['Link<Entry>', 'Link<Asset>']);

  ['x', null, undefined].forEach(linkType => {
    const ct = testCt([{id: 'fid', type: 'Link', linkType}]);
    t.throws(() => prepareSpaceGraph([ct]), /type "Link"/);
  });

  t.end();
});

test('prepare-space-graph: simple field types', function (t) {
  const mapping = {
    Symbol: 'String',
    Text: 'String',
    Number: 'Float',
    Integer: 'Int',
    Date: 'String',
    Boolean: 'Bool',
    Location: 'Location',
    Object: 'Object'
  };

  const keys = Object.keys(mapping);
  const values = keys.map(key => mapping[key]);
  const fields = keys.reduce((acc, type, i) => {
    return acc.concat([{id: `f${i}`, type}]);
  }, []);

  const [p] = prepareSpaceGraph([testCt(fields)]);

  t.deepEqual(p.fields.map(f => f.type), values);

  ['x', null, undefined].forEach(type => {
    const ct = testCt([{id: 'fid', type}]);
    t.throws(() => prepareSpaceGraph([ct]), /Unknown field type/);
  });

  t.end();
});

test('prepare-space-graph: finding linked content types', function (t) {
  const tests = [
    undefined,
    [],
    [{linkContentType: ['foo', 'bar']}],
    [{unique: true}, {linkContentType: ['baz']}, {}]
  ];

  const fields = tests.reduce((acc, validations, i) => {
    return acc.concat([
      {id: `fl${i}`, type: 'Link', linkType: 'Entry', validations},
      {id: `fa${i}`, type: 'Array', items: {type: 'Link', linkType: 'Entry', validations}}
    ]);
  }, []);

  const [p] = prepareSpaceGraph([testCt(fields)]);
  const linkedCts = p.fields.map(f => f.linkedCt).filter(id => typeof id === 'string');

  t.deepEqual(linkedCts, ['baz', 'baz']);

  t.end();
});

test('prepare-space-graph: mixing field and items validations', function (t) {
  const items = {type: 'Link', linkType: 'Entry', validations: [{linkContentType: ['ctid']}]};
  const fields = [{id: 'fid', type: 'Array', validations: [], items}];
  const [p] = prepareSpaceGraph([testCt(fields)]);

  t.equal(p.fields[0].linkedCt, 'ctid');

  t.end();
});

test('prepare-space-graph: adding backreferences', function (t) {
  const cts = [
    {
      sys: {id: 'post'},
      name: 'post',
      fields: [
        {id: 'author', type: 'Link', linkType: 'Entry', validations: [{linkContentType: ['author']}]}
      ]
    },
    {
      sys: {id: 'author'},
      name: 'author',
      fields: []
    }
  ];

  const [pPost, pAuthor] = prepareSpaceGraph(cts);
  t.equal(pPost._backrefs, undefined);
  t.deepEqual(pAuthor.backrefs, [{
    ctId: 'post',
    fieldId: 'author',
    backrefFieldName: 'posts__via__author'
  }]);

  t.end();
});
