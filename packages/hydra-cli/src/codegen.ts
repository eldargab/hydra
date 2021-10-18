import type {
  Entity,
  Enum,
  JsonObject,
  Model,
  Prop,
  Union,
} from '@subsquid/openreader/dist/model'
import {
  lowerCaseFirst,
  Output,
  unsupportedCase,
} from '@subsquid/openreader/dist/util'
import assert from 'assert'
import { OutDir } from './utils/outDir'

export interface CodegenOptions {
  model: Model
  outDir: OutDir
  withServer?: boolean
  withServerExtension?: boolean
}

export function codegen(options: CodegenOptions): void {
  const { model, outDir } = options
  outDir.del()
  outDir.addResource('codegen/ormconfig.ts', 'ormconfig.ts')
  if (options.withServer) {
    outDir.addResource('codegen/server.ts', 'server.ts')
    if (options.withServerExtension) {
      outDir.addResource('codegen/type-graphql.ts', 'type-graphql.ts')
    }
  }
  generateOrmModels(model, outDir)
}

function generateOrmModels(model: Model, dir: OutDir): void {
  const variants = collectVariants(model)
  const index = dir.file('model.ts')

  for (const name in model) {
    const item = model[name]
    switch (item.kind) {
      case 'entity':
        generateEntity(name, item)
        break
      case 'object':
        generateObject(name, item)
        break
      case 'union':
        generateUnion(name, item)
        break
      case 'enum':
        generateEnum(name, item)
        break
    }
  }

  index.write()
  dir.addResource('codegen/marshal.ts', 'marshal.ts')

  function generateEntity(name: string, entity: Entity): void {
    index.line(`export * from "./model/${lowerCaseFirst(name)}.model"`)
    const out = dir.file(`model/${lowerCaseFirst(name)}.model.ts`)
    const imports = new ImportRegistry()
    imports.useTypeorm('Entity', 'Column', 'PrimaryColumn')
    out.lazy(() => imports.render(model))
    out.line()
    printComment(entity, out)
    out.line('@Entity_()')
    out.block(`export class ${name}`, () => {
      out.block(`constructor(props?: Partial<${name}>)`, () => {
        out.line('Object.assign(this, props)')
      })
      for (const key in entity.properties) {
        const prop = entity.properties[key]
        importReferencedModel(imports, prop)
        out.line()
        printComment(prop, out)
        switch (prop.type.kind) {
          case 'scalar':
            if (key === 'id') {
              out.line('@PrimaryColumn_()')
            } else if (prop.type.name === 'BigInt') {
              imports.useMarshal()
              out.line(
                `@Column_("numeric", {transformer: marshal.bigintTransformer, nullable: ${prop.nullable}})`
              )
            } else {
              out.line(
                `@Column_("${getDbType(prop.type.name)}", {nullable: ${
                  prop.nullable
                }})`
              )
            }
            break
          case 'enum':
            out.line(
              `@Column_("varchar", {length: ${getEnumMaxLength(
                model,
                prop.type.name
              )}, nullable: ${prop.nullable}})`
            )
            break
          case 'fk':
            imports.useTypeorm('ManyToOne', 'Index')
            out.line('@Index_()')
            out.line(
              `@ManyToOne_(() => ${prop.type.foreignEntity}, {nullable: ${prop.nullable}})`
            )
            break
          case 'list-relation':
            imports.useTypeorm('OneToMany')
            out.line(
              `@OneToMany_(() => ${prop.type.entity}, e => e.${prop.type.field})`
            )
            break
          case 'object':
          case 'union':
            imports.useMarshal()
            out.line(
              `@Column_("jsonb", {transformer: {to: obj => ${marshalToJson(
                prop,
                'obj'
              )}, from: obj => ${marshalFromJson(prop, 'obj')}}, nullable: ${
                prop.nullable
              }})`
            )
            break
          case 'list':
            switch (prop.type.item.type.kind) {
              case 'scalar':
                out.line(
                  `@Column_("${getDbType(
                    prop.type.item.type.name
                  )}", {array: true, nullable: ${prop.nullable}})`
                )
                break
              case 'enum':
                out.line(
                  `@Column_("varchar", {length: ${getEnumMaxLength(
                    model,
                    prop.type.item.type.name
                  )}, array: true, nullable: ${prop.nullable}})`
                )
                break
              case 'object':
              case 'union':
              case 'list':
                imports.useMarshal()
                out.line(
                  `@Column_("jsonb", {transformer: {to: obj => ${marshalToJson(
                    prop,
                    'obj'
                  )}, from: obj => ${marshalFromJson(
                    prop,
                    'obj'
                  )}}, nullable: ${prop.nullable}})`
                )
                break
              default:
                throw unsupportedCase(prop.type.item.type.kind)
            }
            break
          default:
            throw unsupportedCase((prop.type as any).kind)
        }
        out.line(`${key}!: ${getPropJsType('entity', prop)}`)
      }
    })
    out.write()
  }

  function getDbType(scalar: string): string {
    switch (scalar) {
      case 'ID':
      case 'String':
        return 'text'
      case 'Int':
        return 'integer'
      case 'Boolean':
        return 'bool'
      case 'DateTime':
        return 'timestamp with time zone'
      case 'BigInt':
        return 'numeric'
      case 'Bytes':
        return 'bytea'
      default:
        throw unsupportedCase(scalar)
    }
  }

  function generateObject(name: string, object: JsonObject): void {
    index.line(`export * from "./model/${lowerCaseFirst(name)}"`)
    const out = dir.file(`model/${lowerCaseFirst(name)}.ts`)
    const imports = new ImportRegistry()
    imports.useMarshal()
    imports.useAssert()
    out.lazy(() => imports.render(model))
    out.line()
    printComment(object, out)
    out.block(`export class ${name}`, () => {
      if (variants.has(name)) {
        out.line(`public readonly isTypeOf = '${name}'`)
      }
      for (const key in object.properties) {
        const prop = object.properties[key]
        importReferencedModel(imports, prop)
        out.line(`private _${key}!: ${getPropJsType('object', prop)}`)
      }
      out.line()
      out.block(
        `constructor(props?: Partial<Omit<${name}, 'toJSON'>>, json?: any)`,
        () => {
          out.line('Object.assign(this, props)')
          out.block(`if (json != null)`, () => {
            for (const key in object.properties) {
              const prop = object.properties[key]
              out.line(`this._${key} = ${marshalFromJson(prop, 'json.' + key)}`)
            }
          })
        }
      )
      for (const key in object.properties) {
        const prop = object.properties[key]
        out.line()
        printComment(prop, out)
        out.block(`get ${key}(): ${getPropJsType('object', prop)}`, () => {
          if (!prop.nullable) {
            out.line(`assert(this._${key} != null, 'uninitialized access')`)
          }
          out.line(`return this._${key}`)
        })
        out.line()
        out.block(`set ${key}(value: ${getPropJsType('object', prop)})`, () => {
          out.line(`this._${key} = value`)
        })
      }
      out.line()
      out.block(`toJSON(): object`, () => {
        out.block('return', () => {
          if (variants.has(name)) {
            out.line('isTypeOf: this.isTypeOf,')
          }
          for (const key in object.properties) {
            const prop = object.properties[key]
            out.line(`${key}: ${marshalToJson(prop, 'this.' + key)},`)
          }
        })
      })
    })
    out.write()
  }

  function importReferencedModel(imports: ImportRegistry, prop: Prop) {
    switch (prop.type.kind) {
      case 'enum':
      case 'object':
      case 'union':
        imports.useModel(prop.type.name)
        break
      case 'fk':
        imports.useModel(prop.type.foreignEntity)
        break
      case 'list-relation':
        imports.useModel(prop.type.entity)
        break
      case 'list':
        importReferencedModel(imports, prop.type.item)
        break
    }
  }

  function marshalFromJson(prop: Prop, exp: string): string {
    // assumes exp is a pure variable or prop access
    let convert: string
    switch (prop.type.kind) {
      case 'scalar':
        convert = `marshal.${prop.type.name.toLowerCase()}.fromJSON(${exp})`
        break
      case 'enum':
      case 'fk':
        convert = `marshal.string.fromJSON(${exp})`
        break
      case 'object':
        convert = `new ${prop.type.name}(undefined, ${
          prop.nullable ? exp : `marshal.nonNull(${exp})`
        })`
        break
      case 'union':
        convert = `fromJson${prop.type.name}(${exp})`
        break
      case 'list':
        convert = `marshal.fromList(${exp}, val => ${marshalFromJson(
          prop.type.item,
          'val'
        )})`
        break
      default:
        throw unsupportedCase(prop.type.kind)
    }
    if (prop.nullable) {
      convert = `${exp} == null ? undefined : ${convert}`
    }
    return convert
  }

  function marshalToJson(prop: Prop, exp: string): string {
    // assumes exp is a pure variable or prop access
    let convert: string
    switch (prop.type.kind) {
      case 'scalar':
        switch (prop.type.name) {
          case 'ID':
          case 'String':
          case 'Boolean':
          case 'Int':
          case 'Float':
            return exp
          default:
            convert = `marshal.${prop.type.name.toLowerCase()}.toJSON(${exp})`
        }
        break
      case 'enum':
      case 'fk':
        return exp
      case 'object':
      case 'union':
        convert = exp + '.toJSON()'
        break
      case 'list':
        convert = `${exp}.map((val: any) => ${marshalToJson(
          prop.type.item,
          'val'
        )})`
        break
      default:
        throw unsupportedCase(prop.type.kind)
    }
    if (prop.nullable) {
      convert = `${exp} == null ? undefined : ${convert}`
    }
    return convert
  }

  function generateUnion(name: string, union: Union): void {
    index.line(`export * from "./model/${lowerCaseFirst(name)}"`)
    const out = dir.file(`model/${lowerCaseFirst(name)}.ts`)
    const imports = new ImportRegistry()
    out.lazy(() => imports.render(model))
    union.variants.forEach((v) => imports.useModel(v))
    out.line()
    out.line(`export type ${name} = ${union.variants.join(' | ')}`)
    out.line()
    out.block(`export function fromJson${name}(json: any): ${name}`, () => {
      out.block(`switch(json?.isTypeOf)`, () => {
        union.variants.forEach((v) => {
          out.line(`case '${v}': return new ${v}(undefined, json)`)
        })
        out.line(
          `default: throw new TypeError('Unknown json object passed as ${name}')`
        )
      })
    })
    out.write()
  }

  function generateEnum(name: string, e: Enum): void {
    index.line(`export * from "./model/${lowerCaseFirst(name)}"`)
    const out = dir.file(`model/${lowerCaseFirst(name)}.ts`)
    out.block(`export enum ${name}`, () => {
      for (const val in e.values) {
        out.line(`${val} = "${val}",`)
      }
    })
    out.write()
  }
}

function getPropJsType(owner: 'entity' | 'object', prop: Prop): string {
  let type: string
  switch (prop.type.kind) {
    case 'scalar':
      type = getScalarJsType(prop.type.name)
      break
    case 'enum':
    case 'object':
    case 'union':
      type = prop.type.name
      break
    case 'fk':
      if (owner === 'entity') {
        type = prop.type.foreignEntity
      } else {
        type = 'string'
      }
      break
    case 'list':
      type = getPropJsType('object', prop.type.item)
      if (type.indexOf('|')) {
        type = `(${type})[]`
      } else {
        type += '[]'
      }
      break
    case 'list-relation':
      type = prop.type.entity + '[]'
      break
    default:
      throw unsupportedCase((prop.type as any).kind)
  }
  if (prop.nullable) {
    type += ' | undefined | null'
  }
  return type
}

function getScalarJsType(typeName: string): string {
  switch (typeName) {
    case 'ID':
    case 'String':
      return 'string'
    case 'Int':
    case 'Float':
      return 'number'
    case 'Boolean':
      return 'boolean'
    case 'DateTime':
      return 'Date'
    case 'BigInt':
      return 'bigint'
    case 'Bytes':
      return 'Buffer'
    default:
      throw unsupportedCase(typeName)
  }
}

function getEnumMaxLength(model: Model, enumName: string): number {
  const e = model[enumName]
  assert(e.kind === 'enum')
  return Object.keys(e.values).reduce((max, v) => Math.max(max, v.length), 0)
}

function collectVariants(model: Model): Set<string> {
  const variants = new Set<string>()
  for (const name in model) {
    const item = model[name]
    if (item.kind === 'union') {
      item.variants.forEach((v) => variants.add(v))
    }
  }
  return variants
}

function printComment(obj: { description?: string }, out: Output) {
  if (obj.description) {
    const lines = obj.description.split('\n')
    out.line(`/**`)
    lines.forEach((line) => out.line(' * ' + line)) // FIXME: escaping
    out.line(' */')
  }
}

class ImportRegistry {
  private typeorm = new Set<string>()
  private model = new Set<string>()
  private marshal = false
  private assert = false

  useTypeorm(...names: string[]): void {
    names.forEach((name) => this.typeorm.add(name))
  }

  useModel(...names: string[]): void {
    names.forEach((name) => this.model.add(name))
  }

  useMarshal() {
    this.marshal = true
  }

  useAssert() {
    this.assert = true
  }

  render(model: Model): string[] {
    const imports: string[] = []
    if (this.assert) {
      imports.push('import assert from "assert"')
    }
    if (this.typeorm.size > 0) {
      const importList = Array.from(this.typeorm).map(
        (name) => name + ' as ' + name + '_'
      )
      imports.push(`import {${importList.join(', ')}} from "typeorm"`)
    }
    if (this.marshal) {
      imports.push(`import * as marshal from "../marshal"`)
    }
    for (const name of this.model) {
      switch (model[name].kind) {
        case 'entity':
          imports.push(
            `import {${name}} from "./${lowerCaseFirst(name)}.model"`
          )
          break
        default: {
          const names = [name]
          if (model[name].kind === 'union') {
            names.push('fromJson' + name)
          }
          imports.push(
            `import {${names.join(', ')}} from "./${lowerCaseFirst(name)}"`
          )
        }
      }
    }
    return imports
  }
}
