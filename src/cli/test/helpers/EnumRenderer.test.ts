import { EnumRenderer } from '../../generate/EnumRenderer'
import { fromStringSchema, readResource } from './model'
import { expect } from 'chai'
import Debug from 'debug'

const debug = Debug('cli-test:enum-renderer')

describe('EnumRenderer', function () {
  let modelTemplate: string

  before(() => {
    // set timestamp in the context to make the output predictable
    modelTemplate = readResource('templates/entities/enums.ts.mst')
  })

  it('should render enum values', function () {
    const model = fromStringSchema(`
        enum episode_long_name {
          NEWHOPE
          EMPIRE
          JEDI
        }
      `)

    const generator = new EnumRenderer(model)
    const rendered = generator.render(modelTemplate)
    debug(`rendered: ${JSON.stringify(rendered, null, 2)}`)
    expect(rendered).to.include(
      `export enum episode_long_name`,
      'Should pascal-case the name'
    )
    expect(rendered).to.include(`NEWHOPE = 'NEWHOPE',`, 'Should render values')
  })
})
