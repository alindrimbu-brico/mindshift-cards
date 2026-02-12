import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card as CardType, parseExerciseSteps } from "@/lib/cards";
import { Search, Heart, Filter, ArrowLeft, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

type Tab = "all" | "favorites" | "history";

const Library = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadCards();
  }, [user, tab, search, selectedCategory]);

  const loadCards = async () => {
    if (!user) return;
    setLoading(true);

    if (tab === "favorites") {
      const { data: favs } = await supabase
        .from("favorites")
        .select("card_id, cards(*)")
        .eq("user_id", user.id);
      const c = (favs ?? []).map((f: any) => f.cards).filter(Boolean) as CardType[];
      setCards(filterCards(c));
    } else if (tab === "history") {
      const { data: dels } = await supabase
        .from("deliveries")
        .select("card_id, cards(*)")
        .eq("user_id", user.id)
        .order("delivered_at", { ascending: false })
        .limit(100);
      const c = (dels ?? []).map((d: any) => d.cards).filter(Boolean) as CardType[];
      // Deduplicate
      const seen = new Set<string>();
      const unique = c.filter((card) => {
        if (seen.has(card.id)) return false;
        seen.add(card.id);
        return true;
      });
      setCards(filterCards(unique));
    } else {
      let query = supabase.from("cards").select("*").eq("status", "published");
      if (selectedCategory) query = query.eq("category", selectedCategory);
      if (search) query = query.ilike("title", `%${search}%`);
      const { data } = await query.limit(50);
      setCards((data as CardType[]) ?? []);
    }

    // Load categories
    if (categories.length === 0) {
      const { data: cats } = await supabase
        .from("cards")
        .select("category")
        .eq("status", "published")
        .limit(1000);
      const unique = [...new Set((cats ?? []).map((c: any) => c.category).filter(Boolean))];
      setCategories(unique as string[]);
    }

    setLoading(false);
  };

  const filterCards = (c: CardType[]) => {
    let result = c;
    if (search) result = result.filter((card) => card.title.toLowerCase().includes(search.toLowerCase()));
    if (selectedCategory) result = result.filter((card) => card.category === selectedCategory);
    return result;
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "Toate" },
    { id: "favorites", label: "Favorite" },
    { id: "history", label: "Istoric" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="px-5 pt-6 pb-4 space-y-4">
        <h1 className="text-xl font-bold font-display text-foreground">Bibliotecă</h1>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută un card..."
            className="pl-10 rounded-xl border-border bg-card"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {tab === "all" && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory("")}
                className="shrink-0 rounded-full border border-primary bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground flex items-center gap-1"
              >
                {selectedCategory} <X className="h-3 w-3" />
              </button>
            )}
            {categories
              .filter((c) => c !== selectedCategory)
              .map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  {c}
                </button>
              ))}
          </div>
        )}
      </header>

      {/* Cards */}
      <div className="flex-1 px-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <p className="text-center text-muted-foreground pt-8">Niciun card găsit.</p>
        ) : (
          cards.map((card) => (
            <button
              key={card.id}
              onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
              className="w-full text-left rounded-xl bg-card p-4 card-shadow transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.card_variant} · {card.category}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    card.card_variant === "CRISIS"
                      ? "bg-crisis/10 text-crisis"
                      : card.card_variant === "ACTION"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {card.pack}
                </span>
              </div>
              {expandedCard === card.id && (
                <div className="pt-2 space-y-2 animate-fade-in">
                  {card.key_idea && (
                    <p className="text-xs italic text-muted-foreground">{card.key_idea}</p>
                  )}
                  {parseExerciseSteps(card.exercise_steps_json).map((s, i) => (
                    <p key={i} className="text-xs text-foreground/80">
                      {i + 1}. {s}
                    </p>
                  ))}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Library;
