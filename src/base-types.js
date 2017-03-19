'use strict';

const _get = require('lodash.get');
const graphql = require('graphql');

const GraphQLNonNull = graphql.GraphQLNonNull;
const GraphQLString = graphql.GraphQLString;
const GraphQLObjectType = graphql.GraphQLObjectType;

const IDType = new GraphQLNonNull(graphql.GraphQLID);
const NonNullStringType = new GraphQLNonNull(GraphQLString);

const baseSysFields = {
  id: {type: IDType},
  createdAt: {type: NonNullStringType},
  updatedAt: {type: NonNullStringType}
};

const entrySysFields = {
  contentTypeId: {
    type: IDType,
    resolve: sys => _get(sys, ['contentType', 'sys', 'id'])
  }
};

const SysType = new graphql.GraphQLInterfaceType({
  name: 'Sys',
  fields: baseSysFields
});

const AssetSysType = createSysType('Asset');
const EntrySysType = createSysType('Entry', entrySysFields);

const AssetType = new GraphQLObjectType({
  name: 'Asset',
  fields: {
    sys: {type: AssetSysType},
    title: {
      type: GraphQLString,
      resolve: asset =>  _get(asset, ['fields', 'title'])
    },
    description: {
      type: GraphQLString,
      resolve: asset => _get(asset, ['fields', 'description'])
    },
    url: {
      type: GraphQLString,
      resolve: asset => _get(asset, ['fields', 'file', 'url'])
    }
  }
});

const EntryType = new graphql.GraphQLInterfaceType({
  name: 'Entry',
  fields: {sys: {type: EntrySysType}}
});

module.exports = {
  IDType,
  SysType,
  AssetSysType,
  EntrySysType,
  AssetType,
  EntryType
};

function createSysType (entityType, extraFields) {
  return new GraphQLNonNull(new GraphQLObjectType({
    name: `${entityType}Sys`,
    interfaces: [SysType],
    fields: Object.assign({}, baseSysFields, extraFields || {}),
    isTypeOf: sys => _get(sys, ['type']) === entityType
  }));
}
