'use strict';

const {
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLList,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt
} = require('graphql');

const {getEntry, getEntries} = require('./client.js');

const {upperFirst, camelCase} = require('lodash');
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
        id: {type: new GraphQLNonNull(GraphQLString)}
      },
      resolve: (_, {id}) => getEntry(id, ct.sys.id)
    };

    acc[pluralize(name)] = {
      type: new GraphQLList(Type),
      resolve: () => getEntries(ct.sys.id)
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
  const {items = {}} = cfField;
  if (items.type === 'Symbol') {
    return arrayOfStrings(cfField);
  } else if (items.type === 'Link' && items.linkType === 'Entry') {
    return arrayOfRefs(cfField, ctIdToType);
  }
}

function hasScalarMapping ({type}) {
  return Object.keys(CF_TO_GRAPHQL_TYPE).includes(type);
}

function scalar ({type, id}) {
  return {
    type: CF_TO_GRAPHQL_TYPE[type],
    resolve: e => e.fields && e.fields[id]
  };
}

function arrayOfStrings ({id}) {
  return {
    type: new GraphQLList(GraphQLString),
    resolve: e => e.fields && e.fields[id]
  };
}

function arrayOfRefs ({id, items = {}}, ctIdToType) {
  const linkedCt = findLinkedCt(items.validations);
  if (linkedCt) {
    return {
      type: new GraphQLList(ctIdToType[linkedCt]),
      resolve: e => (
        // TODO: boo! should not map with `getEntry`
        e.fields && e.fields[id].map(l => getEntry(l.sys.id, linkedCt))
      )
    };
  }
}

function ref ({id, validations}, ctIdToType) {
  const linkedCt = findLinkedCt(validations);
  if (linkedCt) {
    return {
      type: ctIdToType[linkedCt],
      resolve: e => (
        e.fields && e.fields[id] && getEntry(e.fields[id].sys.id, linkedCt)
      )
    };
  }
}

function findLinkedCt (validations = []) {
  const v = validations.find(v => (
    Array.isArray(v.linkContentType) && v.linkContentType.length === 1
  ));

  return v && v.linkContentType[0];
}
