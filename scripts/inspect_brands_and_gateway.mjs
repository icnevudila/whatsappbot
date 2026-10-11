import pg from 'pg'

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

  const res = await pool.query(`
    SELECT pi.id, pi.org_id, pi.product_id, pi.public_url, pi.sort_order, p.name 
    FROM org_product_images pi 
    JOIN org_products p ON p.id = pi.product_id 
    WHERE pi.org_id IN ('afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', '4a58b0dd-0931-4901-880a-686457d15010')
  `)
  console.log('=== PRODUCT IMAGES IN DB ===')
  console.log(JSON.stringify(res.rows, null, 2))

  await pool.end()
}

run().catch(console.error)
