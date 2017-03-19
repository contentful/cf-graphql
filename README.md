# cf-graphql

`cf-graphql` is a library that allows you to query your data stored in
[Contentful](https://www.contentful.com/) with [GraphQL](http://graphql.org/).
A schema and value resolvers are automatically generated out of an existing
space.

Generated artifacts can be used with any node-based GraphQL server. The outcome
of the project's main function call is an instance of the
[`GraphQLSchema`](http://graphql.org/graphql-js/type/#graphqlschema) class.


## Example

This repository contains a project example. To run it, clone the repo and
execute:

```
nvm use
npm install
npm run example-server
```

Navigate to <http://localhost:4000> to access an IDE (GraphiQL). You can query
[a pregenerated schema](./example/resources/schema.graphql) of my space there.
Here is how its graph looks like:

![Schema graph](./example/resources/graph.png)

To use your own Contentful space with the example, you have to provide both
a space ID and its CDA token. As the last step, the schema needs to be
regenerated:

```
vi example/resources/config.json
npm run example-prepare
npm run example-server
```
