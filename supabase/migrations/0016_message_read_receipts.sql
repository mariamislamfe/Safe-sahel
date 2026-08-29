-- Safe Sahel — read receipts for chat
--
-- messages had SELECT and INSERT policies but no UPDATE policy at all, so
-- every "mark these as read" call (the messenger widget's unread badge,
-- and the read-receipt ticks this adds) was silently rejected by RLS the
-- whole time — the badge never actually cleared.

create policy "Participants mark messages read in their conversations"
  on public.messages for update
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.guest_id = auth.uid() or c.owner_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.guest_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

-- Table's already in the supabase_realtime publication (0007), which
-- broadcasts UPDATEs too by default — full replica identity just makes sure
-- the changed row's full data (not just its primary key) is in the payload,
-- so the read-receipt ticks can flip to "seen" live without a refetch.
alter table public.messages replica identity full;
