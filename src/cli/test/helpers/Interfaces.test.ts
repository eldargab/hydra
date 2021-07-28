import { expect } from 'chai'
import * as fs from 'fs-extra'
import { WarthogModelBuilder } from '../../parse/WarthogModelBuilder'
import { WarthogModel } from '../../model'
import { ModelRenderer } from '../../generate/ModelRenderer'

describe('InterfaceRenderer', () => {
  let generator: ModelRenderer
  let warthogModel: WarthogModel
  let modelTemplate: string

  before(() => {
    // set timestamp in the context to make the output predictable
    modelTemplate = fs.readFileSync(
      './src/templates/entities/model.ts.mst',
      'utf-8'
    )

    warthogModel = new WarthogModelBuilder(
      'test/fixtures/interfaces.graphql'
    ).buildWarthogModel()

    generator = new ModelRenderer(
      warthogModel,
      warthogModel.lookupInterface('MembershipEvent')
    )
  })

  it('should render interface with enum field', () => {
    const rendered = generator.render(modelTemplate)

    expect(rendered).include(
      `@EnumField('MembershipEventTypeOptions', MembershipEventTypeOptions,`,
      'shoud have an EnumField'
    )
  })
})
