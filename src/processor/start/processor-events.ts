import { EventEmitter } from 'events'

export const eventEmitter = new EventEmitter()

export enum ProcessorEvents {
  // fired when an index head is updated
  NEW_INDEXER_HEAD = 'NEW_INDEXER_HEAD',
  // fired when a new batch of events is processed
  PROCESSED_EVENT = 'PROCESSED_EVENT',
  // fired when the processor state has changed
  STATE_CHANGE = 'STATE_CHANGE',
  // fired when the indexer status has been updated
  INDEXER_STATUS_CHANGE = 'INDEXER_STATUS_CHANGE',
  // when the event queue is updated
  QUEUE_SIZE_CHANGE = 'QUEUE_SIZE_CHANGE',
  // when the queue has completed fetching a new block
  QUEUE_LAST_COMPLETE_BLOCK_CHANGE = 'QUEUE_LAST_COMPLETE_BLOCK_CHANGE',
  // when the queue is drained (ie no pending events)
  QUEUE_DRAINED = 'QUEUE_DRAINED',
}
