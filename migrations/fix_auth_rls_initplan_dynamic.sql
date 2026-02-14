-- Supabase Performance Advisor: auth_rls_initplan 동적 수정
-- users, stores, companies 등 코드베이스에 정의 없는 정책을 pg_policy에서 읽어 auth.uid() → (select auth.uid()) 로 치환
-- fix_auth_rls_initplan.sql 실행 후, 남은 auth_rls_initplan 경고를 해결하기 위해 실행

DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_with_check TEXT;
  cmd_str TEXT;
  create_sql TEXT;
BEGIN
  -- 루프 중 DROP으로 pg_policy 변경 방지: TEMP 테이블에 수정 대상만 먼저 수집
  CREATE TEMP TABLE IF NOT EXISTS _auth_rls_fix_targets (
    schemaname name, tablename name, policyname name, polcmd "char",
    polpermissive boolean, qual text, with_check text, restrict_roles text
  );
  TRUNCATE _auth_rls_fix_targets;

  INSERT INTO _auth_rls_fix_targets
  SELECT
    n.nspname,
    c.relname,
    p.polname,
    p.polcmd,
    p.polpermissive,
    pg_get_expr(p.polqual, p.polrelid),
    pg_get_expr(p.polwithcheck, p.polrelid),
      (
        SELECT string_agg(quote_ident(rolname), ', ')
        FROM pg_roles
        WHERE oid = ANY(p.polroles)
      )
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT IN ('store_assign', 'stores')  -- 정적 마이그레이션에서 처리, DROP 실패 방지
  AND (
    (pg_get_expr(p.polqual, p.polrelid) ~ 'auth\.uid\(\)' AND (pg_get_expr(p.polqual, p.polrelid) IS NULL OR pg_get_expr(p.polqual, p.polrelid) !~ '\(select auth\.uid\(\)\)'))
    OR (pg_get_expr(p.polwithcheck, p.polrelid) ~ 'auth\.uid\(\)' AND (pg_get_expr(p.polwithcheck, p.polrelid) IS NULL OR pg_get_expr(p.polwithcheck, p.polrelid) !~ '\(select auth\.uid\(\)\)'))
    OR (pg_get_expr(p.polqual, p.polrelid) ~ 'auth\.jwt\(\)' AND (pg_get_expr(p.polqual, p.polrelid) IS NULL OR pg_get_expr(p.polqual, p.polrelid) !~ '\(select auth\.jwt\(\)\)'))
    OR (pg_get_expr(p.polwithcheck, p.polrelid) ~ 'auth\.jwt\(\)' AND (pg_get_expr(p.polwithcheck, p.polrelid) IS NULL OR pg_get_expr(p.polwithcheck, p.polrelid) !~ '\(select auth\.jwt\(\)\)'))
  );

  FOR r IN SELECT * FROM _auth_rls_fix_targets
  LOOP
    new_qual := r.qual;
    new_with_check := r.with_check;

    -- auth.uid() → (select auth.uid()) 치환
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, 'auth\.uid\(\)', '(select auth.uid())', 'g');
    END IF;
    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check, 'auth\.uid\(\)', '(select auth.uid())', 'g');
    END IF;

    -- auth.jwt() → (select auth.jwt()) 치환
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, 'auth\.jwt\(\)', '(select auth.jwt())', 'g');
    END IF;
    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check, 'auth\.jwt\(\)', '(select auth.jwt())', 'g');
    END IF;

    -- polcmd: r=SELECT, a=INSERT, w=UPDATE, d=DELETE, *=ALL
    cmd_str := CASE r.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
      ELSE 'ALL'
    END;

    -- DROP POLICY
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    -- CREATE POLICY
    create_sql := format(
      'CREATE POLICY %I ON %I.%I FOR %s',
      r.policyname, r.schemaname, r.tablename, cmd_str
    );

    IF r.polpermissive = FALSE THEN
      create_sql := create_sql || ' AS RESTRICTIVE';
    END IF;

    IF r.restrict_roles IS NOT NULL AND r.restrict_roles != '' THEN
      create_sql := create_sql || ' TO ' || r.restrict_roles;
    END IF;

    IF new_qual IS NOT NULL AND new_qual != '' THEN
      create_sql := create_sql || ' USING (' || replace(new_qual, '''', '''''') || ')';
    END IF;

    IF new_with_check IS NOT NULL AND new_with_check != '' AND r.polcmd IN ('a', 'w', '*') THEN
      create_sql := create_sql || ' WITH CHECK (' || replace(new_with_check, '''', '''''') || ')';
    END IF;

    create_sql := create_sql || ';';

    BEGIN
      EXECUTE create_sql;
      RAISE NOTICE 'Fixed policy %.% on %.%', r.schemaname, r.policyname, r.schemaname, r.tablename;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to recreate policy %.% on %.%: %', r.schemaname, r.policyname, r.schemaname, r.tablename, SQLERRM;
    END;
  END LOOP;
END $$;
