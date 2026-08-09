import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://hublishamiyana.vercel.app';

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/suppliers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/bookings`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    const { data: suppliers } = await supabase.from('suppliers').select('id, updated_at');
    if (suppliers && suppliers.length > 0) {
      const supplierPages: MetadataRoute.Sitemap = suppliers.map((supplier) => ({
        url: `${baseUrl}/supplier/${supplier.id}`,
        lastModified: supplier.updated_at ? new Date(supplier.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
      return [...staticPages, ...supplierPages];
    }
  } catch (e) {
    console.error('Failed to generate supplier sitemap URLs:', e);
  }

  return staticPages;
}
