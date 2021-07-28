/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {createModel, readResource} from './model'
import { FTSQueryRenderer } from '../../generate/FTSQueryRenderer'
import * as chai from 'chai'

const chaiSnapshot = require('mocha-chai-snapshot')
const { expect } = chai
chai.use(chaiSnapshot)

describe('FTSQueryRenderer', () => {
  let generator: FTSQueryRenderer

  before(() => {
    // set timestamp in the context to make the output predictable
    generator = new FTSQueryRenderer({ ts: 111111111 })
  })

  it('Should generate migration', function () {
    const warthogModel = createModel()

    warthogModel.addQueryClause('test1', 'initial_body_text', 'Post')
    warthogModel.addQueryClause('test1', 'title', 'Post')
    warthogModel.addQueryClause('test1', 'initial_body_text', 'Thread')
    warthogModel.addQueryClause('test1', 'title', 'Thread')

    const templateData = readResource(
      'templates/textsearch/migration.ts.mst'
    )

    const transformed = generator.generate(
      templateData,
      warthogModel.lookupQuery('test1')
    )

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ;(expect(transformed).to as any).matchSnapshot(this)
  })

  it(`Should add filter options to fts resolver`, () => {
    const warthogModel = createModel()
    warthogModel.addQueryClause('search', 'title', 'Post')

    const resolverTemplate = readResource(
      'templates/textsearch/resolver.ts.mst',
    )
    const rendered = generator.generate(
      resolverTemplate,
      warthogModel.lookupQuery(`search`)
    )

    expect(rendered).to.include(
      `import {  PostWhereInput,  } from '../../../generated'`
    )
    expect(rendered).to.include(
      `@Arg('skip', () => Int, { defaultValue: 0 }) skip: number`
    )
    expect(rendered).to.include(
      `@Arg('wherePost', { nullable: true }) wherePost?: PostWhereInput`
    )
  })
  it(`Should add filter options to fts service`, () => {
    const warthogModel = createModel()
    warthogModel.addQueryClause('search', 'title', 'Post')

    const resolverTemplate = readResource(
      'templates/textsearch/service.ts.mst',
    )
    const rendered = generator.generate(
      resolverTemplate,
      warthogModel.lookupQuery(`search`)
    )

    expect(rendered).to.include(`@Inject('PostService')`)
    expect(rendered).to.include(`skip = 0`)
    expect(rendered).to.include(`wherePost?: PostWhereInput`)
    expect(rendered).to.include(`[text, limit, skip]`)
    expect(rendered).to.include(
      `private async processWheres(wheres: any[]): Promise<[string, any[], number]>`
    )
    expect(rendered).to.include(
      `AND unique_id IN (SELECT unique_id FROM selected_ids)`
    )
  })
})
