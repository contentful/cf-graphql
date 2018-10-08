'use strict';

const HttpClient = require('./http-client.js');
const createEntryLoader = require('./entry-loader.js');
const CMA = 'api';

module.exports = createClient;

function createClient(config) {
  return {
    getContentTypes: function() {
      return createContentfulClient(CMA, config)
      .get('/content_types', { limit: 1000 })
      .then(res => res.items);
    },
    createEntryLoader: function() {
      return createEntryLoader(createRestClient(config), config.basePageTypes);
    }
  };
}

function createContentfulClient(api, config) {
  const protocol = config.secure !== false ? 'https' : 'http';
  const domain = config.domain || 'contentful.com';
  const base = `${protocol}://${api}.${domain}/spaces/${config.spaceId}`;
  const headers = { Authorization: `Bearer ${config.cmaToken}` };
  const defaultParams = {};

  return HttpClient.createContentfulClient({ base, headers, defaultParams });
}

function createRestClient(config) {
  const base = config.host;
  const defaultParams = {};
  const spaceName = config.spaceName || '';
  defaultParams.include = 3;
  if (config.locale) {
    defaultParams.locale = config.locale;
  }

  return HttpClient.createRestClient({ base, spaceName, defaultParams });
}
