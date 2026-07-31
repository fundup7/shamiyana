"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "Pending Approval", color: "text-amber-800", bg: "bg-amber-50", border: "border-amber-200" },
  confirmed: { label: "Booking Confirmed", color: "text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-200" },
  completed: { label: "Event Completed", color: "text-blue-800", bg: "bg-blue-50", border: "border-blue-200" },
  cancelled: { label: "Cancelled", color: "text-red-800", bg: "bg-red-50", border: "border-red-200" },
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
    <div className="bg-[#FAF7F2] pb-28 min-h-screen font-sans text-[#1E1B17]">
      {/* Header */}
      <div className="bg-white px-5 pt-5 pb-4 sticky top-0 z-40 border-b border-[#E8E1DA] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-heading text-[24px] font-bold uppercase tracking-tight text-[#1E1B17]">Bookings Tracker</h1>
            <p className="text-[12px] text-[#57423C] font-medium mt-0.5">ಬುಕಿಂಗ್‌ಗಳು · {bookings.length} total records</p>
          </div>
          <Link href="/" className="w-10 h-10 bg-[#FAF7F2] rounded-xl flex items-center justify-center border border-[#E8E1DA] text-[#1E1B17]">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </Link>
        </div>

        {/* Role Tabs */}
        {user && (
          <div className="flex bg-[#FAF7F2] border border-[#E8E1DA] rounded-lg p-1 gap-1">
            <button
              onClick={() => setView("customer")}
              className={`flex-1 py-2 rounded-md text-[13px] font-bold uppercase transition ${view === "customer" ? "bg-[#C04D31] text-white shadow-sm" : "text-[#57423C]"}`}
            >My Bookings</button>
            <button
              onClick={() => setView("supplier")}
              className={`flex-1 py-2 rounded-md text-[13px] font-bold uppercase transition ${view === "supplier" ? "bg-[#C04D31] text-white shadow-sm" : "text-[#57423C]"}`}
            >Received Requests</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pt-5">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-[#C04D31] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-[#57423C] font-medium">Fetching booking status...</p>
          </div>
        ) : !user ? (
          <div className="text-center py-20 bg-white rounded-xl border border-[#E8E1DA]">
            <span className="text-5xl mb-4 block">🔐</span>
            <p className="font-heading font-bold text-[20px] uppercase text-[#1E1B17] mb-2">Login Required</p>
            <p className="text-[13px] text-[#57423C] mb-6 max-w-[260px] mx-auto leading-relaxed">Sign in to view your equipment bookings and manage event schedules.</p>
            <Link href="/login" className="inline-block bg-[#C04D31] text-white font-bold uppercase tracking-wide px-8 py-3.5 rounded-xl text-[14px] shadow-sm hover:bg-[#9F351C] transition">
              Sign In Now
            </Link>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-[#E8E1DA]">
            <span className="text-5xl mb-4 block">📋</span>
            <p className="font-heading font-bold text-[20px] uppercase text-[#1E1B17] mb-1">No bookings yet</p>
            <p className="text-[13px] text-[#57423C] mb-6">
              {view === "supplier" ? "Booking requests from event organizers will appear here." : "Browse suppliers and place your first event rental request!"}
            </p>
            <Link href="/suppliers" className="inline-block bg-[#C04D31] text-white font-bold uppercase tracking-wide px-6 py-3 rounded-xl text-[13px] shadow-sm hover:bg-[#9F351C] transition">
              Browse Suppliers
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {bookings.map((b) => {
              const status = STATUS_MAP[b.status] || STATUS_MAP.pending;
              const items = b.items_requested || [];
              return (
                <div key={b.id} className="bg-white rounded-xl border border-[#E8E1DA] shadow-sm overflow-hidden">
                  <div className="p-4">
                    {/* Top row */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-[17px] uppercase leading-snug text-[#1E1B17]">{b.customer_name || "Customer"}</h3>
                        <p className="text-[12px] text-[#57423C] font-medium mt-0.5">📞 {b.customer_phone}</p>
                      </div>
                      <span className={`${status.bg} ${status.color} ${status.border} border px-3 py-1 rounded-md text-[11px] font-bold shrink-0 uppercase tracking-wide`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Event date */}
                    <div className="flex items-center gap-2 mb-3 bg-[#FAF7F2] border border-[#E8E1DA] rounded-lg px-3 py-2.5">
                      <svg className="w-4 h-4 text-[#C04D31] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                      <span className="text-[13px] font-bold text-[#1E1B17]">Event Date: {formatDate(b.event_date)}</span>
                    </div>

                    {/* Items requested */}
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {items.map((item: any, idx: number) => (
                          <span key={idx} className="bg-[#F4EDE5] border border-[#E8E1DA] text-[#57423C] text-[11px] font-medium px-2.5 py-1 rounded-md">
                            {item.item_name} × {item.quantity}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price + Supplier Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#E8E1DA]">
                      <span className="font-heading text-[#C04D31] font-bold text-[18px]">₹{b.total_price}<span className="text-[11px] text-[#57423C] font-normal">/day</span></span>
                      {view === "supplier" && b.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => updateBookingStatus(b.id, "confirmed")} className="bg-[#C04D31] text-white text-[12px] font-bold uppercase px-3.5 py-1.5 rounded-lg transition hover:bg-[#9F351C]">Accept</button>
                          <button onClick={() => updateBookingStatus(b.id, "cancelled")} className="bg-white border border-[#1E1B17] text-[#1E1B17] text-[12px] font-bold uppercase px-3.5 py-1.5 rounded-lg transition hover:bg-[#1E1B17] hover:text-white">Decline</button>
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#E8E1DA] flex justify-around items-center pt-2 pb-3 z-50 shadow-lg">
        <Link href="/" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 group-hover:bg-[#F4EDE5] transition">
            <svg className="w-[18px] h-[18px] text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>
          <span className="text-[11px] font-medium text-[#57423C]">Home</span>
        </Link>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-[#FFF6F4] border border-[#DFC0B9] flex items-center justify-center mb-0.5">
            <svg className="w-[18px] h-[18px] text-[#C04D31]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <span className="text-[11px] font-bold text-[#C04D31]">Bookings</span>
        </div>
        <Link href="/suppliers" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 group-hover:bg-[#F4EDE5] transition">
            <svg className="w-[18px] h-[18px] text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <span className="text-[11px] font-medium text-[#57423C]">Suppliers</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 group-hover:bg-[#F4EDE5] transition">
            <svg className="w-[18px] h-[18px] text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <span className="text-[11px] font-medium text-[#57423C]">Profile</span>
        </Link>
      </div>
    </div>
  );
}
