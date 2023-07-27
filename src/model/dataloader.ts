import Dataloader from 'dataloader';
import * as A from 'fp-ts/lib/Array';
import * as E from 'fp-ts/lib/Either';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import { ErrorWithCause } from 'pony-cause';
import { NotFoundError } from '../errors';
import { getUsers } from './service';
import { User, UserId } from './types';


// (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;
async function userBatchFn(keys: readonly UserId[]) {
  console.log(`calling userBatchFn with keys=${JSON.stringify(keys)}`);

  const prog = pipe(
    keys as UserId[],
    getUsers,
    A.map(TE.foldW(T.of, T.of)),
    T.sequenceArray,
  );

  return await prog();
}

export const userDataloader = new Dataloader<UserId, User | NotFoundError>(
  userBatchFn, {
    batch: true,
    cache: true,
  });

export const getUsersFromDataloader = (ids: UserId[]): T.Task<E.Either<NotFoundError, User>[]> => {
  return pipe(
    () => userDataloader.loadMany(ids),
    T.map(A.map(
      userOrError => userOrError instanceof ErrorWithCause || userOrError instanceof Error
        ? E.left(userOrError as ErrorWithCause) // Dataloader interface is too loose, we always get the error we return from the batch loading function
        : E.right(userOrError)
      )
    )
  );
}
