- [GraphQL default error handling](#graphql-default-error-handling)
- [Better modelisation of errors using Union and Interfaces](#better-modelisation-of-errors-using-union-and-interfaces)
  - [Schema modification](#schema-modification)
  - [Handle those Schema changes into the GraphQL server](#handle-those-schema-changes-into-the-graphql-server)
- [Error handling in a type-safe way](#error-handling-in-a-type-safe-way)
  - [Well-defined Error classes for all GraphQL schema Error types](#well-defined-error-classes-for-all-graphql-schema-error-types)
  - [`codegen` mapping](#codegen-mapping)
  - [Help the GraphQL engine decide which type to return](#help-the-graphql-engine-decide-which-type-to-return)
  - [Rewrite the resolvers to use the Errors types and `__isTypeOf`](#rewrite-the-resolvers-to-use-the-errors-types-and-__istypeof)
  - [Query fields selection](#query-fields-selection)
- [Even safer error handling using Functional Programming paradigm](#even-safer-error-handling-using-functional-programming-paradigm)
  - [Algebraic data types to the rescue](#algebraic-data-types-to-the-rescue)
  - [Make the APIs safer](#make-the-apis-safer)
  - [Avoid nested `pipe` with the `Do` notation](#avoid-nested-pipe-with-the-do-notation)
  - [Query resolver](#query-resolver)
    - [Inputs validation](#inputs-validation)
    - [Fetching the data and returning](#fetching-the-data-and-returning)
  - [Bonus: make the Errors type resolvers better using `currying`](#bonus-make-the-errors-type-resolvers-better-using-currying)
- [Wrapping up](#wrapping-up)

GraphQL error handling to the max with Typescript, codegen and functional programming

Contrary to REST, GraphQL does not use Status Code to differentiate a successful result from an exception. In REST, one can send a response with a appropriate status code to inform the caller about the kind of exception encountered, e.g.:
- 400: bad request (e.g. invalid inputs)
- 401 or 403: unauthorized (need authentication) or forbidden (insufficient permission)
- 404: resource not found
- 500: internal server error
- and more.


# GraphQL default error handling


In GraphQL, you'll get a 5xx error in case the server is not available at all, but for other exceptions you'll get the standard error handling mechanism from GraphQL: in the JSON you receive there is:
- a `data` key which contains the data corresponding to the GraphQL operation (query, mutation, subscription) invoked and
- an `errors` key which contains an array of errors returned by the server, with a message and location.

This solution is however not satisfactory for the following reasons:

1. it is not easily parseable, it is more meant for a human user to read
2. it is not typed: you can add more information, e.g. an error code and other fields, but those are not part of the schema
3. it is not self-documented: by looking at the operation signature, you don't know what might fail
4. it treats some domain results as errors / exceptions whereas they are just alternate results of the operation. E.g. an entity not found for a given id and a user not having permission to access an entity belong to the domain model, whereas runtime exceptions such as the GraphQL server failing to communicate with the database / external microservice, or an operation timing out because of slowness are real exceptions: we don't get any result that relates to domain model, just an unexpected runtime error.


# Better modelisation of errors using Union and Interfaces


GraphQL has support for Union types (only for types, not yet for Input). Therefore we can design our schema to specify the happy and unhappy paths.

Benefits:

1. Type-safety: the errors are also typed
2. The consumer cannot ignore the errors
3. Self-documented: the operation signature includes all possible cases (result and errors) therefore less documentation is required to explain the possible error cases
4. The _unhappy_ paths are not unexpected anymore, there are just other possible results

## Schema modification

Given a schema like the following:

```gql
type Entity {
  id: ID!
  name: String!
}

type Query {
  entity(id: ID!, userId: ID!): Entity
}
```

If something fails during the execution, we can:
- throw an Error and use the default GraphQL error mechanism explained above
- return `null`: this is not satisfactory because we can't know the reason the operation returned `null`

Let's make the following modification to handle all possible paths:

```gql
interface BaseError {
  message: String!
}

type InvalidInputError implements BaseError {
  message: String!
}

type NotFoundError implements BaseError {
  message: String!
}

type UnknownError implements BaseError {
  message: String!
}

type NotAllowedError implements BaseError {
  message: String!
}

type Entity {
  id: ID!
  name: String!
}

union EntityResult =
  | Entity
  | NotFoundError
  | NotAllowedError
  | InvalidInputError
  | UnknownError

type Query {
  entity(id: ID!, userId: ID!): EntityResult!
}
```

We define a `BaseError` interface that all concrete Errors implement. And we define the query result as a Union type of the happy path (an `Entity`) and the other possible results (`NotFoundError`, `NotAllowedError`, etc.). In this manner we extensively describe all possible results, with the added benefit that we can make our result type non-nullable (with the `!` character).

For a more detailed explanation, you can read this article from Sasha Solomon: [200 OK! Error Handling in GraphQL](https://sachee.medium.com/200-ok-error-handling-in-graphql-7ec869aec9bc).

## Handle those Schema changes into the GraphQL server

Since we changed the Schema, we also need to change the query, mutation and types resolvers.

For simple cases, we can just return the correct object from the query resolver:

```ts
const resolvers = {
  Query: {
    entity: async (parent, { id, userId }, context) => {
      const entity = await context.api.getEntityById(id);
      const isAllowed = await context.api.isUserAllowedForEntity(id, userId);

      if (!isAllowed) {
        return {
          __typename: 'NotAllowedError',
          message: `User ${userId} not allowed for entity ${id}`,
        };
      }
      if (!entity) {
        return {
          __typename: 'NotFoundError',
          message: `Entity ${id} not found`,
        };
      }
      return {
        __typename: 'Entity',
        ...entity,
      };
    },
  },
};
```

Since we include the `__typename` and the fields match the Schema type definitions, there is no need to define type resolvers.

For more details on this solution, you can read this article from [Laurin Quast](https://github.com/n1ru4l): [Handling GraphQL errors like a champ with unions and interfaces](https://blog.logrocket.com/handling-graphql-errors-like-a-champ-with-unions-and-interfaces/).


# Error handling in a type-safe way


Let's now take it to the next level using Typescript and GraphQL Code Generator.

[Typescript](https://www.typescriptlang.org/) is a superset of Javascript which adds type annotations to Javascript code and therefore type safety (with caveats) at compile-time.

[GraphQL Code Generator](https://www.graphql-code-generator.com/) is a tool which generates type definitions which corresponds to the GraphQL schema. It has several plugins and we'll use 3 of those:

- [typescript](https://www.graphql-code-generator.com/plugins/typescript): generates the type definitions for Typescript
- [typescript-resolvers](https://www.graphql-code-generator.com/plugins/typescript-resolvers): generates type definitions for all operations resolvers
- [add](https://www.graphql-code-generator.com/plugins/add): append/prepend text to the generated type definitions file, it allows us to `import` some of our types into the generated file

## Well-defined Error classes for all GraphQL schema Error types

First we defined corresponding Error classes for the different error cases:
```ts
export class InvalidInputError extends Error {}
export class NotFoundError extends Error {}
export class NoUserRightsError extends Error {}
export class UnknownError extends Error {}
```

A small workaround is needed because `graphql-js` treats error-returning and error-throwing the same in resolvers, therefore we need to wrap our Errors before we can safely return them from the resolvers. Let's use a simple custom wrapper type and constructor function:

```ts
export type WrappedError<E extends Error> = {
  _tag: 'WrappedError';
  err: NonNullable<E>;
};

export const wrappedError = <E extends Error>(err: E) => ({
  _tag: 'WrappedError',
  err,
});
```

## `codegen` mapping

GraphQL Code Generator is configured with a `codegen.yml` YAML file. In the `mappers` section, we map every type of our GraphQL Union type to its corresponding Typescript type.

```yml
overwrite: true
schema: "**/*/typedefs.graphql"
documents: null
generates:
  src/generated/graphql.ts:
    plugins:
      - add:
          content: '/* eslint-disable */'
      - add:
          content: "import * as E from './src/errors';"
      - "typescript"
      - "typescript-resolvers"
    config:
      mappers:
        InputFieldValidation: 'E.InputFieldError'
        InvalidInputError: 'E.WrappedError<E.InvalidInputError>'
        NotFoundError: 'E.WrappedError<E.NotFoundError>'
        NotAllowedError: 'E.WrappedError<E.NotAllowedError>'
        UnknownError: 'E.WrappedError<E.UnknownError>'
        Entity: './src/model/data/entity.data#Entity'
```

__*Note*__: we use the `add` plugin to import the `WrappedError` generic wrapper type and the Errors types. If we don't do that, we would have to define the full path for each mapper, e.g.:

```yml
NotFoundError: 'import("./src/errors").WrappedError<import("./src/errors").NotFoundError>'
```

This `codegen` configuration generates the Typescript types from the Schema and the proper signatures for the operations (query/mutation/subscription) and types resolvers. Now we have type safety at compile-time and type inference and hints in the code editor.

## Help the GraphQL engine decide which type to return

In the first version of the query resolver, we were returning objects that matched the GraphQL types and were tagged with the `__typename` so the GraphQL engine could just return those without the need to have type resolvers.
But now, we are returning different objects that will be mapped to the proper GraphQL type. And those objects are not tagged with `__typename`. So how does the GraphQL engine know to map the value returned by the query resolver?

In the `codegen` configuration, we have defined mappers between the GraphQL schema types and the Typescript types. But this is not used at runtime. This configuration is only used by GraphQL Code Generator to generate the proper types and resolvers signatures so that you get compile-time type safety and code editor hints.

The type resolvers have a special field resolver for this purpose: `__isTypeOf` is a field resolver function on each of the GraphQL type resolver of the query union type result. This field resolver is executed on all types that form the query resolver's result Union type: when one returns `true`, the GraphQL engine will use this type resolver to generate the proper result object.

## Rewrite the resolvers to use the Errors types and `__isTypeOf`

Now that we have defined the proper mapping between the GraphQL schema types and the Typescript types, let's rewrite the resolvers:

```ts
const resolvers = {
  Query: {
    entity: async (parent, { id, userId }, context) => {
      const entity = await context.api.getEntityById(id);
      const isAllowed = await context.api.isUserAllowedForEntity(id, userId);

      const error = (
        !isAllowed ? new NotAllowedError(`User ${userId} not allowed for entity ${id}`) :
        !entity ? new NotFoundError(`Entity ${id} not found`) :
        null
      );

      if (error) {
        return wrappedError(error);
      }

      return entity;
    },
  },

  Entity: {
    __isTypeOf: (parent): parent instanceof Entity,
    id: (parent) => parent.id,
    name: (parent) => parent.name,
  },

  NotFoundError: {
    __isTypeOf: (parent) => parent.err instanceof NotFoundError,
    message: (parent) => parent.err.message,
  },

  // same for all other error types: NotAllowedError, InvalidInputsError, UnknownError
};
```

## Query fields selection

Our query can now return several types, therefore we need to adapt the query fields selection and use fragments:

```gql
query entity($id: ID!, $userId: ID!) {
  entity(id: $id, userId: $userId) {
    __typename
    ...on Entity {
      id
      name
    }
    ...on BaseError {
      message
    }
  }
}
```

A good practice is to always have a fragment that matches the `BaseError` interface: it makes the client code future-proof in case one more error is added to the Union result type.


# Even safer error handling using Functional Programming paradigm


The previous section was dedicated to showing how to get type safety and inference in resolvers and how to generate the proper GraphQL type from a query resolver Union type value.

The query resolver code above to get an Entity and check if User is allowed is oversimplified. In real-life, we would probably get this data from one or two data sources (database, distributed cache) or even another external microservice with a REST or gRPC interface. Those data fetching calls might throw errors, or return `null`.

We want to handle those errors, transform meaningless and unsafe `null` values into meaningful errors, while also being able to bubble up those errors to the query resolvers in a safe manner.

## Algebraic data types to the rescue

In order to make our throwing and unsafe APIs into safe data fetching functions, we'll use data types and techniques from the Functional Programming paradigm. In particular, we'll use the [fp-ts](https://gcanti.github.io/fp-ts/) library (but you can choose the FP library of your choice, e.g. [purify](https://gigobyte.github.io/purify/getting-started), [effect](https://github.com/Effect-TS/core), [monio](https://github.com/getify/monio), and [others](https://github.com/stoeffel/awesome-fp-js#libraries)).

`fp-ts` exposes several useful data types and functions which allows to work on safe abstractions using composable functions. In particular, we'll use:
- `Either`: represents the result of a computation that might fail
- `Option`: represents possible null/undefined values in a safe way
- `Task`: lazy Promise, represents the result of an async operation
- `TaskEither`: represents the result of an async operation that might fail (combination of `Task` and `Either` as its name implies)

## Make the APIs safer

Let's consider a simple mock API for the purpose of this article. It represents a throwing API, such as a gRPC API.

```ts
// returns an Entity or throws
export async function fetchEntity(id: number): Promise<Entity> {
  const entity = entities.find(e => e.id === id);
  if (!entity) {
    throw new Error(`Entity ${id} not found`));
  }
  return new Entity(entity);
}

// returns a User or throws
export async function fetchUser(id: UserId): Promise<User> {
  const user = users.find(u => u.id === id);
  if (!user) {
    throw new Error(`User ${id} not found`);
  }
  return new User(user);
}
```

Since we have an async API that can throw, we'll use `TaskEither` to wrap those calls. `Either<E, A>` (and so `TaskEither<E, A>`) is parametrized by two types: `E` which represents the Error and `A` which represents the type of the data if the call was successful. By convention, the left side represents the Error, the right side the data type of the successful result.

We can create an instance of it by using one of its basic constructors: `of`, `left` (to directly create an Error), `right` (to create a success) or one of its *convenience* constructors:
- `tryCatch`: if the function supplied throws, store a customized Error in the left side, else store the successful result in the right side
- `fromPredicate`: if the predicate applied to the value is falsy, store a customized Error in the left side, else store the value in the right side
- `fromNullable`: if the value is `null` or `undefined`, store a customized Error in the left side, else store the value in the right side

This is now our safe APIs:

```ts
export const getEntity = (id: number): TE.TaskEither<NotFoundError, Entity> =>
  TE.tryCatch(
    () => fetchEntity(id),
    (e) => new NotFoundError(e.message),
  );

export const getUser = (id: UserId): TE.TaskEither<Error, User> =>
  TE.tryCatch(
    () => fetchUser(id),
    (e) => new NotFoundError(e.message),
  );
```

Not only have we made our API safer code-wise, but also better from a documentation standpoint: now we can also see what Errors the API returns, which was not the case when we were using Promise and `reject` (or `try/catch`).

Now that we have dealt with the data fetching, let's consume this data. The first functionality we add is checking the user permissions. In this simple example, we don't query an external service, we got the data in the Entity and User types. We can create the checking function without worrying about whether the user or entity is present since this will be handled by the algebraic data types (Either, TaskEither, Option). We can also decide to represent the absence of permission as an Error: in the second function, we use the `Either.fromPredicate` to transform the `false` value into a custom `NotAllowedError`:

```ts
// unsafe API
const isUserAllowedForEntity = async (user: User, entity: Entity): Promise<boolean> => {
  try {
    return !entity.restrictions.includes(user.country);
  } catch (e) {
    throw e;
  }
}

// safe API
export const getIsUserAllowedForEntity =
  (user: User, entity: Entity): TE.TaskEither<UnknownError, boolean> =>
    TE.tryCatch(
      () => isUserAllowedForEntity(user, entity),
      (e) => new UnknownError(e.message),
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
```

Now that both the Entity and User permission fetching calls are safer, we can combine them to create the Entity fetching function with User permission check incorporated:

```ts
export const getEntityForUser = (
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
    ),
  );
```

We fetch the User, then the Entity and when we have both, we check the User permission for this entity. Two things to note here:

1. because the `isUserAllowedForEntityAsError` depends on both the User and the Entity and we fetched those separately, we have a nested pipeline (the nested pipe needs to close over the `user`). We'll see next an alternate syntax to get rid of this nesting.
2. the `chainFirst` function allows us to execute computations in sequence but keep only the result of the first computation. Here what it does is:
   1. get the Entity (as a `TaskEither`)
      1. if it's a left (some `Error`), it won't execute the `isUserAllowedForEntityAsError`
      2. if it's a right (`Entity`), it executes the `isUserAllowedForEntityAsError`
         1. if it is a left (`NotAllowedError`), it returns the `TaskEither` holding this Error
         2. if it is a right (`true`), it ignores it and returns the result of the previous computation (the `TaskEither` holding the `Entity`)

## Avoid nested `pipe` with the `Do` notation

The `Do` notation is an adaptation of its native Haskell counterpart. It allows to build a context object that keeps track of the unwrapped values produced by the different operations in the pipeline. After its creation using the ADT `Do` or `bind`/`bindTo` functions, every subsequent operation in the pipeline has access to this context object, therefore eliminating the need for nesting.

Let's rewrite our function using the `Do` notation:

```ts
export const getEntityForUser = (
  id: number,
  userId: UserId
): TE.TaskEither<NotFoundError | NotAllowedError, Entity> =>
  pipe(
    getUser(userId),
    TE.bindTo('user'),
    TE.bind('entity', (_) => getEntity(id)),
    TE.bind('isAllowed', ({ user, entity }) => isUserAllowedForEntityAsError(user)(entity)),
    TE.map(({ entity }) => entity),
  );
```

Because the `bind`/`bindTo` functions return instances of ADTs (`TaskEither` here), we keep the fail-fast behaviour. In this example, if the `getUser` call returns a `Left<NotFoundError>`, we won't call `getEntity` nor `isUserAllowedForEntityAsError`, it will return the `TaskEither` holding the `NotFoundError`.

*Note*: with the `Do` notation, we gain nest-free pipeline, but we lose point-free programming.

## Query resolver

Now that we have a safe API, we can move on to the query resolver. We'll first validate the inputs and then query the data.

### Inputs validation

To validate the inputs, we'll also create a function that runs a validator on each input and returns an `Either`. By doing this we can integrate the result of the validation into the pipeline.

```ts
Query: {
  entity: (_, args, __) => {
    const { id: entityId, userId } = args;

    const validatedInputs = validate({
      entityId: validateIsNumber(entityId, 'entityId'),
      userId: validateIsUserId(userId, 'userId'),
    });

    return pipe(
      validatedInputs,
      // more code here
    )();
  }
},
```

The `validateIsNumber` and `validateIsUserId` are functions that return `Either<{ field: string; message: string }, TypeOfTheInput>`. If the input fails the validation, we get an object of field name and validation message in the `Left` side, otherwise we get the input value in the `Right` side.

The `validate` function takes a record of field to validator function and returns either an `InvalidInputError` or an object of input name to input value.

### Fetching the data and returning
```ts
Query: {
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
      ),
    )();
  }
},
```

Once the inputs are validated, the next step in the pipeline is to fetch the data using `getEntityForUser`. Because this call returns a `TaskEither`, we need to transform the previous `Either` into a `TaskEither` using `TaskEither.fromEither`. Of course, because of the fail-fast nature of the ADT, this won't be called if the inputs failed the validation.

Finally we *exit the abstraction* by using the `TaskEither.fold` (also called `match`) destructor: this function does pattern matching on the `TaskEither` and executes the first callback if it's a `Left`, or the second callback if it's a `Right`. At this point we want to return a `WrappedError` or an `Entity` from our query resolver, we do not want to return a `TaskEither` because we want simple type resolvers that acts on the correct type. The ADT abstraction stays within the boundaries of our program and we consider the query (or mutation or subscription) resolver to be this boundary.


## Bonus: make the Errors type resolvers better using `currying`

`Currying` is the technique of converting a function that takes multiple arguments into a sequence of functions that each takes a single argument. It enables [point-free programming](https://en.wikipedia.org/wiki/Tacit_programming) which allows for cleaner callback or function composition in pipeline.

We used above on several occasions:

```ts
pipe(
  // ...
  getEntity(id),
  TE.chainFirstW(isUserAllowedForEntityAsError(user)),
  // ...
)
```

The `isUserAllowedForEntityAsError` is a curried function: when called with the `user` input, it returns a function that takes an `entity` input. If the function was not curried, we would have written:

```ts
pipe(
  // ...
  getEntity(id),
  TE.chainFirstW((entity) => isUserAllowedForEntityAsError(user, entity)),
  // ...
)
```

With this knowledge, we can improve the repetitive type resolver code:

```ts
NotFoundError: {
  __isTypeOf: (parent) => parent.err instanceof NotFoundError,
  message: (parent) => parent.err.message,
},
NotAllowedError: {
  __isTypeOf: (parent) => parent.err instanceof NotAllowedError,
  message: (parent) => parent.err.message,
},

// same for all other error types: InvalidInputsError, UnknownError
```

This code will be the same for all errors (with maybe a few additional field resolvers for some errors). To make it better, we'll create a curried typeguard function and a curried field extraction for the error:

```ts
// curried typeguard
const isWrappedError =
  <E extends Error>(errorClass: Type<E>) =>
    (v: any): v is WrappedError<E> =>
      v?._tag === 'WrappedError' && v.err instanceof errorClass;

// curried field extractor
const wrappedErrorField =
  <E extends Error>(errorClass: Type<E>) =>
    <TKey extends keyof E>(prop: TKey) =>
      (wrappedErr: WrappedError<E>): E[TKey] => wrappedErr.err[prop];
```

Now we can rewrite our error type resolvers like so:

```ts
NotFoundError: {
  __isTypeOf: isWrappedError(NotFoundError),
  message: wrappedErrorField(NotFoundError)('message'),
},
NotAllowedError: {
  __isTypeOf: isWrappedError(NotAllowedError),
  message: wrappedErrorField(NotAllowedError)('message'),
},

// same for all other error types: InvalidInputsError, UnknownError
```

And since this code is common, we can extract it into a type resolver factory function:

```ts
const errorTypesCommonResolvers = <E extends Error>(errorClass: Type<E>) => ({
  __isTypeOf: isWrappedError(errorClass),
  message: wrappedErrorField(errorClass)('message'),
});
```

And rewrite our errors type resolvers like so:

```ts
export const queryResolvers: Resolvers = {

  NotFoundError: errorTypesCommonResolvers(NotFoundError),
  NotAllowedError: errorTypesCommonResolvers(NotAllowedError),

  // same for all other error types: InvalidInputsError, UnknownError
}
```

And if we have an error with more fields (e.g. we add a `validations` field to `InvalidInputError`), we can still customize it by using the spread operator on the type resolver object:

```ts
export const queryResolvers: Resolvers = {

  NotFoundError: errorTypesCommonResolvers(NotFoundError),
  NotAllowedError: errorTypesCommonResolvers(NotAllowedError),
  // same for UnknownError type

  // customized error type resolver
  InvalidInputError: {
    ...errorTypesCommonResolvers(InvalidInputError),
    validations: wrappedErrorField(InvalidInputError)('validations'),
  },
}
```


# Wrapping up

GraphQL gives you the power to model your domain errors and deliver them to the caller in a documented and type-safe way. Using Typescript you get type safety for most of your code. Combined with GraphQL Code Generator, you even get your resolvers functions fully typed. And finally with powerful functional programming concepts applied to your GraphQL resolvers, you can get the ultimate safe handling of your unsafe APIs.
