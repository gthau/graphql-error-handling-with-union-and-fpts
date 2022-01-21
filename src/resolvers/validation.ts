import { sequenceS } from 'fp-ts/lib/Apply';
import { getSemigroup } from 'fp-ts/lib/Array';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import { InputFieldError, InvalidInputError } from '../errors/errors';

export const validateIsNumber = (v: string | null | undefined, inputName: string) =>
  pipe(
    O.fromNullable(v),
    O.map(Number),
    O.chain(O.fromPredicate(Number.isInteger)),
    E.fromOption(() => [
      {
        field: inputName,
        message: `${inputName} input is not a number`,
      },
    ])
  );

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
