import pg from 'pg'

const BOFE_ORG = 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc'
const AYVAZ_ORG = '4a58b0dd-0931-4901-880a-686457d15010'

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

  const bofeContaminated = await pool.query(
    `SELECT id, org_id, title, created_at FROM creatives 
     WHERE org_id = $1 AND (title ILIKE '%ayvazoğlu%' OR title ILIKE '%tuğla%')`,
    [BOFE_ORG]
  )
  console.log('Bofe records containing Ayvazoğlu/Tuğla:', bofeContaminated.rows.length)
  for (const r of bofeContaminated.rows) {
    console.log(`  Bofe row ID: ${r.id} | ${r.title}`)
  }

  const ayvazContaminated = await pool.query(
    `SELECT id, org_id, title, created_at FROM creatives 
     WHERE org_id = $1 AND (title ILIKE '%bofe%' OR title ILIKE '%ilaçlama%')`,
    [AYVAZ_ORG]
  )
  console.log('Ayvazoğlu records containing Bofe/İlaçlama:', ayvazContaminated.rows.length)
  for (const r of ayvazContaminated.rows) {
    console.log(`  Ayvazoğlu row ID: ${r.id} | ${r.title}`)
  }

  await pool.end()
}
run().catch(console.error)
