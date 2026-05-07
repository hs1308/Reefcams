-- Stream load telemetry — logged by hosted-player/player.js for all users.
-- No auth required to insert; only readable via service role (Supabase dashboard).

create table if not exists stream_load_events (
  id          uuid primary key default gen_random_uuid(),
  video_id    text,
  cam_title   text,
  event       text not null,   -- 'revealed' | 'retried'
  source      text,            -- 'yt_state' | 'yt_info' | 'force_reveal' | 'force_reveal_retry' | 'yt_state_unstarted'
  elapsed_ms  int,             -- ms from load start to this event
  retried     boolean default false,
  created_at  timestamptz default now()
);

alter table stream_load_events enable row level security;

create policy "Anyone can log stream events"
  on stream_load_events for insert
  to anon, authenticated
  with check (true);
