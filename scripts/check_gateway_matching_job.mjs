async function run() {
  const res = await fetch('http://167.233.201.31:3456/health')
  const json = await res.json()
  const jobs = json.activeJobs || []
  console.log('Total active/recent jobs in gateway:', jobs.length)
  for (const j of jobs) {
    if (JSON.stringify(j).includes('1890c3da')) {
      console.log('Found matching job:', JSON.stringify(j, null, 2))
    }
  }
}
run().catch(console.error)
