# cf-graphql

## Local development

Setup:

```
nvm use
npm install
vi config.json
npm run get-cts
```

Run:

```
npm start # and go to http://localhost:4000
```

Drawing the graph (server must be running):

```
npm run graph # written to dist/graph.png
```

## AWS Lambda

Prepare a zip file:

```
npm run zip
du -h dist/lambda-cf-graphql.zip # yay! small!
```

Handlers:
- `lambda.ui` serves the [GraphiQL](https://github.com/graphql/graphiql) UI
- `lambda.graphql` is the default [graphql-server-lambda](https://github.com/apollographql/graphql-server#aws-lambda) handler

## TODOs

- [ ] `q` (query string part) argument for collections
- [ ] Checks for name generation logic (current version may cause conflicts)
- [ ] GraphiQL HTML/JS refactoring
