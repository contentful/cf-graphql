'use strict';

const test = require('tape');
const sinon = require('sinon');

const {
  graphql,
  GraphQLSchema,
  GraphQLObjectType
} = require('graphql');

const {
  createSchema,
  createQueryType,
  createQueryFields
} = require('../src/schema.js');

const postct = {
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
};

test('schema: querying generated schema', function (t) {
  const spaceGraph = [
    postct,
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

  t.plan(22);

  testQuery('{ posts { title } }', {query: sinon.stub().resolves([post])})
  .then(([entryLoader, res]) => {
    t.deepEqual(entryLoader.query.firstCall.args, ['postct', {}]);
    t.equal(res.errors, undefined);
    t.deepEqual(res.data.posts, [{title: 'Hello world'}]);
  });

  testQuery(
    '{ categories(skip: 2, limit: 3, q: "fields.name=test") { name } }',
    {query: sinon.stub().resolves([category])}
  ).then(([entryLoader, res]) => {
    t.deepEqual(
      entryLoader.query.firstCall.args,
      ['catct', {skip: 2, limit: 3, q: 'fields.name=test'}]
    );
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
    t.deepEqual(entryLoader.query.firstCall.args, ['postct', {}]);
    t.deepEqual(entryLoader.get.firstCall.args, ['c1', 'catct']);
    t.equal(res.errors, undefined);
    t.deepEqual(res.data, {posts: [{title: 'Hello world'}], category: {name: 'test'}});
  });

  testQuery(
    '{ categories { _backrefs { posts__via__category { title } } } }',
    {query: sinon.stub().resolves([category]), queryAll: sinon.stub().resolves([post])}
  ).then(([entryLoader, res]) => {
    t.deepEqual(entryLoader.query.firstCall.args, ['catct', {}]);
    t.deepEqual(entryLoader.queryAll.firstCall.args, ['postct']);
    t.equal(res.errors, undefined);
    t.deepEqual(res.data, {categories: [{_backrefs: {posts__via__category: [{title: 'Hello world'}]}}]});
  });

  testQuery(
    '{ _categoriesMeta(q: "sys.id[in]=1,2,3") { count } }',
    {count: sinon.stub().resolves(7)}
  ).then(([entryLoader, res]) => {
    t.deepEqual(entryLoader.count.firstCall.args, ['catct', {q: 'sys.id[in]=1,2,3'}]);
    t.equal(res.errors, undefined);
    t.deepEqual(res.data, {_categoriesMeta: {count: 7}});
  });
});

test('schema: name of query type', function (t) {
  t.plan(6);

  ['Root', undefined].forEach(name => {
    const schema = createSchema([postct], name);
    const QueryType = createQueryType([postct], name);

    t.ok(QueryType instanceof GraphQLObjectType);

    const query = '{ __schema { queryType { name } } }';
    const assertName = ({data}) => t.equal(data.__schema.queryType.name, name || 'Query');

    graphql(schema, query).then(assertName);
    graphql(new GraphQLSchema({query: QueryType}), query).then(assertName);
  });
});

test('schema: producting query fields', function (t) {
  const queryFields = createQueryFields([postct]);

  t.equal(typeof queryFields, 'object');
  t.deepEqual(
    Object.keys(queryFields).sort(),
    ['post', 'posts', '_postsMeta'].sort()
  );

  t.end();
});
