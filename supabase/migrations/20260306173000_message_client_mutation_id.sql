alter table public.messages
  add column if not exists client_mutation_id text;

create unique index if not exists idx_messages_sender_client_mutation
  on public.messages(sender_id, client_mutation_id)
  where client_mutation_id is not null;
