"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  confirmed: { label: "Confirmed", color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
  completed: { label: "Completed", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  cancelled: { label: "Cancelled", color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<"customer" | "supplier">("customer");

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUser(session.user);

    // Check if user is a supplier
    const { data: supplierData } = await supabase.from("suppliers").select("id").eq("id", session.user.id).single();
    if (supplierData) setView("supplier");

    fetchBookings(session.user.id, supplierData ? "supplier" : "customer");
  };

  const fetchBookings = async (userId: string, role: string) => {
    let query;
    if (role === "supplier") {
      query = supabase.from("bookings").select("*").eq("supplier_id", userId).order("created_at", { ascending: false });
    } else {
      query = supabase.from("bookings").select("*").eq("customer_phone", userId).order("created_at", { ascending: false });
    }
    const { data } = await query;
    if (data) setBookings(data);
    setLoading(false);
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (user) fetchBookings(user.id, view);
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className="bg-[#FAF7F2] pb-28 min-h-screen font-sans text-[#1A1A1A]">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-lg px-5 pt-5 pb-4 sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[22px] font-bold">Bookings</h1>
            <p className="text-[12px] text-[#999] mt-0.5">ಬುಕಿಂಗ್‌ಗಳು · {bookings.length} total</p>
          </div>
          <Link href="/" className="w-10 h-10 bg-[#FAF7F2] rounded-2xl flex items-center justify-center border border-gray-100">
            <svg className="w-[18px] h-[18px] text-[#888]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </Link>
        </div>

        {/* Tabs */}
        {user && (
          <div className="flex bg-[#FAF7F2] rounded-xl p-1 gap-1">
            <button
              onClick={() => setView("customer")}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition ${view === "customer" ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#999]"}`}
            >My Bookings</button>
            <button
              onClick={() => setView("supplier")}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition ${view === "supplier" ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#999]"}`}
            >Received</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pt-5">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-[#F59032] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-[#999]">Loading bookings...</p>
          </div>
        ) : !user ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <span className="text-5xl mb-4 block">🔐</span>
            <p className="font-bold text-[16px] text-[#555] mb-2">Login Required</p>
            <p className="text-[13px] text-[#999] mb-5 max-w-[240px] mx-auto">Sign in to view your bookings and manage requests.</p>
            <Link href="/login" className="inline-block bg-[#F59032] text-white font-semibold px-6 py-3 rounded-2xl text-[14px] shadow-sm active:scale-[0.97] transition">
              Sign In
            </Link>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <span className="text-5xl mb-4 block">📋</span>
            <p className="font-bold text-[16px] text-[#555] mb-1">No bookings yet</p>
            <p className="text-[13px] text-[#999] mb-5">
              {view === "supplier" ? "Booking requests from customers will appear here." : "Browse suppliers and make your first booking!"}
            </p>
            <Link href="/suppliers" className="inline-block bg-[#F59032] text-white font-semibold px-6 py-3 rounded-2xl text-[14px] shadow-sm active:scale-[0.97] transition">
              Browse Suppliers
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => {
              const status = STATUS_MAP[b.status] || STATUS_MAP.pending;
              const items = b.items_requested || [];
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4">
                    {/* Top row */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[15px] leading-snug">{b.customer_name || "Customer"}</h3>
                        <p className="text-[12px] text-[#999] mt-0.5">{b.customer_phone}</p>
                      </div>
                      <span className={`${status.bg} ${status.color} ${status.border} border px-3 py-1 rounded-full text-[11px] font-semibold shrink-0`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Event date */}
                    <div className="flex items-center gap-2 mb-3 bg-[#FAF7F2] rounded-xl px-3 py-2.5">
                      <svg className="w-4 h-4 text-[#F59032] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                      <span className="text-[13px] font-medium text-[#555]">{formatDate(b.event_date)}</span>
                    </div>

                    {/* Items */}
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {items.map((item: any, idx: number) => (
                          <span key={idx} className="bg-[#F5F5F5] text-[#666] text-[11px] font-medium px-2.5 py-1 rounded-full">
                            {item.item_name} × {item.quantity}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price + Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-[#F59032] font-bold text-[16px]">₹{b.total_price}<span className="text-[11px] text-[#999] font-normal">/day</span></span>
                      {view === "supplier" && b.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => updateBookingStatus(b.id, "confirmed")} className="bg-green-500 text-white text-[12px] font-semibold px-4 py-2 rounded-xl active:scale-[0.97] transition">Accept</button>
                          <button onClick={() => updateBookingStatus(b.id, "cancelled")} className="bg-white border border-gray-200 text-[#888] text-[12px] font-semibold px-4 py-2 rounded-xl active:scale-[0.97] transition">Decline</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-lg border-t border-gray-100 flex justify-around items-center pt-2 pb-3 z-50">
        <Link href="/" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 group-hover:bg-gray-50 transition">
            <svg className="w-[18px] h-[18px] text-[#999]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>
          <span className="text-[10px] font-medium text-[#999]">Home</span>
        </Link>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF3E6] flex items-center justify-center mb-0.5">
            <svg className="w-[18px] h-[18px] text-[#F59032]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <span className="text-[10px] font-semibold text-[#F59032]">Bookings</span>
        </div>
        <Link href="/suppliers" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 group-hover:bg-gray-50 transition">
            <svg className="w-[18px] h-[18px] text-[#999]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <span className="text-[10px] font-medium text-[#999]">Suppliers</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 group-hover:bg-gray-50 transition">
            <svg className="w-[18px] h-[18px] text-[#999]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <span className="text-[10px] font-medium text-[#999]">Profile</span>
        </Link>
      </div>
    </div>
  );
}
