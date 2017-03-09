'use strict';

const config = require('./config.json');
const spaceId = config.spaceId;
const cdaToken = config.cdaToken;

const fetch = require('node-fetch');

const BASE = `https://cdn.contentful.com/spaces/${spaceId}`;

module.exports = {
  BASE,
  getEntry,
  getEntries,
  getContentTypes
};

function getEntry (id, forcedCtId) {
  return fetch(`${BASE}/entries/${id}?access_token=${cdaToken}`)
  .then(checkStatus)
  .then(res => res.json())
  .then(res => {
    if (forcedCtId && res.sys.contentType.sys.id !== forcedCtId) {
      throw new Error('Does not match the forced Content Type ID.');
    } else {
      return res;
    }
  });
}

function getEntries (ctId) {
  return getMany(`${BASE}/entries?content_type=${ctId}&access_token=${cdaToken}`);
}

function getContentTypes () {
  return getMany(`${BASE}/content_types?access_token=${cdaToken}`);
}

function getMany (url) {
  return fetch(url)
  .then(checkStatus)
  .then(res => res.json())
  .then(res => res.items);
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
