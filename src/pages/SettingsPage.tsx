import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogOut, Clock, Trash2, Save } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const [times, setTimes] = useState({ AM: "08:30", PM: "13:30", SEARA: "21:30" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("preferred_times_json")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferred_times_json) {
          try {
            setTimes(JSON.parse(data.preferred_times_json));
          } catch {}
        }
      });
  }, [user]);

  const saveTimes = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ preferred_times_json: JSON.stringify(times) })
      .eq("user_id", user.id);
    setSaving(false);
    toast.success("Ore salvate!");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Ești sigur/ă că vrei să ștergi contul? Această acțiune este ireversibilă.")) return;
    toast.error("Contactează-ne pentru ștergerea contului.");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold font-display text-foreground">Setări</h1>
        {user && (
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        )}
      </header>

      <div className="flex-1 px-5 space-y-6">
        {/* Preferred times */}
        <div className="rounded-xl bg-card p-5 card-shadow space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Ore preferate</h3>
          </div>
          {(["AM", "PM", "SEARA"] as const).map((block) => (
            <div key={block} className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                {block === "AM" ? "Dimineața" : block === "PM" ? "După-amiaza" : "Seara"}
              </span>
              <input
                type="time"
                value={times[block]}
                onChange={(e) => setTimes((prev) => ({ ...prev, [block]: e.target.value }))}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          ))}
          <Button
            onClick={saveTimes}
            disabled={saving}
            className="w-full rounded-xl"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Se salvează..." : "Salvează"}
          </Button>
        </div>

        {/* Logout */}
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full rounded-xl h-12"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Deconectare
        </Button>

        {/* Delete */}
        <button
          onClick={handleDeleteAccount}
          className="flex w-full items-center justify-center gap-2 text-sm text-crisis hover:underline"
        >
          <Trash2 className="h-4 w-4" />
          Șterge contul
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
