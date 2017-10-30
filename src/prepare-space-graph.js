'use strict';

const _get = require('lodash.get');
const upperFirst = require('lodash.upperfirst');
const camelCase = require('lodash.camelcase');
const pluralize = require('pluralize');

const ENTITY_TYPES = [
  'Entry',
  'Asset'
];

const SHORTCUT_FIELD_TYPE_MAPPING = {
  Entry: 'Link<Entry>',
  Asset: 'Link<Asset>',
  Symbols: 'Array<String>',
  Entries: 'Array<Link<Entry>>',
  Assets: 'Array<Link<Asset>>'
};

const SIMPLE_FIELD_TYPE_MAPPING = {
  Symbol: 'String',
  Text: 'String',
  Number: 'Float',
  Integer: 'Int',
  Date: 'String',
  Boolean: 'Bool',
  Location: 'Location',
  Object: 'Object'
};

module.exports = prepareSpaceGraph;
function prepareSpaceGraph(cts, basePageTypes = [], allowMultipleContentTypeFieldsForBackref = false) {
  return addBackrefs(createSpaceGraph(cts, allowMultipleContentTypeFieldsForBackref, basePageTypes), basePageTypes);
}

function createSpaceGraph(cts, allowMultipleContentTypeFieldsForBackref, basePageTypes) {
  const accumulatedNames = {};

  if (basePageTypes.length > 0) {
    const basePage = cts.find(x => basePageTypes.includes(x.sys.id))
    cts.push({
      sys: { id: 'basePage' },
      name: 'BasePage',
      fields: basePage.fields.filter(f => f.id === 'urlFolder' || f.id === 'url')
    });
  }

  return cts.map(ct => ({
    id: ct.sys.id,
    names: names(ct.name, accumulatedNames),
    fields: ct.fields.reduce((acc, f) => {
      return f.omitted ? acc : acc.concat([field(f, allowMultipleContentTypeFieldsForBackref, basePageTypes)]);
    }, [])
  }));
}

function names(name, accumulatedNames) {
  const fieldName = camelCase(name);
  const typeName = upperFirst(fieldName);

  return checkForConflicts({
    field: fieldName,
    collectionField: pluralize(fieldName),
    type: typeName,
    backrefsType: `${typeName}Backrefs`
  }, accumulatedNames);
}

function checkForConflicts(names, accumulatedNames) {
  Object.keys(names).forEach(key => {
    const value = names[key];
    accumulatedNames[key] = accumulatedNames[key] || [];
    if (accumulatedNames[key].includes(value)) {
      throw new Error(`Conflicing name: "${value}". Type of name: "${key}"`);
    }
    accumulatedNames[key].push(value);
  });

  return names;
}

function field(f, allowMultipleContentTypeFieldsForBackref, basePageTypes) {
  ['sys', '_backrefs'].forEach(id => {
    if (f.id === id) {
      throw new Error(`Fields named "${id}" are unsupported`);
    }
  });

  return {
    id: f.id,
    type: type(f),
    linkedCt: linkedCt(f, allowMultipleContentTypeFieldsForBackref, basePageTypes)
  };
}

function type(f) {
  if (f.type === 'Array') {
    if (f.items.type === 'Symbol') {
      return 'Array<String>';
    } else if (f.items.type === 'Link' && isEntityType(f.items.linkType)) {
      return `Array<Link<${f.items.linkType}>>`;
    } else {
      throw new Error('Invalid field of a type "Array"');
    }
  }

  if (f.type === 'Link') {
    if (isEntityType(f.linkType)) {
      return `Link<${f.linkType}>`;
    } else {
      throw new Error('Invalid field of a type "Link"');
    }
  }

  const mapped = SHORTCUT_FIELD_TYPE_MAPPING[f.type] || SIMPLE_FIELD_TYPE_MAPPING[f.type];
  if (mapped) {
    return mapped;
  } else {
    throw new Error(`Unknown field type: "${f.type}"`);
  }
}

function isEntityType(x) {
  return ENTITY_TYPES.indexOf(x) > -1;
}

function linkedCt(f, allowMultipleContentTypeFieldsForBackref, basePageTypes) {
  const prop = 'linkContentType';
  const validation = getValidations(f).find(v => {
    return Array.isArray(v[prop]) && (allowMultipleContentTypeFieldsForBackref ? v[prop].length : v[prop].length === 1);
  });

  const linkedCt = validation && validation[prop];

  if (linkedCt) {
    if (linkedCt.find(x => basePageTypes.includes(x))) {
      linkedCt.push('basePage')
    }
    return linkedCt;
  }
}

function getValidations(f) {
  if (f.type === 'Array') {
    return _get(f, ['items', 'validations'], []);
  } else {
    return _get(f, ['validations'], []);
  }
}

function addBackrefs(spaceGraph, basePageTypes) {
  basePageTypes = basePageTypes.map(type => type.endsWith('s') ? type : `${type}s`);
  const byId = spaceGraph.reduce((acc, ct) => {
    acc[ct.id] = ct;
    return acc;
  }, {});

  spaceGraph.forEach(ct => ct.fields.forEach(field => {
    if (field.linkedCt) {
      field.linkedCt.forEach(link => {
        const linked = byId[link];
        if (linked) {
          linked.backrefs = linked.backrefs || [];
          linked.backrefs.push({
            ctId: ct.id,
            fieldId: field.id,
            backrefFieldName: `${ct.names.collectionField}__via__${field.id}`
          });

          if (basePageTypes.includes(ct.names.collectionField)) {
            linked.backrefs.push({
              ctId: 'basePage',
              fieldId: field.id,
              backrefFieldName: `basePages__via__${field.id}`
            });
          }
        }
      });
    }
  }));

  return spaceGraph;
}
