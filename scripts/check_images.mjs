import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_j7eSMifBFtd3@ep-curly-brook-ascm3kjp-pooler.c-4.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require');

async function run() {
  const rows = await sql`SELECT id, data FROM cars LIMIT 10`;
  rows.forEach((r, i) => {
    let d = r.data;
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch(e) {}
    }
    console.log(`Car #${i+1}: ${d.make || d.brand} ${d.model}`);
    console.log('  All keys:', Object.keys(d));
    console.log('  images:', d.images);
    console.log('  imageUrls:', d.imageUrls);
    console.log('  photos:', d.photos);
  });
}

run().catch(console.error);
