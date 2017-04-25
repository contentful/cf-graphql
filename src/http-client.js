'use strict';

const qs = require('querystring');
const fetch = require('node-fetch');

module.exports = config => {
  config = config || {};
  const opts = {
    base: config.base || '',
    headers: config.headers || {},
    timeline: config.timeline || [],
    cache: config.cache || {}
  };

  return {
    get: (url, params = {}) => get(url, params, opts),
    timeline: opts.timeline
  };
};

function get (url, params, opts) {
  const sortedQS = getSortedQS(params);
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

  cache[url] = fetch(base + url, {headers})
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
