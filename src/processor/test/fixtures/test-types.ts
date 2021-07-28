import { SubstrateEvent } from '../../../common'

export namespace Balances {
  export class TransferEvent {
    constructor(public readonly ctx: SubstrateEvent) {}

    get testProp(): string {
      return 'TestProp'
    }
  }
}
