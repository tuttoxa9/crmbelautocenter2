import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_j7eSMifBFtd3@ep-curly-brook-ascm3kjp-pooler.c-4.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require');

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS ad_cars (
      id VARCHAR(64) PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log('Successfully created ad_cars table in Neon PostgreSQL!');
}

run().catch(console.error);
