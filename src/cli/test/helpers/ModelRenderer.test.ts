import { ModelRenderer } from '../../generate/ModelRenderer'
import { WarthogModel, Field, ObjectType } from '../../model'
import { createModel, fromStringSchema, readResource } from './model'
import { expect } from 'chai'
import Debug from 'debug'

const debug = Debug('cli-test:model-renderer')

describe('ModelRenderer', () => {
  let generator: ModelRenderer
  let warthogModel: WarthogModel
  let modelTemplate: string
  let resolverTemplate: string

  before(() => {
    // set timestamp in the context to make the output predictable
    modelTemplate = readResource('templates/entities/model.ts.mst')
    resolverTemplate = readResource('templates/entities/resolver.ts.mst')
  })

  beforeEach(() => {
    warthogModel = createModel()
  })

  it('should transform fields to camelCase', function () {
    warthogModel.addField('Post', new Field('CamelCase', 'String'))
    warthogModel.addField('Post', new Field('snake_case', 'String'))
    warthogModel.addField('Post', new Field('kebab-case', 'String'))

    generator = new ModelRenderer(
      warthogModel,
      warthogModel.lookupEntity('Post')
    )

    const rendered = generator.render(modelTemplate)

    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)

    expect(rendered).to.include(
      'camelCase?: string',
      'Should camelCase correctly'
    )
    expect(rendered).to.include(
      'snakeCase?: string',
      'Should camelCase correctly'
    )
    expect(rendered).to.include(
      'kebabCase?: string',
      'Should camelCase correctly'
    )
  })

  it('should render ClassName', function () {
    warthogModel.addEntity({
      name: `some_randomEntity`,
      isEntity: true,
      isVariant: false,
      fields: [new Field('a', 'String')],
    } as ObjectType)

    generator = new ModelRenderer(
      warthogModel,
      warthogModel.lookupEntity('some_randomEntity')
    )

    const rendered = generator.render(modelTemplate)
    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)

    expect(rendered).to.include(
      'export class SomeRandomEntity extends BaseModel',
      'Should render ClassName corretly'
    )
  })

  it('should include imports', function () {
    warthogModel.addField('Post', new Field('a', 'ID'))
    warthogModel.addField('Post', new Field('b', 'String'))
    warthogModel.addField('Post', new Field('c', 'Int'))
    warthogModel.addField('Post', new Field('d', 'DateTime'))
    warthogModel.addField('Post', new Field('e', 'Float'))
    warthogModel.addField('Post', new Field('f', 'BigInt'))
    warthogModel.addField('Post', new Field('g', 'BigDecimal'))
    warthogModel.addField('Post', new Field('h', 'Bytes'))
    warthogModel.addField('Post', new Field('j', 'Boolean'))

    generator = new ModelRenderer(
      warthogModel,
      warthogModel.lookupEntity('Post')
    )

    const rendered = generator.render(modelTemplate)

    expect(rendered).to.include('BooleanField,', 'Should import BooleanField')
    expect(rendered).to.include('DateTimeField,', 'Should import DateTimeField')
    expect(rendered).to.include('FloatField,', 'Should import FloatField')
    expect(rendered).to.include('IntField,', 'Should import IntField')
    expect(rendered).to.include('NumericField,', 'Should import NumericField')
    expect(rendered).to.include('BytesField,', 'Should import BytesField')
  })

  it('should render otm types', function () {
    const model = fromStringSchema(`
    type Author @entity {
      posts: [Post!] @derivedFrom(field: "author")
    }
    
    type Post @entity {
      title: String
      author: Author!
    }`)

    generator = new ModelRenderer(model, model.lookupEntity('Author'))

    const rendered = generator.render(modelTemplate)
    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)

    expect(rendered).to.include(
      `import { Post } from '../post/post.model`,
      `Should render imports`
    )
    expect(rendered).to.include(
      `@OneToMany(() => Post, (param: Post) => param.author,`,
      'Should render OTM decorator'
    )
    expect(rendered).to.include(
      `posts?: Post[];`,
      'Should render plural references'
    )
  })

  it('should render mto types', function () {
    const model = fromStringSchema(`
    type Author @entity {
      name: String!
    }
    
    type Post @entity {
      title: String
      author: Author! 
    }`)

    generator = new ModelRenderer(model, model.lookupEntity('Post'))
    const rendered = generator.render(modelTemplate)
    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)

    expect(rendered).to.include(
      `import { Author } from '../author/author.model`,
      `Should render imports`
    )
    expect(rendered).to.include(
      `@ManyToOne(() => Author, (param: Author) => param.postauthor,`,
      'Should render MTO decorator'
    ) // nullable: true is not includered?
    expect(rendered).to.include(
      `author!: Author;`,
      'Should render required referenced field'
    )
  })

  it('should add nullable option mto decorator', function () {
    const model = fromStringSchema(`
    type Channel @entity {
      handle: String!
      language: Language
    }
    
    type Language @entity {
      code: String!
      name: String!
    }`)

    generator = new ModelRenderer(model, model.lookupEntity('Channel'))
    const rendered = generator.render(modelTemplate)
    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)

    expect(rendered).to.include(
      `@ManyToOne(() => Language, (param: Language) => param.channellanguage, {
    skipGraphQLField: true,
    nullable: true,`,
      'Should render MTO decorator with nullable option'
    )
  })

  it('should renderer array types', function () {
    const model = fromStringSchema(`
    type Author @entity {
      posts: [String]
    }`)

    generator = new ModelRenderer(model, model.lookupEntity('Author'))

    const rendered = generator.render(modelTemplate)
    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)
    expect(rendered).to.include('CustomField,', 'Should import CustomField')
    expect(rendered).to.include(
      `@CustomField`,
      'Should decorate arrays with @CustomField'
    )
    expect(rendered).to.include(
      `db: { type: 'text', array: true, nullable: true }`,
      'Should add db option'
    )
    expect(rendered).to.include(
      `api: { type: 'string', nullable: true }`,
      'Should inclued api option'
    )
    expect(rendered).to.include('posts?: string[]', `should add an array field`)
  })

  it('should render enum types', function () {
    const model = fromStringSchema(`
      enum Episode {
        NEWHOPE
        EMPIRE
        JEDI
      }
        
      type Movie @entity {
        episode: Episode
      }`)

    generator = new ModelRenderer(model, model.lookupEntity('Movie'))
    const rendered = generator.render(modelTemplate)
    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)

    expect(rendered).to.include('EnumField,', 'Should import EnumField')
    expect(rendered).to.include('export { Episode }', 'Should export enum')
    // this will be generated in ../enums/enum.ts
    // expect(rendered).to.include(`NEWHOPE = 'NEWHOPE'`, 'Should render enum values');
    expect(rendered).to.include(`@EnumField`, 'Should decorate with @EnumField')
    expect(rendered).to.include(`'Episode', Episode`)
    expect(rendered).to.include(
      `nullable: true`,
      'Should add enum decorator options'
    )
    expect(rendered).to.include(`episode?:`, 'Should add nullable')
  })

  it('should decorate field with the correct enum type', function () {
    const model = fromStringSchema(`
      enum episode_Camel_Case {
        NEWHOPE
        EMPIRE
        JEDI
      }
        
      type Movie @entity {
        episode: episode_Camel_Case
      }`)

    generator = new ModelRenderer(model, model.lookupEntity('Movie'))
    const rendered = generator.render(modelTemplate)
    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)

    expect(rendered).to.include(
      `import { episode_Camel_Case } from '../enums/enums'`,
      'Should import enum'
    )
    expect(rendered).to.include(
      'export { episode_Camel_Case }',
      'Should export enum'
    )
    // this will be generated in ../enums/enum.ts
    // expect(rendered).to.include(`NEWHOPE = 'NEWHOPE'`, 'Should render enum values');
    expect(rendered).to.include(
      `'episode_Camel_Case', episode_Camel_Case,`,
      'Should add enum decorator options'
    )
    expect(rendered).to.include(
      `nullable: true`,
      'Should add enum decorator options'
    )

    expect(rendered).to.include(
      `episode?: episode_Camel_Case`,
      'Should camelCase type'
    )
  })

  it('should import and export both enums', function () {
    const model = fromStringSchema(`
      enum enum1 {
        NEWHOPE
        EMPIRE
        JEDI
      }

      enum enum2 {
        NEWHOPE
        EMPIRE
        JEDI
      }
        
      type Movie @entity {
        field1: enum1,
        field2: enum2
      }`)
    generator = new ModelRenderer(model, model.lookupEntity('Movie'))
    const rendered = generator.render(modelTemplate)
    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)
    expect(rendered).to.include(
      `import { enum1 } from '../enums/enums'`,
      'Should import enum1'
    )
    expect(rendered).to.include('export { enum1 }', 'Should export enum1')
    expect(rendered).to.include(
      `import { enum2 } from '../enums/enums'`,
      'Should import enum2'
    )
    expect(rendered).to.include('export { enum2 }', 'Should export enum2')
  })

  it('should export enum from a single entity', function () {
    const model = fromStringSchema(`
      enum enum1 {
        NEWHOPE
        EMPIRE
        JEDI
      }
      
      type B @entity {
        field1: enum1,
      }

      type A @entity {
        field1: enum1,
      }`)
    generator = new ModelRenderer(model, model.lookupEntity('A'))
    let rendered = generator.render(modelTemplate)
    debug(`rendered A: ${JSON.stringify(rendered, null, 2)}`)
    expect(rendered).to.include('export { enum1 }', 'Should export enum1')

    generator = new ModelRenderer(model, model.lookupEntity('B'))
    rendered = generator.render(modelTemplate)
    debug(`rendered B: ${JSON.stringify(rendered, null, 2)}`)
    expect(rendered).to.include(
      'export { enum1 }',
      'B should also export enum1'
    )
  })

  it('Should render all fields in the interface implementations', () => {
    const model = fromStringSchema(`
        interface IEntity @entity {
            field1: String
        }
        type A implements IEntity @entity {
            field1: String
            field2: String
        }`)
    generator = new ModelRenderer(model, model.lookupEntity('A'))
    const rendered = generator.render(modelTemplate)
    expect(rendered).to.include('field1', 'should render both fields')
    expect(rendered).to.include('field2', 'should render both fields')
  })
  // THIS IS NO LONGER THE CASE
  // it('should extend interface type', function () {
  //   const model = fromStringSchema(`
  //       interface IEntity @entity {
  //           field1: String
  //       }
  //       type A implements IEntity @entity {
  //           field1: String
  //           field2: String
  //   }`)
  //   generator = new ModelRenderer(model, model.lookupEntity('A'))
  //   const rendered = generator.render(modelTemplate)
  //   expect(rendered).to.include('extends IEntity')
  //   expect(rendered).to.include(
  //     `import { IEntity } from '../i-entity/i-entity.model'`,
  //     'should import interface type'
  //   )
  // })

  it('should import two unions from variants', async function () {
    const model = fromStringSchema(`
        type A @entity {
        firstUnion: unionOne!
        secondUnion: unionTwo
        }
        union unionOne = variantOneUnionOne | variantTwoUnionOne
        union unionTwo =  variantOneUnionTwo | variantTwoUnionTwo
        
        type variantOneUnionOne @variant {
            id: ID!
            propertah: String!
        }
        
        type variantTwoUnionOne @variant {
            id: ID!
            propertah: String!
        }
        
        type variantOneUnionTwo @variant {
            id: ID!
            propertah: String!
        }
        
        type variantTwoUnionTwo @variant {
            id: ID!
            propertah: String!
        }
    `)
    generator = new ModelRenderer(model, model.lookupEntity('A'))
    const rendered = generator.render(modelTemplate)
    expect(rendered).to.include(
      `import { unionOne } from '../variants/variants.model';`,
      'should import two unions'
    )
  })

  // TODO: THIS TEST DOES NOT APPLY, we render all the interface fields
  // it('should not include interface field', function () {
  //   const model = fromStringSchema(`
  //       interface IEntity @entity {
  //           field1: String
  //       }
  //       type A implements IEntity @entity {
  //           field1: String
  //           field2: String
  //   }`)
  //   generator = new ModelRenderer(model, model.lookupEntity('A'))
  //   const rendered = generator.render(modelTemplate)
  //   expect(rendered).to.not.include('field1')
  // })

  it('should render interface', function () {
    const model = fromStringSchema(`
        interface IEntity @entity {
            field1: String
        }
        type A implements IEntity @entity {
            field1: String
            field2: String
    }`)
    generator = new ModelRenderer(model, model.lookupInterface('IEntity'))
    const rendered = generator.render(modelTemplate)
    expect(rendered).to.include('@InterfaceType')
  })

  it('should render interface without relation fields', () => {
    const model = fromStringSchema(`
        type Extrinsic @entity {
          hash: String!
        }
        interface Event @entity {
          indexInBlock: Int!
          inExtrinsic: Extrinsic!
        }
        type BoughtMemberEvent implements Event @entity {
          memberId: Int!
          indexInBlock: Int!
          inExtrinsic: Extrinsic!
    }`)
    generator = new ModelRenderer(model, model.lookupInterface('Event'))
    let rendered = generator.render(modelTemplate)
    expect(rendered).to.not.include('inExtrinsic')

    generator = new ModelRenderer(
      model,
      model.lookupEntity('BoughtMemberEvent')
    )
    rendered = generator.render(modelTemplate)
    expect(rendered).to.include('inExtrinsic')
  })

  it('should import unions', function () {
    const model = fromStringSchema(`
    union Poor = HappyPoor | Miserable
    type HappyPoor @variant {
      father: Poor!
      mother: Poor!
    }
    
    type Miserable @variant {
      hates: String!
    }
    
    type MyEntity @entity {
      status: Poor!
    }`)

    generator = new ModelRenderer(model, model.lookupEntity('MyEntity'))
    const rendered = generator.render(modelTemplate)
    expect(rendered).to.include(
      `import { Poor } from '../variants/variants.model'`
    )
    // prettier put brackets aroung args
    expect(rendered).to.include(
      '(type) => Poor',
      'Should render the correct union type'
    )
    expect(rendered).to.include(
      'status!: typeof Poor',
      'Should render the correct union type'
    )
  })

  it('Should add transformer for BigInt fields', () => {
    const model = fromStringSchema(`
    type Tip @entity {
      value: BigInt!
    }
    `)
    generator = new ModelRenderer(model, model.lookupEntity('Tip'))
    const rendered = generator.render(modelTemplate)
    expect(rendered).to.include(`transformer`)
    expect(rendered).to.include(
      `to: (entityValue: BN) => (entityValue !== undefined ? entityValue.toString(10) : null)`
    )
    expect(rendered).to.include(
      `dbValue !== undefined && dbValue !== null && dbValue.length > 0 ? new BN(dbValue, 10) : undefined`
    )
  })

  it('Should add required object definations for Pagination', () => {
    const model = fromStringSchema(`
    type Member @entity {
      id: ID!
      handle: String!
    }
    `)

    generator = new ModelRenderer(model, model.lookupEntity('Member'))
    const rendered = generator.render(resolverTemplate)

    expect(rendered).to.include(`MemberEdge`)
    expect(rendered).to.include(`MemberConnection`)
    expect(rendered).to.include(`ConnectionPageInputOptions`)
    expect(rendered).to.include(`MemberConnectionWhereArgs`)
    expect(rendered).to.include(`membersConnection`)
    expect(rendered).to.include(`findConnection<MemberWhereInput>`)
  })

  it('Should properly pluralize connection naming for camelCased names', () => {
    const model = fromStringSchema(`
    type VideoCategory @entity {
      id: ID!
    }

    type Video @entity {
      id: ID!
    }
    `)

    generator = new ModelRenderer(model, model.lookupEntity('VideoCategory'))
    const rendered = generator.render(resolverTemplate)
    expect(rendered).to.include(`videoCategoriesConnection`)
    expect(rendered).to.include(`async videoCategories`)

    generator = new ModelRenderer(model, model.lookupEntity('Video'))
    expect(generator.render(resolverTemplate)).to.include(`videosConnection`)
    expect(generator.render(resolverTemplate)).to.include(`async videos`)
  })

  it('Should add querying a single entity query', () => {
    const model = fromStringSchema(`
    type Channel @entity {
      id: ID!
      handle: String!
    }`)

    generator = new ModelRenderer(model, model.lookupEntity('Channel'))
    const rendered = generator.render(resolverTemplate)

    expect(rendered).to.include(`Query(() => Channel, { nullable: true })`)
    expect(rendered).to.include(
      `async channelByUniqueInput(
    @Arg('where') where: ChannelWhereUniqueInput,
    @Fields() fields: string[]
  ): Promise<Channel | null>`
    )
    expect(rendered).to.include(
      `this.service.find(where, undefined, 1, 0, fields)`
    )
  })

  it('Should import a variant only once', () => {
    const model = fromStringSchema(`
    union Poor = HappyPoor | Miserable

    type HappyPoor @variant {
      father: Poor!
      mother: Poor!
    }
    
    type Miserable @variant {
      hates: String!
    }
    
    type MyEntity @entity {
      status: Poor!
      anotherStatus: Poor!
    }`)

    generator = new ModelRenderer(model, model.lookupEntity('MyEntity'))
    const rendered = generator.render(modelTemplate)

    expect(rendered).to.include(
      `import { Poor } from '../variants/variants.model'`,
      'Should import variant only once'
    )

    expect(rendered).to.not.include(
      `
import { Poor } from '../variants/variants.model';
import { Poor } from '../variants/variants.model';`,
      `Should not import same variant twice`
    )
  })
})
