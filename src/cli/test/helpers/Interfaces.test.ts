import { expect } from 'chai'
import { WarthogModelBuilder } from '../../parse/WarthogModelBuilder'
import { WarthogModel } from '../../model'
import { ModelRenderer } from '../../generate/ModelRenderer'
import { readResource, resource } from './model'

describe('InterfaceRenderer', () => {
  let generator: ModelRenderer
  let warthogModel: WarthogModel
  let modelTemplate: string

  before(() => {
    // set timestamp in the context to make the output predictable
    modelTemplate = readResource('templates/entities/model.ts.mst')

    warthogModel = new WarthogModelBuilder(
      resource('fixtures/interfaces.graphql')
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
