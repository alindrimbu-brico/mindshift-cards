import { supabase } from "@/integrations/supabase/client";

export type Card = {
  id: string;
  chapter_no: number | null;
  chapter_title: string | null;
  card_no_in_chapter: number | null;
  theme_title: string | null;
  category: string | null;
  tags: string | null;
  tags_curated: string | null;
  card_variant: string | null;
  recommended_time: string | null;
  pack: string | null;
  title: string;
  key_idea: string | null;
  explanation: string | null;
  exercise_steps_json: string | null;
  duration_seconds: number | null;
  difficulty: string | null;
  status: string | null;
  is_free_top300: boolean | null;
};

export function getCurrentTimeBlock(): "AM" | "PM" | "SEARA" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "AM";
  if (h >= 12 && h < 18) return "PM";
  return "SEARA";
}

function getPreferredVariant(block: "AM" | "PM" | "SEARA"): string {
  if (block === "AM") return "ACTION";
  return "REFRAME";
}

export function parseExerciseSteps(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function tryQuery(
  filters: (q: any) => any,
  label: string
): Promise<Card | null> {
  const q1 = filters(supabase.from("cards"));
  const { count } = await q1.select("*", { count: "exact", head: true });
  const total = count ?? 0;
  console.log(`[getDailyCard] ${label}: ${total} cards`);
  if (total === 0) return null;
  const offset = Math.floor(Math.random() * total);
  const q2 = filters(supabase.from("cards"));
  const { data } = await q2.select("*").range(offset, offset).limit(1);
  return (data?.[0] as Card) ?? null;
}

export async function getDailyCard(
  _isPremium: boolean,
  userId: string,
  isCrisis = false
): Promise<Card | null> {
  const block = getCurrentTimeBlock();
  const variant = isCrisis ? "CRISIS" : getPreferredVariant(block);
  const pack = isCrisis ? "CRISIS" : block;

  // Soft 30-day repeat filter
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: recentDeliveries } = await supabase
    .from("deliveries")
    .select("card_id")
    .eq("user_id", userId)
    .gte("delivered_at", thirtyDaysAgo.toISOString());
  const recentIds = (recentDeliveries ?? []).map((d) => d.card_id);

  // Stage 1: pack + variant, exclude recent
  let card = await tryQuery((q) => {
    let r = q.eq("status", "published").eq("pack", pack).eq("card_variant", variant);
    if (recentIds.length > 0) r = r.not("id", "in", `(${recentIds.join(",")})`);
    return r;
  }, `S1 pack=${pack} var=${variant} -recent`);
  if (card) return card;

  // Stage 2: pack + variant, allow recent
  card = await tryQuery((q) =>
    q.eq("status", "published").eq("pack", pack).eq("card_variant", variant),
    `S2 pack=${pack} var=${variant}`);
  if (card) return card;

  // Stage 3: variant only
  card = await tryQuery((q) =>
    q.eq("status", "published").eq("card_variant", variant),
    `S3 var=${variant}`);
  if (card) return card;

  // Stage 4: any published
  card = await tryQuery((q) =>
    q.eq("status", "published"),
    `S4 any published`);
  if (card) return card;

  console.warn("[getDailyCard] No cards at any stage!");
  return null;
}

export async function recordDelivery(userId: string, cardId: string, action: string) {
  await supabase.from("deliveries").insert({
    user_id: userId,
    card_id: cardId,
    action_taken: action,
  });
}

export async function toggleFavorite(userId: string, cardId: string, isFavorited: boolean) {
  if (isFavorited) {
    await supabase.from("favorites").delete().eq("user_id", userId).eq("card_id", cardId);
  } else {
    await supabase.from("favorites").insert({ user_id: userId, card_id: cardId });
  }
}

export async function updateStreak(userId: string) {
  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!streak) {
    await supabase.from("streaks").insert({
      user_id: userId,
      current_streak: 1,
      best_streak: 1,
      last_completed_at: new Date().toISOString(),
    });
    return;
  }

  const lastDate = streak.last_completed_at ? new Date(streak.last_completed_at) : null;
  const now = new Date();
  const diffHours = lastDate ? (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60) : 999;

  let newStreak = streak.current_streak ?? 0;
  if (diffHours < 48) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }

  const bestStreak = Math.max(newStreak, streak.best_streak ?? 0);

  await supabase
    .from("streaks")
    .update({
      current_streak: newStreak,
      best_streak: bestStreak,
      last_completed_at: now.toISOString(),
    })
    .eq("user_id", userId);
}
