'use strict';

const _get = require('lodash.get');
const chunk = require('lodash.chunk');
const qs = require('querystring');
const DataLoader = require('dataloader');

const createHttpClient = require('./http-client.js');

const CHUNK_SIZE = 100;

module.exports = createClient;

function createClient (config) {
  const base = `https://cdn.contentful.com/spaces/${config.spaceId}`;
  const headers = {Authorization: `Bearer ${config.cdaToken}`};

  return {
    getContentTypes,
    createEntryLoader
  };

  function getContentTypes () {
    const http = createHttpClient({base, headers});
    return http.get('/content_types', {limit: 1000})
    .then(res => res.items);
  }

  function createEntryLoader () {
    const http = createHttpClient({base, headers});
    const loader = new DataLoader(load);
    const assets = {};

    return {
      get: getOne,
      getMany: loader.loadMany.bind(loader),
      query,
      getIncludedAsset: id => assets[id],
      getTimeline: () => http.timeline
    };

    function load (ids) {
      const requests = chunk(ids, CHUNK_SIZE)
      .map(ids => http.get('/entries', {
        limit: CHUNK_SIZE,
        skip: 0,
        include: 1,
        'sys.id[in]': ids.join(',')
      }));

      return Promise.all(requests)
      .then(responses => responses.reduce((acc, res) => {
        prime(res);
        _get(res, ['items'], []).forEach(e => acc[e.sys.id] = e);
        return acc;
      }, {}))
      .then(byId => ids.map(id => byId[id]));
    }

    function getOne (id, forcedCtId) {
      return loader.load(id)
      .then(res => {
        const ctId = _get(res, ['sys', 'contentType', 'sys', 'id']);
        if (forcedCtId && ctId !== forcedCtId) {
          throw new Error('Does not match the forced Content Type ID.');
        } else {
          return res;
        }
      });
    }

    function query (ctId, q) {
      const params = Object.assign({
        limit: 100,
        skip: 0,
        include: 1,
        content_type: ctId
      }, qs.parse(q || ''));

      return http.get('/entries', params).then(prime);
    }

    function prime (res) {
      _get(res, ['items'], [])
      .concat(_get(res, ['includes', 'Entry'], []))
      .forEach(e => loader.prime(e.sys.id, e));

      _get(res, ['includes', 'Asset'], [])
      .forEach(a => assets[a.sys.id] = a);

      return res.items;
    }
  }
}
