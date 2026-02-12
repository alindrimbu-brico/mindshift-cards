import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Clock, Heart, Check } from "lucide-react";

const GOALS = [
  { id: "rutina", label: "Rutină", icon: "🎯" },
  { id: "emotii", label: "Emoții", icon: "💚" },
  { id: "relatii", label: "Relații", icon: "🤝" },
  { id: "decizii", label: "Decizii", icon: "⚡" },
  { id: "stres", label: "Stres", icon: "🧘" },
];

const STATES = [
  "Anxios/ă", "Copleșit/ă", "Nehotărât/ă", "Frustrat/ă",
  "Obosit/ă", "Demotivat/ă", "Tensionat/ă", "Confuz/ă",
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("");
  const [times, setTimes] = useState({ AM: "08:30", PM: "13:30", SEARA: "21:30" });
  const [states, setStates] = useState<string[]>([]);

  const toggleState = (s: string) => {
    setStates((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleFinish = async () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      await supabase.from("profiles").upsert({
        user_id: user!.id,
        goal,
        timezone: tz,
        preferred_times_json: JSON.stringify(times),
        frequent_states_json: JSON.stringify(states),
      }, { onConflict: "user_id" });
    } catch {
      toast("Nu am putut salva acum, continuăm oricum");
    } finally {
      navigate("/home");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      {/* Progress */}
      <div className="mb-8 flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 animate-fade-in" key={step}>
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-display text-foreground">
                Ce vrei să îmbunătățești?
              </h2>
              <p className="text-muted-foreground">
                Alege obiectivul principal
              </p>
            </div>
            <div className="space-y-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all ${
                    goal === g.id
                      ? "border-primary bg-accent card-shadow"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="text-2xl">{g.icon}</span>
                  <span className="font-semibold text-foreground">{g.label}</span>
                  {goal === g.id && (
                    <Check className="ml-auto h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-display text-foreground">
                Când preferi să practici?
              </h2>
              <p className="text-muted-foreground">
                Setează orele ideale
              </p>
            </div>
            <div className="space-y-4">
              {(["AM", "PM", "SEARA"] as const).map((block) => (
                <div
                  key={block}
                  className="flex items-center justify-between rounded-xl border-2 border-border bg-card px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">
                      {block === "AM" ? "Dimineața" : block === "PM" ? "După-amiaza" : "Seara"}
                    </span>
                  </div>
                  <input
                    type="time"
                    value={times[block]}
                    onChange={(e) =>
                      setTimes((prev) => ({ ...prev, [block]: e.target.value }))
                    }
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Fusul orar: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-display text-foreground">
                Ce simți cel mai des?
              </h2>
              <p className="text-muted-foreground">
                Alege cel puțin una (ne ajută să personalizăm)
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {STATES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleState(s)}
                  className={`rounded-full border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                    states.includes(s)
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/30"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 pb-4">
        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && !goal}
            className="w-full rounded-xl h-14 text-base font-semibold"
            size="lg"
          >
            Continuă
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={states.length === 0}
            className="w-full rounded-xl h-14 text-base font-semibold gradient-primary text-primary-foreground elevated-shadow"
            size="lg"
          >
            Începe călătoria
            <Heart className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
