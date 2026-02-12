
-- Add unique_key column
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS unique_key text;

-- Backfill unique_key for all existing cards
UPDATE public.cards 
SET unique_key = coalesce(chapter_no::text, 'X') || '-' || coalesce(card_no_in_chapter::text, 'X') || '-' || coalesce(card_variant, 'X');

-- Delete duplicates keeping earliest row per unique_key
DELETE FROM public.cards
WHERE id NOT IN (
  SELECT DISTINCT ON (unique_key) id
  FROM public.cards
  ORDER BY unique_key, created_at ASC
);

-- Add unique constraint
ALTER TABLE public.cards ADD CONSTRAINT cards_unique_key_unique UNIQUE (unique_key);
