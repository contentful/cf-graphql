'use strict';

const _get = require('lodash.get');
const qs = require('querystring');
const fetch = require('node-fetch');
const DataLoader = require('dataloader');

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
    params = qs.stringify(params || {});
    if (typeof params === 'string' && params.length > 0) {
      url = `${url}?${params}`;
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
      const params =  {'sys.id[in]': ids.join(',')};
      return httpGet('/entries', params, timeline, cachedPromises)
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
        const ctId = _get(res ['sys', 'contentType', 'sys', 'id']);
        if (forcedCtId && ctId !== forcedCtId) {
          throw new Error('Does not match the forced Content Type ID.');
        } else {
          return res;
        }
      });
    }

    function query (ctId, q) {
      const params = Object.assign({content_type: ctId}, q || {});
      return httpGet('/entries', params, timeline, cachedPromises)
      .then(res => {
        prime(res);
        return res.items;
      });
    }

    function prime (res) {
      res.items.concat(_get(res, ['includes', 'Entry'], []))
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
