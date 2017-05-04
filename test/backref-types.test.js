'use strict';

const test = require('tape');

const {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString
} = require('graphql');

const createBackrefsType = require('../src/backref-types.js');

test('backref-types: no or invalid backrefs given', function (t) {
  t.equal(createBackrefsType({}, {}), undefined);
  t.equal(createBackrefsType({backrefs: [{ctId: 'x'}, {ctId: 'y'}]}, {}), undefined);
  t.end();
});

test('backref-types: creating backrefers type', function (t) {
  t.plan(3);

  const PostType = new GraphQLObjectType({
    name: 'Post',
    fields: {
      title: {type: GraphQLString, resolve: e => e.fields.title}
    }
  });

  const graphCt = {
    names: {
      type: 'Category',
      backrefsType: 'CategoryBackrefs',
    },
    backrefs: [
      {
        ctId: 'pct',
        fieldId: 'category',
        backrefFieldName: 'posts__via__category'
      },
      {
        ctId: 'pct',
        fieldId: 'category2',
        backrefFieldName: 'posts__via__category2'
      },
      {
        ctId: 'missing'
      }
    ]
  };

  const BackrefsType = createBackrefsType(graphCt, {pct: PostType});

  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {test: {type: BackrefsType, resolve: () => 'someid'}}
    })
  });

  const posts = [
    {
      sys: {id: 'p1'},
      fields: {
        title: 'p1t',
        category: {sys: {id: 'someid'}},
      }
    },
    {
      sys: {id: 'p2'},
      fields: {
        title: 'p2t',
        category2: [{sys: {id: 'xxx'}}, {sys: {id: 'yyy'}}]
      }
    },
    {
      sys: {id: 'p3'},
      fields: {
        title: 'p3t',
        category: {sys: {id: 'xxx'}},
        category2: [{sys: {id: 'yyy'}}, {sys: {id: 'someid'}}]
      }
    }
  ];

  const ctx = {entryLoader: {queryAll: () => Promise.resolve(posts)}};

  graphql(
    schema,
    '{ test { posts__via__category { title } posts__via__category2 { title } } }',
    null,
    ctx
  ).then(res => {
    t.deepEqual(res.data.test.posts__via__category, [{title: 'p1t'}]);
    t.deepEqual(res.data.test.posts__via__category2, [{title: 'p3t'}]);
    t.equal(res.errors, undefined);
  });
});
