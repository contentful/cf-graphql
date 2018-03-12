'use strict';

const _get = require('lodash.get');
const _flatten = require('lodash.flatten');
const DataLoader = require('dataloader');

module.exports = createEntryLoader;

function createEntryLoader(http, basePageTypes) {
  const entryLoader = new DataLoader(loadEntries);
  const assetLoader = new DataLoader(loadAssets);
  const entriesByPageTypeLoader = new DataLoader(loadEntriesByPageType);
  const entriesByBasePageLoader = new DataLoader(loadEntriesByBasePage)

  return {
    get: getOne,
    getMany: entryLoader.loadMany.bind(entryLoader),
    query: queryAll,
    queryAll,
    getIncludedAsset: id => assetLoader.load([id]),
    getTimeline: () => http.timeline,
    queryBasePages,
  };

  function loadEntries(ids) {
    const requests = ids.map(id => http.get(`${id}`, { path: 'entry' }));
    return Promise.all(requests);
  }

  function loadAssets(ids) {
    const requests = ids.map(id => http.get(`${id}`, { path: 'asset' }));
    return Promise.all(requests);
  }

  function loadEntriesByPageType(contentTypeIds) {
    const requests = contentTypeIds.map(ctId => http.get(`contentModel/${ctId}`, { path: 'entry', queryParams: ctId === 'basePage' || basePageTypes.includes(ctId) ? 'slimEntry=true' : 'slimEntry=false' }));
    return Promise.all(requests);
  }

  function loadEntriesByBasePage(queryParams) {
    const requests = queryParams.map(queryParam => http.get(`contentModel/basePage`, { path: 'entry', queryParams: queryParam }));
    return Promise.all(requests);
  }

  function getOne(id, forcedCtId) {
    return entryLoader.load(id)
    .then(res => {
      const ctId = _get(res, ['sys', 'contentType', 'sys', 'id']);
      if (forcedCtId && ctId !== forcedCtId) {
        throw new Error('Does not match the forced Content Type ID.');
      } else {
        return res;
      }
    });
  }

  function queryAll(ctId) {
    return entriesByPageTypeLoader.load(ctId);
  }

  function queryBasePages(ctId, fields) {
    return entriesByBasePageLoader.load(`slimEntry=true&fields=${fields.join(',')}`);
  }
}
