'use strict';

// result of a `createExtension` call can be passed to express-graphql
//
// options available: "timeline" and "detailedErrors" (both default to false)
//
// timeline extension and detailed errors are nice for development, but most
// likely you want to skip them in your production setup

module.exports = createExtension;

function createExtension (client, schema, options = {}) {
  return function () {
    const start = Date.now();
    const entryLoader = client.createEntryLoader();

    return {
      context: {entryLoader},
      schema,
      graphiql: false,
      extensions: options.timeline ? extensions : undefined,
      formatError: options.detailedErrors ? formatError : undefined
    };

    function extensions () {
      return {
        time: Date.now()-start,
        timeline: entryLoader.getTimeline().map(httpCall => {
          return Object.assign({}, httpCall, {start: httpCall.start-start});
        })
      };
    }
  };
}

function formatError (err) {
  return {
    message: err.message,
    locations: err.locations,
    stack: err.stack,
    path: err.path
  };
}
