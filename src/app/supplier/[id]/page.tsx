"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import MessageModal from "@/components/MessageModal";

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
  const [modalState, setModalState] = useState<{ isOpen: boolean; type?: "success" | "error" | "info"; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => { if (supplierId) fetchSupplierData(); }, [supplierId]);

  const fetchSupplierData = async () => {
    const { data: p, error } = await supabase.from("suppliers").select("*").eq("id", supplierId).single();
    if (error || !p) return router.push("/");
    setSupplier(p);
    const { data: inv } = await supabase.from("inventory").select("*").eq("supplier_id", supplierId).eq("is_active", true).order("created_at", { ascending: false });
    setInventory(inv || []);
    setLoading(false);
  };

  const handleQuantity = (itemId: string, change: number, maxStock: number) => {
    setCart(prev => {
      const next = (prev[itemId] || 0) + change;
      if (next < 0 || next > maxStock) return prev;
      const c = { ...prev };
      if (next === 0) delete c[itemId]; else c[itemId] = next;
      return c;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((t, [id, qty]) => {
    const item = inventory.find(i => i.id === id);
    return t + (item ? item.price_per_day * qty : 0);
  }, 0);

  const handleSubmitBooking = async () => {
    if (!customerName || !customerPhone || !eventDate) {
      return setModalState({
        isOpen: true,
        type: "error",
        title: "Missing Details",
        message: "Please fill out your Name, 10-digit Phone Number, and Event Date before proceeding.",
      });
    }
    setSubmitting(true);
    const itemsRequested = Object.entries(cart).map(([id, qty]) => {
      const item = inventory.find(i => i.id === id);
      return { item_id: id, item_name: item?.item_name_en, quantity: qty, price: item?.price_per_day };
    });
    const { error } = await supabase.from("bookings").insert([{
      supplier_id: supplierId, customer_name: customerName, customer_phone: customerPhone,
      event_date: eventDate, total_price: totalPrice, items_requested: itemsRequested, status: 'pending'
    }]);
    setSubmitting(false);
    if (error) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Booking Failed",
        message: error.message || "Could not place booking request. Please try again.",
      });
    } else {
      // Trigger Telegram notification in background
      try {
        fetch("/api/telegram-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName,
            customerPhone,
            eventDate,
            totalPrice,
            itemsRequested,
            supplierName: supplier?.business_name
          })
        }).catch(err => console.error("Telegram notify error:", err));
      } catch (e) {
        console.error("Telegram trigger error:", e);
      }

      setIsBookingModalOpen(false);
      setCart({});
      setCustomerName("");
      setCustomerPhone("");
      setEventDate("");
      setModalState({
        isOpen: true,
        type: "success",
        title: "Booking Request Sent! 🎉",
        message: `Your rental request for ${supplier?.business_name || "the supplier"} has been sent. The supplier will contact you at ${customerPhone} to confirm details.`,
      });
    }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center"><div className="w-8 h-8 border-3 border-[#F59032] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="bg-[#FAF7F2] pb-36 min-h-screen font-sans text-[#1E1B17]">
      {/* Hero Header */}
      <div className="relative h-[280px] overflow-hidden">
        <img src={supplier.profile_picture || "/images/hero.png"} className="absolute inset-0 w-full h-full object-cover" alt="Cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E1B17]/60 via-transparent to-[#FAF7F2]" />
        <div className="relative z-10 flex items-center justify-between px-5 pt-5">
          <button onClick={() => router.back()} className="w-10 h-10 bg-[#1E1B17]/40 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <img src={supplier.profile_picture || "/images/hero.png"} className="w-11 h-11 rounded-xl object-cover border-2 border-white shadow-md" alt="Profile" />
        </div>
      </div>

      {/* Info Card */}
      <div className="px-5 -mt-8 relative z-10 space-y-4">
        <div className="bg-white rounded-xl p-5 border border-[#E8E1DA] shadow-sm">
          <h1 className="font-heading font-bold text-[24px] uppercase leading-tight mb-1 text-[#1E1B17]">{supplier.business_name}</h1>
          <p className="text-[13px] text-[#57423C] font-medium flex items-center gap-1.5 mb-3">
            <svg className="w-3.5 h-3.5 text-[#C04D31]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            {supplier.area_name || "Hubli, Karnataka"}
          </p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {supplier.is_verified ? (
              <span className="bg-[#FAF7F2] text-[#C04D31] px-3 py-1 rounded-lg text-[11px] font-bold border border-[#E8E1DA] flex items-center gap-1">
                ✓ VERIFIED SUPPLIER
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-lg text-[11px] font-semibold border border-amber-200 flex items-center gap-1">
                ⏳ Under Verification
              </span>
            )}
            <span className="bg-[#FFF6F4] text-[#C04D31] px-3 py-1 rounded-lg text-[11px] font-bold border border-[#DFC0B9]">★ {supplier.google_rating > 0 ? supplier.google_rating : "4.8"}</span>
          </div>
          <p className="text-[13px] text-[#57423C] leading-relaxed">{supplier.description || "Premium provider of event setups, specializing in tents, seating, and equipment."}</p>
        </div>

        {/* Google Maps Location Card */}
        <div className="bg-white rounded-xl p-4 border border-[#E8E1DA] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FFF6F4] border border-[#DFC0B9] text-[#C04D31] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              </div>
              <div>
                <h4 className="font-heading font-bold text-[14px] text-[#1E1B17] uppercase">Business Location</h4>
                <p className="text-[11px] text-[#57423C] truncate max-w-[180px]">{supplier.area_name || "Hubli, Karnataka"}</p>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((supplier.latitude && supplier.longitude) ? `${supplier.latitude},${supplier.longitude}` : (supplier.area_name || supplier.business_name))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#C04D31] bg-[#FFF6F4] border border-[#DFC0B9] px-3 py-1.5 rounded-lg hover:bg-[#C04D31] hover:text-white transition flex items-center gap-1 shrink-0"
            >
              Open Maps ↗
            </a>
          </div>
          <div className="w-full h-36 rounded-lg overflow-hidden border border-[#E8E1DA] relative bg-[#F4EDE5]">
            <iframe
              title="Supplier Location"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${supplier.latitude || 15.3647},${supplier.longitude || 75.1240}&z=14&output=embed`}
            />
          </div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="px-5 pt-6">
        <h3 className="font-heading text-[20px] font-bold uppercase tracking-tight mb-4 text-[#1E1B17]">Available Items</h3>
        <div className="space-y-4">
          {inventory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E8E1DA]">
              <p className="text-[14px] text-[#57423C]">No items listed by this vendor yet.</p>
            </div>
          ) : inventory.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div key={item.id} className="bg-white rounded-xl border border-[#E8E1DA] shadow-sm overflow-hidden">
                <div className="h-44 w-full bg-[#F4EDE5]">
                  <img src={item.image_url || "/images/plates.png"} className="w-full h-full object-cover" alt={item.item_name_en} />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-heading font-bold text-[17px] uppercase leading-snug flex-1 text-[#1E1B17]">{item.item_name_en}</h4>
                    <span className="bg-[#FAF7F2] border border-[#E8E1DA] text-[#57423C] text-[11px] px-2.5 py-1 rounded-md font-semibold shrink-0">{item.total_stock} in stock</span>
                  </div>
                  
                  <p className="text-[12px] text-[#57423C] mb-3 leading-relaxed">
                    {item.description || "High quality equipment, ideal for events and gatherings."}
                  </p>

                  {item.extra_images && item.extra_images.length > 0 && (
                    <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 no-scrollbar">
                      <img src={item.image_url} className="w-12 h-12 rounded-md object-cover border border-[#E8E1DA] shrink-0" alt="" />
                      {item.extra_images.map((img: string, i: number) => (
                        <img key={i} src={img} className="w-12 h-12 rounded-md object-cover border border-[#E8E1DA] shrink-0" alt="" />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#E8E1DA]">
                    <div>
                      <span className="font-heading text-[#C04D31] font-bold text-[22px]">₹{item.price_per_day}</span>
                      <span className="text-[12px] text-[#57423C] font-normal">/day</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-[#FAF7F2] rounded-lg border border-[#E8E1DA] overflow-hidden">
                        <button onClick={() => handleQuantity(item.id, -1, item.total_stock)} className="w-9 h-9 flex items-center justify-center text-[#57423C] font-bold text-lg hover:bg-[#E8E1DA] transition">−</button>
                        <span className="w-8 text-center text-[14px] font-bold text-[#1E1B17]">{qty}</span>
                        <button onClick={() => handleQuantity(item.id, 1, item.total_stock)} className="w-9 h-9 flex items-center justify-center text-[#1E1B17] font-bold text-lg hover:bg-[#E8E1DA] transition">+</button>
                      </div>
                      <button onClick={() => { if (qty === 0) handleQuantity(item.id, 1, item.total_stock); }} className="bg-[#C04D31] text-white text-[13px] font-bold px-4 py-2 rounded-lg shadow-sm transition hover:bg-[#9F351C]">
                        {qty > 0 ? "Selected" : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Floating Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#E8E1DA] p-4 z-50 shadow-lg">
        {totalItems > 0 ? (
          <button onClick={() => setIsBookingModalOpen(true)} className="w-full bg-[#C04D31] text-white font-bold py-3.5 rounded-xl shadow-md flex justify-between items-center px-5 transition hover:bg-[#9F351C]">
            <span className="font-heading text-[18px]">₹{totalPrice}/day</span>
            <span className="text-[14px] font-bold uppercase tracking-wider">Book Now ({totalItems} items) →</span>
          </button>
        ) : (
          <div className="flex gap-2.5">
            <button onClick={() => window.open(`tel:+91${supplier.phone_number?.replace(/\D/g, '') || "9886000000"}`)} className="flex-1 bg-white border border-[#1E1B17] text-[#1E1B17] font-bold py-3 rounded-xl text-[13px] flex justify-center items-center gap-2 hover:bg-[#1E1B17] hover:text-white transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              Call Supplier
            </button>
            <button 
              onClick={() => {
                const phone = supplier.whatsapp_number?.replace(/\D/g, '') || supplier.phone_number?.replace(/\D/g, '') || "9886000000";
                const msg = encodeURIComponent(`Hi ${supplier.business_name}, I saw your profile on PandalOnline. I want to check equipment availability and rental price per day for my event. Please call or message me back.`);
                window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
              }} 
              className="flex-[1.2] bg-[#E8F8EE] border border-[#25D366] text-[#128C7E] font-bold py-3 rounded-xl text-[13px] flex justify-center items-center gap-2 hover:bg-[#25D366] hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 2C6.49 2 2 6.49 2 12.03c0 1.777.466 3.447 1.282 4.908l-1.332 4.873 4.996-1.31C8.36 21.284 10.134 21.75 12.03 21.75 17.57 21.75 22 17.26 22 11.72 22 6.18 17.571 2 12.031 2z"/></svg>
              WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Booking Form Modal with High Contrast Inputs */}
      {isBookingModalOpen && (
        <>
          <div className="fixed inset-0 bg-[#1E1B17]/60 z-50 backdrop-blur-sm" onClick={() => setIsBookingModalOpen(false)} />
          <div className="fixed bottom-0 left-0 w-full bg-white rounded-t-2xl z-50 shadow-2xl border-t border-[#E8E1DA]">
            <div className="w-12 h-1 bg-[#E8E1DA] rounded-full mx-auto mt-3 mb-4" />
            <div className="px-6 pb-8 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#E8E1DA]">
                <div>
                  <h3 className="font-heading text-[20px] font-bold uppercase text-[#1E1B17]">Request Booking</h3>
                  <p className="text-[12px] text-[#57423C]">Send details directly to supplier</p>
                </div>
                <span className="bg-[#FFF6F4] text-[#C04D31] border border-[#DFC0B9] px-3 py-1.5 rounded-lg font-heading font-bold text-[16px]">
                  ₹{totalPrice}/day
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide">Your Full Name *</label>
                  <input 
                    type="text" 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} 
                    placeholder="e.g. Ramesh Kumar" 
                    className="w-full bg-[#FAF7F2] border border-[#1E1B17] rounded-lg py-3 px-4 outline-none text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] mt-1.5 focus:border-[#C04D31]" 
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide">Mobile / WhatsApp Number *</label>
                  <input 
                    type="tel" 
                    value={customerPhone} 
                    onChange={(e) => setCustomerPhone(e.target.value)} 
                    placeholder="10-digit number" 
                    className="w-full bg-[#FAF7F2] border border-[#1E1B17] rounded-lg py-3 px-4 outline-none text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] mt-1.5 focus:border-[#C04D31]" 
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide">Event Date *</label>
                  <input 
                    type="date" 
                    value={eventDate} 
                    onChange={(e) => setEventDate(e.target.value)} 
                    className="w-full bg-[#FAF7F2] border border-[#1E1B17] rounded-lg py-3 px-4 outline-none text-[15px] font-bold text-[#1E1B17] mt-1.5 focus:border-[#C04D31]" 
                  />
                </div>
              </div>
              <button 
                onClick={handleSubmitBooking} 
                disabled={submitting} 
                className="w-full bg-[#C04D31] text-white font-bold py-3.5 rounded-xl mt-6 uppercase tracking-wider text-[15px] hover:bg-[#9F351C] transition disabled:opacity-50 shadow-md"
              >
                {submitting ? "Sending Request..." : "Confirm & Send Booking"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Message Modal */}
      <MessageModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
