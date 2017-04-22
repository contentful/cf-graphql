'use strict';

const _get = require('lodash.get');
const {GraphQLObjectType, GraphQLList} = require('graphql');

module.exports = createBackrefsType;

function createBackrefsType (ct, ctIdToType) {
  return new GraphQLObjectType({
    name: ct.names.backrefsType,
    fields: ct.backrefs.reduce((acc, br) => {
      const Type = ctIdToType[br.ctId];
      if (Type) {
        acc[br.backrefFieldName] = createBackrefFieldConfig(br, Type);
      }
      return acc;
    }, {})
  });
}

function createBackrefFieldConfig (br, Type) {
  return {
    type: new GraphQLList(Type),
    resolve: (entryId, _, ctx) => {
      // TODO: should fetch all entries before filtering
      // multiple requests may be required, limit=1000 is the maximal value
      return ctx.entryLoader.query(br.ctId, 'limit=1000')
      .then(entries => filterEntries(entries, br.fieldId, entryId));
    }
  };
}

function filterEntries (entries, refFieldId, entryId) {
  return entries.filter(entry => {
    const refField = _get(entry, ['fields', refFieldId]);

    if (Array.isArray(refField)) {
      return !!refField.find(link => _get(link, ['sys', 'id']) === entryId);
    } else if (typeof refField === 'object') {
      return _get(refField, ['sys', 'id']) === entryId;
    } else {
      return false;
    }
  });
}
