import { expect } from 'chai'
import { IConfig } from '../commands/typegen'
import { parseConfigFile } from '../config/parse-yaml'
import { validate } from '../config/validate'
import path from 'path'

describe('config', () => {
  it('should parse config file', () => {
    const config = parseConfigFile(resource('fixtures/config.yml'))
    expect(config.customTypes?.typedefsLoc).not.to.be.an('undefined')
  })

  it('should throw if no events or calls were defined', () => {
    expect(() =>
      validate(({ events: [], calls: [] } as unknown) as IConfig)
    ).to.throw('Nothing to generate')
  })

  it('should throw if it cannot locate typedef files', () => {
    expect(() =>
      validate(({
        events: ['a'],
        calls: ['b'],
        customTypes: { typedefsLoc: 'non-existent' },
      } as unknown) as IConfig)
    ).to.throw('Cannot find type definition')
  })

  it('should locate type defintions', () => {
    expect(() =>
      validate(({
        events: ['a'],
        calls: ['b'],
        customTypes: { typedefsLoc: resource('fixtures/typedefs.json') },
      } as unknown) as IConfig)
    ).not.to.throw()
  })
})

function resource(name: string): string {
  return path.resolve(__dirname, '../../../resources/typegen', name)
}
