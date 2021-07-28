import { expect } from 'chai'
import { ModelRenderer } from '../../generate/ModelRenderer'
import { RelationshipGenerator } from '../../generate/RelationshipGenerator'
import { WarthogModel } from '../../model'
import { fromStringSchema, readResource } from './model'
import { compact as c } from '../../generate/utils'

describe('ReletionshipGenerator', () => {
  let model: WarthogModel
  let generator: ModelRenderer
  let modelTemplate: string
  let resolverTemplate: string

  before(() => {
    modelTemplate = readResource('templates/entities/model.ts.mst')

    resolverTemplate = readResource('templates/entities/resolver.ts.mst')
  })

  it('should not create import statement for self referenced entities', () => {
    model = fromStringSchema(`
    type Member @entity {
      invitor: Member
      invitees: [Member!] @derivedFrom(field: "invitor")
    }`)
    generator = new ModelRenderer(model, model.lookupEntity('Member'))
    const rendered = generator.render(modelTemplate)
    expect(rendered).to.not.include(
      `import { Member } from '../member/member.model.ts'`
    )
  })

  it('should include only one relationship', () => {
    model = fromStringSchema(`
    type Channel @entity {
      id: ID!
      category: ChannelCategory
    }

    type ChannelCategory @entity {
      id: ID!
      channels: [Channel!] @derivedFrom(field: "category")
    }
    `)

    const relGenerator = new RelationshipGenerator(model)
    relGenerator.generate()
    expect(relGenerator.relationships.length).to.be.equal(1)
  })

  it('should add a new field to other entity for onetomany', () => {
    model = fromStringSchema(`
    type Extrinsic @entity {
      id: ID!
      hash: String!
    }
    type Event @entity {
      id: ID!
      inExtrinsic: Extrinsic!
    }`)

    generator = new ModelRenderer(model, model.lookupEntity('Extrinsic'))
    const rendered = generator.render(modelTemplate)

    expect(rendered).to.include(
      `@OneToMany(() => Event, (param: Event) => param.inExtrinsic`
    )
    expect(rendered).to.include(`eventinExtrinsic?: Event[]`)

    // Resolver return type should be ok as well
    const resolver = generator.render(resolverTemplate)
    expect(c(resolver)).to.include(
      c(
        `async eventinExtrinsic(@Root() r: Extrinsic, @Ctx() ctx: BaseContext): Promise<Event[] | null>`
      )
    )
  })

  it('should handle names with interfaces and numbers', () => {
    model = fromStringSchema(`
    type Extrinsic @entity {
      hash: String!
    }

    interface ExtrinsicOnlyEvent @entity {
      extrinsic: Extrinsic!
    }

    type MembershipExtrinsicOnlyEvent1 implements ExtrinsicOnlyEvent @entity {
      extrinsic: Extrinsic!
      handle: String!
    }`)

    generator = new ModelRenderer(
      model,
      model.lookupEntity('MembershipExtrinsicOnlyEvent1')
    )
    const rendered = generator.render(modelTemplate)

    expect(c(rendered)).to.include(
      c(`
    @ManyToOne(() => Extrinsic, (param: Extrinsic) => param.membershipextrinsiconlyevent1Extrinsic, {
      skipGraphQLField: true,
      modelName: 'MembershipExtrinsicOnlyEvent1',
      relModelName: 'Extrinsic',
      propertyName: 'extrinsic',
    })
    extrinsic!: Extrinsic`)
    )
  })
})
