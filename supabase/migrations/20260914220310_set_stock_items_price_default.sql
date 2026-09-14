-- Change the default price from 0 to 3000 so new stock items get a sensible default.
ALTER TABLE stock_items ALTER COLUMN price SET DEFAULT 3000;
