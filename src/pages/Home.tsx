import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Card as CardType,
  SelectionDebug,
  getDailyCard,
  parseExerciseSteps,
  recordDelivery,
  toggleFavorite,
  updateStreak,
  getCurrentTimeBlock,
} from "@/lib/cards";
import { toast } from "sonner";
import { Check, Heart, X, SkipForward, Flame, AlertTriangle, RefreshCw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [card, setCard] = useState<CardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [debug, setDebug] = useState<SelectionDebug | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const lastShownCardIdRef = useRef<string | null>(null);

  const loadCard = useCallback(
    async (crisis = false) => {
      if (!user) return;
      setLoading(true);
      const result = await getDailyCard(isPremium, user.id, crisis, lastShownCardIdRef.current);
      setCard(result.card);
      setDebug(result.debug);
      if (result.card) {
        // Record "shown" delivery
        await recordDelivery(user.id, result.card.id, "shown");
        lastShownCardIdRef.current = result.card.id;
        // Check if favorited
        const { data: fav } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("card_id", result.card.id)
          .maybeSingle();
        setIsFavorited(!!fav);
      }
      setLoading(false);
    },
    [user, isPremium]
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("goal, is_premium")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile || !profile.goal) {
        setHasProfile(false);
        navigate("/onboarding");
        return;
      }
      setHasProfile(true);
      setIsPremium(profile.is_premium ?? false);

      const { data: s } = await supabase
        .from("streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      setStreak(s?.current_streak ?? 0);
    })();
  }, [user, navigate]);

  useEffect(() => {
    if (hasProfile) loadCard();
  }, [hasProfile, loadCard]);

  const handleAction = async (action: string) => {
    if (!user || !card) return;
    await recordDelivery(user.id, card.id, action);
    if (action === "completed") {
      await updateStreak(user.id);
      setStreak((s) => s + 1);
      toast.success("Felicitări! Exercițiu completat 🎉");
    }
    if (action === "saved") {
      await toggleFavorite(user.id, card.id, isFavorited);
      setIsFavorited(!isFavorited);
      toast.success(isFavorited ? "Eliminat din favorite" : "Salvat în favorite ❤️");
      return;
    }
    loadCard();
  };

  const steps = card ? parseExerciseSteps(card.exercise_steps_json) : [];
  const timeBlock = getCurrentTimeBlock();

  if (loading || hasProfile === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {timeBlock === "AM" ? "Bună dimineața ☀️" : timeBlock === "PM" ? "Bună ziua 🌤" : "Bună seara 🌙"}
          </p>
          <h1 className="text-xl font-bold font-display text-foreground">MindShift</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDebug((v) => !v)} className="p-1.5 rounded-full hover:bg-muted">
            <Bug className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5">
            <Flame className="h-4 w-4 text-secondary" />
            <span className="text-sm font-bold text-accent-foreground">{streak}</span>
          </div>
        </div>
      </header>

      {/* Debug Panel */}
      {showDebug && debug && (
        <div className="mx-5 mb-3 rounded-xl border border-muted bg-muted/50 p-3 text-xs font-mono space-y-1">
          <p><span className="text-muted-foreground">Stage:</span> {debug.stage}</p>
          <p><span className="text-muted-foreground">Candidates:</span> {debug.candidatesCount}</p>
          <p><span className="text-muted-foreground">Excluded:</span> {debug.excludedCount}</p>
          <p><span className="text-muted-foreground">Selected:</span> {debug.selectedCardId?.slice(0, 8) ?? "none"}</p>
          <p><span className="text-muted-foreground">LastShown:</span> {debug.lastShownCardId?.slice(0, 8) ?? "none"}</p>
        </div>
      )}

      {/* Crisis Button */}
      <div className="px-5 py-3">
        <button
          onClick={() => navigate("/moment-greu")}
          className="flex w-full items-center gap-3 rounded-xl border-2 border-crisis/20 bg-crisis/5 px-4 py-3 transition-all hover:bg-crisis/10"
        >
          <AlertTriangle className="h-5 w-5 text-crisis" />
          <span className="text-sm font-semibold text-crisis">Moment greu?</span>
        </button>
      </div>

      {/* Card */}
      <div className="flex-1 px-5">
        {card ? (
          <div className="animate-scale-in rounded-2xl bg-card card-shadow p-6 space-y-5">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  card.card_variant === "CRISIS"
                    ? "bg-crisis/10 text-crisis"
                    : card.card_variant === "ACTION"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-secondary"
                }`}
              >
                {card.card_variant}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                {card.category}
              </span>
            </div>

            <h2 className="text-xl font-bold font-display text-foreground leading-tight">
              {card.title}
            </h2>

            {card.key_idea && (
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                {card.key_idea}
              </p>
            )}

            {card.explanation && (
              <p className="text-sm text-foreground/80 leading-relaxed">
                {card.explanation}
              </p>
            )}

            {steps.length > 0 && (
              <div className="space-y-3 rounded-xl bg-accent/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                  Exercițiu ({card.duration_seconds ? `${Math.round(card.duration_seconds / 60)} min` : "2 min"})
                </p>
                <ol className="space-y-2.5">
                  {steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 pt-2">
              <Button onClick={() => handleAction("completed")} variant="default" className="flex-col gap-1 h-auto py-3 rounded-xl">
                <Check className="h-5 w-5" />
                <span className="text-[10px]">Aplică</span>
              </Button>
              <Button onClick={() => handleAction("saved")} variant="outline" className={`flex-col gap-1 h-auto py-3 rounded-xl ${isFavorited ? "border-crisis text-crisis" : ""}`}>
                <Heart className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`} />
                <span className="text-[10px]">Salvează</span>
              </Button>
              <Button onClick={() => handleAction("not_relevant")} variant="outline" className="flex-col gap-1 h-auto py-3 rounded-xl">
                <X className="h-5 w-5" />
                <span className="text-[10px]">Nu e pt mine</span>
              </Button>
              <Button onClick={() => handleAction("skipped")} variant="outline" className="flex-col gap-1 h-auto py-3 rounded-xl">
                <SkipForward className="h-5 w-5" />
                <span className="text-[10px]">Altul</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card card-shadow p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-secondary" />
            <p className="text-muted-foreground">
              Nu sunt carduri în baza de date. Importă CSV-ul din pagina <span className="font-semibold text-foreground">/import</span>.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
