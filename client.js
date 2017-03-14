'use strict';

const config = require('./config.json');
const spaceId = config.spaceId;
const cdaToken = config.cdaToken;

const qs = require('querystring');
const fetch = require('node-fetch');
const DataLoader = require('dataloader');
const _get = require('lodash.get');

const BASE = `https://cdn.contentful.com/spaces/${spaceId}`;

module.exports = {
  BASE,
  createEntryLoader,
  getContentTypes
};

function createEntryLoader (log) {
  const loader = new DataLoader(load);
  const assets = {};

  return {
    get: getOne,
    getMany: loader.loadMany.bind(loader),
    query,
    getIncludedAsset: id => assets[id]
  };

  function load (ids) {
    return httpGet('/entries', {'sys.id[in]': ids.join(',')}, log)
    .then(res => {
      prime(res);

      const byId = res.items.reduce((acc, e) => {
        acc[e.sys.id] = e;
        return acc;
      }, {});

      return ids.map(id => byId[id]);
    });
  }

  function getOne (id, forcedCtId) {
    return loader.load(id)
    .then(res => {
      if (forcedCtId && res.sys.contentType.sys.id !== forcedCtId) {
        throw new Error('Does not match the forced Content Type ID.');
      } else {
        return res;
      }
    });
  }

  function query (ctId) {
    return httpGet('/entries', {content_type: ctId}, log)
    .then(res => {
      prime(res);
      return res.items;
    });
  }

  function prime (res) {
    res.items.concat(_get(res, ['includes', 'Entry'], []))
    .forEach(e => loader.prime(e.sys.id, e));

    _get(res, ['includes', 'Asset'], []).forEach(a => assets[a.sys.id] = a);
  }
}

function getContentTypes () {
  return httpGet('/content_types')
  .then(res => res.items);
}

function httpGet (url, params, log) {
  const headers = {Authorization: `Bearer ${cdaToken}`};

  params = qs.stringify(params || {});
  if (typeof params === 'string' && params.length > 0) {
    url = `${url}?${params}`;
  }

  log = log || (() => {});
  const start = Date.now();
  log(`doing HTTP - GET ${url}`);

  return fetch(BASE + url, {headers})
  .then(checkStatus)
  .then(res => {
    log(`done in ${Date.now()-start}ms - GET ${url}`);
    return res.json();
  });
}

function checkStatus (res) {
  if (res.status >= 200 && res.status < 300) {
    return res;
  } else {
    const err = new Error(res.statusText);
    err.response = res;
    throw err;
  }
}
