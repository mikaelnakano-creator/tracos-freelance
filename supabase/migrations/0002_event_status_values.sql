do $$
begin
  alter type public.event_status add value if not exists 'partially_assigned';
  alter type public.event_status add value if not exists 'fully_assigned';
exception when duplicate_object then null;
end $$;
