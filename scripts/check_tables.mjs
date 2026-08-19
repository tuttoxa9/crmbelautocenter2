import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_j7eSMifBFtd3@ep-curly-brook-ascm3kjp-pooler.c-4.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require');

async function run() {
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  console.log('Existing tables in Neon DB:', tables.map(t => t.table_name));
}

run().catch(console.error);
