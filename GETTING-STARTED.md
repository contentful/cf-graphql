# How to get started with Contentful and GraphQL

This article details how to set up your own GraphQL server and connect it with Contentful.

## What is GraphQL?

[GraphQL](http://graphql.org/) is a fairly new query language that gives developers the super powers to shape API call responses tailored to their needs. It was invented by Facebook to initially serve their mobile apps.

As a developer, something like GraphQL can make life a lot easier. Today, RESTful architectures are the de facto standard in the overall API landscape. The division of endpoints for every resource and the usage of the HTTP methods to model resource actions makes a lot of sense, but maybe you find yourself cursing this API architecture from time to time?

Usually, you have no way to control the shape of API responses. And very often you have to make several requests to fetch all the data from different resources which is usually needed for a UI interface. These parallel requests, and the asynchronous nature of JavaScript, increase the complexity developers have to deal with and very often more data is fetched than is actually needed. Query strings including things like `includeSomething=true` or Contentful's very own [include operator](/developers/docs/references/content-delivery-api/#/reference/links) and [select operator](/developers/docs/references/content-delivery-api/#/reference/search-parameters/select-operator) are solutions addressing the problems of unflexible RESTful response bodies. You can e.g. set `include=1` to only retreive the entities of the first linked level in a single call and additionally use `select=fields.name` to only retreive the `name` field of the entities.

In a GraphQL world, there's no need for these solutions, because these problems just don't exist. A GraphQL query decides what resources and fields will be included in the response.

- Do you want to fetch several resources in a single call? No problem!
- Do you only want to retrieve an image and a name of a given resource? Easy peasy!
- Do you want to access resources linked to another resource? Go ahead!

GraphQL can help you with daily problems. Sounds too good to be true? I hear you – so let's dive right into it.

## Setting up the Contentful GraphQL server

### Install `cf-graphql`

[The demo project included in the project](https://github.com/contentful-labs/cf-graphql/tree/master/demo) makes use of the "Blog" space template, which you can choose to set up a newly created space. In case you don't want to set up a new space and just want to play around with `cf-graphql` you can still use the [demo project](https://github.com/contentful-labs/cf-graphql/tree/master/demo), which can run against a public space, too. So let's kick it off!

`cf-graphql` is built to be used programmatically, which means that you can use it in plain Node.js or combine it with a web application framework like [express](https://expressjs.com/) to serve the API requests. This tutorial uses express to keep the complexity low.

In case you start a project from scratch set up a new `package.json` using npm itself.

~~~bash
$ npm init
~~~

The next steps are to install all the needed dependencies and add them to the newly created `package.json`. You can do so by executing `npm install` with the `--save` flag. Overall, what you need for the GraphQL server are the `cf-graphql`, `express` and `express-graphql`. This tutorial guides you step-by-step through all of the modules and why they are needed.

~~~bash
$ npm install --save cf-graphql express express-graphql
~~~

~~~json
// package.json
{
  "dependencies": {
    "cf-graphql": "^0.4.2",
    "express": "^4.15.3",
    "express-graphql": "^0.6.6",
  }
}
~~~

### Configure `cf-graphql`

To make `cf-graphql` work you have to set up a new file `server.js` which then accesses three needed authorization tokens:

- a space ID
- a content delivery token
- a content management token

The node script will access this information by reading the environment variables `SPACE_ID`, `CDA_TOKEN` and `CMA_TOKEN`.

~~~javascript
const spaceId = process.env.SPACE_ID;
const cdaToken = process.env.CDA_TOKEN;
const cmaToken = process.env.CMA_TOKEN;
~~~

You can then set these variables when executing the node script.

~~~bash
$ SPACE_ID=some-space-id CMA_TOKEN=xxx CDA_TOKEN=xxx node server.js

# wrapped in an npm script
$ SPACE_ID=some-space-id CMA_TOKEN=xxx CDA_TOKEN=xxx npm start

~~~

If you have used Contentful before you might ask yourself why you need to define a Content Management API token. [The Content Management API](/developers/docs/references/content-management-api/) is usually used to perform READ/WRITE operations and our GraphQL server should only perform READ operations.

The reason for this is, that `cf-graphql` allows you to reference [backlinks](https://github.com/contentful-labs/cf-graphql#querying) in the query document. This feature is only possible by retrieving detailed content model information that is not available in the Content Delivery API today.

### Create a GraphQL schema

You can then create a new client interface which helps us in setting up a new GraphQL server.

~~~javascript
const client = cfGraphql.createClient({spaceId, cdaToken, cmaToken});

client.getContentTypes()
.then(cfGraphql.prepareSpaceGraph)
.then(spaceGraph => {
  const names = spaceGraph.map(ct => ct.names.type).join(', ');
  console.log(`Contentful content types prepared: ${names}`);
  return spaceGraph;
})
.then(cfGraphql.createSchema)
.then(schema => startServer(client, schema))
.catch(fail);
~~~

Let's go over this step-by-step to understand what's going on. These lines below do a few different things:

- the client fetches the complete content model from Contentful
- `cf-graphql` figures out the content graph for the fetched content model
- `cf-graphql` creates a GraphQL schema
- a web server will be started

The most important part is the schema creation. A valid schema is the base for every GraphQL server. It defines the available data and the accessible resource types. In case you're interested in GraphQL schemas and type systems [the documentation](http://graphql.org/learn/schema/) around it is actually a pretty good read.

### Spin up the GraphQL server

The next step is then to connect the GraphQL schema with the express server that we already have on board as a dependency. Luckily there is already the express middleware `express-graphql` available that helps you set this up. All it takes to start serving GraphQL is to connect the express app with [the express GraphQL middleware](https://github.com/graphql/express-graphql). Following GraphQL conventions, you configure the middleware to be mounted to the `/graphql` path.

~~~javascript
const graphqlHTTP = require('express-graphql');

function startServer (client, schema) {
  const app = express();
  app.use('/graphql', graphqlHTTP({
    context: {entryLoader: client.createEntryLoader()},
    graphiql: true,
    schema,
  }));

  app.listen(port);
  console.log(`Running a GraphQL server, listening on ${port}`);
}
~~~
Let's have a look at the documentation of `cf-graphql` for a moment:

> The only caveat is how the context is constructed. The library expects the `entryLoader` key of the context to be set to an instance created with client.createEntryLoader().

**That's important**: according to the docs of `cf-graphql`, you'll need to pass an `entryLoader` property to the middleware which is provided by the `cf-graphql` client itself.

One interesting thing to point out is the truthy `graphiql` property. [GraphiQL](https://github.com/graphql/graphiql) is an extremely handy graphical and interactive in-browser GraphQL IDE, which is really helpful when you build your first GraphQL queries. You'll use it to write your first GraphQL query in a minute. With these few lines of code you're ready to start the server and connect it to a GraphQL client.

This is a basic example. If you check [the demo project](https://github.com/contentful-labs/cf-graphql/tree/master/demo) you'll see that we decided to go with a bit more complex configuration.

~~~javascript
function startServer (client, schema) {
  const app = express();
  app.use(cors());

  // serve React Frontend
  app.use('/client', express.static(path.join(__dirname,'dist')));

  // ship own GraphiQL to be completely flexible
  const ui = cfGraphql.helpers.graphiql({title: 'cf-graphql demo'});
  app.get('/', (_, res) => res.set(ui.headers).status(ui.statusCode).end(ui.body));

  // enable GraphQL extension to retrieve GraphQL versoin and
  // detailed HTTP request information
  const opts = {version: true, timeline: true, detailedErrors: false};
  const ext = cfGraphql.helpers.expressGraphqlExtension(client, schema, opts);
  app.use('/graphql', graphqlHTTP(ext));

  app.listen(port);
}
~~~

We anabled CORS header to make it possible to access the GraphQL endpoint from within an application that is not running on the same origin and also used `cf-graphql` [helper utils](https://github.com/contentful-labs/cf-graphql#helpers) to serve an encapsulated GraphiQL on a different endpoint and enrich the response with useful information like timing of the underlying HTTP requests.



## Figure out your first GraphQL query

Before starting to implement GraphQL in a client you have to figure out your first query. GraphiQL is an extremely helpful tool to help you do just that. To access the GraphIDE you can use [an online demo](https://cf-graphql-demo.now.sh/) or execute `npm start` inside of [the demo project](https://github.com/contentful-labs/cf-graphql#demo) included in `cf-graphql` itself.

Inside the IDE you can try out queries and see the results. This doesn't sound too exciting, but GraphiQL fetches the complete schema on startup which means that it can provide auto-completions for almost everything. This way of writing a query becomes a breeze and even if you're not familiar with GraphQL the whole concept makes sense then.

The example space "Photo Gallery" comes with a content model including the content types "Author", "Image" and "Photo Gallery". To access the entries for all three content types you would have to make three API calls in the RESTful world. In GraphQL you can combine them all into a single query.

~~~
{
  authors {
    name
  }
  categories {
    title
  }
  posts {
    title
  }
}
~~~

The query response includes the following data plus some additional meta information:

~~~json
{
  "data": {
    "authors": [
      {
        "name": "Lewis Carroll"
      },
      {
        "name": "Mike Springer"
      }
    ],
    "categories": [
      {
        "title": "Literature"
      },
      {
        "title": "Children"
      }
    ],
    "posts": [
      {
        "title": "Seven Tips From Ernest Hemingway on How to Write Fiction"
      },
      {
        "title": "Down the Rabbit Hole"
      }
    ]
  }
}
~~~

Using GraphQL you could not only save two HTTP calls from the client but also cut off all the data you're not interested in. The query only requested the `title` field of the photo galleries and images, and the `name` field of all the authors. Pure magic!

## How to use it in the Frontend

Now that you defined your first query it's time to look around for options to adopt GraphQL in a Frontend React stack – in this regard you definitely have the agony of choice. There are several frameworks you could use. This tutorial uses [Apollo](https://www.apollodata.com/) but alternatives like [Relay](https://facebook.github.io/relay/) or even Facebook's [GraphQL.js](http://graphql.org/graphql-js/) will work just fine.

### Implement the Apollo framework

To use Apollo in a React environment you have to install it.

~~~bash
$ npm install --save react-apollo
~~~

The demo project comes with a complete [webpack](https://webpack.js.org/) and [babel](https://babeljs.io/) setup so that you don't have to worry about bundling and ES5 compatibility.

Then create an Apollo client which you configure to use the GraphQL server being available at `/graphql/`.

~~~javascript
import { ApolloClient, createNetworkInterface } from 'react-apollo';

const client = new ApolloClient({
  networkInterface: createNetworkInterface({
    uri: '/graphql/',
  })
});
~~~

Next, you have to include an `ApolloProvider` element in your React components. `ApolloProvider` makes the GraphQL client available to all of your components enhanced by the `graphql()` function which you'll use next.

So **TL;DR** without wrapping the GraphQL elements in your React components with an `ApolloProvider` it won't work. ;)

~~~javascript
class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <!-- GraphQL components will go here -->
      </ApolloProvider>
    );
  }
}
~~~

Enhanced components? Apollo follows the principle of higher-order components which means that you can enhance all your components with GraphQL capabilities. Define your GraphQL query using the `gql` tagged template literal, and then combine it with the `graphql` method which will return a function that's able to enhance your components after execution.


~~~javascript
import {gql, graphql} from 'react-apollo';

const graphQLQuery = gql`
  {
    authors {
      twitterHandle
    }
    images {
      title
    }
    photoGalleries {
      title
    }
  }
`;
const getGraphQLEnhancedComponent = graphql(graphQLQuery);
~~~

With the method `getGraphQLEnhancedComponent` you can now wrap any component and give it access to the state and response of a GraphQL query.

Let's implement a `DataViewer` component that displays the data we just fetched. Wrapped with `getGraphQLEnhancedComponent` it now has access to the loading state of the query and also to the data of `photoGalleries`, `authors` and `images`.

~~~javascript
const DataViewer = ({ data: {loading, error, photoGalleries, authors, images }}) => {
  if (loading) return <p>Loading ...</p>;
  if (error) return <p>{error.message}</p>;

  return (
    <div>
      // authors from GraphQL query available
      <ul>{ authors.map( a => <li key={a.twitterHandle}>{a.twitterHandle}</li>) }</ul>
      // images from GraphQL query available
      <ul>{ images.map( i =>  <li key={i.title}>{i.title}</li>) }</ul
      // galleries from GraphQL query available
      <ul>{ photoGalleries.map( p => <li key={p.title}>{p.title}</li>) }</ul>
    </div>
  )
};

const DataViewerWithData = getGraphQLEnhancedComponent(DataViewer);
~~~

The last thing to do then is to implement the new higher-order component `DataViewerWithData` in your app.

~~~javascript
class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <DataViewerWithData/>
      </ApolloProvider>
    );
  }
}
~~~

You can find a complete Frontend implementation in the [demo project](https://github.com/contentful-labs/cf-graphql/tree/master/demo) of `cf-graphql` itself, too.

In case you're looking for more detailed information on how to use Apollo, head over to [the official docs of react-apollo](https://github.com/apollographql/react-apollo).

## Other possible queries

In this example you only implemented a pretty basic query. `cf-graphql` is able to resolve [more advanced queries](https://github.com/contentful-labs/cf-graphql#querying), too. It supports Contentful query parameters, id filtering, and even back references.

~~~
{
  authors {
    _backrefs {
      posts__via__author {
        title
      }
    }
  }

  post(id: "some-post-id") {
    title
    author
    comments
  }

  posts(q: "fields.rating[gt]=5") {
    title
    rating
  }
}
~~~

## Sum up

GraphQL is definitely an approach worth checking out. It gives developers the freedom and the flexibility they need to write applications faster and with less complexity and cognitive overhead.

We at Contentful are really excited about this new way of API interfaces and would love to hear your thoughts on it.

Check out the [demo](https://github.com/contentful-labs/cf-graphql/tree/master/demo) to see your own local version of it. ;)

## Further resources

- [cf-graphql demo](https://github.com/contentful-labs/cf-graphql/tree/master/demo)
- [GraphQL specifiction](http://graphql.org/)
- [GraphiQL](https://github.com/graphql/graphiql)
- [React Apollo](http://dev.apollodata.com/react/)

## Next steps

  - [Explore the JavaScript CDA SDK GitHub repository](https://github.com/contentful/contentful.js)
  - [Learn how to use the Sync API with JavaScript](/developers/docs/javascript/tutorials/using-the-sync-api-with-js/)
  - [Create an Express.js application with Contentful](/developers/docs/javascript/tutorials/create-expressjs-app-using-contentful/)  
