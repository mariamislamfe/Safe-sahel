import { createClient } from "@/lib/supabase/server";

export type ConversationSummary = {
  id: string;
  otherPersonName: string;
  propertyTitle: string | null;
  lastMessageAt: string;
};

export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, property_id, guest_id, owner_id, last_message_at")
    .or(`guest_id.eq.${userId},owner_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (!conversations || conversations.length === 0) return [];

  const otherIds = conversations.map((c) => (c.guest_id === userId ? c.owner_id : c.guest_id));
  const propertyIds = conversations.map((c) => c.property_id).filter((id): id is string => !!id);

  const [{ data: profiles }, { data: properties }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", otherIds),
    propertyIds.length > 0
      ? supabase.from("properties").select("id, title").in("id", propertyIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const titleById = new Map((properties ?? []).map((p) => [p.id, p.title]));

  return conversations.map((c) => {
    const otherId = c.guest_id === userId ? c.owner_id : c.guest_id;
    return {
      id: c.id,
      otherPersonName: nameById.get(otherId) ?? "Safe Sahel user",
      propertyTitle: c.property_id ? (titleById.get(c.property_id) ?? null) : null,
      lastMessageAt: c.last_message_at,
    };
  });
}

export type ConversationDetail = {
  id: string;
  guestId: string;
  ownerId: string;
  otherPersonName: string;
  propertyTitle: string | null;
};

export async function getConversationDetail(
  conversationId: string,
  userId: string,
): Promise<ConversationDetail | null> {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, property_id, guest_id, owner_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation || (conversation.guest_id !== userId && conversation.owner_id !== userId)) {
    return null;
  }

  const otherId = conversation.guest_id === userId ? conversation.owner_id : conversation.guest_id;

  const [{ data: profile }, { data: property }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle(),
    conversation.property_id
      ? supabase.from("properties").select("title").eq("id", conversation.property_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: conversation.id,
    guestId: conversation.guest_id,
    ownerId: conversation.owner_id,
    otherPersonName: profile?.full_name ?? "Safe Sahel user",
    propertyTitle: property?.title ?? null,
  };
}

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    body: m.body,
    createdAt: m.created_at,
  }));
}
