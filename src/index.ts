import { envelop, useLogger, useSchema, useTiming } from '@envelop/core';
import { useParserCache } from '@envelop/parser-cache';
import { useValidationCache } from '@envelop/validation-cache';
import { loadFilesSync } from "@graphql-tools/load-files";
import { makeExecutableSchema } from '@graphql-tools/schema';
import { fastify } from 'fastify';
import cors from 'fastify-cors';
import { GraphQLError } from 'graphql';
import { join } from 'path';
import { graphqlHandler } from './graphql-http-handler';
import { queryResolvers } from './resolvers';


export async function main() {
  const server = fastify({
    disableRequestLogging: true,
    logger: {
      level: 'debug',
    },
  });

  process
    .on('unhandledRejection', (reason, p) => {
      server.log.error(reason as any, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', (err: GraphQLError) => {
      server.log.error(err as any, 'Uncaught Exception thrown');
    });

  server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['x-requested-with', 'Content-type'],
    credentials: true,
  });

  try {
    const graphqlPath = '/graphql';
    const subscriptionsPath = '/subscriptions';
    let playgroundGraphqlEndpoint = graphqlPath;
    let playgroundSubscriptionEndpoint = subscriptionsPath;

    const port = process.env.PORT || 4000;

    const schema = makeExecutableSchema({
      typeDefs: loadFilesSync(join(__dirname, './typedefs.graphql')),
      resolvers: {
        ...queryResolvers,
      },
    });

    const getEnveloped = envelop({
      plugins: [
        useSchema(schema),
        useLogger(),
        useTiming(),
        useParserCache(),
        useValidationCache(),
      ],
    });

    server.route({
      method: ['GET', 'POST'],
      url: graphqlPath,
      handler: await graphqlHandler({
        getEnveloped,
        graphiqlEndpoint: playgroundGraphqlEndpoint,
        subscriptionsEndpoint: playgroundSubscriptionEndpoint,
      }),
    });

    await server.listen(port, '0.0.0.0');
  } catch (error) {
    server.log.fatal(error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
