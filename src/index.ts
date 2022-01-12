import { envelop, useLogger, useSchema, useTiming } from '@envelop/core';
import { loadFilesSync } from "@graphql-tools/load-files";
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createServer } from 'http';
import { join } from 'path';
import { queryResolvers } from './resolvers';

const schema = makeExecutableSchema({
  typeDefs: loadFilesSync(join(__dirname, './typedefs.graphql')),
  resolvers: {
    ...queryResolvers,
  },
});

const getEnveloped = envelop({
  plugins: [useSchema(schema), useLogger(), useTiming()],
});

const server = createServer((req, res) => {
  const { parse, validate, contextFactory, execute, schema } = getEnveloped({ req });
  let payload = '';

  req.on('data', chunk => {
    payload += chunk.toString();
  });

  req.on('end', async () => {
    const { query, variables } = JSON.parse(payload);
    const document = parse(query);
    const validationErrors = validate(schema, document);

    if (validationErrors.length > 0) {
      res.end(
        JSON.stringify({
          errors: validationErrors,
        })
      );

      return;
    }

    const context = await contextFactory();
    const result = await execute({
      document,
      schema,
      variableValues: variables,
      contextValue: context,
    });

    res.end(JSON.stringify(result));
  });
});

server.listen(3000);
