'use strict';

const os = require('os');
const qs = require('querystring');
const fetch = require('node-fetch');
const _get = require('lodash.get');
const request = require('tuin-request').defaults({
  json: true,
  gzip: true
}).retry({
  on: err => console.log(`Retrying ${err.options.uri} (${err.message})`),
  retries: 4
});

exports.createRestClient = createRestClient;
exports.createContentfulClient = createContentfulClient;

function createRestClient (config) {
  const opts = Object.assign({}, createOptions(config), { spaceName: config.spaceName || '', locale: config.defaultParams.locale || '', });

  return {
    get: (url, params) => rest(url, params, opts),
    timeline: opts.timeline
  };
}

function createContentfulClient (config) {
  const opts = createOptions(config);

  return {
    get: (url, params = {}) => cfGet(url, params, opts),
    timeline: opts.timeline
  };
}

function createOptions (config) {
  config = config || {};
  return {
    base: config.base || '',
    headers: config.headers || {},
    defaultParams: config.defaultParams || {},
    timeline: config.timeline || [],
    cache: config.cache || {}
  };
}

function rest (entryId, params, opts) {
  const { base, spaceName, timeline, cache, locale } = opts;
  const httpCall = { entryId, start: Date.now() };
  timeline.push(httpCall);

  const url = `${base}${params.path}/${spaceName}/${entryId}?${params.queryParams || ''}`;
  const cached = cache[url];
  if (cached) {
    return cached;
  }

  cache[url] = request.get(url)
    .then(res => {
      httpCall.duration = Date.now() - httpCall.start;
      return res;
    })
    .then(item => removeLocale(item, locale));

  return cache[url];
}


function cfGet (url, params, opts) {
  const paramsWithDefaults = Object.assign({}, opts.defaultParams, params);
  const sortedQS = getSortedQS(paramsWithDefaults);
  if (typeof sortedQS === 'string' && sortedQS.length > 0) {
    url = `${url}?${sortedQS}`;
  }

  const { base, headers, timeline, cache } = opts;
  const cached = cache[url];
  if (cached) {
    return cached;
  }

  const httpCall = { url, start: Date.now() };
  timeline.push(httpCall);

  cache[url] = fetch(
    base + url, { headers: Object.assign({}, getUserAgent(), headers) }
  )
    .then(checkStatus)
    .then(res => {
      httpCall.duration = Date.now() - httpCall.start;
      return res.json();
    });

  return cache[url];
}

function spliceEntryLocale (obj, locale) {
  obj.fields = Object.keys(obj.fields).reduce((acc, item) => {
    const prop = obj.fields[item];
    acc[item] = prop.hasOwnProperty(locale) ? prop[locale] : prop;
    return acc;
  }, obj.fields);

  return obj;
}

function removeLocale (obj, locale) {
  return obj instanceof Array ? obj.map(item => spliceEntryLocale(item, locale)) : spliceEntryLocale(obj, locale);
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
  return { 'X-Contentful-User-Agent': `${joined};` };
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
