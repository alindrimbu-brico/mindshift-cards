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

export function parseExerciseSteps(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getDailyCard(
  isPremium: boolean,
  userId: string,
  isCrisis = false
): Promise<Card | null> {
  // Get cards shown in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentDeliveries } = await supabase
    .from("deliveries")
    .select("card_id")
    .eq("user_id", userId)
    .gte("delivered_at", thirtyDaysAgo.toISOString());

  const recentCardIds = (recentDeliveries ?? []).map((d) => d.card_id);

  let query = supabase
    .from("cards")
    .select("*")
    .eq("status", "published");

  if (isCrisis) {
    query = query.eq("pack", "CRISIS").eq("card_variant", "CRISIS");
  } else {
    const block = getCurrentTimeBlock();
    query = query.eq("pack", block);
  }

  if (!isPremium) {
    query = query.eq("is_free_top300", true);
  }

  if (recentCardIds.length > 0) {
    query = query.not("id", "in", `(${recentCardIds.join(",")})`);
  }

  // Random card via offset
  const { count } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
    .eq(isCrisis ? "pack" : "pack", isCrisis ? "CRISIS" : getCurrentTimeBlock())
    .eq(isPremium ? "status" : "is_free_top300", isPremium ? "published" : true as any);

  const total = count ?? 0;
  if (total === 0) return null;

  const offset = Math.floor(Math.random() * Math.min(total, 50));
  const { data } = await query.range(offset, offset).limit(1);

  return (data?.[0] as Card) ?? null;
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
