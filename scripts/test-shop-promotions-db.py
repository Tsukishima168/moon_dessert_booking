#!/usr/bin/env python3
"""Native PostgreSQL invariants; creates its own Unix-socket-only disposable cluster.
Never accepts a connection string or reads a production env file.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, os, shutil, subprocess, tempfile, uuid

repo = Path(__file__).resolve().parents[1]
required = ['initdb', 'pg_ctl', 'psql']
for name in required:
    if not shutil.which(name): raise SystemExit(f'{name} unavailable: database verification NOT RUN')
env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
results = []
def check(name, condition):
    assert condition, name
    results.append(name)

with tempfile.TemporaryDirectory(prefix='shop-promo-pg-') as directory:
    root = Path(directory); data = root / 'data'; socket = root / 'socket'; socket.mkdir(mode=0o700)
    subprocess.run(['initdb', '-D', str(data), '-A', 'trust', '--no-locale', '--encoding=UTF8'], env=env, check=True, capture_output=True)
    subprocess.run(['pg_ctl', '-D', str(data), '-l', str(root/'server.log'), '-o', f"-h '' -k {socket} -p 55439", '-w', 'start'], env=env, check=True, capture_output=True)
    args = ['psql', '-X', '-h', str(socket), '-p', '55439', '-d', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1']
    def sql(text, ok=True):
        result = subprocess.run(args + ['-c', text], env=env, capture_output=True, text=True)
        if ok and result.returncode: raise AssertionError(result.stderr)
        return result.stdout.strip() if ok else result.returncode != 0
    try:
        sql('''CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
        CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
        CREATE EXTENSION "uuid-ossp";
        CREATE TABLE public.promo_codes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL,
          description text, discount_type text, discount_value numeric, min_order_amount numeric DEFAULT 0,
          max_uses integer, used_count integer DEFAULT 0, valid_from timestamptz DEFAULT now(), valid_until timestamptz, is_active boolean DEFAULT true);
        CREATE TABLE public.orders(order_id text UNIQUE, user_id uuid, promo_code text, checkout_site text, status text);
        GRANT SELECT(code), UPDATE(used_count) ON public.promo_codes TO anon;
        ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
        CREATE POLICY old_open ON public.promo_codes FOR ALL USING(true) WITH CHECK(true);
        INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');''')
        for file in ['20260129000001_create_banners.sql', '20260129000002_banner_rpc_functions.sql', '20261013230000_shop_promotions.sql']:
            subprocess.run(args + ['-f', str(repo/'supabase/migrations'/file)], env=env, check=True, capture_output=True, text=True)
        check('anon table and column privileges revoked', sql("SELECT has_table_privilege('anon','public.promo_codes','UPDATE') OR has_column_privilege('anon','public.promo_codes','used_count','UPDATE') OR has_column_privilege('anon','public.promo_codes','code','SELECT')") == 'f')
        check('member and analytics ledgers private', sql("SET ROLE anon; SELECT * FROM public.shop_promo_usages", False) and sql("SET ROLE authenticated; SELECT * FROM public.shop_banner_events", False))
        check('anonymous cannot forge member reservation', sql("SET ROLE anon; SELECT public.reserve_shop_promo_usage('TEST',600,'00000000-0000-4000-8000-000000000001','ORD-0000000000000001',50)", False))
        check('authenticated cannot forge another member', sql("SET ROLE authenticated; SELECT public.reserve_shop_promo_usage('TEST',600,'00000000-0000-4000-8000-000000000002','ORD-0000000000000001',50)", False))
        check('legacy direct banner counters denied', sql("SET ROLE anon; SELECT public.increment_banner_views(gen_random_uuid())", False))
        sql("INSERT INTO promo_codes(code,discount_type,discount_value,max_uses) VALUES ('GLOBAL','fixed',50,3),('MEMBER','fixed',50,NULL),('PERCENT','percentage',12,NULL),('EXPIRED','fixed',50,NULL),('LEGACY','fixed',50,NULL),('PRICE','fixed',50,NULL),('DECIMAL','percentage',9.2,NULL)")
        sql("UPDATE promo_codes SET member_only=true,per_member_limit=1 WHERE code IN ('MEMBER','LEGACY'); UPDATE promo_codes SET valid_until=now()-interval '1 day' WHERE code='EXPIRED'")
        owner = "'00000000-0000-4000-8000-000000000001'"
        other = "'00000000-0000-4000-8000-000000000002'"
        def reserve(code, n, who='NULL', amount=600, discount=50):
            return json.loads(sql(f"SET ROLE service_role; SELECT public.reserve_shop_promo_usage('{code}',{amount},{who},'ORD-{n:016X}',{discount})"))
        with ThreadPoolExecutor(max_workers=8) as pool: wins = list(pool.map(lambda n: reserve('GLOBAL',n), range(1,9)))
        check('8 concurrent clients respect total quota of 3', sum(x['ok'] for x in wins) == 3 and sql("SELECT used_count FROM promo_codes WHERE code='GLOBAL'") == '3')
        with ThreadPoolExecutor(max_workers=8) as pool: member = list(pool.map(lambda n: reserve('MEMBER',n,owner), range(20,28)))
        check('8 concurrent member clients consume only one allowance', sum(x['ok'] for x in member) == 1)
        winner = next(n for n,x in zip(range(20,28),member) if x['ok'])
        saved = reserve('MEMBER',winner,owner)
        check('same reservation retry is idempotent', saved['ok'] and sql("SELECT used_count FROM promo_codes WHERE code='MEMBER'") == '1')
        check('same order cannot switch member', not reserve('MEMBER',winner,other)['ok'])
        check('member-only rejects guest', not reserve('MEMBER',40)['ok'])
        check('different member has independent allowance', reserve('MEMBER',41,other)['ok'])
        check('expired code rejects and does not consume', not reserve('EXPIRED',42)['ok'] and sql("SELECT used_count FROM promo_codes WHERE code='EXPIRED'") == '0')
        check('changed discount rejects and does not consume', not reserve('PRICE',43,discount=51)['ok'] and sql("SELECT used_count FROM promo_codes WHERE code='PRICE'") == '0')
        check('12 percent off calculates 8.8 fold pricing', reserve('PERCENT',44,discount=72)['ok'])
        check('decimal half boundary accepts exactly 35 TWD', reserve('DECIMAL',46,amount=375,discount=35)['ok'])
        sql(f"INSERT INTO orders VALUES ('LEGACY-ORDER',{owner},'LEGACY','shop','paid')")
        check('legacy-used code cannot rename in the database', sql("UPDATE promo_codes SET code='RENAMED' WHERE code='LEGACY'", False))
        check('new-ledger-used code cannot rename in the database', sql("UPDATE promo_codes SET code='RENAMED' WHERE code='MEMBER'", False))
        check('pre-migration member order counted', not reserve('LEGACY',45,owner)['ok'])
        sql(f"INSERT INTO orders VALUES ('ORD-{winner:016X}',{owner},'MEMBER','shop','pending')")
        check('uncertain committed order cannot release allowance', sql(f"SET ROLE service_role; SELECT public.release_shop_promo_usage('{saved['id']}')") == 'f')
        sql(f"DELETE FROM orders WHERE order_id='ORD-{winner:016X}'")
        check('known rollback releases allowance', sql(f"SET ROLE service_role; SELECT public.release_shop_promo_usage('{saved['id']}')") == 't')
        check('repeated release does not decrement twice', sql(f"SET ROLE service_role; SELECT public.release_shop_promo_usage('{saved['id']}')") == 't' and sql("SELECT used_count FROM promo_codes WHERE code='MEMBER'") == '1')
        sql("INSERT INTO banners(id,title,is_active) VALUES ('00000000-0000-4000-8000-000000000010','offline fixture',true),('00000000-0000-4000-8000-000000000011','inactive fixture',false)")
        impression = str(uuid.uuid4())
        def event(action, banner='00000000-0000-4000-8000-000000000010'):
            return sql(f"SET ROLE service_role; SELECT public.record_shop_banner_event('{banner}','{impression}','{action}','{'a'*64}')")
        with ThreadPoolExecutor(max_workers=8) as pool: views = list(pool.map(lambda _: event('view'),range(8)))
        check('concurrent duplicate impressions count once', views.count('t') == 1)
        with ThreadPoolExecutor(max_workers=8) as pool: clicks = list(pool.map(lambda _: event('click'),range(8)))
        check('concurrent duplicate interactions count once', clicks.count('t') == 1 and sql("SELECT view_count||','||click_count FROM banners WHERE title='offline fixture'") == '1,1')
        check('inactive announcement cannot count', event('view','00000000-0000-4000-8000-000000000011') == 'f')
        impression = str(uuid.uuid4()); event('click')
        check('click arriving before view creates one coherent impression', sql("SELECT view_count||','||click_count FROM banners WHERE title='offline fixture'") == '2,2')
        def rate_event(n):
            return sql(f"SET ROLE service_role; SELECT public.record_shop_banner_event('00000000-0000-4000-8000-000000000010','{uuid.uuid4()}','view','{'b'*64}')")
        with ThreadPoolExecutor(max_workers=8) as pool: rate_calls = list(pool.map(rate_event,range(40)))
        check('40 concurrent attempts respect 30-per-minute bucket', rate_calls.count('t') == 30)
        check('rate ledger stays private', sql('SET ROLE anon; SELECT * FROM public.shop_banner_rate_limits',False))
        check('banner title/button/details persist', sql("UPDATE banners SET link_text='選購甜點',details='活動規則',promo_code='MEMBER' WHERE title='offline fixture'; SELECT link_text||','||details||','||promo_code FROM banners WHERE title='offline fixture'") == '選購甜點,活動規則,MEMBER')
        print(json.dumps({'passed':len(results),'checks':results,'database':'isolated native PostgreSQL, Unix socket only','production_writes':0}, ensure_ascii=False, indent=2))
    finally:
        subprocess.run(['pg_ctl','-D',str(data),'-m','fast','-w','stop'], env=env, capture_output=True, check=True)
