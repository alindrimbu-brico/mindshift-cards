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
  unique_key: string | null;
};

export type SelectionDebug = {
  lastShownCardId: string | null;
  stage: string;
  candidatesCount: number;
  excludedCount: number;
  selectedCardId: string | null;
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

async function getExcludedCardIds(userId: string, days: number): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("deliveries")
    .select("card_id")
    .eq("user_id", userId)
    .gte("delivered_at", since.toISOString());
  return (data ?? []).map((d) => d.card_id);
}

async function pickRandom(
  filters: (q: any) => any,
  excludeIds: string[],
  label: string
): Promise<{ card: Card | null; count: number }> {
  // Get count
  let q1 = filters(supabase.from("cards").select("*", { count: "exact", head: true }));
  if (excludeIds.length > 0) q1 = q1.not("id", "in", `(${excludeIds.join(",")})`);
  const { count } = await q1;
  const total = count ?? 0;
  console.log(`[getDailyCard] ${label}: ${total} candidates (excluded ${excludeIds.length})`);
  if (total === 0) return { card: null, count: 0 };

  const offset = Math.floor(Math.random() * total);
  let q2 = filters(supabase.from("cards").select("*"));
  if (excludeIds.length > 0) q2 = q2.not("id", "in", `(${excludeIds.join(",")})`);
  const { data } = await q2.range(offset, offset).limit(1);
  return { card: (data?.[0] as Card) ?? null, count: total };
}

export async function getDailyCard(
  _isPremium: boolean,
  userId: string,
  isCrisis = false,
  lastShownCardId: string | null = null
): Promise<{ card: Card | null; debug: SelectionDebug }> {
  const block = getCurrentTimeBlock();
  const variant = isCrisis ? "CRISIS" : getPreferredVariant(block);
  const pack = isCrisis ? "CRISIS" : block;

  const debug: SelectionDebug = {
    lastShownCardId,
    stage: "",
    candidatesCount: 0,
    excludedCount: 0,
    selectedCardId: null,
  };

  const excluded30 = await getExcludedCardIds(userId, 30);
  const baseExclude = lastShownCardId ? [...excluded30, lastShownCardId] : excluded30;
  debug.excludedCount = baseExclude.length;

  const published = (q: any) => q.eq("status", "published");

  // Stage 1: pack + variant, exclude 30d
  let result = await pickRandom(
    (q: any) => published(q).eq("pack", pack).eq("card_variant", variant),
    baseExclude,
    `S1 pack=${pack} var=${variant} -30d`
  );
  if (result.card) {
    debug.stage = "S1"; debug.candidatesCount = result.count; debug.selectedCardId = result.card.id;
    console.log(`[getDailyCard] Selected ${result.card.id} at S1`);
    return { card: result.card, debug };
  }

  // Stage 2: variant only, exclude 30d
  result = await pickRandom(
    (q: any) => published(q).eq("card_variant", variant),
    baseExclude,
    `S2 var=${variant} -30d`
  );
  if (result.card) {
    debug.stage = "S2"; debug.candidatesCount = result.count; debug.selectedCardId = result.card.id;
    console.log(`[getDailyCard] Selected ${result.card.id} at S2`);
    return { card: result.card, debug };
  }

  // Stage 3: pack + variant, exclude only 7d
  const excluded7 = await getExcludedCardIds(userId, 7);
  const shortExclude = lastShownCardId ? [...excluded7, lastShownCardId] : excluded7;

  result = await pickRandom(
    (q: any) => published(q).eq("pack", pack).eq("card_variant", variant),
    shortExclude,
    `S3 pack=${pack} var=${variant} -7d`
  );
  if (result.card) {
    debug.stage = "S3"; debug.candidatesCount = result.count; debug.selectedCardId = result.card.id;
    console.log(`[getDailyCard] Selected ${result.card.id} at S3`);
    return { card: result.card, debug };
  }

  // Stage 4: any variant, exclude 7d
  result = await pickRandom(
    (q: any) => published(q),
    shortExclude,
    `S4 any -7d`
  );
  if (result.card) {
    debug.stage = "S4"; debug.candidatesCount = result.count; debug.selectedCardId = result.card.id;
    console.log(`[getDailyCard] Selected ${result.card.id} at S4`);
    return { card: result.card, debug };
  }

  // Stage 5: any published, only exclude lastShown
  const lastOnly = lastShownCardId ? [lastShownCardId] : [];
  result = await pickRandom(
    (q: any) => published(q),
    lastOnly,
    `S5 any published -lastShown`
  );
  if (result.card) {
    debug.stage = "S5"; debug.candidatesCount = result.count; debug.selectedCardId = result.card.id;
    console.log(`[getDailyCard] Selected ${result.card.id} at S5`);
    return { card: result.card, debug };
  }

  // Stage 6: absolute fallback
  result = await pickRandom((q: any) => published(q), [], `S6 absolute fallback`);
  if (result.card) {
    debug.stage = "S6"; debug.candidatesCount = result.count; debug.selectedCardId = result.card.id;
    console.log(`[getDailyCard] Selected ${result.card.id} at S6`);
    return { card: result.card, debug };
  }

  console.warn("[getDailyCard] No cards at any stage!");
  debug.stage = "NONE";
  return { card: null, debug };
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
