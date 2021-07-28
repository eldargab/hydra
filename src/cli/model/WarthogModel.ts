import { GraphQLEnumType } from 'graphql'
import Debug from 'debug'

import { ObjectType } from './ObjectType'
import { Field } from './Field'
import { FTSQuery } from './FTSQuery'
import { availableTypes } from '../schema/scalars'
import * as validate from '../validation'

const debug = Debug('qnode-cli:model')

export enum ModelType {
  ENUM,
  VARIANT,
  ENTITY,
  UNION,
  INTERFACE,
  SCALAR,
  JSON,
}

export class WarthogModel {
  private _entities: ObjectType[]
  private _ftsQueries: FTSQuery[]
  private _enums: GraphQLEnumType[] = []
  private _interfaces: ObjectType[] = []
  private _variants: ObjectType[] = []
  private _unions: UnionType[] = []
  private _jsonFields: ObjectType[] = []

  private _name2query: { [key: string]: FTSQuery } = {}
  private _name2type: { [key: string]: ObjectType } = {}

  constructor() {
    this._entities = []
    this._ftsQueries = []
  }

  addUnion(name: string, typeNames: string[]): void {
    const types: ObjectType[] = []
    typeNames.map((t) => types.push(this.lookupVariant(t)))
    this._unions.push({
      name,
      types,
    })
  }

  addVariant(type: ObjectType): void {
    if (!type.isVariant) {
      debug(`${type.name} is not an Entity`)
      return
    }

    if (type.isEntity) {
      throw new Error('An entity cannot be a variant')
    }

    validate.variantType(type)
    this._variants.push(type)
  }

  addEntity(type: ObjectType): void {
    if (!type.isEntity) {
      debug(`${type.name} is not an Entity`)
      return
    }

    this._entities.push(type)
    this._name2type[type.name] = type
  }

  addFTSQuery(query: FTSQuery): void {
    if (!this._name2query[query.name]) {
      this._name2query[query.name] = query
    }
    this._ftsQueries.push(query)
  }

  addInterface(_interface: ObjectType): void {
    this._interfaces.push(_interface)
  }

  addEnum(_enum: GraphQLEnumType): void {
    this._enums.push(_enum)
  }

  addJsonField(_jsonField: ObjectType): void {
    this._jsonFields.push(_jsonField)
  }

  /**
   * Add emply full text search query with the given name
   *
   * @param name query name to be added
   */
  addEmptyFTSQuery(name: string): FTSQuery {
    const query = {
      name,
      clauses: [],
    }
    this.addFTSQuery(query)
    return query
  }

  private _addQueryClause(name: string, f: Field, t: ObjectType): void {
    let q: FTSQuery = this._name2query[name]
    if (!q) {
      q = this.addEmptyFTSQuery(name)
    }
    q.clauses.push({
      entity: t,
      field: f,
    })
  }

  /**
   * Add text search field to the named FTS query
   *
   * @param queryName fulltext query name
   * @param fieldName name of the field to be added to the query
   * @param typeName  objectType which defined that field
   */
  addQueryClause(queryName: string, fieldName: string, typeName: string): void {
    const field = this.lookupField(typeName, fieldName)
    const objType = this.lookupEntity(typeName)
    this._addQueryClause(queryName, field, objType)
  }

  get entities(): ObjectType[] {
    return this._entities
  }

  get ftsQueries(): FTSQuery[] {
    return this._ftsQueries
  }

  get enums(): GraphQLEnumType[] {
    return this._enums
  }

  get interfaces(): ObjectType[] {
    return this._interfaces
  }

  get variants(): ObjectType[] {
    return this._variants
  }

  get unions(): UnionType[] {
    return this._unions
  }

  get jsonFields(): ObjectType[] {
    return this._jsonFields
  }

  /**
   * Lookup ObjectType by it's name (as defined in the schema file)
   *
   * @param name ObjectTypeName as defined in the schema
   */
  lookupEntity(name: string): ObjectType {
    if (!this._name2type[name]) {
      throw new Error(
        `Entity ${name} is undefined. Make sure the type definition is decorated with @entity.`
      )
    }
    return this._name2type[name]
  }

  lookupUnion(name: string): UnionType {
    const u = this._unions.find((u) => u.name === name)
    if (!u) throw new Error(`Cannot find union type with name ${name}`)
    return u
  }

  lookupEnum(name: string): GraphQLEnumType {
    const e = this._enums.find((e) => e.name === name)
    if (!e) throw new Error(`Cannot find enum with name ${name}`)
    return e
  }

  lookupVariant(name: string): ObjectType {
    const e = this._variants.find((e) => e.name === name)
    if (!e)
      throw new Error(
        `Variant ${name} is undefined. Make sure the type definition is decorated with @variant.`
      )
    return e
  }

  lookupInterface(name: string): ObjectType {
    const e = this._interfaces.find((e) => e.name === name)
    if (!e) throw new Error(`Cannot find interface with name ${name}`)
    return e
  }

  lookupQuery(queryName: string): FTSQuery {
    if (!this._name2query) {
      throw new Error(`No query with name ${queryName} found`)
    }
    return this._name2query[queryName]
  }

  lookupJsonField(name: string): ObjectType {
    const jsonField = this._jsonFields.find((e) => e.name === name)
    if (!jsonField) throw Error(`Cannot find JsonField with name ${name}`)
    return jsonField
  }

  /**
   * Get subclasses of a given interface
   *
   * @param interfaceName Name of the interface
   */
  getSubclasses(interfaceName: string): ObjectType[] {
    return this._entities.filter(
      (t) =>
        t.interfaces &&
        t.interfaces.length > 0 &&
        t.interfaces[0].name === interfaceName
    )
  }

  /**
   * Lookup Warthog's Field model object by it's ObjectType and name
   *
   * @param objTypeName Type name with the given field defined
   * @param name the name of the field
   */
  lookupField(objTypeName: string, name: string): Field {
    const objType = this.lookupEntity(objTypeName)
    const field = objType.fields.find((f) => f.name === name)
    if (!field) {
      throw new Error(
        `No field ${name} is found for object type ${objTypeName}`
      )
    }
    return field
  }

  addField(entity: string, field: Field): void {
    const objType = this.lookupEntity(entity)
    objType.fields.push(field)
  }

  lookupType(name: string): ModelType {
    if (name in availableTypes) {
      return ModelType.SCALAR
    }

    if (this._name2type[name]) {
      return ModelType.ENTITY
    }

    if (this._interfaces.find((i) => i.name === name)) {
      return ModelType.INTERFACE
    }

    if (this._variants.find((v) => v.name === name)) {
      return ModelType.VARIANT
    }

    if (this._unions.find((u) => u.name === name)) {
      return ModelType.UNION
    }

    if (this._enums.find((e) => e.name === name)) {
      return ModelType.ENUM
    }

    if (this._jsonFields.find((j) => j.name === name)) {
      return ModelType.JSON
    }

    throw Error(`Type ${name} is undefined`)
  }
}

export interface UnionType {
  name: string
  types: ObjectType[]
}
