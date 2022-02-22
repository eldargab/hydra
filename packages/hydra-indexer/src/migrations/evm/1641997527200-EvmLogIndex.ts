import { MigrationInterface, QueryRunner } from 'typeorm'

export class EvmLogIndex1641997527200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE evm_log_idx
      (
          contract_address char(42),
          topic char(66),
          block_id char(16) REFERENCES substrate_block,
          primary key (contract_address, topic, block_id)
      )
    `)

    await queryRunner.query(`
      INSERT INTO evm_log_idx (block_id, contract_address, topic)
      SELECT block_id,
             evm_log_address,
             jsonb_array_elements_text('["*"]' || evm_log_topics)
      FROM substrate_event 
      WHERE name = 'evm.Log' AND evm_log_address IS NOT NULL 
    `)

    await queryRunner.query(`
      CREATE FUNCTION evm_log_idx_insert_fnc() RETURNS trigger AS
      $$
      BEGIN
          IF (new.name = 'evm.Log' AND new.evm_log_address IS NOT NULL) THEN
              INSERT INTO evm_log_idx (block_id, contract_address, topic)
              SELECT new.block_id, 
                     new.evm_log_address, 
                     jsonb_array_elements_text('["*"]' || new.evm_log_topics)
              ON CONFLICT DO NOTHING;
          END IF;
          RETURN new;
      END;
      $$ LANGUAGE 'plpgsql';
    `)

    await queryRunner.query(`
      CREATE TRIGGER evm_log_idx_on_event
          AFTER INSERT OR UPDATE
          ON substrate_event
          FOR EACH ROW
      EXECUTE PROCEDURE evm_log_idx_insert_fnc()
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER evm_log_idx_on_event`)
    await queryRunner.query(`DROP FUNCTION evm_log_idx_insert_fnc`)
    await queryRunner.query(`DROP TABLE evm_log_idx`)
  }
}
