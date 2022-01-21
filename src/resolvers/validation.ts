import { sequenceS } from 'fp-ts/lib/Apply';
import { getSemigroup } from 'fp-ts/lib/Array';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import { InputFieldError, InvalidInputError } from '../errors/errors';
import { UserId } from '../model/types';

export const validateInput = <T>(
  predFn: (v: unknown) => v is T,
  errorMsg: string,
) =>
 (v: unknown, inputName: string) =>
    pipe(
      O.fromNullable(v),
      O.chain(O.fromPredicate(predFn)),
      E.fromOption(() => [
        {
          field: inputName,
          message: `${inputName} input ${errorMsg}`,
        },
      ])
    );

export const isNumberId = (v: unknown): v is number => Number.isInteger(Number(v));
export const validateIsNumber = validateInput(isNumberId, 'is not a Number');

export const isUserId = (v: unknown): v is UserId => /u-\d+/.test(String(v));
export const validateIsUserId = validateInput(isUserId, 'is not in the form u-<number>');

export const validate = (inputs: Record<string, E.Either<InputFieldError[], any>>) => {
  const validation = E.getApplicativeValidation(getSemigroup<InputFieldError>());
  return pipe(
    sequenceS(validation)(inputs),
    E.mapLeft((errors) => new InvalidInputError(
      `Input validation failed for fields: [${errors.map(err => err.field).join(', ')}]`,
      errors
    )),
  );
};
