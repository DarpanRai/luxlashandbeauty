-- Run this if a table was just created via SQL Editor and the API still says
-- "Could not find the table in the schema cache" — PostgREST (the API layer) caches
-- the schema and doesn't always notice a new table created outside the Table Editor UI.
NOTIFY pgrst, 'reload schema';
