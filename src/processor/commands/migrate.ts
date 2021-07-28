import { Command, flags } from '@oclif/command'
import { Connection } from 'typeorm'
import { createDBConnection } from '../db/dal'
import { info } from '../util'
import dotenv from 'dotenv'

export default class Migrate extends Command {
  static flags = {
    env: flags.string({
      char: 'e',
      description: 'Path to a file with environment variables',
    }),
  }

  async run(): Promise<void> {
    let connection: Connection | undefined
    info('Running migrations for Hydra Processor')

    const { flags } = this.parse(Migrate)
    if (flags.env) {
      dotenv.config({ path: flags.env })
    }

    try {
      connection = await createDBConnection()
      if (connection) await connection.runMigrations()
      info('Hydra Processor migrations completed successfully')
    } finally {
      if (connection) await connection.close()
    }
  }
}
