const { neon } = require('@neondatabase/serverless');
async function run() {
  const sql = neon("postgresql://neondb_owner:npg_j7eSMifBFtd3@ep-curly-brook-ascm3kjp-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require");
  const rows = await sql`SELECT id, data FROM ad_cars WHERE data::text ILIKE '%meriva%'`;
  console.log(JSON.stringify(rows, null, 2));
}
run();
