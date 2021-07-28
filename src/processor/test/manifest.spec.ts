import { expect } from 'chai'
import { parseManifest } from '../start/manifest'
import * as path from "path"

export const manifest = parseManifest(
  path.resolve(__dirname, '../../../resources/processor/fixtures/manifest.yml')
)

describe('manifest', () => {
  it('parses manifest', () => {
    expect(Object.keys(manifest.mappings.eventHandlers).length).to.be.equal(
      1,
      'Has 1 event handler'
    )
    expect(Object.keys(manifest.mappings.extrinsicHandlers).length).to.be.equal(
      1,
      'Has 1 extrinsic handlers'
    )
    expect(manifest.mappings.preBlockHooks.length).to.be.equal(
      2,
      'Has 2 pre block hooks'
    )
    expect(manifest.mappings.postBlockHooks.length).to.be.equal(
      2,
      'Has 2 post block hooks'
    )
  })
})
