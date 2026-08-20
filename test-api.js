const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon("postgresql://neondb_owner:npg_j7eSMifBFtd3@ep-curly-brook-ascm3kjp-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require");
  const rows = await sql`SELECT id, data FROM cars`;

  const availableCars = rows
    .map((row) => {
      let d = row.data;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch (e) { d = {}; }
      }
      if (!d || typeof d !== 'object') d = {};

      const make = d.make || d.brand || d.mark || '';
      const model = d.model || '';
      const name = `${make} ${model}`.trim() || d.name || d.title || 'Unknown';
      const year = d.year || '';
      const priceUsd = Number(d.priceUsd || d.priceUSD || d.price || d.price_usd || 0);
      const isSold = d.status === 'sold' || d.isAvailable === false || d.is_available === false;
      
      return { id: row.id, name, year, priceUsd, isSold };
    })
    .filter((c) => !c.isSold && c.priceUsd > 0);

  const meriva = availableCars.filter(c => c.name.toLowerCase().includes('meriva'));
  console.log("Found in catalog:", meriva);
}
run();
