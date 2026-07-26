ALTER TABLE public.suppliers ADD COLUMN profile_picture TEXT;
ALTER TABLE public.suppliers ADD COLUMN description TEXT;
ALTER TABLE public.suppliers ADD COLUMN google_rating DECIMAL DEFAULT 0.0;
ALTER TABLE public.suppliers ADD COLUMN whatsapp_number TEXT;
ALTER TABLE public.suppliers ADD COLUMN gallery_images TEXT[] DEFAULT '{}';
