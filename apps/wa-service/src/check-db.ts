/**
 * Baglanti on kontrolu: `npm run db:check --workspace @wa/service`
 *
 * Servisi ayaga kaldirmadan once baglantiyi ve semanin yerinde oldugunu
 * dogrular. Hatalari tahmin etmek yerine ne yapilmasi gerektigini yaziyor;
 * bu uc hata (yanlis sifre, IPv6 erisimi yok, sema eksik) birbirine cok
 * benzeyen mesajlar uretiyor.
 */
import process from 'node:process'
import { closePool, one, pool } from './db.js'

type Diagnosis = { ok: boolean; message: string; hint?: string }

function diagnose(error: unknown): Diagnosis {
  const code = (error as { code?: string }).code
  const message = error instanceof Error ? error.message : String(error)

  if (code === 'ENOTFOUND' || code === 'ENETUNREACH' || code === 'EHOSTUNREACH') {
    return {
      ok: false,
      message: `Sunucuya ulasilamadi (${code}).`,
      hint:
        'Supabase dogrudan baglantiyi IPv6 uzerinden veriyor. Baglantinizda IPv6 yoksa\n' +
        '   Supabase paneli -> Connect -> Session pooler altindaki dizeyi kopyalayip\n' +
        '   apps/wa-service/.env icindeki DATABASE_URL yerine koyun.',
    }
  }

  if (code === '28P01' || /password authentication failed/i.test(message)) {
    return {
      ok: false,
      message: 'Sifre kabul edilmedi.',
      hint:
        'apps/wa-service/.env icindeki [SIFRENIZ] kismini gercek sifreyle degistirdiniz mi?\n' +
        '   Sifreyi hatirlamiyorsaniz Supabase paneli -> Project Settings -> Database -> Reset password.',
    }
  }

  if (/\[SIFRENIZ\]/.test(message) || /SIFRENIZ/.test(process.env.DATABASE_URL ?? '')) {
    return {
      ok: false,
      message: 'DATABASE_URL hala ornek deger iceriyor.',
      hint: 'apps/wa-service/.env dosyasindaki [SIFRENIZ] kismini doldurun.',
    }
  }

  if (code === 'ETIMEDOUT') {
    return {
      ok: false,
      message: 'Baglanti zaman asimina ugradi.',
      hint: 'Guvenlik duvari 5432 portunu engelliyor olabilir; pooler 6543 portunu deneyin.',
    }
  }

  return { ok: false, message, hint: code ? `Postgres hata kodu: ${code}` : undefined }
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? ''

  if (url.includes('SIFRENIZ')) {
    console.error('✗ DATABASE_URL hala ornek deger iceriyor.')
    console.error('  apps/wa-service/.env dosyasindaki [SIFRENIZ] kismini doldurun.')
    process.exit(1)
  }

  // Host'u yaziyoruz ama sifreyi asla: bu cikti kopyalanip paylasilabilsin.
  const host = url.replace(/:\/\/[^@]*@/, '://***@')
  console.log(`→ Baglaniliyor: ${host}`)

  try {
    const version = await one<{ version: string }>('select version() as version')
    console.log(`✓ Postgres: ${version?.version?.split(',')[0]}`)
  } catch (error) {
    const result = diagnose(error)
    console.error(`✗ ${result.message}`)
    if (result.hint) console.error(`   ${result.hint}`)
    await closePool().catch(() => undefined)
    process.exit(1)
  }

  // Sema yerinde mi? Migrasyonlar uygulanmadiysa servis ilk isde patlar.
  const checks: { label: string; sql: string }[] = [
    { label: 'public.accounts', sql: 'select count(*) from public.accounts' },
    { label: 'public.jobs', sql: 'select count(*) from public.jobs' },
    { label: 'wa.creds', sql: 'select count(*) from wa.creds' },
    { label: 'wa.session_lease', sql: 'select count(*) from wa.session_lease' },
    {
      label: 'wa.claim_jobs()',
      sql: "select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'wa' and p.proname = 'claim_jobs'",
    },
    {
      label: 'accounts.new_chat_quota_total',
      sql: "select 1 from information_schema.columns where table_schema = 'public' and table_name = 'accounts' and column_name = 'new_chat_quota_total'",
    },
  ]

  let missing = 0
  for (const check of checks) {
    try {
      await pool.query(check.sql)
      console.log(`✓ ${check.label}`)
    } catch {
      console.error(`✗ ${check.label} bulunamadi`)
      missing += 1
    }
  }

  await closePool()

  if (missing > 0) {
    console.error('\nSema eksik. `npx supabase db push` ile migrasyonlari uygulayin.')
    process.exit(1)
  }

  console.log('\nHer sey yerinde. `npm run dev:service` ile servisi baslatabilirsiniz.')
}

void main().catch(async (error) => {
  console.error('✗ Beklenmeyen hata:', error)
  await closePool().catch(() => undefined)
  process.exit(1)
})
