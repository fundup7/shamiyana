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
    <div className="bg-[#FAF7F2] pb-28 min-h-screen font-sans text-[#1A1A1A]">

      {/* ─── Hero Section ─── */}
      <div className="relative h-[320px]">
        <img 
          src="/images/hero.png" 
          alt="Shamiyana event setup" 
          className="absolute inset-0 w-full h-full object-cover rounded-b-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#FAF7F2] rounded-b-3xl" />

        {/* Navbar on hero */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18"/><path d="M12 3l9 18"/><path d="M12 3l-9 18"/><path d="M12 3v18"/>
              </svg>
            </div>
            <span className="font-bold text-white text-[18px] tracking-tight drop-shadow-sm">Shamiyana</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 px-6 mt-8">
          <h1 className="text-white text-[32px] font-extrabold leading-[1.1] drop-shadow-lg">
            Plan Your<br/>Perfect Event
          </h1>
          <p className="text-white/80 text-[14px] mt-2 font-medium drop-shadow-sm">
            ನಿಮ್ಮ ಕಾರ್ಯಕ್ರಮವನ್ನು ಯೋಜಿಸಿ
          </p>
        </div>
      </div>

      {/* Floating Search Bar (Positioned gracefully over hero bottom without clipping) */}
      <div className="relative z-30 px-5 -mt-7">
        <div className="bg-white rounded-2xl flex items-center h-[54px] shadow-xl shadow-black/10 border border-gray-100/80 px-4">
          <svg className="w-[18px] h-[18px] text-[#F59032] shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder={PLACEHOLDERS[phIdx]}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setActiveCategory(""); }}
            className="flex-1 min-w-0 bg-transparent border-none text-[14px] font-medium text-gray-900 outline-none placeholder:text-gray-400" 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="ml-2 text-gray-400 hover:text-gray-600 transition"
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
        <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={() => { setActiveCategory(cat.query); setSearchQuery(""); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeCategory === cat.query
                  ? "bg-[#F59032] text-white shadow-md shadow-orange-200"
                  : "bg-white text-[#555] border border-gray-200 hover:border-[#F59032]/40 hover:text-[#F59032]"
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
        <div className="px-5 pt-4 pb-2">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="relative h-24 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition" onClick={() => setActiveCategory('Tents')}>
              <img src="/images/shamiyana.png" className="absolute inset-0 w-full h-full object-cover" alt="Tents" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-2.5 text-white font-bold text-[12px] drop-shadow-sm">Tents</span>
            </div>
            <div className="relative h-24 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition" onClick={() => setActiveCategory('Chairs')}>
              <img src="/images/chairs.png" className="absolute inset-0 w-full h-full object-cover" alt="Chairs" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-2.5 text-white font-bold text-[12px] drop-shadow-sm">Chairs</span>
            </div>
            <div className="relative h-24 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition" onClick={() => setActiveCategory('Utensils')}>
              <img src="/images/plates.png" className="absolute inset-0 w-full h-full object-cover" alt="Utensils" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-2.5 text-white font-bold text-[12px] drop-shadow-sm">Utensils</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Suppliers ─── */}
      <div className="px-5 pt-6">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h2 className="text-[20px] font-bold leading-tight">
              {effectiveQuery ? "Results" : "Near You"}
            </h2>
            {!effectiveQuery && (
              <p className="text-[13px] text-[#888] mt-0.5">ನಿಮ್ಮ ಹತ್ತಿರ ಜನಪ್ರಿಯ</p>
            )}
          </div>
          {effectiveQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setActiveCategory(""); }}
              className="text-[#F59032] text-[13px] font-semibold"
            >
              Clear
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-[#F59032] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-[#888] font-medium">Finding suppliers...</p>
          </div>
        ) : processedSuppliers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <span className="text-4xl mb-3 block">😕</span>
            <p className="font-bold text-gray-800 text-[15px]">No suppliers found</p>
            <p className="text-[13px] text-[#888] mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-4">
            {processedSuppliers.map((supplier) => {
              const minPrice = supplier.inventory?.length ? Math.min(...supplier.inventory.map((i:any)=>i.price_per_day)) : null;
              
              return (
                <Link 
                  key={supplier.id} 
                  href={`/supplier/${supplier.id}`} 
                  className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
                >
                  <div className="h-40 w-full relative bg-gray-50">
                    <img 
                      src={supplier.profile_picture || "/images/hero.png"} 
                      className="w-full h-full object-cover" 
                      alt={supplier.business_name} 
                    />
                    {supplier.distance !== null && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#333] shadow-sm">
                        📍 {supplier.distance.toFixed(1)} km
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h3 className="font-bold text-[16px] leading-snug flex-1">{supplier.business_name}</h3>
                      <div className="flex items-center gap-1 bg-[#FFF8F0] px-2.5 py-1 rounded-full shrink-0">
                        <span className="text-[#F59032] text-[11px]">★</span>
                        <span className="text-[12px] font-bold text-[#333]">{supplier.google_rating > 0 ? supplier.google_rating : "4.8"}</span>
                      </div>
                    </div>
                    
                    <p className="text-[13px] text-[#777] leading-relaxed line-clamp-2 mb-3">
                      {supplier.description || "Premium event equipment and professional setup services."}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {supplier.inventory?.slice(0, 3).map((item: any, idx: number) => (
                          <span key={idx} className="bg-[#F5F5F5] text-[#666] text-[11px] font-medium px-2.5 py-1 rounded-full">
                            {item.item_name_en}
                          </span>
                        ))}
                        {(!supplier.inventory || supplier.inventory.length === 0) && (
                          <>
                            <span className="bg-[#F5F5F5] text-[#666] text-[11px] font-medium px-2.5 py-1 rounded-full">Tents</span>
                            <span className="bg-[#F5F5F5] text-[#666] text-[11px] font-medium px-2.5 py-1 rounded-full">Chairs</span>
                          </>
                        )}
                      </div>
                      {minPrice && (
                        <span className="text-[#F59032] text-[13px] font-bold whitespace-nowrap">
                          ₹{minPrice}<span className="text-[11px] font-medium text-[#999]">/day</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Bottom Nav ─── */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-lg border-t border-gray-100 flex justify-around items-center pt-2 pb-3 z-50">
        <div className="flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF3E6] flex items-center justify-center mb-0.5">
            <svg className="w-[18px] h-[18px] text-[#F59032]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold text-[#F59032]">Home</span>
        </div>
        <Link href="/bookings" className="flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 group-hover:bg-gray-50 transition">
            <svg className="w-[18px] h-[18px] text-[#999]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-[#999]">Bookings</span>
        </Link>
        <Link href="/suppliers" className="flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 group-hover:bg-gray-50 transition">
            <svg className="w-[18px] h-[18px] text-[#999]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-[#999]">Suppliers</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 group-hover:bg-gray-50 transition">
            <svg className="w-[18px] h-[18px] text-[#999]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-[#999]">Profile</span>
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
