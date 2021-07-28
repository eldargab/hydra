import { expect } from 'chai'
import tmp from 'tmp'
import { GeneratorConfig, generateIndex } from '../generators'
import path from 'path'
import fs from 'fs'

describe('gen-index', () => {
  it('should copy type definition file', () => {
    const dest = tmp.dirSync().name
    generateIndex(({
      modules: [],
      customTypes: { typedefsLoc: resource('fixtures/typedefs.json') },
      dest,
    } as unknown) as GeneratorConfig)
    expect(fs.existsSync(path.join(dest, 'typedefs.json'))).equal(true)
  })
})

function resource(name: string): string {
  return path.resolve(__dirname, '../../../resources/typegen', name)
}