import { ConnectionOptions } from 'typeorm'
import { SnakeNamingStrategy } from '@subsquid/warthog'
import { snakeCase } from 'typeorm/util/StringUtils'

class CustomNamingStrategy extends SnakeNamingStrategy {
  tableName(className: string, customName?: string): string {
    return customName || `${snakeCase(className)}`
  }
}

const options: ConnectionOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: (process.env.DB_PORT && parseInt(process.env.DB_PORT)) || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  migrations: ['db/migrations/*.ts'],
  entities: [
    'generated/modules/**/*.model.ts',
    'server-extension/**/*.model.ts',
  ],
  namingStrategy: new CustomNamingStrategy(),
  cli: {
    migrationsDir: 'db/migrations',
  },
}

module.exports = options
