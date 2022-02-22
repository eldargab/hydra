import { MigrationInterface, QueryRunner } from 'typeorm'

export class StoreEvmLog1641997527150 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "substrate_event" ADD COLUMN IF NOT EXISTS "evm_log_data"  CHARACTER VARYING GENERATED ALWAYS AS (case when name = 'evm.Log' then params->0->'value'->>'data' end) STORED;`
    )

    await queryRunner.query(
      `ALTER TABLE "substrate_event" ADD COLUMN IF NOT EXISTS "evm_log_address"  CHARACTER VARYING GENERATED ALWAYS AS (case when name = 'evm.Log' then params->0->'value'->>'address' end) STORED;`
    )

    await queryRunner.query(
      `ALTER TABLE "substrate_event" ADD COLUMN IF NOT EXISTS "evm_log_topics"  jsonb GENERATED ALWAYS AS (case when name = 'evm.Log' then params->0->'value'->'topics' end) STORED;`
    )

    await queryRunner.query(
      `CREATE INDEX "IDX_substrate_event__evm_log_address" ON "substrate_event" ("evm_log_address") `
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_substrate_event__evm_log_address"`)

    await queryRunner.query(
      `ALTER TABLE "substrate_event" DROP COLUMN IF EXISTS "evm_log_topics"`
    )

    await queryRunner.query(
      `ALTER TABLE "substrate_event" DROP COLUMN IF EXISTS "evm_log_address"`
    )

    await queryRunner.query(
      `ALTER TABLE "substrate_event" DROP COLUMN IF EXISTS "evm_log_data"`
    )
  }
}
