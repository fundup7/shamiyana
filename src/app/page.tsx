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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    fetchSuppliers();
    requestLocation();
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
    const { data, error } = await supabase
      .from('suppliers')
      .select(`*, inventory ( item_name_en, category, total_stock, price_per_day )`);
    if (data) setSuppliers(data);
    setLoading(false);
  };

  const processedSuppliers = suppliers
    .filter(supplier => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
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
    <div className="bg-[#FBF6ED] pb-24 min-h-screen font-sans text-[#1F1F1F]">
      {/* Top Bar */}
      <div className="bg-[#FBF6ED] px-4 py-4 sticky top-0 z-50 flex items-center gap-2">
        <div className="w-8 h-8 bg-[#F59032] rounded flex items-center justify-center text-white shrink-0 shadow-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"></path>
            <path d="M12 3l9 18"></path>
            <path d="M12 3l-9 18"></path>
            <path d="M12 3v18"></path>
          </svg>
        </div>
        <span className="font-extrabold text-[#1F1F1F] text-[20px] tracking-tight">Hubli Shamiyana</span>
      </div>

      {/* Hero */}
      <div className="px-4 pt-2">
        <h1 className="text-[28px] font-extrabold leading-[1.1] mb-1">Plan Your Event.</h1>
        <h2 className="text-[22px] font-bold leading-snug mb-3 text-[#3D3328]">ನಿಮ್ಮ ಕಾರ್ಯಕ್ರಮವನ್ನು ಯೋಜಿಸಿ.</h2>
        <p className="text-[13px] text-[#505762] mb-0.5">Find the best tents, chairs, and utensils in Hubli.</p>
        <p className="text-[12px] text-[#69727B] font-medium mb-5">ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ಅತ್ಯುತ್ತಮ ಟೆಂಟ್‌ಗಳು, ಕುರ್ಚಿಗಳು ಮತ್ತು ಪಾತ್ರೆಗಳನ್ನು ಹುಡುಕಿ.</p>
        
        <div className="border border-gray-300 rounded flex items-center bg-white mb-3 shadow-sm h-12 relative overflow-hidden">
          <svg className="w-4 h-4 text-gray-400 ml-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <div className="flex flex-col flex-1 px-2 py-1 justify-center relative">
            <input 
              type="text" 
              placeholder={searchQuery ? "" : "Search plates, chairs, tents.."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-[12px] text-gray-900 outline-none placeholder:text-gray-500 z-10" 
            />
            {!searchQuery && <span className="text-[10px] text-gray-400 pointer-events-none truncate absolute top-7 z-0">ಪ್ಲೇಟ್‌ಗಳು, ಕುರ್ಚಿಗಳು, ಟೆಂಟ್‌ಗಳನ್ನು ಹುಡುಕಿ...</span>}
          </div>
        </div>
        
        <button className="w-full bg-[#F59032] hover:bg-[#E88022] text-white font-bold py-3.5 rounded text-[13px] shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5">
          <span>Search Now.</span> <span className="font-medium text-[12px]">ಈಗ ಹುಡುಕಿ</span>
        </button>
      </div>

      {/* Categories */}
      {!searchQuery && (
        <div className="px-4 pt-8">
          <h2 className="text-[18px] font-bold mb-4 flex items-center gap-1.5">
            Categories. <span className="text-[16px] text-[#505762]">ವರ್ಗಗಳು</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div onClick={() => setSearchQuery('Tents')} className="relative h-28 rounded-md overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition border border-gray-200">
              <img src="/images/hero.png" className="absolute inset-0 w-full h-full object-cover" alt="Tents" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-2 left-3 drop-shadow-md">
                <span className="text-white font-bold text-[16px] block leading-tight">Tents</span>
                <span className="text-gray-200 font-bold text-[12px] block leading-tight mt-0.5">ಟೆಂಟ್‌ಗಳು</span>
              </div>
            </div>
            <div onClick={() => setSearchQuery('Chairs')} className="relative h-28 rounded-md overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition border border-gray-200">
              <img src="/images/chairs.png" className="absolute inset-0 w-full h-full object-cover" alt="Chairs" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-2 left-3 drop-shadow-md">
                <span className="text-white font-bold text-[16px] block leading-tight">Chairs</span>
                <span className="text-gray-200 font-bold text-[12px] block leading-tight mt-0.5">ಕುರ್ಚಿಗಳು</span>
              </div>
            </div>
            <div onClick={() => setSearchQuery('Utensils')} className="relative h-44 rounded-md overflow-hidden shadow-sm col-span-2 cursor-pointer active:scale-[0.98] transition mt-1 border border-gray-200">
              <img src="/images/plates.png" className="absolute inset-0 w-full h-full object-cover" alt="Utensils" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
              <div className="absolute bottom-3 left-4 drop-shadow-md">
                <span className="text-white font-bold text-[18px] block leading-tight">Utensils</span>
                <span className="text-gray-200 font-bold text-[14px] block leading-tight mt-0.5">ಪಾತ್ರೆಗಳು</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popular Near You */}
      <div className="px-4 pt-8">
        <div className="mb-4">
          <h2 className="text-[18px] font-bold leading-tight">{searchQuery ? "Search Results" : "Popular Near You."}</h2>
          {!searchQuery && <h3 className="text-[16px] font-bold text-[#505762] leading-tight mt-0.5">ನಿಮ್ಮ ಹತ್ತಿರ ಜನಪ್ರಿಯ</h3>}
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500 font-bold animate-pulse">Loading...</div>
        ) : processedSuppliers.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-md border border-gray-200 shadow-sm">
            <span className="text-4xl mb-2 block">😕</span>
            <p className="font-bold text-gray-900 text-sm">No suppliers found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {processedSuppliers.map((supplier) => {
              const minPrice = supplier.inventory?.length ? Math.min(...supplier.inventory.map((i:any)=>i.price_per_day)) : null;
              
              return (
                <Link key={supplier.id} href={`/supplier/${supplier.id}`} className="block bg-[#FFFDFD] rounded-lg overflow-hidden shadow-sm border border-gray-200">
                  <div className="h-36 w-full relative bg-gray-100">
                    <img src={supplier.profile_picture || "/images/hero.png"} className="w-full h-full object-cover" alt={supplier.business_name} />
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-[#1F1F1F] text-[17px] leading-tight flex-1 mr-2">{supplier.business_name}</h3>
                      <div className="bg-[#FDF3E7] text-[#1F1F1F] px-1.5 py-0.5 rounded flex items-center shrink-0 border border-[#FAD7B5]">
                        <span className="text-[10px] font-bold">{minPrice ? `₹${minPrice}/day, ` : ''}{supplier.google_rating > 0 ? supplier.google_rating : "4.8"} ★</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#505762] mb-4 leading-relaxed line-clamp-2">{supplier.description || "Premium tents, seating arrangements, and complete event setups."}</p>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.inventory?.slice(0, 3).map((item: any, idx: number) => (
                        <span key={idx} className="bg-[#F2F4F7] text-[#505762] text-[10px] font-medium px-2.5 py-1 rounded">
                          {item.item_name_en}
                        </span>
                      ))}
                      {(!supplier.inventory || supplier.inventory.length === 0) && (
                        <>
                          <span className="bg-[#F2F4F7] text-[#505762] text-[10px] font-medium px-2.5 py-1 rounded">Tents</span>
                          <span className="bg-[#F2F4F7] text-[#505762] text-[10px] font-medium px-2.5 py-1 rounded">Chairs</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 w-full bg-[#FFFDFD] border-t border-gray-200 flex justify-around items-center py-2 pb-safe z-50">
        <div className="flex flex-col items-center cursor-pointer text-[#F59032]">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[9px] font-bold leading-tight">Home</span>
          <span className="text-[8px] font-medium leading-tight">ಮುಖಪುಟ</span>
        </div>
        <Link href="/dashboard" className="flex flex-col items-center cursor-pointer text-[#69727B] hover:text-[#1F1F1F] transition">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-[9px] font-bold leading-tight">Bookings</span>
          <span className="text-[8px] font-medium leading-tight">ಬುಕಿಂಗ್‌ಗಳು</span>
        </Link>
        <Link href="/" className="flex flex-col items-center cursor-pointer text-[#69727B] hover:text-[#1F1F1F] transition">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          <span className="text-[9px] font-bold leading-tight">Suppliers</span>
          <span className="text-[8px] font-medium leading-tight">ಪೂರೈಕೆದಾರರು</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center cursor-pointer text-[#69727B] hover:text-[#1F1F1F] transition">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[9px] font-bold leading-tight">Profile</span>
          <span className="text-[8px] font-medium leading-tight">ಪ್ರೊಫೈಲ್</span>
        </Link>
      </div>
    </div>
  );
}
