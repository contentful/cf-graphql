'use strict';

const createHttpClient = require('./http-client.js');
const createEntryLoader = require('./entry-loader.js');

module.exports = createClient;

function createClient (config) {
  const base = `https://cdn.contentful.com/spaces/${config.spaceId}`;
  const headers = {Authorization: `Bearer ${config.cdaToken}`};
  const http = () => createHttpClient({base, headers});

  return {
    getContentTypes,
    createEntryLoader: () => createEntryLoader(http())
  };

  function getContentTypes () {
    return http()
    .get('/content_types', {limit: 1000})
    .then(res => res.items);
  }
}
