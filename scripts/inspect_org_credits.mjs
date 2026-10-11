import pg from 'pg'

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const res = await pool.query(
    `SELECT id, name, plan, monthly_message_quota, accounts_quota, ai_image_mode 
     FROM organizations 
     WHERE id IN ('afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', '4a58b0dd-0931-4901-880a-686457d15010')`
  )
  console.log('Organizations:', res.rows)
  await pool.end()
}
run().catch(console.error)
