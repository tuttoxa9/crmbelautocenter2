import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_j7eSMifBFtd3@ep-curly-brook-ascm3kjp-pooler.c-4.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require');

async function run() {
  const carsColumns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'cars'
  `;
  console.log('cars columns:', carsColumns);

  const settingsRows = await sql`SELECT * FROM settings`;
  console.log('settings rows:', settingsRows);
}

run().catch(console.error);
