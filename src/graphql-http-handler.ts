import { RouteHandlerMethod } from 'fastify';
import {
  shouldRenderGraphiQL,
  getGraphQLParameters,
  processRequest,
} from 'graphql-helix';
import { GetEnvelopedFn } from '@envelop/core';
import { renderPlaygroundPage } from 'graphql-playground-html';

export interface GraphQLHandlerOptions {
  graphiqlEndpoint: string;
  subscriptionsEndpoint: string;
  getEnveloped: GetEnvelopedFn<any>;
}

export const graphqlHandler = async (
  options: GraphQLHandlerOptions
): Promise<RouteHandlerMethod> => {
  return async (fastifyRequest, reply) => {
    const { contextFactory, schema, parse, validate, execute, subscribe } =
      options.getEnveloped({
        req: fastifyRequest,
        headers: fastifyRequest.headers,
      });

    // Create a generic Request object that can be consumed by Graphql Helix's API
    const request = {
      body: fastifyRequest.body,
      headers: fastifyRequest.headers,
      method: fastifyRequest.method,
      query: fastifyRequest.query,
    };

    // Determine whether we should render GraphiQL instead of returning an API response
    if (shouldRenderGraphiQL(request)) {
      reply.type('text/html');
      reply.send(
        renderPlaygroundPage({
          endpoint: options.graphiqlEndpoint,
          subscriptionEndpoint: options.subscriptionsEndpoint,
          settings: {
            'general.betaUpdates': false,
            'editor.cursorShape': 'line',
            'editor.theme':'dark',
            'editor.reuseHeaders': true,
            'tracing.hideTracingResponse': true,
            'tracing.tracingSupported': true,
            'editor.fontSize': 14,
            'editor.fontFamily': "'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace",
            'request.credentials': 'same-origin',
            'request.globalHeaders': {},
            'schema.polling.enable': true,
            'schema.polling.endpointFilter': '*localhost*',
            'schema.polling.interval': 2000,
          }
        })
      );
    } else {
      // Extract the GraphQL parameters from the request
      const { operationName, query, variables } = getGraphQLParameters(request);

      // Validate and execute the query
      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
        schema,
        parse,
        validate,
        execute,
        subscribe,
        contextFactory,
      });

      if (result.type === 'RESPONSE') {
        result.headers.forEach(({ name, value }) => reply.header(name, value));
        reply.status(result.status);
        reply.send(result.payload);
      } else {
        throw new Error('Not implemented yet!');
      }
    }
  };
};
