create table if not exists reefcams_notifications (
  id          text primary key,   -- bump this per batch, used as dismissal key
  message     text not null,
  is_active   boolean default false,
  created_at  timestamptz default now()
);

alter table reefcams_notifications enable row level security;

create policy "Authenticated users can read active notifications"
  on reefcams_notifications for select
  to authenticated
  using (is_active = true);

-- First notification
insert into reefcams_notifications (id, message, is_active) values
  ('batch-birds-pets-may2026', 'New cams: birds, kittens, puppies 🐦', true);
