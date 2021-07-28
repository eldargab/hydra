import { ConnectionOptions } from 'typeorm'
import { SubstrateEventEntity, SubstrateExtrinsicEntity } from '../entities'
import { SnakeNamingStrategy } from '../../db-utils'
import { getDBConfig } from '../node'
import { SubstrateBlockEntity } from '../entities/SubstrateBlockEntity'

const config: () => ConnectionOptions = () => {
  const conf = getDBConfig()
  return {
    type: 'postgres',
    host: conf.DB_HOST,
    port: conf.DB_PORT,
    username: conf.DB_USER,
    password: conf.DB_PASS,
    database: conf.DB_NAME,
    entities: [
      SubstrateEventEntity,
      SubstrateExtrinsicEntity,
      SubstrateBlockEntity,
    ],
    migrations: ['./**/migrations/v3/*.js'],
    cli: {
      migrationsDir: 'src/migrations/v3',
    },
    logging: conf.DB_LOGGING,
    namingStrategy: new SnakeNamingStrategy(),
  } as ConnectionOptions
}

export default config
