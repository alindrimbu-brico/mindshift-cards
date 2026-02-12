import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const ImportCards = () => {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState<{ inserted: number; errors: number }[]>([]);

  const importCSV = async (url: string, isTop300: boolean) => {
    setStatus(`Se descarcă ${isTop300 ? "Top 300" : "toate cardurile"}...`);
    const res = await fetch(url);
    const text = await res.text();

    const lines = text.split("\n").filter((l) => l.trim());
    const header = lines[0];
    const chunkSize = 500;

    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 1; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const csvChunk = header + "\n" + chunk.join("\n");
      setStatus(
        `Import ${isTop300 ? "Top 300" : "cards"}: ${Math.min(i + chunkSize - 1, lines.length - 1)}/${lines.length - 1}`
      );

      const { data, error } = await supabase.functions.invoke("import-cards", {
        body: { csv_data: csvChunk, is_top300: isTop300 },
      });

      if (error) {
        console.error("Import error:", error);
        totalErrors += chunkSize;
      } else {
        totalInserted += data?.inserted ?? 0;
        totalErrors += data?.errors ?? 0;
      }
    }

    return { inserted: totalInserted, errors: totalErrors };
  };

  const handleImport = async () => {
    setImporting(true);
    setResults([]);

    try {
      // Step 1: Import all cards
      const allResult = await importCSV("/data/cards_all.csv", false);
      setResults((prev) => [...prev, allResult]);
      toast.success(`${allResult.inserted} carduri importate!`);

      // Step 2: Mark Top 300 free
      const top300Result = await importCSV("/data/top300_free.csv", true);
      setResults((prev) => [...prev, top300Result]);
      toast.success(`${top300Result.inserted} carduri marcate ca free!`);

      setStatus("Import complet! ✅");
    } catch (err) {
      setStatus("Eroare la import");
      toast.error("Eroare la import");
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold font-display text-foreground">Import Carduri</h1>
        <p className="text-sm text-muted-foreground">
          Importă cele 6588 carduri și marchează Top 300 ca gratuite.
        </p>

        <Button
          onClick={handleImport}
          disabled={importing}
          size="lg"
          className="w-full rounded-xl h-14"
        >
          {importing ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Se importă...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Start Import
            </>
          )}
        </Button>

        {status && (
          <p className="text-sm text-muted-foreground font-mono">{status}</p>
        )}

        {results.map((r, i) => (
          <div key={i} className="rounded-xl bg-card p-4 card-shadow text-sm">
            <div className="flex items-center gap-2 text-success">
              <Check className="h-4 w-4" />
              <span>{r.inserted} inserate</span>
            </div>
            {r.errors > 0 && (
              <div className="flex items-center gap-2 text-crisis mt-1">
                <AlertTriangle className="h-4 w-4" />
                <span>{r.errors} erori</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImportCards;
