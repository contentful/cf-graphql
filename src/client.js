'use strict';

const _get = require('lodash.get');
const chunk = require('lodash.chunk');
const qs = require('querystring');
const fetch = require('node-fetch');
const DataLoader = require('dataloader');

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
    return httpGet('/content_types')
    .then(res => res.items);
  }

  function httpGet (url, params, timeline, cachedPromises) {
    const sortedQS = getSortedQS(params);
    if (typeof sortedQS === 'string' && sortedQS.length > 0) {
      url = `${url}?${sortedQS}`;
    }

    cachedPromises = cachedPromises || {};
    const cached = cachedPromises[url];
    if (cached) {
      return cached;
    }

    timeline = timeline || [];
    const httpCall = {url, start: Date.now()};
    timeline.push(httpCall);

    cachedPromises[url] = fetch(base + url, {headers})
    .then(checkStatus)
    .then(res => {
      httpCall.duration = Date.now()-httpCall.start;
      return res.json();
    });

    return cachedPromises[url];
  }

  function createEntryLoader () {
    const loader = new DataLoader(load);
    const assets = {};
    const timeline = [];
    const cachedPromises = {};

    return {
      get: getOne,
      getMany: loader.loadMany.bind(loader),
      query,
      getIncludedAsset: id => assets[id],
      getTimeline: () => timeline
    };

    function load (ids) {
      const requests = chunk(ids, CHUNK_SIZE)
      .map(ids => httpGet('/entries', {
        limit: CHUNK_SIZE,
        skip: 0,
        include: 1,
        'sys.id[in]': ids.join(',')
      }, timeline, cachedPromises));

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
        const ctId = _get(res ['sys', 'contentType', 'sys', 'id']);
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

      return httpGet('/entries', params, timeline, cachedPromises)
      .then(res => {
        prime(res);
        return res.items;
      });
    }

    function prime (res) {
      _get(res, ['items'], [])
      .concat(_get(res, ['includes', 'Entry'], []))
      .forEach(e => loader.prime(e.sys.id, e));

      _get(res, ['includes', 'Asset'], [])
      .forEach(a => assets[a.sys.id] = a);
    }
  }
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

function getSortedQS (params) {
  const sortedParams = Object.keys(params).sort();
  const qsPairs = sortedParams.reduce((acc, key) => {
    const pair = {};
    pair[key] = params[key];
    const s = qs.stringify(pair);

    if (typeof s === 'string' && s.length > 0) {
      return acc.concat([s]);
    } else {
      return acc;
    }
  }, []);

  return qsPairs.join('&');
}
