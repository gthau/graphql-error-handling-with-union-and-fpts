import { pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { getEntityForUser } from '../data/service';
import { Resolvers } from '../generated/graphql';

export const queryResolvers: Resolvers = {
  Query: {
    hello: () => 'World',

    entity: (_, args, __) => {
      const { id: entityId, userId } = args;

      return pipe(
        getEntityForUser(Number(entityId), Number(userId)),
        TE.fold(
          (_) => T.of(null),
          T.of,
        )
      )();
    }
  },

  Entity: {
    id: (parent) => String(parent.id),
    name: (parent) => parent.name,
  }
};
