import { pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { ErrorWithCause } from 'pony-cause';
import { InvalidInputError, NotAllowedError, NotFoundError, UnknownError } from '../errors/errors';
import { isWrappedError, taskWrappedError, Type, wrappedErrorField } from '../errors/wrapped-error';
import { Resolvers } from '../generated/graphql';
import { getEntityForUser } from '../model/service';
import { Entity } from '../model/types';
import { validate, validateIsNumber, validateIsUserId } from './validation';

const errorTypesCommonResolvers = <E extends ErrorWithCause<Error>>(errorClass: Type<E>) => ({
  __isTypeOf: isWrappedError(errorClass),
  message: wrappedErrorField(errorClass)('message'),
});

export const queryResolvers: Resolvers = {
  Query: {
    hello: () => 'World',

    entity: (_, args, __) => {
      const { id: entityId, userId } = args;

      const validatedInputs = validate({
        entityId: validateIsNumber(entityId, 'entityId'),
        userId: validateIsUserId(userId, 'userId'),
      });

      return pipe(
        validatedInputs,
        TE.fromEither,
        TE.chain(({ entityId, userId }) => getEntityForUser(Number(entityId), userId)),
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

  NotFoundError: errorTypesCommonResolvers(NotFoundError),
  NotAllowedError: errorTypesCommonResolvers(NotAllowedError),
  UnknownError: errorTypesCommonResolvers(UnknownError),
  InvalidInputError: {
    ...errorTypesCommonResolvers(InvalidInputError),
    inputs: wrappedErrorField(InvalidInputError)('validations'),
  },
};
