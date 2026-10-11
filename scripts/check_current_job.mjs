import pg from 'pg'

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const res = await pool.query(
    "SELECT id, status, payload FROM creatives WHERE id = '1890c3da-c28f-5ff0-aa4a-017cec853856'"
  )
  const r = res.rows[0]
  console.log('lastImageJob:', r?.payload?.lastImageJob)
  console.log('imageTerminalFailure:', r?.payload?.imageTerminalFailure)
  await pool.end()
}
run().catch(console.error)
