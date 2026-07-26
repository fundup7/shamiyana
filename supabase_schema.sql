-- 1. Create Suppliers Table (Extends Supabase Auth Users)
CREATE TABLE public.suppliers (
    id UUID REFERENCES auth.users(id) PRIMARY KEY, -- Links to Supabase Auth
    business_name TEXT NOT NULL,
    phone_number TEXT UNIQUE,
    area_name TEXT, -- e.g., 'Gokul Road, Hubli'
    latitude DECIMAL,
    longitude DECIMAL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for Suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
-- Anyone can read supplier profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.suppliers FOR SELECT USING (true);
-- Suppliers can only update their own profile
CREATE POLICY "Users can insert their own profile." ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.suppliers FOR UPDATE USING (auth.uid() = id);

-- 2. Create Inventory Table (Items for rent)
CREATE TABLE public.inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    item_name_en TEXT NOT NULL,
    item_name_kn TEXT, -- Kannada translation
    category TEXT NOT NULL, -- e.g., 'tents', 'chairs', 'plates'
    total_stock INTEGER NOT NULL DEFAULT 0,
    price_per_day DECIMAL NOT NULL,
    image_url TEXT, -- URL pointing to Supabase Storage Bucket
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for Inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
-- Anyone can read inventory
CREATE POLICY "Inventory is viewable by everyone." ON public.inventory FOR SELECT USING (true);
-- Only the owning supplier can insert/update/delete their inventory
CREATE POLICY "Suppliers can insert their own inventory." ON public.inventory FOR INSERT WITH CHECK (auth.uid() = supplier_id);
CREATE POLICY "Suppliers can update their own inventory." ON public.inventory FOR UPDATE USING (auth.uid() = supplier_id);
CREATE POLICY "Suppliers can delete their own inventory." ON public.inventory FOR DELETE USING (auth.uid() = supplier_id);

-- 3. Create Bookings Table
CREATE TABLE public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    event_date DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'completed'
    total_price DECIMAL,
    items_requested JSONB NOT NULL, -- E.g., [{"item_id": "...", "quantity": 200}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
-- Suppliers can only see their own bookings
CREATE POLICY "Suppliers can view own bookings." ON public.bookings FOR SELECT USING (auth.uid() = supplier_id);
-- Anyone (consumers) can insert a booking request (No auth required for consumers)
CREATE POLICY "Anyone can create a booking request." ON public.bookings FOR INSERT WITH CHECK (true);
-- Only suppliers can update the status of their bookings (e.g. Accept/Decline)
CREATE POLICY "Suppliers can update own bookings." ON public.bookings FOR UPDATE USING (auth.uid() = supplier_id);
