import pg from 'pg'

const BOFE_ORG = 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc'

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const res = await pool.query(
    `UPDATE creatives 
     SET status = 'failed', 
         error = 'Test artifact: Ayvazoğlu brick brief submitted while active org was Bofe during Oct 6 run'
     WHERE org_id = $1 AND (title ILIKE '%ayvazoğlu%' OR title ILIKE '%tuğla%') 
     RETURNING id, title`,
    [BOFE_ORG]
  )
  console.log(`Updated ${res.rows.length} test records to status='failed'.`)
  for (const r of res.rows) {
    console.log(`  ID: ${r.id} | ${r.title}`)
  }
  await pool.end()
}
run().catch(console.error)
