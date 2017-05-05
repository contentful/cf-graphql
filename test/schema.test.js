'use strict';

const test = require('tape');
const sinon = require('sinon');
const {graphql} = require('graphql');

const createSchema = require('../src/schema.js');

test('schema: querying generated schema', function (t) {
  const spaceGraph = [
    {
      id: 'postct',
      names: {
        field: 'post',
        collectionField: 'posts',
        type: 'Post'
      },
      fields: [
        {id: 'title', type: 'String'},
        {id: 'content', type: 'String'},
        {id: 'category', type: 'Link<Entry>', linkedCt: 'catct'}
      ]
    },
    {
      id: 'catct',
      names: {
        field: 'category',
        collectionField: 'categories',
        type: 'Category',
        backrefsType: 'CategoryBackrefs'
      },
      fields: [
        {id: 'name', type: 'String'}
      ],
      backrefs: [
        {ctId: 'postct', fieldId: 'category', backrefFieldName: 'posts__via__category'}
      ]
    }
  ];

  const schema = createSchema(spaceGraph);

  const post = {
    sys: {id: 'p1', contentType: {sys: {id: 'postct'}}},
    fields: {
      title: 'Hello world',
      category: {sys: {id: 'c1'}}
    }
  };

  const category = {
    sys: {id: 'c1', contentType: {sys: {id: 'catct'}}},
    fields: {name: 'test'}
  };

  const testQuery = (query, entryLoader) => {
    return graphql(schema, query, null, {entryLoader})
    .then(res => [entryLoader, res]);
  };

  t.plan(19);

  testQuery('{ posts { title } }', {query: sinon.stub().resolves([post])})
  .then(([entryLoader, res]) => {
    t.deepEqual(entryLoader.query.firstCall.args, ['postct', undefined]);
    t.equal(res.errors, undefined);
    t.deepEqual(res.data.posts, [{title: 'Hello world'}]);
  });

  testQuery(
    '{ categories(q: "fields.name=test") { name } }',
    {query: sinon.stub().resolves([category])}
  ).then(([entryLoader, res]) => {
    t.deepEqual(entryLoader.query.firstCall.args, ['catct', 'fields.name=test']);
    t.equal(res.errors, undefined);
    t.deepEqual(res.data.categories, [{name: 'test'}]);
  });

  testQuery(
    '{ post(id: "p1") { title category { name } } }',
    {get: sinon.stub().onCall(0).resolves(post).onCall(1).resolves(category)}
  ).then(([entryLoader, res]) => {
    t.equal(entryLoader.get.callCount, 2);
    t.deepEqual(entryLoader.get.firstCall.args, ['p1', 'postct']);
    t.deepEqual(entryLoader.get.lastCall.args, ['c1', 'catct']);
    t.equal(res.errors, undefined);
    t.deepEqual(res.data.post, {title: 'Hello world', category: {name: 'test'}});
  });

  testQuery(
    '{ posts { title } category(id: "c1") { name } }',
    {query: sinon.stub().resolves([post]), get: sinon.stub().resolves(category)}
  ).then(([entryLoader, res]) => {
    t.deepEqual(entryLoader.query.firstCall.args, ['postct', undefined]);
    t.deepEqual(entryLoader.get.firstCall.args, ['c1', 'catct']);
    t.equal(res.errors, undefined);
    t.deepEqual(res.data, {posts: [{title: 'Hello world'}], category: {name: 'test'}});
  });

  testQuery(
    '{ categories { _backrefs { posts__via__category { title } } } }',
    {query: sinon.stub().resolves([category]), queryAll: sinon.stub().resolves([post])}
  ).then(([entryLoader, res]) => {
    t.deepEqual(entryLoader.query.firstCall.args, ['catct', undefined]);
    t.deepEqual(entryLoader.queryAll.firstCall.args, ['postct']);
    t.equal(res.errors, undefined);
    t.deepEqual(res.data, {categories: [{_backrefs: {posts__via__category: [{title: 'Hello world'}]}}]});
  });
});
