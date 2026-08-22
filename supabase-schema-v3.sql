-- Create channel_members table for private/hidden channels
create table if not exists public.channel_members (
  channel_id uuid references public.channels(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (channel_id, user_id)
);

-- Enable RLS
alter table public.channel_members enable row level security;

-- Policies for channel_members
create policy "Anyone can read channel_members"
  on public.channel_members for select
  using (true);

create policy "Users can insert channel_members"
  on public.channel_members for insert
  with check (auth.uid() is not null);

create policy "Users can delete channel_members"
  on public.channel_members for delete
  using (auth.uid() is not null);

-- Also, update the channels RLS to allow reading ALL channels (since filtering will be done via UI/Code for simplicity, or we can enforce it here, but public.channels read is already true)
-- We will handle visibility logic in the UI/API for now to avoid breaking existing queries.
