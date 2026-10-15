-- Run in Supabase SQL Editor after migration 008. All fixture writes roll back.
begin;
set local statement_timeout = '30s';

do $check$
declare
  r record;
  c record;
  owner_id uuid;
begin
  for r in select * from (values
    ('transactions', 'wallet_id', 'wallets', 'transactions_wallet_owner_fkey'),
    ('transactions', 'category_id', 'categories', 'transactions_category_owner_fkey'),
    ('transfers', 'from_wallet_id', 'wallets', 'transfers_from_wallet_owner_fkey'),
    ('transfers', 'to_wallet_id', 'wallets', 'transfers_to_wallet_owner_fkey'),
    ('loans', 'wallet_id', 'wallets', 'loans_wallet_owner_fkey'),
    ('budgets', 'category_id', 'categories', 'budgets_category_owner_fkey')
  ) as expected(table_name, column_name, parent_name, constraint_name)
  loop
    select con.* into c from pg_constraint con
      where con.conrelid = ('public.' || r.table_name)::regclass
      and con.conname = r.constraint_name and con.contype = 'f';
    assert found, 'Missing FK: ' || r.constraint_name;
    assert c.convalidated, 'FK must validate existing rows';
    assert c.confrelid = ('public.' || r.parent_name)::regclass, 'Wrong FK parent';
    assert (select array_agg(a.attname::text order by k.ord)
      from unnest(c.conkey) with ordinality k(num, ord)
      join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num)
      = array[r.column_name, 'user_id'], 'FK must include child owner';
    assert (select array_agg(a.attname::text order by k.ord)
      from unnest(c.confkey) with ordinality k(num, ord)
      join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num)
      = array['id', 'user_id'], 'FK must include parent owner';
  end loop;

  for r in select * from (values
    ('physique_weight_logs'), ('physique_metrics'),
    ('physique_checklists'), ('discipline_logs')
  ) as expected(table_name)
  loop
    assert (select relrowsecurity from pg_class where oid=('public.' || r.table_name)::regclass), 'RLS disabled';
    assert (select attnotnull from pg_attribute where attrelid=('public.' || r.table_name)::regclass and attname='user_id'), 'Owner nullable';
    assert (select count(*) = 1 from pg_policy where polrelid=('public.' || r.table_name)::regclass
      and pg_get_expr(polqual, polrelid) = '(auth.uid() = user_id)'
      and pg_get_expr(polwithcheck, polrelid) = '(auth.uid() = user_id)'), 'Missing owner policy';
  end loop;
  select id into owner_id from auth.users limit 1;
  assert owner_id is not null, 'Requires one existing application user';
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
end $check$;

set local role authenticated;
do $check$
declare
  owner_id uuid := auth.uid();
  stranger_id uuid := gen_random_uuid();
  fixture_id uuid;
  blocked boolean := false;
begin
  insert into public.physique_weight_logs(user_id, weight)
    values (owner_id, 70) returning id into fixture_id;
  assert (select count(*)=1 from public.physique_weight_logs where id=fixture_id), 'Owner cannot read';
  update public.physique_weight_logs set weight=71 where id=fixture_id;
  assert found, 'Owner cannot update';
  begin
    update public.physique_weight_logs set user_id=stranger_id where id=fixture_id;
  exception when insufficient_privilege then blocked := true;
  end;
  assert blocked, 'WITH CHECK allowed ownership change';

  perform set_config('request.jwt.claim.sub', stranger_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', stranger_id, 'role', 'authenticated')::text, true);
  assert not exists(select 1 from public.physique_weight_logs where id=fixture_id), 'Cross-user read allowed';
  update public.physique_weight_logs set weight=72 where id=fixture_id;
  assert not found, 'Cross-user update allowed';
  delete from public.physique_weight_logs where id=fixture_id;
  assert not found, 'Cross-user delete allowed';
  blocked := false;
  begin
    insert into public.physique_weight_logs(user_id, weight) values(owner_id, 72);
  exception when insufficient_privilege then blocked := true;
  end;
  assert blocked, 'Cross-user insert allowed';

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  delete from public.physique_weight_logs where id=fixture_id;
  assert found, 'Owner cannot delete';
end $check$;
reset role;
rollback;
select 'PASS: 6 validated owner FKs, 4 RLS policies, owner CRUD and cross-user isolation; test writes rolled back' as result;
