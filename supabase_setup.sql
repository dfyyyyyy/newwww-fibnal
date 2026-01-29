
-- 1. Pehle purane saare possible versions ko khatam karein takay ambiguity khatam ho
DROP FUNCTION IF EXISTS public.create_public_booking(uuid, text, text, text, text, public.booking_status, text, jsonb, public.booking_type, real);
DROP FUNCTION IF EXISTS public.create_public_booking(uuid, text, text, text, text, text, text, jsonb, text, numeric);
DROP FUNCTION IF EXISTS public.create_public_booking(uuid, text, text, text, text, text, text, jsonb, text);

-- 2. Create the function with standard text types for parameters
-- Is se JavaScript/Supabase-JS ko call karne mein asani hoti hai
CREATE OR REPLACE FUNCTION public.create_public_booking(
  uid_param uuid,
  customer text,
  driver text,
  pickup text,
  dropoff text,
  status text,
  amount text,
  form_data_param jsonb,
  booking_type text,
  rental_hours numeric DEFAULT NULL
) RETURNS integer AS $$
DECLARE
  new_booking_id integer;
BEGIN
  -- Insert statement mein hum text ko cast kar rahe hain sahi ENUM types mein
  INSERT INTO public.bookings (
    uid, 
    customer, 
    driver, 
    pickup, 
    dropoff, 
    status, 
    amount, 
    form_data, 
    booking_type, 
    rental_hours
  ) VALUES (
    uid_param, 
    customer, 
    driver, 
    pickup, 
    dropoff, 
    status::public.booking_status, 
    amount, 
    form_data_param, 
    booking_type::public.booking_type, 
    rental_hours
  ) RETURNING id INTO new_booking_id;

  RETURN new_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Anonymous users (public) ko permission dein
GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, text, text, text, text, text, text, jsonb, text, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, text, text, text, text, text, text, jsonb, text, numeric) TO authenticated;

-- 4. Public config function ko bhi check kar lein
ALTER FUNCTION public.get_public_booking_config(uuid) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_public_booking_config(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_booking_config(uuid) TO authenticated;

-- 5. RLS Policies for Public Access
-- Is se public status page aur form configuration sahi kaam karega
DROP POLICY IF EXISTS "Allow public read access to specific bookings" ON public.bookings;
CREATE POLICY "Allow public read access to specific bookings" 
ON public.bookings FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow public read access to drivers" ON public.drivers;
CREATE POLICY "Allow public read access to drivers" 
ON public.drivers FOR SELECT 
USING (true);
