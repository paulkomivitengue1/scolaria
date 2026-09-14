-- Backfill price for existing book stock items that were inserted before price tracking was added.
-- Prices are set per class level, matching the defaults in data.ts initialBooks.

UPDATE stock_items SET price = 2500
  WHERE category = 'livre' AND price = 0 AND class_level IN ('Jardin');

UPDATE stock_items SET price = 3000
  WHERE category = 'livre' AND price = 0 AND class_level IN ('1ère année', '2ème année');

UPDATE stock_items SET price = 3500
  WHERE category = 'livre' AND price = 0 AND class_level IN ('3ème année', '4ème année');

UPDATE stock_items SET price = 4500
  WHERE category = 'livre' AND price = 0 AND class_level IN ('5ème année', '6ème année');

UPDATE stock_items SET price = 5500
  WHERE category = 'livre' AND price = 0 AND class_level IN ('7ème année', '8ème année');

UPDATE stock_items SET price = 6500
  WHERE category = 'livre' AND price = 0 AND class_level IN ('9ème année');

-- Set a sensible default for any tenue items that might still have price = 0
UPDATE stock_items SET price = 5000
  WHERE category = 'tenue' AND price = 0;
