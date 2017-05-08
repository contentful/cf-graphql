'use strict';

const os = require('os');
const qs = require('querystring');
const fetch = require('node-fetch');
const _get = require('lodash.get');

module.exports = createClient;

function createClient (config) {
  config = config || {};
  const opts = {
    base: config.base || '',
    headers: config.headers || {},
    defaultParams: config.defaultParams || {},
    timeline: config.timeline || [],
    cache: config.cache || {}
  };

  return {
    get: (url, params = {}) => get(url, params, opts),
    timeline: opts.timeline
  };
}

function get (url, params, opts) {
  const paramsWithDefaults = Object.assign({}, opts.defaultParams, params);
  const sortedQS = getSortedQS(paramsWithDefaults);
  if (typeof sortedQS === 'string' && sortedQS.length > 0) {
    url = `${url}?${sortedQS}`;
  }

  const {base, headers, timeline, cache} = opts;
  const cached = cache[url];
  if (cached) {
    return cached;
  }

  const httpCall = {url, start: Date.now()};
  timeline.push(httpCall);

  cache[url] = fetch(
    base + url,
    {headers: Object.assign({}, getUserAgent(), headers)}
  )
  .then(checkStatus)
  .then(res => {
    httpCall.duration = Date.now()-httpCall.start;
    return res.json();
  });

  return cache[url];
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
  return Object.keys(params).sort().reduce((acc, key) => {
    const pair = {};
    pair[key] = params[key];
    return acc.concat([qs.stringify(pair)]);
  }, []).join('&');
}

function getUserAgent () {
  const segments = ['app contentful.cf-graphql', getOs(), getPlatform()];
  const joined = segments.filter(s => typeof s === 'string').join('; ');
  return {'X-Contentful-User-Agent': `${joined};`};
}

function getOs () {
  const name = {
    win32: 'Windows',
    darwin: 'macOS'
  }[os.platform()] || 'Linux';

  const release = os.release();
  if (release) {
    return `os ${name}/${release}`;
  }
}

function getPlatform () {
  const version = _get(process, ['versions', 'node']);
  if (version) {
    return `platform node.js/${version}`;
  }
}
