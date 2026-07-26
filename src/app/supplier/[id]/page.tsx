"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function SupplierProfile() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (supplierId) fetchSupplierData();
  }, [supplierId]);

  const fetchSupplierData = async () => {
    const { data: profileData, error: profileError } = await supabase.from("suppliers").select("*").eq("id", supplierId).single();
    if (profileError || !profileData) return router.push("/");
    setSupplier(profileData);

    const { data: inventoryData } = await supabase.from("inventory").select("*").eq("supplier_id", supplierId).eq("is_active", true).order("created_at", { ascending: false });
    setInventory(inventoryData || []);
    setLoading(false);
  };

  const handleQuantity = (itemId: string, change: number, maxStock: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + change;
      if (next < 0 || next > maxStock) return prev;
      const newCart = { ...prev };
      if (next === 0) delete newCart[itemId];
      else newCart[itemId] = next;
      return newCart;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((total, [id, qty]) => {
    const item = inventory.find(i => i.id === id);
    return total + (item ? item.price_per_day * qty : 0);
  }, 0);

  const handleSubmitBooking = async () => {
    if (!customerName || !customerPhone || !eventDate) return alert("Please fill out your Name, Phone, and Event Date.");
    setSubmitting(true);
    const itemsRequested = Object.entries(cart).map(([id, qty]) => {
      const item = inventory.find(i => i.id === id);
      return { item_id: id, item_name: item?.item_name_en, quantity: qty, price: item?.price_per_day };
    });

    const { error } = await supabase.from("bookings").insert([{
      supplier_id: supplierId, customer_name: customerName, customer_phone: customerPhone, event_date: eventDate, total_price: totalPrice, items_requested: itemsRequested, status: 'pending'
    }]);

    setSubmitting(false);
    if (error) alert("Error: " + error.message);
    else {
      alert("Booking Request Sent Successfully!");
      setIsBookingModalOpen(false); setCart({}); setCustomerName(""); setCustomerPhone(""); setEventDate("");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#FBF6ED] flex items-center justify-center font-bold text-[#F59032]">Loading...</div>;

  return (
    <div className="bg-[#FBF6ED] pb-[140px] min-h-screen font-sans text-[#1F1F1F]">
      {/* Top Header */}
      <div className="bg-[#FBF6ED] px-4 py-4 sticky top-0 z-50 flex justify-between items-center text-[#1F1F1F]">
        <button onClick={() => router.back()} className="p-1">
          <svg className="w-5 h-5 text-[#1F1F1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <span className="font-bold text-[#F59032] text-lg">{supplier.business_name || "Shamiyana Hubli"}</span>
        <img src={supplier.profile_picture || "/images/hero.png"} className="w-8 h-8 rounded-full object-cover border border-gray-300 shadow-sm" alt="Profile" />
      </div>

      {/* Hero Image with Overlaid Title */}
      <div className="px-4">
        <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-sm">
          <img src={supplier.profile_picture || "/images/hero.png"} className="w-full h-full object-cover" alt="Cover" />
          <div className="absolute inset-0 bg-black/10"></div>
          
          <div className="absolute bottom-2 left-2 bg-[#FBF6ED] px-4 py-2.5 rounded shadow-sm max-w-[85%]">
            <h1 className="text-[16px] font-bold text-[#1F1F1F] leading-tight flex flex-wrap gap-1">
              <span>{supplier.business_name}</span> <span>/ ರಾಜಾ</span>
            </h1>
            <p className="text-[11px] text-[#69727B] flex items-center gap-1 mt-0.5">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {supplier.area_name || "New Delhi, India / ನವದೆಹಲಿ, ಭಾರತ"}
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="px-4 mt-4 mb-6">
        <div className="flex gap-2 mb-3">
          <div className="bg-[#FDECEC] text-[#C43228] px-2 py-1 rounded text-[10px] font-bold flex items-center border border-red-100">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Verified Supplier
          </div>
          <div className="bg-[#F2F4F7] text-[#505762] px-2 py-1 rounded text-[10px] font-bold flex items-center border border-gray-200">
            ☆ {supplier.google_rating > 0 ? supplier.google_rating : "4.8"} (120 Reviews)
          </div>
        </div>
        <p className="text-[13px] text-[#505762] leading-relaxed">
          {supplier.description || "Premium provider of large-scale event setups, specializing in heavy-duty tents, industrial cooking equipment, and more."}
        </p>
      </div>

      {/* Inventory */}
      <div className="px-4">
        <h3 className="text-[16px] font-bold text-[#1F1F1F] mb-4">ಬಾಡಿಗೆಗೆ ಲಭ್ಯವಿರುವ ವಸ್ತುಗಳು</h3>
        <div className="space-y-4">
          {inventory.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-4">No items yet.</p>
          ) : (
            inventory.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="h-40 w-full bg-gray-100">
                    <img src={item.image_url || "/images/plates.png"} className="w-full h-full object-cover" alt={item.item_name_en} />
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-[15px] text-[#1F1F1F] mb-1 leading-tight">{item.item_name_en}</h4>
                    <p className="text-[12px] text-[#69727B] mb-3 leading-snug line-clamp-2">Heavy-duty equipment, ideal for large gatherings.</p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <span className="text-[#C43228] font-bold text-[18px]">₹{item.price_per_day}</span>
                        <span className="text-[12px] text-[#1F1F1F] font-bold">/ದಿನ</span>
                      </div>
                      <span className="bg-[#F8F9FA] text-[#505762] border border-gray-200 text-[10px] px-2.5 py-1 rounded font-medium">
                        {item.total_stock} Available
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-3 border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-3 border border-gray-200 rounded p-1 w-24 justify-between shadow-sm">
                        <button onClick={() => handleQuantity(item.id, -1, item.total_stock)} className="w-6 h-6 flex items-center justify-center text-[#505762] font-bold active:bg-gray-100 rounded">-</button>
                        <span className="text-[13px] font-bold text-[#1F1F1F]">{qty}</span>
                        <button onClick={() => handleQuantity(item.id, 1, item.total_stock)} className="w-6 h-6 flex items-center justify-center text-[#1F1F1F] font-bold active:bg-gray-100 rounded">+</button>
                      </div>
                      <button onClick={() => {if(qty===0) handleQuantity(item.id, 1, item.total_stock)}} className="flex-1 bg-[#F59032] hover:bg-[#E88022] text-white text-[13px] font-bold py-2 rounded shadow-sm transition active:scale-95 text-center">
                        Add / ಸೇರಿಸಿ
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-[56px] left-0 w-full bg-white p-3 z-40 flex gap-3 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] border-t border-gray-100">
        {totalItems > 0 ? (
          <button onClick={() => setIsBookingModalOpen(true)} className="w-full bg-[#F59032] hover:bg-[#E88022] text-white font-bold py-3.5 rounded shadow-sm flex justify-between items-center px-4 transition active:scale-95">
            <div className="flex flex-col text-left leading-tight">
              <span>₹{totalPrice} Total</span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              Book Now ({totalItems} items) →
            </div>
          </button>
        ) : (
          <>
            <button onClick={() => window.open(`tel:+91${supplier.phone_number}`)} className="flex-1 bg-white border border-[#F59032] text-[#F59032] font-bold py-2.5 rounded text-[13px] flex justify-center items-center gap-2 active:bg-orange-50 transition shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> ಕರೆ ಮಾಡಿ
            </button>
            <button onClick={() => window.open(`https://wa.me/91${supplier.whatsapp_number || supplier.phone_number}`)} className="flex-[1.5] bg-[#F59032] hover:bg-[#E88022] text-white font-bold py-2.5 rounded text-[13px] flex justify-center items-center gap-2 shadow-sm transition active:scale-95">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 2C6.49 2 2 6.49 2 12.03c0 1.777.466 3.447 1.282 4.908l-1.332 4.873 4.996-1.31C8.36 21.284 10.134 21.75 12.03 21.75 17.57 21.75 22 17.26 22 11.72 22 6.18 17.571 2 12.031 2zM12.031 19.98c-1.521 0-2.986-.411-4.28-1.18l-.307-.182-3.18.834.847-3.1-2.01-.321c-.815-1.3-1.246-2.796-1.246-4.331C2.864 7.453 6.556 3.76 11.031 3.76c4.474 0 8.167 3.693 8.167 8.167s-3.693 8.053-8.167 8.053zm4.566-6.177c-.25-.125-1.482-.733-1.712-.816-.231-.083-.399-.125-.568.125-.169.25-.65 1.053-.787 1.178-.137.125-.274.142-.524.017-1.127-.565-2.072-1.28-2.823-2.312-.19-.26-.008-.43.14-.585.127-.133.25-.29.375-.436.068-.083.109-.125.163-.25.068-.166.034-.312-.027-.436-.068-.125-.568-1.371-.787-1.879-.215-.494-.43-.427-.568-.436l-.487-.008c-.168 0-.44.062-.672.312-.231.25-.89 1.053-.89 2.569s.912 2.977 1.038 3.144c.125.166 2.146 3.275 5.197 4.593.727.314 1.294.502 1.737.642.73.232 1.396.199 1.921.12.585-.088 1.482-.605 1.693-1.19.211-.585.211-1.086.147-1.19-.063-.105-.231-.167-.481-.292z"/></svg> ವಾಟ್ಸಾಪ್
            </button>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 w-full bg-[#FFFDFD] border-t border-gray-200 flex justify-around items-center py-2 pb-safe z-50 h-[56px]">
        <Link href="/" className="flex flex-col items-center cursor-pointer text-[#69727B] hover:text-[#1F1F1F] transition">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[9px] font-bold leading-tight">Home</span>
          <span className="text-[8px] font-medium leading-tight">ಮುಖಪುಟ</span>
        </Link>
        <Link href="/dashboard" className="flex flex-col items-center cursor-pointer text-[#69727B] hover:text-[#1F1F1F] transition">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-[9px] font-bold leading-tight">Bookings</span>
          <span className="text-[8px] font-medium leading-tight">ಬುಕಿಂಗ್‌ಗಳು</span>
        </Link>
        <div className="flex flex-col items-center cursor-pointer text-[#F59032]">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          <span className="text-[9px] font-bold leading-tight">Suppliers</span>
          <span className="text-[8px] font-medium leading-tight">ಪೂರೈಕೆದಾರರು</span>
        </div>
        <Link href="/login" className="flex flex-col items-center cursor-pointer text-[#69727B] hover:text-[#1F1F1F] transition">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[9px] font-bold leading-tight">Profile</span>
          <span className="text-[8px] font-medium leading-tight">ಪ್ರೊಫೈಲ್</span>
        </Link>
      </div>

      {/* Booking Checkout Bottom Sheet */}
      {isBookingModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={() => setIsBookingModalOpen(false)}></div>
          <div className="fixed bottom-0 left-0 w-full bg-[#FFFDFD] rounded-t-xl z-50 pt-2 pb-safe shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 mt-2"></div>
            <div className="px-6 pb-8 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[#1F1F1F]">Request Booking</h3>
                <span className="bg-[#FDECEC] text-[#C43228] px-3 py-1 rounded font-bold text-sm">₹{totalPrice}/day</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-[#69727B] uppercase tracking-wide">Your Full Name</label>
                  <input type="text" value={customerName} onChange={(e)=>setCustomerName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="w-full border border-gray-300 rounded py-2 px-3 focus:border-[#F59032] outline-none font-bold text-[#1F1F1F] bg-white mt-1 text-[13px]" />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-[#69727B] uppercase tracking-wide">Your Phone Number</label>
                  <input type="tel" value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} placeholder="+91" className="w-full border border-gray-300 rounded py-2 px-3 focus:border-[#F59032] outline-none font-bold text-[#1F1F1F] bg-white mt-1 text-[13px]" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#69727B] uppercase tracking-wide">Event Date</label>
                  <input type="date" value={eventDate} onChange={(e)=>setEventDate(e.target.value)} className="w-full border border-gray-300 rounded py-2 px-3 focus:border-[#F59032] outline-none font-bold text-[#1F1F1F] bg-white mt-1 text-[13px]" />
                </div>
              </div>

              <button onClick={handleSubmitBooking} disabled={submitting} className="w-full bg-[#F59032] hover:bg-[#E88022] text-white font-bold py-3.5 rounded mt-6 active:scale-95 transition disabled:opacity-50 shadow-sm text-[13px]">
                {submitting ? "Sending Request..." : "Submit Booking Request"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
