import { MigrationInterface, QueryRunner } from "typeorm"

export class ChartTagIsKeyChartNonNull1675374345914
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
        UPDATE chart_tags
        SET isKey = 0
        WHERE isKey IS NULL`)

        queryRunner.query(`
        ALTER TABLE chart_tags
        MODIFY COLUMN isKey TINYINT UNSIGNED NOT NULL DEFAULT FALSE`)

        queryRunner.query(`
        ALTER TABLE chart_tags
        RENAME COLUMN isKey TO isKeyChart`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`
        ALTER TABLE chart_tags
        RENAME COLUMN isKeyChart TO isKey`)

        queryRunner.query(`
        ALTER TABLE chart_tags
        MODIFY COLUMN isKey TINYINT UNSIGNED`)
    }
}
