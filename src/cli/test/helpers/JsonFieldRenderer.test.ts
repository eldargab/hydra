import { expect } from 'chai'
import * as fs from 'fs-extra'

import { WarthogModel } from '../../model'
import { ModelRenderer } from '../../generate/ModelRenderer'
import { JsonFieldRenderer } from '../../generate/JsonFieldRenderer'
import { WarthogModelBuilder } from '../../parse/WarthogModelBuilder'
import { compact } from '../../generate/utils'

describe('JsonFieldRenderer', () => {
  let warthogModel: WarthogModel
  let jsonFieldTemplate: string
  let modelTemplate: string

  before(() => {
    jsonFieldTemplate = fs.readFileSync(
      './src/templates/jsonfields/jsonfields.model.ts.mst',
      'utf-8'
    )
    modelTemplate = fs.readFileSync(
      './src/templates/entities/model.ts.mst',
      'utf-8'
    )

    warthogModel = new WarthogModelBuilder(
      'test/fixtures/jsonfields.graphql'
    ).buildWarthogModel()
  })

  it('shoud render typed json object', () => {
    const rendered = compact(
      new JsonFieldRenderer(warthogModel).render(jsonFieldTemplate)
    )

    expect(rendered).include(
      `@InputType('EventParamInput') @ObjectType() export class EventParam {`,
      'shoud have class defination with decorators'
    )
  })
  it('shoud render array typed json object', () => {
    const rendered = compact(
      new JsonFieldRenderer(warthogModel).render(jsonFieldTemplate)
    )

    expect(rendered).include(
      `@Field(() => [AdditionalData]) additionalData!: AdditionalData[]`,
      'shoud have class defination with decorators'
    )
  })

  it('should add @JSONField to the entity defination', () => {
    const rendered = compact(
      new ModelRenderer(
        warthogModel,
        warthogModel.lookupEntity('Event')
      ).render(modelTemplate)
    )

    expect(rendered).include(
      `@JSONField({ filter: true, gqlFieldType: jsonTypes.EventParam }) params!: jsonTypes.EventParam;`,
      'shoud have a field with @JSONField decorator'
    )
  })
})
