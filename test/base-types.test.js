'use strict';

const test = require('tape');
const {graphql, GraphQLSchema, GraphQLObjectType} = require('graphql');

const {AssetType, EntryType, EntrySysType, LocationType} = require('../src/base-types.js');

test('base-types: asset', function (t) {
  const createSchema = val => new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {test: {type: AssetType, resolve: () => val}}
    })
  });

  graphql(createSchema(null), '{ test { title } }').then(res => {
    t.equal(res.data.test, null);
    t.equal(res.errors, undefined);
  });

  graphql(
    createSchema({sys: {type: 'Asset', id: 'aid'}}),
    '{ test { sys { id } title description } }'
  ).then(res => {
    t.deepEqual(res.data.test, {
      sys: {id: 'aid'},
      title: null,
      description: null
    });
    t.equal(res.errors, undefined);
  });

  graphql(
    createSchema({fields: {title: 'boo'}}),
    '{ test { title description } }'
  ).then(res => {
    t.deepEqual(res.data.test, {title: 'boo', description: null});
    t.equal(res.errors, undefined);
  });

  graphql(
    createSchema({
      sys: {type: 'Asset', id: 'aid', createdAt: 'dt1', updatedAt: 'dt2'},
      fields: {
        title: 'xyz',
        description: 'asset desc',
        file: {url: 'http://some-url'}
      }
    }),
    '{ test { sys { id createdAt updatedAt } title description url } }'
  ).then(res => {
    t.deepEqual(res.data.test, {
      sys: {
        id: 'aid',
        createdAt: 'dt1',
        updatedAt: 'dt2'
      },
      title: 'xyz',
      description: 'asset desc',
      url: 'http://some-url'
    });
    t.equal(res.errors, undefined);
  });

  t.end();
});

test('base-types: entry', function (t) {
  const createSchema = val => {
    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          test: {type: EntryType, resolve: () => val},
          impl: {
            type: new GraphQLObjectType({
              name: 'Impl',
              fields: {sys: {type: EntrySysType}},
              interfaces: [EntryType],
              isTypeOf: () => true
            }),
            resolve: () => val
          }
        }
      })
    });
  };

  graphql(createSchema(null), '{ test { sys { id } } }').then(res => {
    t.equal(res.data.test, null);
    t.equal(res.errors, undefined);
  });

  graphql(
    createSchema({sys: {type: 'Entry', id: 'eid'}}),
    '{ test { sys { id } } }'
  ).then(res => {
    t.deepEqual(res.data.test, {sys: {id: 'eid'}});
    t.equal(res.errors, undefined);
  });

  graphql(
    createSchema({
      sys: {
        type: 'Entry',
        id: 'eid',
        createdAt: 'dt3',
        updatedAt: 'dt4',
        contentType: {sys: {id: 'ctid'}}
      }
    }),
    '{ test { sys { id createdAt updatedAt contentTypeId } } }'
  ).then(res => {
    t.deepEqual(res.data.test, {
      sys: {
        id: 'eid',
        createdAt: 'dt3',
        updatedAt: 'dt4',
        contentTypeId: 'ctid'
      }
    });
    t.equal(res.errors, undefined);
  });

  t.end();
});

test('base-types: location', function (t) {
  t.plan(2);

  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        test: {
          type: LocationType,
          resolve: () => ({lon: 11.1, lat: -22.2})
        }
      }
    })
  });

  graphql(schema, '{ test { lat lon } }')
  .then(res => {
    t.deepEqual(res.data.test, {
      lat: -22.2,
      lon: 11.1
    });
    t.equal(res.errors, undefined);
  });
});
