"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { label: "All", query: "", emoji: "✨" },
  { label: "Tents", query: "Tents", emoji: "⛺" },
  { label: "Chairs", query: "Chairs", emoji: "🪑" },
  { label: "Utensils", query: "Utensils", emoji: "🍽️" },
  { label: "Lighting", query: "Lighting", emoji: "💡" },
  { label: "Decor", query: "Decorations", emoji: "🎊" },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select(`*, inventory ( item_name_en, category, total_stock, price_per_day )`)
      .order("created_at", { ascending: false });
    if (data) setSuppliers(data);
    setLoading(false);
  };

  const query = search || activeCategory;
  const filtered = suppliers.filter(s => {
    if (!query) return true;
    const q = query.toLowerCase();
    const nameMatch = s.business_name?.toLowerCase().includes(q);
    const areaMatch = s.area_name?.toLowerCase().includes(q);
    const invMatch = s.inventory?.some((i: any) =>
      i.item_name_en?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q)
    );
    return nameMatch || areaMatch || invMatch;
  });

  return (
    <div className="bg-[#FAF7F2] pb-28 min-h-screen font-sans text-[#1E1B17]">
      {/* Header */}
      <div className="bg-white px-5 pt-5 pb-4 sticky top-0 z-40 border-b border-[#E8E1DA] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-[24px] font-bold uppercase tracking-tight text-[#1E1B17]">Suppliers Directory</h1>
            <p className="text-[12px] text-[#57423C] font-medium mt-0.5">ಪೂರೈಕೆದಾರರು · {filtered.length} local vendors</p>
          </div>
          <Link href="/" className="w-10 h-10 bg-[#FAF7F2] rounded-xl flex items-center justify-center border border-[#E8E1DA] text-[#1E1B17]">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </Link>
        </div>

        {/* Search */}
        <div className="bg-[#FAF7F2] rounded-xl flex items-center h-[48px] border border-[#E8E1DA] overflow-hidden px-3">
          <svg className="w-[18px] h-[18px] text-[#C04D31] shrink-0 mr-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search by vendor name, area, item..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (e.target.value) setActiveCategory(""); }}
            className="flex-1 min-w-0 bg-transparent border-none text-[13px] text-[#1E1B17] outline-none placeholder:text-[#8B716B]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="ml-2 text-[#8B716B] hover:text-[#1E1B17]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2.5 px-5 py-4 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.label}
            onClick={() => { setActiveCategory(cat.query); setSearch(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all shrink-0 border ${
              activeCategory === cat.query
                ? "bg-[#C04D31] text-white border-[#C04D31] shadow-sm"
                : "bg-white text-[#57423C] border-[#E8E1DA] hover:border-[#C04D31] hover:text-[#C04D31]"
            }`}
          >
            <span>{cat.emoji}</span><span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Suppliers Grid */}
      <div className="px-5">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-[#C04D31] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-[#57423C] font-medium">Fetching verified suppliers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-[#E8E1DA]">
            <span className="text-4xl mb-3 block">🎪</span>
            <p className="font-heading font-bold text-[#1E1B17] text-[18px] uppercase">No suppliers found</p>
            <p className="text-[13px] text-[#57423C] mt-1">Try searching another category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filtered.map((s) => {
              const minPrice = s.inventory?.length ? Math.min(...s.inventory.map((i: any) => i.price_per_day)) : null;
              const itemCount = s.inventory?.length || 0;
              return (
                <Link key={s.id} href={`/supplier/${s.id}`} className="bg-white rounded-xl overflow-hidden border border-[#E8E1DA] shadow-sm hover:border-[#C04D31]/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="h-32 w-full bg-[#F4EDE5] relative">
                      <img src={s.profile_picture || "/images/hero.png"} className="w-full h-full object-cover" alt={s.business_name} />
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-0.5 text-[11px] font-bold text-[#1E1B17] border border-[#E8E1DA] flex items-center gap-0.5 shadow-sm">
                        <span className="text-[#C04D31]">★</span> {s.google_rating > 0 ? s.google_rating : "4.8"}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-heading font-bold text-[15px] uppercase leading-tight truncate text-[#1E1B17]">{s.business_name}</h3>
                      <p className="text-[11px] text-[#57423C] mt-0.5 truncate">📍 {s.area_name || "Hubli"}</p>
                    </div>
                  </div>
                  <div className="px-3 pb-3 pt-1 border-t border-[#E8E1DA]/60 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#8B716B]">{itemCount} items</span>
                    {minPrice && <span className="font-heading text-[#C04D31] text-[14px] font-bold">₹{minPrice}+</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#E8E1DA] flex justify-around items-center pt-2 pb-3 z-50 shadow-lg">
        <Link href="/" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 group-hover:bg-[#F4EDE5] transition">
            <svg className="w-[18px] h-[18px] text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>
          <span className="text-[11px] font-medium text-[#57423C]">Home</span>
        </Link>
        <Link href="/bookings" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 group-hover:bg-[#F4EDE5] transition">
            <svg className="w-[18px] h-[18px] text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <span className="text-[11px] font-medium text-[#57423C]">Bookings</span>
        </Link>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-[#FFF6F4] border border-[#DFC0B9] flex items-center justify-center mb-0.5">
            <svg className="w-[18px] h-[18px] text-[#C04D31]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <span className="text-[11px] font-bold text-[#C04D31]">Suppliers</span>
        </div>
        <Link href="/login" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 group-hover:bg-[#F4EDE5] transition">
            <svg className="w-[18px] h-[18px] text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <span className="text-[11px] font-medium text-[#57423C]">Profile</span>
        </Link>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
