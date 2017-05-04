'use strict';

const createHttpClient = require('./http-client.js');
const createEntryLoader = require('./entry-loader.js');

const CDA = 'cdn';
const CMA = 'api';

module.exports = createClient;

function createClient (config) {
  return {
    getContentTypes: function () {
      return createContentfulClient(CMA, config)
      .get('/content_types', {limit: 1000})
      .then(res => res.items);
    },
    createEntryLoader: function () {
      return createEntryLoader(createContentfulClient(CDA, config));
    }
  };
}

function createContentfulClient (api, config) {
  const protocol = config.secure !== false ? 'https' : 'http';
  const domain = config.domain || 'contentful.com';
  const base = `${protocol}://${api}.${domain}/spaces/${config.spaceId}`;

  const token = api === CDA ? config.cdaToken : config.cmaToken;
  const headers = {Authorization: `Bearer ${token}`};

  const defaultParams = {};
  if (api === CDA && config.locale) {
    defaultParams.locale = config.locale;
  }

  return createHttpClient({base, headers, defaultParams});
}
