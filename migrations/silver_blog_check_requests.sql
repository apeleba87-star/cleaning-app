create table if not exists public.silver_blog_check_requests (
  id uuid primary key default gen_random_uuid(),
  center_name text,
  role text not null check (role in ('원장님', '직원', '기타')),
  phone text not null,
  privacy_agreed boolean not null default false,
  privacy_agreed_at timestamptz,
  source_page text not null default 'silver-consulting',
  status text not null default 'submitted' check (status in ('submitted', 'contacted', 'completed', 'archived')),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.silver_blog_check_requests
  add column if not exists center_name text;

alter table public.silver_blog_check_requests
  add column if not exists privacy_agreed boolean not null default false;

alter table public.silver_blog_check_requests
  add column if not exists privacy_agreed_at timestamptz;

alter table public.silver_blog_check_requests enable row level security;

drop policy if exists "silver_blog_check_requests_admin_all" on public.silver_blog_check_requests;

create index if not exists idx_silver_blog_check_requests_created_at
  on public.silver_blog_check_requests (created_at desc);
