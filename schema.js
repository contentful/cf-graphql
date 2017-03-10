'use strict';

const graphql = require('graphql');
const GraphQLSchema = graphql.GraphQLSchema;
const GraphQLNonNull = graphql.GraphQLNonNull;
const GraphQLObjectType = graphql.GraphQLObjectType;
const GraphQLList = graphql.GraphQLList;
const GraphQLID = graphql.GraphQLID;
const GraphQLString = graphql.GraphQLString;
const GraphQLBoolean = graphql.GraphQLBoolean;
const GraphQLInt = graphql.GraphQLInt;

const _get = require('lodash.get');

const upperFirst = require('lodash.upperfirst');
const camelCase = require('lodash.camelcase');
const pluralize = require('pluralize');

const CF_TO_GRAPHQL_TYPE = {
  Symbol: GraphQLString,
  Text: GraphQLString,
  Date: GraphQLString,
  Boolean: GraphQLBoolean,
  Number: GraphQLInt
};

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: queryFields(require('./cts.json'))
});

const SysType = new GraphQLObjectType({
  name: 'Sys',
  fields: {
    id: {type: new GraphQLNonNull(GraphQLID)},
    createdAt: {type: new GraphQLNonNull(GraphQLString)},
    updatedAt: {type: new GraphQLNonNull(GraphQLString)}
  }
});

module.exports = new GraphQLSchema({query: QueryType});

function queryFields (cts) {
  const ctIdToType = {};

  return cts.reduce((acc, ct) => {
    const name = camelCase(ct.name);

    const Type = ctIdToType[ct.sys.id] = new GraphQLObjectType({
      name: upperFirst(name),
      fields: () => ctFields(ct, ctIdToType)
    });

    acc[name] = {
      type: Type,
      args: {
        id: {type: new GraphQLNonNull(GraphQLID)}
      },
      resolve: (_, args, ctx) => ctx.entryLoader.get(args.id, ct.sys.id)
    };

    acc[pluralize(name)] = {
      type: new GraphQLList(Type),
      resolve: (_, args, ctx) => ctx.entryLoader.query(ct.sys.id)
    };

    return acc;
  }, {});
}

function ctFields (ct, ctIdToType) {
  const fields = {sys: {type: new GraphQLNonNull(SysType)}};

  return ct.fields.reduce((acc, cfField) => {
    if (!cfField.omitted && cfField.id !== 'sys') {
      const fn = cfField.type === 'Array' ? arrayField : singularField;
      const field = fn(cfField, ctIdToType);

      if (field) {
        acc[cfField.id] = field;
      }
    }

    return acc;
  }, fields);
}

function singularField (cfField, ctIdToType) {
  if (hasScalarMapping(cfField)) {
    return scalar(cfField);
  } else if (cfField.type === 'Link' && cfField.linkType === 'Entry') {
    return ref(cfField, ctIdToType);
  }
}

function arrayField (cfField, ctIdToType) {
  const items = cfField.items || {};
  if (items.type === 'Symbol') {
    return arrayOfStrings(cfField);
  } else if (items.type === 'Link' && items.linkType === 'Entry') {
    return arrayOfRefs(cfField, ctIdToType);
  }
}

function hasScalarMapping (cfField) {
  return Object.keys(CF_TO_GRAPHQL_TYPE).indexOf(cfField.type) > -1;
}

function scalar (cfField) {
  return {
    type: CF_TO_GRAPHQL_TYPE[cfField.type],
    resolve: entry => _get(entry, ['fields', cfField.id])
  };
}

function arrayOfStrings (cfField) {
  return {
    type: new GraphQLList(GraphQLString),
    resolve: entry => _get(entry, ['fields', cfField.id])
  };
}

function arrayOfRefs (cfField, ctIdToType) {
  const items = cfField.items || {};
  const linkedCt = findLinkedCt(items.validations);

  if (linkedCt) {
    return {
      type: new GraphQLList(ctIdToType[linkedCt]),
      resolve: (entry, _, ctx) => {
        const links = _get(entry, ['fields', cfField.id], []);
        return ctx.entryLoader.getMany(links.map(l => l.sys.id));
      }
    };
  }
}

function ref (cfField, ctIdToType) {
  const linkedCt = findLinkedCt(cfField.validations);

  if (linkedCt) {
    return {
      type: ctIdToType[linkedCt],
      resolve: (entry, _, ctx) => {
        const link = _get(entry, ['fields', cfField.id]);
        return link && ctx.entryLoader.get(link.sys.id, linkedCt);
      }
    };
  }
}

function findLinkedCt (validations) {
  const v = (validations || []).find(v => (
    Array.isArray(v.linkContentType) && v.linkContentType.length === 1
  ));

  return v && v.linkContentType[0];
}
