import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const Login = () => {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-scale-in">
          <Brain className="h-12 w-12 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/home" replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-slide-up space-y-8 text-center">
        {/* Logo */}
        <div className="space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary elevated-shadow">
            <Brain className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-foreground">
            MindShift
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Micro-exerciții zilnice pentru o minte mai clară
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3">
          {[
            "Carduri personalizate pentru ziua ta",
            "Exerciții de 2-5 minute",
            "Moment greu? Ajutor instant",
          ].map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 card-shadow"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <Sparkles className="h-4 w-4 shrink-0 text-secondary" />
              <span className="text-sm text-foreground">{f}</span>
            </div>
          ))}
        </div>

        {/* Login CTA */}
        <Button
          onClick={signInWithGoogle}
          size="lg"
          className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-semibold elevated-shadow"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuă cu Google
        </Button>

        <p className="text-xs text-muted-foreground">
          Prin conectare, accepți termenii și condițiile aplicației.
        </p>
      </div>
    </div>
  );
};

export default Login;
