import { expect } from 'chai'
import { SourcesGenerator } from '../../generate/SourcesGenerator'
import { fromStringSchema } from './model'
import { compact as c } from '../../generate/utils'

describe('model index render', () => {
  before(() => {
    // bypass the annoying warthog checks...
    process.env.WARTHOG_APP_HOST = 'test'
    process.env.WARTHOG_APP_PORT = 'test'
    process.env.WARTHOG_DB_HOST = 'test'
    process.env.DRY_RUN = 'true'
  })

  it('should render index file', () => {
    const model = fromStringSchema(`
  enum Network {
    BABYLON
    ALEXANDRIA
    ROME
  }

  union MyUnion = Var1 | Var2

  type Var1 @variant {
    f1: BigInt!
  }

  type Var2 @variant {
    f2: String!
  }

  type MyEntity @entity {
    f3: String!
  }

  interface MyInterface @entity {
    f4: String!
  }
`)

    const rendered = new SourcesGenerator(model).generateModelIndex()

    expect(c(rendered)).to.include(
      c(`import { MyUnion } from '../src/modules/variants/variants.model`),
      'should import union types'
    )
    expect(c(rendered)).to.include(
      c(`import { Var1 } from '../src/modules/variants/variants.model`),
      'should import variant'
    )
    expect(c(rendered)).to.include(
      c(`import { Network } from '../src/modules/enums/enums`),
      'should import enums'
    )
    expect(c(rendered)).to.include(
      c(`export { Network }`),
      'should export enums'
    )
    expect(c(rendered)).to.include(
      c(`import { MyEntity } from '../src/modules/my-entity/my-entity.model`),
      'should import entities'
    )
    expect(c(rendered)).to.include(
      c(`export { MyEntity }`),
      'should export entities'
    )
    expect(c(rendered)).to.include(
      c(
        `import { MyInterface } from '../src/modules/my-interface/my-interface.model`
      ),
      'should import interfaces'
    )
    expect(c(rendered)).to.include(
      c(`export { MyInterface }`),
      'should export interfaces'
    )
  })
})
