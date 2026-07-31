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
    <div className="bg-[#FAF7F2] pb-36 min-h-screen font-sans text-[#1A1A1A]">
      {/* Hero */}
      <div className="relative h-[260px] overflow-hidden">
        <img src={supplier.profile_picture || "/images/hero.png"} className="absolute inset-0 w-full h-full object-cover" alt="Cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#FAF7F2]" />
        <div className="relative z-10 flex items-center justify-between px-5 pt-5">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <img src={supplier.profile_picture || "/images/hero.png"} className="w-10 h-10 rounded-2xl object-cover border-2 border-white/50 shadow-lg" alt="Profile" />
        </div>
      </div>

      {/* Info */}
      <div className="px-5 -mt-6 relative z-10 space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h1 className="text-[22px] font-bold leading-tight mb-1">{supplier.business_name}</h1>
          <p className="text-[13px] text-[#888] flex items-center gap-1.5 mb-3">
            <svg className="w-3.5 h-3.5 text-[#F59032]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            {supplier.area_name || "Hubli, Karnataka"}
          </p>
          <div className="flex gap-2 mb-4">
            {supplier.is_verified ? (
              <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[11px] font-semibold border border-green-100 flex items-center gap-1">
                ✓ Verified Supplier
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[11px] font-semibold border border-amber-200 flex items-center gap-1">
                ⏳ Application Under Review
              </span>
            )}
            <span className="bg-[#FFF8F0] text-[#F59032] px-3 py-1 rounded-full text-[11px] font-semibold border border-orange-100">★ {supplier.google_rating > 0 ? supplier.google_rating : "4.8"}</span>
          </div>
          <p className="text-[13px] text-[#777] leading-relaxed">{supplier.description || "Premium provider of event setups, specializing in tents, seating, and equipment."}</p>
        </div>

        {/* Google Maps Location Card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#F59032] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-[#1A1A1A]">Business Location</h4>
                <p className="text-[11px] text-[#888] truncate max-w-[200px]">{supplier.area_name || "Hubli, Karnataka"}</p>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((supplier.latitude && supplier.longitude) ? `${supplier.latitude},${supplier.longitude}` : (supplier.area_name || supplier.business_name))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-[#F59032] bg-[#FFF3E6] px-3 py-1.5 rounded-xl hover:bg-[#FFE5CC] transition flex items-center gap-1 shrink-0"
            >
              Open Maps ↗
            </a>
          </div>
          <div className="w-full h-36 rounded-xl overflow-hidden border border-gray-100 relative bg-gray-100">
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

      {/* Inventory */}
      <div className="px-5 pt-6">
        <h3 className="text-[18px] font-bold mb-4">Available Items</h3>
        <div className="space-y-3">
          {inventory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <p className="text-[14px] text-[#999]">No items listed yet</p>
            </div>
          ) : inventory.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-44 w-full bg-gray-50">
                  <img src={item.image_url || "/images/plates.png"} className="w-full h-full object-cover" alt={item.item_name_en} />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-[16px] leading-snug flex-1">{item.item_name_en}</h4>
                    <span className="bg-[#F5F5F5] text-[#888] text-[11px] px-2.5 py-1 rounded-full font-medium shrink-0">{item.total_stock} left</span>
                  <p className="text-[12px] text-[#888] mb-3 leading-relaxed">
                    {item.description || "High quality equipment, ideal for events and gatherings."}
                  </p>
                  {item.extra_images && item.extra_images.length > 0 && (
                    <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 no-scrollbar">
                      <img src={item.image_url} className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0" alt="" />
                      {item.extra_images.map((img: string, i: number) => (
                        <img key={i} src={img} className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0" alt="" />
                      ))}
                    </div>
                  )}
                    <div>
                      <span className="text-[#F59032] font-bold text-[20px]">₹{item.price_per_day}</span>
                      <span className="text-[12px] text-[#999] font-medium">/day</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0 bg-[#FAF7F2] rounded-xl border border-gray-200 overflow-hidden">
                      <button onClick={() => handleQuantity(item.id, -1, item.total_stock)} className="w-10 h-10 flex items-center justify-center text-[#888] font-bold text-lg hover:bg-gray-100 transition">−</button>
                      <span className="w-8 text-center text-[14px] font-bold">{qty}</span>
                      <button onClick={() => handleQuantity(item.id, 1, item.total_stock)} className="w-10 h-10 flex items-center justify-center text-[#333] font-bold text-lg hover:bg-gray-100 transition">+</button>
                    </div>
                    <button onClick={() => { if (qty === 0) handleQuantity(item.id, 1, item.total_stock); }} className="flex-1 bg-[#F59032] text-white text-[14px] font-semibold py-2.5 rounded-xl shadow-sm transition active:scale-[0.97] hover:bg-[#E88022]">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-lg p-4 z-50 border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        {totalItems > 0 ? (
          <button onClick={() => setIsBookingModalOpen(true)} className="w-full bg-[#F59032] text-white font-bold py-4 rounded-2xl shadow-md flex justify-between items-center px-5 transition active:scale-[0.98]">
            <span className="text-[16px]">₹{totalPrice}/day</span>
            <span className="text-[14px]">Book Now ({totalItems}) →</span>
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => window.open(`tel:+91${supplier.phone_number}`)} className="flex-1 bg-white border border-gray-200 text-[#333] font-semibold py-3.5 rounded-2xl text-[14px] flex justify-center items-center gap-2 active:bg-gray-50 transition shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              Call
            </button>
            <button onClick={() => window.open(`https://wa.me/91${supplier.whatsapp_number || supplier.phone_number}`)} className="flex-[1.5] bg-[#F59032] text-white font-semibold py-3.5 rounded-2xl text-[14px] flex justify-center items-center gap-2 shadow-md transition active:scale-[0.98]">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 2C6.49 2 2 6.49 2 12.03c0 1.777.466 3.447 1.282 4.908l-1.332 4.873 4.996-1.31C8.36 21.284 10.134 21.75 12.03 21.75 17.57 21.75 22 17.26 22 11.72 22 6.18 17.571 2 12.031 2z"/></svg>
              WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setIsBookingModalOpen(false)} />
          <div className="fixed bottom-0 left-0 w-full bg-white rounded-t-3xl z-50 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />
            <div className="px-6 pb-8 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[18px] font-bold">Book Items</h3>
                <span className="bg-[#FFF3E6] text-[#F59032] px-3 py-1.5 rounded-full font-bold text-[13px]">₹{totalPrice}/day</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-semibold text-[#888] uppercase tracking-wide">Your Name</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="w-full bg-[#FAF7F2] border border-gray-200 rounded-xl py-3 px-4 focus:border-[#F59032] outline-none text-[14px] mt-1.5 transition" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#888] uppercase tracking-wide">Phone Number</label>
                  <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+91" className="w-full bg-[#FAF7F2] border border-gray-200 rounded-xl py-3 px-4 focus:border-[#F59032] outline-none text-[14px] mt-1.5 transition" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#888] uppercase tracking-wide">Event Date</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full bg-[#FAF7F2] border border-gray-200 rounded-xl py-3 px-4 focus:border-[#F59032] outline-none text-[14px] mt-1.5 transition" />
                </div>
              </div>
              <button onClick={handleSubmitBooking} disabled={submitting} className="w-full bg-[#F59032] text-white font-bold py-4 rounded-2xl mt-5 active:scale-[0.98] transition disabled:opacity-50 shadow-sm text-[15px]">
                {submitting ? "Sending..." : "Submit Booking"}
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
