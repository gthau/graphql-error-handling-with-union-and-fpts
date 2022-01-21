import { pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { getEntityForUser } from '../model/service';
import { Entity } from '../model/types';
import { InvalidInputError, NotAllowedError, NotFoundError, UnknownError } from '../errors/errors';
import { isWrappedError, taskWrappedError, wrappedErrorMsg } from '../errors/wrapped-error';
import { Resolvers } from '../generated/graphql';

export const queryResolvers: Resolvers = {
  Query: {
    hello: () => 'World',

    entity: (_, args, __) => {
      const { id: entityId, userId } = args;

      return pipe(
        getEntityForUser(Number(entityId), Number(userId)),
        TE.foldW(
          taskWrappedError,
          T.of,
        )
      )();
    }
  },

  Entity: {
    __isTypeOf: (parent) => parent instanceof Entity,
    id: (parent) => String(parent.id),
    name: (parent) => parent.name,
  },

  NotFoundError: {
    __isTypeOf: isWrappedError(NotFoundError),
    message: wrappedErrorMsg,
  },
  NotAllowedError: {
    __isTypeOf: isWrappedError(NotAllowedError),
    message: wrappedErrorMsg,
  },
  InvalidInputError: {
    __isTypeOf: isWrappedError(InvalidInputError),
    message: wrappedErrorMsg,
  },
  UnknownError: {
    __isTypeOf: isWrappedError(UnknownError),
    message: wrappedErrorMsg,
  },
};
