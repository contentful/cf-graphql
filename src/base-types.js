'use strict';

const graphql = require('graphql');
const _get = require('lodash.get');

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
    title: {type: IDType},
    description: {type: GraphQLString},
    url: {type: GraphQLString}
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
