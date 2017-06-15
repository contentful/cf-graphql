'use strict';

module.exports = getResponse;

function getResponse (opts) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    },
    body: body(opts)
  };
}

function body (opts = {}) {
  const title = opts.title || 'GraphiQL';
  const url = opts.url || '/graphql';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/graphiql/0.10.1/graphiql.min.css">
  <style>
    body {margin: 0; height: 100%; width: 100%; overflow: hidden;}
    #graphiql {height: 100vh;}
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/15.4.2/react.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/15.4.2/react-dom.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/graphiql/0.10.1/graphiql.min.js"></script>
</head>
<body>
  <div id="graphiql">Loading...</div>
  <script>
    ReactDOM.render(
      React.createElement(GraphiQL, {fetcher: fetcher}),
      document.getElementById('graphiql')
    );

    function fetcher (params) {
      return fetch('${url}', {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      }).then(function (res) {
        return res.text();
      }).then(function (res) {
        try {
          return JSON.parse(res);
        } catch (err) {
          return res;
        }
      });
    }
  </script>
</body>
</html>
`;
}
