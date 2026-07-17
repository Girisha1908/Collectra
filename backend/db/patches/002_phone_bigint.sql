-- phone_number: VARCHAR -> BIGINT (10 digits). Safe to re-run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'phone_number'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_phone_10;
    ALTER TABLE orders
      ALTER COLUMN phone_number TYPE BIGINT
      USING ((regexp_replace(COALESCE(phone_number::text, ''), '\D', '', 'g'))::bigint);
    ALTER TABLE orders
      ADD CONSTRAINT orders_phone_10
      CHECK (phone_number >= 1000000000 AND phone_number <= 9999999999);
  END IF;
END $$;
