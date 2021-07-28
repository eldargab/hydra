---
description: Extract interfaces and query multiple types in a single query
---

# Interfaces

Interfaces are useful when several entity types share some set of properties and one would like to have an aggregated result when such a common property is queried.

This is achieved through the natively supported GraphQL [interface](https://graphql.org/learn/schema/#interfaces) type and [inline fragments](https://graphql.org/learn/queries/#inline-fragments) in the output schema. For example, let us define the following input schema:

```graphql
interface Profile @entity {
    about: String!
}

type Member implements Profile @entity {
    about: String!
    handle: String!
}

type Account implements Profile @entity {
    about: String!
    accountId: Bytes   
}
```

Note that interfaces should be decorated with `@entity` and all the subclasses must explicitly define the inherited fields \(otherwise an error will be thrown during the codegen\).

The output schema will support a query by `about` which puts together `Member` and `Account` types. Note that `orderBy` is also supported for the inherited properties as well as OpenCRUD.

```graphql
query {
  profiles(limit: 5, offset: 5, orderBy: about_ASC, where: { about_eq: "joystreamer" }) {
    about
    __typename 
    ... on Member {
      handle
    }
    ... on Account {
      accountId
    }
  }
}
```

