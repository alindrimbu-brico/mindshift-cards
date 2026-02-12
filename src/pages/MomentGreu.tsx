import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card as CardType, getDailyCard, parseExerciseSteps, recordDelivery } from "@/lib/cards";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Timer, Check, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CRISIS_STATES = [
  "Anxietate", "Panică", "Tristețe", "Furie",
  "Copleșire", "Frică", "Gol interior", "Confuzie",
];

const MomentGreu = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState("");
  const [card, setCard] = useState<CardType | null>(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsPremium(data?.is_premium ?? false));
  }, [user]);

  const loadCrisisCard = async () => {
    if (!user) return;
    setLoading(true);
    const c = await getDailyCard(isPremium, user.id, true);
    setCard(c);
    setLoading(false);
    if (c) {
      setTimer(c.duration_seconds ?? 90);
      setTimerActive(true);
    }
  };

  useEffect(() => {
    if (!timerActive || timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  const handleComplete = async () => {
    if (!user || !card) return;
    await recordDelivery(user.id, card.id, "completed");
    toast.success("Ai reușit! Ești mai puternic decât crezi. 💪");
    navigate("/home");
  };

  const steps = card ? parseExerciseSteps(card.exercise_steps_json) : [];

  if (!selectedState) {
    return (
      <div className="flex min-h-screen flex-col bg-background px-6 py-8">
        <button onClick={() => navigate("/home")} className="mb-6 flex items-center gap-2 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Înapoi</span>
        </button>
        <div className="space-y-6 animate-fade-in">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display text-foreground">Ce simți acum?</h2>
            <p className="text-muted-foreground text-sm">
              Alege ce te descrie cel mai bine. Te vom ghida.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {CRISIS_STATES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSelectedState(s);
                  loadCrisisCard();
                }}
                className="rounded-xl border-2 border-crisis/20 bg-crisis/5 px-4 py-4 text-sm font-semibold text-crisis transition-all hover:bg-crisis/10 hover:border-crisis/40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      <button onClick={() => navigate("/home")} className="mb-6 flex items-center gap-2 text-muted-foreground">
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">Înapoi</span>
      </button>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-crisis" />
        </div>
      ) : card ? (
        <div className="animate-scale-in space-y-6">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2">
            <Timer className="h-5 w-5 text-crisis" />
            <span className="text-2xl font-bold font-display text-crisis">
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
            </span>
          </div>

          {/* Card */}
          <div className="rounded-2xl border-2 border-crisis/20 bg-card p-6 space-y-4 card-shadow">
            <span className="rounded-full bg-crisis/10 px-3 py-1 text-xs font-semibold text-crisis">
              {selectedState} · CRISIS
            </span>
            <h3 className="text-lg font-bold font-display text-foreground">{card.title}</h3>
            {card.key_idea && (
              <p className="text-sm italic text-muted-foreground">{card.key_idea}</p>
            )}
            {steps.length > 0 && (
              <ol className="space-y-3">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crisis text-xs font-bold text-crisis-foreground">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <Button
            onClick={handleComplete}
            className="w-full rounded-xl h-14 text-base font-semibold bg-crisis text-crisis-foreground hover:bg-crisis/90"
            size="lg"
          >
            <Check className="mr-2 h-5 w-5" />
            Am terminat
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center">
          <p className="text-muted-foreground">Nu am găsit un card potrivit. Încearcă din nou.</p>
        </div>
      )}
    </div>
  );
};

export default MomentGreu;
