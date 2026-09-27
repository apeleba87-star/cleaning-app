// Field migration test on PGlite with minimal Supabase stubs (auth, storage, extensions, roles).
// Run: npm run test:field
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync } from 'node:fs'

const db = new PGlite({ extensions: { pgcrypto } })

const stub = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, metadata jsonb, UNIQUE (bucket_id, name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON storage.objects TO authenticated;
INSERT INTO auth.users VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
`

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

let pass = 0
let fail = 0
function ok(cond, name) {
  if (cond) { pass++; console.log('  PASS', name) } else { fail++; console.log('  FAIL', name) }
}

async function as(uid, role, sql, params = []) {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '${uid ?? ''}', false); SET ROLE ${role};`)
  try {
    return await db.query(sql, params)
  } finally {
    await db.exec('RESET ROLE')
  }
}

async function expectError(uid, role, sql, params, pattern, name) {
  try {
    await as(uid, role, sql, params)
    ok(false, `${name} (no error)`)
  } catch (e) {
    const matched = pattern.test(e.message)
    if (!matched) console.log('     got:', e.message)
    ok(matched, name)
  }
}

const assetPaths = (cid, pid, id) => {
  const prefix = `companies/${cid}/projects/${pid}/${id}`
  return [`${prefix}.jpg`, `${prefix}_t.webp`]
}

await db.exec(stub)
await db.exec(readFileSync(new URL('../../migrations/field_001_initial.sql', import.meta.url), 'utf8'))
console.log('migration applied')

try {
  console.log('\n[company]')
  const cA = (await as(A, 'authenticated', `SELECT field.create_company('A청소') AS id`)).rows[0].id
  const cB = (await as(B, 'authenticated', `SELECT field.create_company('B청소') AS id`)).rows[0].id
  ok(cA && cB, 'create_company for A and B')
  await expectError(A, 'authenticated', `SELECT field.create_company('again')`, [], /company_already_exists/, 'second company rejected')
  await expectError(A, 'authenticated', `INSERT INTO field.company_members (company_id, user_id) VALUES ($1, $2)`, [cB, A], /permission denied/, 'cannot join other company directly')
  await expectError(A, 'authenticated', `UPDATE field.companies SET max_photos_per_project = 99999`, [], /permission denied/, 'cannot raise own photo limit')

  console.log('\n[projects isolation]')
  const pA = (await as(A, 'authenticated',
    `INSERT INTO field.projects (company_id, title, service_type_code, region_sido_code, region_sigungu_code, region_sido_name, region_sigungu_name)
     VALUES ($1, '강남 입주청소', 'MOVE_IN', '11', '11680', '서울특별시', '강남구') RETURNING id`, [cA])).rows[0].id
  ok(pA, 'A creates project')
  await expectError(A, 'authenticated', `INSERT INTO field.projects (company_id, title, service_type_code) VALUES ($1, 'x', 'ETC')`, [cB], /row-level security/, 'A cannot create project in B company')
  await expectError(A, 'authenticated', `INSERT INTO field.projects (company_id, title, service_type_code) VALUES ($1, 'x', 'NOPE')`, [cA], /foreign key/, 'unknown service type rejected')
  await expectError(A, 'authenticated', `INSERT INTO field.projects (company_id, title, service_type_code, region_sido_code, region_sigungu_code) VALUES ($1, 'x', 'ETC', '11', '26110')`, [cA], /region_code_consistent/, 'inconsistent region codes rejected')
  const bSees = await as(B, 'authenticated', `SELECT count(*)::int AS n FROM field.projects`)
  ok(bSees.rows[0].n === 0, 'B sees none of A projects')
  await expectError(A, 'authenticated', `UPDATE field.projects SET company_id = $1 WHERE id = $2`, [cB, pA], /permission denied/, 'cannot change company_id')
  const bUpd = await as(B, 'authenticated', `UPDATE field.projects SET title = 'hacked' WHERE id = $1`, [pA])
  ok(bUpd.affectedRows === 0, 'B update on A project affects 0 rows')

  await as(A, 'authenticated', `INSERT INTO field.project_private_details (project_id, company_id, customer_name, customer_phone, address_road, address_detail) VALUES ($1, $2, '홍길동', '010-1234-5678', '서울 강남구 테헤란로 1', '101동 1001호')`, [pA, cA])
  ok(true, 'A stores private details')

  console.log('\n[areas / pairs]')
  const aA = (await as(A, 'authenticated', `INSERT INTO field.areas (company_id, project_id, name) VALUES ($1, $2, '거실') RETURNING id`, [cA, pA])).rows[0].id
  const pp1 = (await as(A, 'authenticated', `INSERT INTO field.photo_pairs (company_id, project_id, area_id) VALUES ($1, $2, $3) RETURNING id`, [cA, pA, aA])).rows[0].id
  const pp2 = (await as(A, 'authenticated', `INSERT INTO field.photo_pairs (company_id, project_id, area_id) VALUES ($1, $2, $3) RETURNING id`, [cA, pA, aA])).rows[0].id
  ok(aA && pp1 && pp2, 'A creates area and pairs')
  await as(B, 'authenticated', `INSERT INTO field.projects (company_id, title, service_type_code) VALUES ($1, 'B현장', 'OFFICE')`, [cB])
  await expectError(B, 'authenticated', `INSERT INTO field.areas (company_id, project_id, name) VALUES ($1, $2, 'x')`, [cB, pA], /company_mismatch/, 'B cannot attach area to A project')

  console.log('\n[media upload flow]')
  const m1 = '11111111-1111-4111-8111-111111111111'
  const [full1, thumb1] = assetPaths(cA, pA, m1)
  const insertMedia = `INSERT INTO field.media_assets (id, company_id, project_id, photo_pair_id, role, storage_path, thumb_path, mime_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'image/jpeg') ON CONFLICT (id) DO NOTHING`
  await as(A, 'authenticated', insertMedia, [m1, cA, pA, pp1, 'before', full1, thumb1])
  ok(true, 'A inserts pending asset')
  await as(A, 'authenticated', insertMedia, [m1, cA, pA, pp1, 'before', full1, thumb1])
  const cnt = await db.query(`SELECT count(*)::int AS n FROM field.media_assets WHERE id = $1`, [m1])
  ok(cnt.rows[0].n === 1, 'retry insert is idempotent')
  await expectError(A, 'authenticated', insertMedia, ['22222222-2222-4222-8222-222222222222', cA, pA, pp1, 'after', `companies/${cB}/x.jpg`, 'x_t.webp'], /invalid_storage_path/, 'wrong storage path rejected')
  const m3 = '33333333-3333-4333-8333-333333333333'
  await expectError(A, 'authenticated',
    `INSERT INTO field.media_assets (id, company_id, project_id, photo_pair_id, role, storage_path, thumb_path, mime_type, status) VALUES ($1,$2,$3,$4,'after',$5,$6,'image/jpeg','uploaded')`,
    [m3, cA, pA, pp1, ...assetPaths(cA, pA, m3)], /row-level security/, 'cannot insert as uploaded')
  await expectError(A, 'authenticated', `UPDATE field.media_assets SET status = 'uploaded' WHERE id = $1`, [m1], /permission denied/, 'cannot set status directly')
  await expectError(A, 'authenticated', `SELECT field.mark_asset_uploaded($1)`, [m1], /file_missing/, 'mark fails without files')

  const objInsert = `INSERT INTO storage.objects (bucket_id, name, metadata) VALUES ('project-media', $1, $2)`
  await expectError(B, 'authenticated', objInsert, [full1, { size: 200000, mimetype: 'image/jpeg' }], /row-level security/, 'B cannot upload into A path')
  await expectError(A, 'authenticated', objInsert, [`companies/${cA}/projects/${pA}/evil.png`, { size: 1, mimetype: 'image/png' }], /row-level security/, 'bad filename rejected by storage policy')
  await as(A, 'authenticated', objInsert, [full1, { size: 210000, mimetype: 'image/jpeg' }])
  await as(A, 'authenticated', objInsert, [thumb1, { size: 18000, mimetype: 'image/webp' }])
  const marked = await as(A, 'authenticated', `SELECT field.mark_asset_uploaded($1) AS s`, [m1])
  ok(marked.rows[0].s === 'uploaded', 'mark succeeds with files')
  const sized = await db.query(`SELECT size_bytes, thumb_size_bytes FROM field.media_assets WHERE id = $1`, [m1])
  ok(sized.rows[0].size_bytes === 210000 && sized.rows[0].thumb_size_bytes === 18000, 'sizes taken from storage metadata')
  await expectError(B, 'authenticated', `SELECT field.mark_asset_uploaded($1)`, [m1], /asset_not_found/, 'B cannot mark A asset')
  const bObj = await as(B, 'authenticated', `SELECT count(*)::int AS n FROM storage.objects`)
  ok(bObj.rows[0].n === 0, 'B cannot list A files')
  const m4 = '44444444-4444-4444-8444-444444444444'
  await expectError(A, 'authenticated', insertMedia, [m4, cA, pA, pp1, 'before', ...assetPaths(cA, pA, m4)], /media_assets_pair_role_uq/, 'second before photo on same pair rejected')

  console.log('\n[photo limit]')
  await db.query(`UPDATE field.companies SET max_photos_per_project = 1 WHERE id = $1`, [cA])
  const m5 = '55555555-5555-4555-8555-555555555555'
  await expectError(A, 'authenticated', insertMedia, [m5, cA, pA, pp2, 'before', ...assetPaths(cA, pA, m5)], /photo_limit_exceeded/, 'company limit enforced')
  await db.query(`UPDATE field.companies SET max_photos_per_project = NULL WHERE id = $1`, [cA])
  const lim = await db.query(`SELECT field.photo_limit_per_project($1) AS n`, [cA])
  ok(lim.rows[0].n === 1000, 'default limit is 1000')

  console.log('\n[report share]')
  const share = (await as(A, 'authenticated', `SELECT * FROM field.create_report_share($1)`, [pA])).rows[0]
  ok(/^[A-Za-z0-9_-]{43}$/.test(share.token), 'token is 43 char base64url')
  const stored = await db.query(`SELECT encode(token_hash, 'hex') AS h FROM field.report_shares WHERE id = $1`, [share.share_id])
  ok(stored.rows[0].h.length === 64, 'only sha256 hash stored')
  await expectError(B, 'authenticated', `SELECT * FROM field.create_report_share($1)`, [pA], /project_not_found/, 'B cannot share A project')

  const rep = await as(null, 'anon', `SELECT field.get_report($1) AS r`, [share.token])
  const r = rep.rows[0].r
  ok(r && r.company_name === 'A청소' && r.service_type === '입주청소' && r.region === '서울특별시 강남구', 'anon gets report header')
  ok(r.pairs.length === 1 && r.pairs[0].before.thumb_path.endsWith('_t.webp') && r.total_pairs === 1, 'report includes uploaded pair only')
  const json = JSON.stringify(r)
  ok(!json.includes('홍길동') && !json.includes('010-') && !json.includes('테헤란로') && !json.includes('1001호'), 'no private details in report')
  await expectError(null, 'anon', `SELECT * FROM field.projects`, [], /permission denied/, 'anon cannot read tables')
  await expectError(null, 'anon', `SELECT field.create_report_share($1)`, [pA], /permission denied/, 'anon cannot create share')
  await expectError(null, 'anon', `SELECT * FROM field._resolve_share($1)`, [share.token], /permission denied/, 'anon cannot call internal function')
  const bad = await as(null, 'anon', `SELECT field.get_report($1) AS r`, ['x'.repeat(43)])
  ok(bad.rows[0].r === null, 'unknown token returns null')
  const media = await as(null, 'anon', `SELECT field.get_report_media($1, 0, 24) AS r`, [share.token])
  ok(Array.isArray(media.rows[0].r) && media.rows[0].r.length === 1, 'get_report_media returns page')
  const views = await db.query(`SELECT view_count FROM field.report_shares WHERE id = $1`, [share.share_id])
  ok(views.rows[0].view_count === 1, 'view counted once (media page does not count)')

  await as(A, 'authenticated', `UPDATE field.report_shares SET status = 'revoked' WHERE id = $1`, [share.share_id])
  const revoked = await as(null, 'anon', `SELECT field.get_report($1) AS r`, [share.token])
  ok(revoked.rows[0].r === null, 'revoked link returns null')
  const rv = await db.query(`SELECT revoked_at FROM field.report_shares WHERE id = $1`, [share.share_id])
  ok(rv.rows[0].revoked_at !== null, 'revoked_at set by trigger')
  await expectError(A, 'authenticated', `UPDATE field.report_shares SET status = 'active' WHERE id = $1`, [share.share_id], /row-level security/, 'cannot reactivate revoked link')

  console.log('\n[soft delete]')
  const share2 = (await as(A, 'authenticated', `SELECT * FROM field.create_report_share($1)`, [pA])).rows[0]
  await as(A, 'authenticated', `UPDATE field.projects SET deleted_at = now() WHERE id = $1`, [pA])
  const gone = await as(null, 'anon', `SELECT field.get_report($1) AS r`, [share2.token])
  ok(gone.rows[0].r === null, 'deleted project report returns null')
} catch (e) {
  fail++
  console.log('  UNEXPECTED ERROR:', e.message, e.where ?? '')
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
