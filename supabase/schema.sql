-- ============================================
-- ReefCams Schema
-- Run this in your Supabase SQL editor
-- ============================================

-- 1. CAM CATALOG
create table if not exists reefcams_catalog (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  youtube_url       text not null,
  category          text not null,
  thumbnail_url     text,
  is_active         boolean default true,
  -- Phase 2: scheduling fields
  live_start_time   time,       -- UTC time when live stream starts
  live_end_time     time,       -- UTC time when live stream ends
  day_start_time    time,       -- UTC time when daytime begins at cam location
  day_end_time      time,       -- UTC time when daytime ends at cam location
  created_at        timestamptz default now()
);

-- 2. USERS (mirrors auth.users)
create table if not exists reefcams_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  created_at  timestamptz default now()
);

-- 3. USER CAM LIST
create table if not exists reefcams_user_cams (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references reefcams_users(id) on delete cascade,
  cam_id          uuid not null references reefcams_catalog(id) on delete cascade,
  display_order   int default 0,
  created_at      timestamptz default now(),
  unique(user_id, cam_id)
);

-- ============================================
-- Row Level Security
-- ============================================

alter table reefcams_catalog enable row level security;
alter table reefcams_users enable row level security;
alter table reefcams_user_cams enable row level security;

-- Catalog: anyone authenticated can read active cams
create policy "Authenticated can view active cams"
  on reefcams_catalog for select
  to authenticated
  using (is_active = true);

-- Users: can only read/update their own row
create policy "Users can view own profile"
  on reefcams_users for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on reefcams_users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on reefcams_users for update
  using (auth.uid() = id);

-- User cams: full CRUD on own rows only
create policy "Users can view own cams"
  on reefcams_user_cams for select
  using (auth.uid() = user_id);

create policy "Users can add cams"
  on reefcams_user_cams for insert
  with check (auth.uid() = user_id);

create policy "Users can remove cams"
  on reefcams_user_cams for delete
  using (auth.uid() = user_id);

create policy "Users can reorder cams"
  on reefcams_user_cams for update
  using (auth.uid() = user_id);

-- ============================================
-- Trigger: auto-create user profile on signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.reefcams_users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
