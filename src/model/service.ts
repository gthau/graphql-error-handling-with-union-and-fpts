import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/lib/TaskEither';
import { newErrorWithCause, NotAllowedError, NotFoundError, UnknownError } from '../errors/errors';
import { fetchEntity, fetchUser, isUserAllowedForEntity } from './throwing-api';
import { Entity, User, UserId } from './types';


export const getEntity = (id: number): TE.TaskEither<NotFoundError, Entity> =>
  TE.tryCatch(
    () => fetchEntity(id),
    newErrorWithCause(NotFoundError),
  );

export const getUser = (id: UserId): TE.TaskEither<NotFoundError, User> =>
  TE.tryCatch(
    () => fetchUser(id),
    newErrorWithCause(NotFoundError),
  );

export const getIsUserAllowedForEntity =
  (user: User, entity: Entity): TE.TaskEither<UnknownError, boolean> =>
    TE.tryCatch(
      () => isUserAllowedForEntity(user, entity),
      newErrorWithCause(UnknownError),
    );

const isNotAllowedAsError = (errorMsg: string) =>
  (isAllowed: boolean): TE.TaskEither<NotAllowedError, boolean> =>
    pipe(
      isAllowed,
      TE.fromPredicate(
        Boolean,
        (_) => new NotAllowedError(errorMsg),
      ),
    );

export const isUserAllowedForEntityAsError = (user: User) =>
  (entity: Entity): TE.TaskEither<NotAllowedError | UnknownError, boolean> =>
    pipe(
      getIsUserAllowedForEntity(user, entity),
      TE.chainW(isNotAllowedAsError(`User ${user.id} isn't allowed to access entity ${entity.id}`)),
    );

export const getEntityForUser = (id: number, userId: UserId): TE.TaskEither<NotFoundError | NotAllowedError, Entity> =>
  pipe(
    getUser(userId),
    TE.bindTo('user'),
    TE.bind('entity', (_) => getEntity(id)),
    TE.bind('isAllowed', ({ user, entity }) => isUserAllowedForEntityAsError(user)(entity)),
    TE.map(({ entity }) => entity),
  );

/**
 * Same as getEntityForUser but without using the Do notation. for illustrative purpose
 */
export const getEntityForUser_noDoNotation = (
  id: number,
  userId: UserId
): TE.TaskEither<NotFoundError | NotAllowedError, Entity> =>
  pipe(
    getUser(userId),
    TE.chainW((user) =>
      pipe(
        getEntity(id),
        TE.chainFirstW(isUserAllowedForEntityAsError(user)),
      )
    )
  );
