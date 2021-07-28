import gql from 'graphql-tag'

export const ENTITY_DIRECTIVE = 'entity'
export const UNIQUE_DIRECTIVE = 'unique'
export const VARIANT_DIRECTIVE = 'variant'
export const DERIVED_FROM_DIRECTIVE = 'derivedFrom'
export const JSON_FIELD_DIRECTIVE = 'jsonField'
export const FULL_TEXT_SEARCHABLE_DIRECTIVE = 'fulltext'

export const directives = gql`
  directive @entity on OBJECT | INTERFACE
  directive @variant on OBJECT
  directive @jsonField on OBJECT
  directive @unique on FIELD_DEFINITION
  directive @derivedFrom(field: String!) on FIELD_DEFINITION
  directive @fulltext(query: String!) on FIELD_DEFINITION
`
