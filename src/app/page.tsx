"use client";
import { useEffect, useState } from "react";
import Link from 'next/link';
import { supabase } from "@/lib/supabase";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI/180);
  const dLon = (lon2 - lon1) * (Math.PI/180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

const PLACEHOLDERS = [
  "Search plates, chairs, tents...",
  "ಪ್ಲೇಟ್, ಕುರ್ಚಿ, ಟೆಂಟ್ ಹುಡುಕಿ...",
];

const CATEGORIES = [
  { label: "All", labelKn: "ಎಲ್ಲಾ", query: "", emoji: "✨" },
  { label: "Tents", labelKn: "ಟೆಂಟ್", query: "Tents", emoji: "⛺" },
  { label: "Chairs", labelKn: "ಕುರ್ಚಿ", query: "Chairs", emoji: "🪑" },
  { label: "Utensils", labelKn: "ಪಾತ್ರೆ", query: "Utensils", emoji: "🍽️" },
  { label: "Lighting", labelKn: "ಬೆಳಕು", query: "Lighting", emoji: "💡" },
  { label: "Decor", labelKn: "ಅಲಂಕಾರ", query: "Decorations", emoji: "🎊" },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [phIdx, setPhIdx] = useState(0);

  useEffect(() => {
    fetchSuppliers();
    requestLocation();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(id);
  }, []);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLoc({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      );
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select(`*, inventory ( item_name_en, category, total_stock, price_per_day )`);
    if (data) setSuppliers(data);
    setLoading(false);
  };

  const effectiveQuery = searchQuery || activeCategory;

  const processedSuppliers = suppliers
    .filter(supplier => {
      if (!effectiveQuery) return true;
      const query = effectiveQuery.toLowerCase();
      const nameMatch = supplier.business_name?.toLowerCase().includes(query);
      const inventoryMatch = supplier.inventory?.some((item: any) => 
        item.item_name_en?.toLowerCase().includes(query) || 
        item.category?.toLowerCase().includes(query)
      );
      return nameMatch || inventoryMatch;
    })
    .map(supplier => {
      let distance = null;
      if (userLoc && supplier.latitude && supplier.longitude) {
        distance = getDistance(userLoc.lat, userLoc.lng, supplier.latitude, supplier.longitude);
      }
      return { ...supplier, distance };
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return 0;
    });

  return (
    <div className="bg-[#FAF7F2] pb-28 min-h-screen font-sans text-[#1E1B17]">

      {/* ─── Hero Section ─── */}
      <div className="relative h-[320px]">
        <img 
          src="/images/hero.png" 
          alt="Shamiyana event setup" 
          className="absolute inset-0 w-full h-full object-cover rounded-b-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E1B17]/70 via-[#1E1B17]/40 to-[#FAF7F2] rounded-b-3xl" />

        {/* Navbar on hero */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#C04D31] text-white rounded-xl flex items-center justify-center shadow-md font-heading font-bold text-xl">
              S
            </div>
            <span className="font-heading font-bold text-white text-[22px] tracking-wide drop-shadow-sm uppercase">Shamiyana</span>
          </div>
          <div className="bg-[#FAF7F2]/90 backdrop-blur-md px-3 py-1 rounded-full border border-[#E8E1DA] text-[12px] font-semibold text-[#1E1B17] flex items-center gap-1 shadow-sm">
            <span className="text-[#C04D31]">📍</span> Hubli - Dharwad
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 px-6 mt-6">
          <h1 className="font-heading text-white text-[36px] font-bold leading-[1.05] tracking-tight drop-shadow-lg uppercase">
            Rent Everything<br/>For Your Event
          </h1>
          <p className="text-[#FAF7F2]/90 text-[14px] mt-1.5 font-medium drop-shadow-sm">
            ನಿಮ್ಮ ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಬೇಕಾದ ಎಲ್ಲಾ ಸಾಮಗ್ರಿಗಳು ಒಂದೇ ಕಡೆ
          </p>
        </div>
      </div>

      {/* Floating Search Bar */}
      <div className="relative z-30 px-5 -mt-7">
        <div className="bg-white rounded-xl flex items-center h-[54px] shadow-lg shadow-[#1E1B17]/5 border border-[#E8E1DA] px-4">
          <svg className="w-[20px] h-[20px] text-[#C04D31] shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder={PLACEHOLDERS[phIdx]}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setActiveCategory(""); }}
            className="flex-1 min-w-0 bg-transparent border-none text-[14px] font-medium text-[#1E1B17] outline-none placeholder:text-[#8B716B]" 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="ml-2 text-[#8B716B] hover:text-[#1E1B17] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ─── Categories ─── */}
      <div className="pt-5 pb-2">
        <div className="flex gap-2.5 px-5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={() => { setActiveCategory(cat.query); setSearchQuery(""); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all shrink-0 border ${
                activeCategory === cat.query
                  ? "bg-[#C04D31] text-white border-[#C04D31] shadow-sm"
                  : "bg-white text-[#57423C] border-[#E8E1DA] hover:border-[#C04D31] hover:text-[#C04D31]"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Gallery Row (only when no search active) ─── */}
      {!effectiveQuery && (
        <div className="px-5 pt-3 pb-2">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="relative h-24 rounded-xl overflow-hidden cursor-pointer border border-[#E8E1DA] active:scale-[0.97] transition" onClick={() => setActiveCategory('Tents')}>
              <img src="/images/shamiyana.png" className="absolute inset-0 w-full h-full object-cover" alt="Tents" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B17]/70 to-transparent" />
              <span className="absolute bottom-2 left-2.5 text-white font-heading font-bold text-[14px] uppercase tracking-wide">Tents</span>
            </div>
            <div className="relative h-24 rounded-xl overflow-hidden cursor-pointer border border-[#E8E1DA] active:scale-[0.97] transition" onClick={() => setActiveCategory('Chairs')}>
              <img src="/images/chairs.png" className="absolute inset-0 w-full h-full object-cover" alt="Chairs" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B17]/70 to-transparent" />
              <span className="absolute bottom-2 left-2.5 text-white font-heading font-bold text-[14px] uppercase tracking-wide">Chairs</span>
            </div>
            <div className="relative h-24 rounded-xl overflow-hidden cursor-pointer border border-[#E8E1DA] active:scale-[0.97] transition" onClick={() => setActiveCategory('Utensils')}>
              <img src="/images/plates.png" className="absolute inset-0 w-full h-full object-cover" alt="Utensils" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B17]/70 to-transparent" />
              <span className="absolute bottom-2 left-2.5 text-white font-heading font-bold text-[14px] uppercase tracking-wide">Utensils</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Verified Local Suppliers ─── */}
      <div className="px-5 pt-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h2 className="font-heading text-[22px] font-bold leading-tight uppercase tracking-tight text-[#1E1B17]">
              {effectiveQuery ? "Search Results" : "Verified Local Suppliers"}
            </h2>
            {!effectiveQuery && (
              <p className="text-[13px] text-[#57423C] mt-0.5 font-medium">ನಿಮ್ಮ ಸ್ಥಳೀಯ ವಿಶ್ವಾಸಾರ್ಹ ಪೂರೈಕೆದಾರರು</p>
            )}
          </div>
          {effectiveQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setActiveCategory(""); }}
              className="text-[#C04D31] text-[13px] font-bold hover:underline"
            >
              Clear Filter
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-[#C04D31] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-[#57423C] font-medium">Connecting to local Hubli suppliers...</p>
          </div>
        ) : processedSuppliers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-[#E8E1DA]">
            <span className="text-4xl mb-3 block">🎪</span>
            <p className="font-heading font-bold text-[#1E1B17] text-[18px] uppercase">No suppliers found</p>
            <p className="text-[13px] text-[#57423C] mt-1">Try another item or category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {processedSuppliers.map((supplier) => {
              const minPrice = supplier.inventory?.length ? Math.min(...supplier.inventory.map((i:any)=>i.price_per_day)) : null;
              
              return (
                <div 
                  key={supplier.id} 
                  className="bg-white rounded-xl overflow-hidden border border-[#E8E1DA] shadow-sm transition-all hover:border-[#C04D31]/40"
                >
                  <Link href={`/supplier/${supplier.id}`} className="block relative">
                    <div className="h-44 w-full relative bg-[#F4EDE5]">
                      <img 
                        src={supplier.profile_picture || "/images/hero.png"} 
                        className="w-full h-full object-cover" 
                        alt={supplier.business_name} 
                      />
                      <div className="absolute top-3 left-3 bg-[#FAF7F2]/90 backdrop-blur-md border border-[#E8E1DA] rounded-lg px-2.5 py-1 text-[11px] font-bold text-[#C04D31]">
                        VERIFIED SUPPLIER ✓
                      </div>
                      {supplier.distance !== null && (
                        <div className="absolute top-3 right-3 bg-[#1E1B17]/80 text-white rounded-lg px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
                          📍 {supplier.distance.toFixed(1)} km away
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    <div className="flex justify-between items-start gap-3 mb-1.5">
                      <Link href={`/supplier/${supplier.id}`} className="flex-1">
                        <h3 className="font-heading font-bold text-[19px] leading-snug text-[#1E1B17] hover:text-[#C04D31] transition uppercase">
                          {supplier.business_name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-1 bg-[#FFF6F4] border border-[#DFC0B9] px-2 py-0.5 rounded-lg shrink-0">
                        <span className="text-[#C04D31] text-[11px]">★</span>
                        <span className="text-[12px] font-bold text-[#1E1B17]">{supplier.google_rating > 0 ? supplier.google_rating : "4.8"}</span>
                      </div>
                    </div>
                    
                    <p className="text-[13px] text-[#57423C] leading-relaxed line-clamp-2 mb-3">
                      {supplier.description || "Tents, chairs, utensils, generator, sound & lighting setup in Hubli-Dharwad."}
                    </p>

                    {/* Inventory Pills & Pricing */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#E8E1DA] mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {supplier.inventory?.slice(0, 3).map((item: any, idx: number) => (
                          <span key={idx} className="bg-[#F4EDE5] text-[#57423C] text-[11px] font-medium px-2.5 py-1 rounded-md border border-[#E8E1DA]">
                            {item.item_name_en}
                          </span>
                        ))}
                        {(!supplier.inventory || supplier.inventory.length === 0) && (
                          <>
                            <span className="bg-[#F4EDE5] text-[#57423C] text-[11px] font-medium px-2.5 py-1 rounded-md border border-[#E8E1DA]">Tents</span>
                            <span className="bg-[#F4EDE5] text-[#57423C] text-[11px] font-medium px-2.5 py-1 rounded-md border border-[#E8E1DA]">Chairs</span>
                          </>
                        )}
                      </div>
                      {minPrice && (
                        <span className="font-heading text-[#C04D31] text-[16px] font-bold whitespace-nowrap">
                          ₹{minPrice}<span className="text-[11px] font-normal text-[#57423C]">/day</span>
                        </span>
                      )}
                    </div>

                    {/* Dual Action Buttons: Book vs WhatsApp vs Call */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <a 
                        href={`tel:${supplier.phone_number || "+919886000000"}`}
                        className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-[#1E1B17] text-[#1E1B17] font-semibold text-[12px] hover:bg-[#1E1B17] hover:text-white transition"
                      >
                        📞 Call
                      </a>
                      <a 
                        href={`https://wa.me/91${supplier.phone_number?.replace(/\D/g, '') || "9886000000"}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-[#25D366] text-[#128C7E] bg-[#E8F8EE] font-semibold text-[12px] hover:bg-[#25D366] hover:text-white transition"
                      >
                        💬 WhatsApp
                      </a>
                      <Link 
                        href={`/supplier/${supplier.id}`}
                        className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-[#C04D31] text-white font-semibold text-[12px] hover:bg-[#9F351C] transition shadow-sm"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Bottom Navigation ─── */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#E8E1DA] flex justify-around items-center pt-2 pb-3 z-50 shadow-lg">
        <div className="flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-lg bg-[#FFF6F4] border border-[#DFC0B9] flex items-center justify-center mb-0.5">
            <svg className="w-[18px] h-[18px] text-[#C04D31]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="text-[11px] font-bold text-[#C04D31]">Home</span>
        </div>
        <Link href="/bookings" className="flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 group-hover:bg-[#F4EDE5] transition">
            <svg className="w-[18px] h-[18px] text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-[11px] font-medium text-[#57423C]">Bookings</span>
        </Link>
        <Link href="/suppliers" className="flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 group-hover:bg-[#F4EDE5] transition">
            <svg className="w-[18px] h-[18px] text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-[11px] font-medium text-[#57423C]">Suppliers</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 group-hover:bg-[#F4EDE5] transition">
            <svg className="w-[18px] h-[18px] text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-[11px] font-medium text-[#57423C]">Profile</span>
        </Link>
      </div>

      {/* Hide scrollbar on category row */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
