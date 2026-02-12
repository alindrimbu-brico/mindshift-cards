import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { csv_data, is_top300 } = await req.json();

    if (!csv_data) {
      return new Response(JSON.stringify({ error: "No CSV data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines = csv_data.split("\n").filter((l: string) => l.trim());
    const headers = parseCSVLine(lines[0]);
    
    let inserted = 0;
    let errors = 0;
    const batchSize = 100;

    for (let i = 1; i < lines.length; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, lines.length); j++) {
        try {
          const values = parseCSVLine(lines[j]);
          if (values.length < headers.length) continue;

          const row: Record<string, any> = {};
          headers.forEach((h: string, idx: number) => {
            const key = h.trim();
            let val = values[idx]?.trim() ?? "";
            
            if (key === "chapter_no" || key === "card_no_in_chapter" || key === "duration_seconds") {
              row[key] = val ? parseInt(val) : null;
            } else if (key === "is_free_top300") {
              row[key] = val === "1" || val === "true" || val === "True";
            } else {
              row[key] = val || null;
            }
          });

          delete row["id"];

          // Compute unique_key
          const chNo = row["chapter_no"] != null ? String(row["chapter_no"]) : "X";
          const cardNo = row["card_no_in_chapter"] != null ? String(row["card_no_in_chapter"]) : "X";
          const variant = row["card_variant"] || "X";
          row["unique_key"] = `${chNo}-${cardNo}-${variant}`;

          // Default status
          if (!row["status"]) row["status"] = "published";
          
          if (row.title) batch.push(row);
        } catch {
          errors++;
        }
      }

      if (batch.length > 0) {
        if (is_top300) {
          for (const card of batch) {
            const { error } = await supabase
              .from("cards")
              .update({ is_free_top300: true })
              .eq("unique_key", card.unique_key);
            if (error) errors++;
            else inserted++;
          }
        } else {
          const { error } = await supabase.from("cards").upsert(batch, { onConflict: "unique_key" });
          if (error) {
            console.error("Batch upsert error:", error);
            errors += batch.length;
          } else {
            inserted += batch.length;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
