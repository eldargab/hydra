import pWaitFor from 'p-wait-for'
import { expect } from 'chai'
import {
  getGQLClient,
  getProcessorStatus,
  queryInterfacesByEnum,
} from './api/processor-api'
import { EVENT_INTERFACE_QUERY } from './api/graphql-queries'

describe('end-to-end interfaces tests', () => {
  before(async () => {
    // wait until the indexer indexes the block and the processor picks it up
    await pWaitFor(
      async () => {
        return (await getProcessorStatus()).lastCompleteBlock > 0
      },
      { interval: 50 }
    )
  })

  it('executes a flat interface query with fragments', async () => {
    const result = await getGQLClient().request<{
      events: any[]
    }>(EVENT_INTERFACE_QUERY)

    expect(result.events.length).to.be.equal(3, 'should find three events')
    expect(result.events[0].field3).to.be.equal(
      'field3',
      'should return eventC with field3'
    )
    expect(result.events[0].complexField).not.to.be.an(
      'undefiend',
      'should load complexField'
    )

    expect(result.events[0].complexField.arg1).to.be.equal(
      'xxx',
      'should load complexField.arg1'
    )

    expect(result.events[1].field2).to.be.equal(
      'field2',
      'should return eventB with field2'
    )
    expect(result.events[2].field1).to.be.equal(
      'field1',
      'should return eventA with field1'
    )
  })

  it('perform filtering on interfaces by implementers enum types', async () => {
    const { events } = await queryInterfacesByEnum()
    expect(events.length).to.be.equal(1, 'shoud find an interface by type')
  })
})
