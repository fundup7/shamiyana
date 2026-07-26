"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [itemName, setItemName] = useState("");
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Tents");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [itemDesc, setItemDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [pBusiness, setPBusiness] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pWhatsapp, setPWhatsapp] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pProfilePic, setPProfilePic] = useState<File | null>(null);
  const [pLat, setPLat] = useState<number | null>(null);
  const [pLng, setPLng] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => { checkUser(); }, []);

  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 4000); };

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push("/login");
    setUser(session.user);
    const { data: profileData } = await supabase.from("suppliers").select("*").eq("id", session.user.id).single();
    if (!profileData || !profileData.phone_number) {
      setNeedsProfileSetup(true);
      if (profileData) setPBusiness(profileData.business_name || "");
    } else {
      setProfile(profileData);
      fetchInventory(session.user.id);
    }
  };

  const fetchInventory = async (supplierId: string) => {
    const { data } = await supabase.from("inventory").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false });
    if (data) setInventory(data);
  };

  const getLocationForProfile = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setPLat(pos.coords.latitude); setPLng(pos.coords.longitude); },
        () => showError("Please allow GPS permissions in your browser so customers can find you.")
      );
    } else { showError("Geolocation is not supported by your browser."); }
  };

  const handleSaveProfile = async () => {
    if (!pProfilePic) return showError("Please upload a Business Logo.");
    if (!pBusiness.trim()) return showError("Business Name is required.");
    const phoneRegex = /^\d{10}$/;
    const cleanPhone = pPhone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) return showError("Please enter a valid 10-digit phone number.");
    if (pWhatsapp) { const cw = pWhatsapp.replace(/\D/g, ''); if (!phoneRegex.test(cw)) return showError("Please enter a valid 10-digit WhatsApp number."); }
    if (!pDesc.trim()) return showError("Please write a short Business Description.");
    if (!pAddress.trim()) return showError("Please enter your Full Address.");
    if (!pLat || !pLng) return showError("Please pin your Map Location using the Get GPS button.");
    setUploading(true);
    try {
      const ext = pProfilePic.name.split('.').pop();
      const path = `${user.id}/profile_${Math.random()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('inventory_images').upload(path, pProfilePic);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('inventory_images').getPublicUrl(path);
      const { error: upsertError } = await supabase.from("suppliers").upsert({
        id: user.id, business_name: pBusiness, phone_number: cleanPhone,
        whatsapp_number: pWhatsapp ? pWhatsapp.replace(/\D/g, '') : cleanPhone,
        area_name: pAddress, description: pDesc, google_rating: 0,
        latitude: pLat, longitude: pLng, profile_picture: data.publicUrl, is_verified: false
      }, { onConflict: 'id' });
      if (upsertError) throw upsertError;
      setNeedsProfileSetup(false);
      checkUser();
    } catch (err: any) { showError(err.message || "Something went wrong saving the profile."); }
    finally { setUploading(false); }
  };

  const toggleAdminVerification = async () => {
    if (!profile) return;
    const newStatus = !profile.is_verified;
    const { error } = await supabase.from("suppliers").update({ is_verified: newStatus }).eq("id", profile.id);
    if (error) showError(error.message);
    else {
      setProfile({ ...profile, is_verified: newStatus });
      showError(newStatus ? "Profile approved & active!" : "Profile status changed to Pending Review.");
    }
  };

  const openAddModal = () => {
    setEditingItem(null); setItemName(""); setStock(""); setPrice(""); setCategory("Tents");
    setImageFiles([]); setItemDesc(""); setExistingImages([]); setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setItemName(item.item_name_en || "");
    setStock(String(item.total_stock || ""));
    setPrice(String(item.price_per_day || ""));
    setCategory(item.category || "Tents");
    setItemDesc(item.description || "");
    const imgs = item.image_url ? [item.image_url, ...(item.extra_images || [])] : [];
    setExistingImages(imgs);
    setImageFiles([]);
    setIsModalOpen(true);
  };

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const total = imageFiles.length + existingImages.length + newFiles.length;
    if (total > 5) return showError("Maximum 5 images allowed.");
    setImageFiles(prev => [...prev, ...newFiles]);
  };

  const removeNewImage = (idx: number) => setImageFiles(prev => prev.filter((_, i) => i !== idx));
  const removeExistingImage = (idx: number) => setExistingImages(prev => prev.filter((_, i) => i !== idx));

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/item_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('inventory_images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('inventory_images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSaveItem = async () => {
    const totalImages = imageFiles.length + existingImages.length;
    if (totalImages === 0) return showError("Please upload at least one photo.");
    if (!itemName.trim()) return showError("Service/product name is required.");
    if (!stock || parseInt(stock) <= 0) return showError("Please enter a valid stock quantity.");
    if (!price || parseFloat(price) <= 0) return showError("Please enter a valid price per day.");
    setUploading(true);
    try {
      const newUrls = imageFiles.length > 0 ? await uploadImages(imageFiles) : [];
      const allUrls = [...existingImages, ...newUrls];
      const mainImage = allUrls[0];
      const extraImages = allUrls.slice(1);

      if (editingItem) {
        const { error } = await supabase.from("inventory").update({
          item_name_en: itemName, category, total_stock: parseInt(stock),
          price_per_day: parseFloat(price), image_url: mainImage,
          extra_images: extraImages, description: itemDesc || null
        }).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory").insert([{
          supplier_id: user.id, item_name_en: itemName, category,
          total_stock: parseInt(stock), price_per_day: parseFloat(price),
          image_url: mainImage, extra_images: extraImages, description: itemDesc || null
        }]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchInventory(user.id);
    } catch (err: any) { showError(err.message || "Something went wrong."); }
    finally { setUploading(false); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this item permanently?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", itemId);
    if (error) showError(error.message);
    else fetchInventory(user.id);
  };

  const ErrorPopup = () => errorMsg ? (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-5 py-3.5 rounded-2xl shadow-lg z-[100] flex items-center gap-3 w-[90%] max-w-sm">
      <span className="text-lg">⚠️</span>
      <p className="text-[13px] font-medium leading-tight">{errorMsg}</p>
    </div>
  ) : null;

  const BottomNav = ({ active }: { active: string }) => (
    <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-lg border-t border-gray-100 flex justify-around items-center pt-2 pb-3 z-50">
      <Link href="/" className="flex flex-col items-center group">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 ${active === 'home' ? 'bg-[#FFF3E6]' : 'group-hover:bg-gray-50'} transition`}>
          <svg className={`w-[18px] h-[18px] ${active === 'home' ? 'text-[#F59032]' : 'text-[#999]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </div>
        <span className={`text-[10px] font-semibold ${active === 'home' ? 'text-[#F59032]' : 'text-[#999]'}`}>Home</span>
      </Link>
      <Link href="/bookings" className="flex flex-col items-center group">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 ${active === 'bookings' ? 'bg-[#FFF3E6]' : 'group-hover:bg-gray-50'} transition`}>
          <svg className={`w-[18px] h-[18px] ${active === 'bookings' ? 'text-[#F59032]' : 'text-[#999]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <span className={`text-[10px] font-medium ${active === 'bookings' ? 'text-[#F59032]' : 'text-[#999]'}`}>Bookings</span>
      </Link>
      <Link href="/suppliers" className="flex flex-col items-center group">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 ${active === 'suppliers' ? 'bg-[#FFF3E6]' : 'group-hover:bg-gray-50'} transition`}>
          <svg className={`w-[18px] h-[18px] ${active === 'suppliers' ? 'text-[#F59032]' : 'text-[#999]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
        <span className={`text-[10px] font-medium ${active === 'suppliers' ? 'text-[#F59032]' : 'text-[#999]'}`}>Suppliers</span>
      </Link>
      <Link href="/login" className="flex flex-col items-center group">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-0.5 ${active === 'profile' ? 'bg-[#FFF3E6]' : 'group-hover:bg-gray-50'} transition`}>
          <svg className={`w-[18px] h-[18px] ${active === 'profile' ? 'text-[#F59032]' : 'text-[#999]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <span className={`text-[10px] font-medium ${active === 'profile' ? 'text-[#F59032]' : 'text-[#999]'}`}>Profile</span>
      </Link>
    </div>
  );

  if (!user) return <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center"><div className="w-8 h-8 border-3 border-[#F59032] border-t-transparent rounded-full animate-spin" /></div>;

  // ─── Profile Setup ───
  if (needsProfileSetup) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] px-5 pt-10 pb-28 font-sans">
        <ErrorPopup />
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#F59032] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-200">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
          </div>
          <h1 className="text-[24px] font-extrabold text-[#1A1A1A] tracking-tight">Complete Profile</h1>
          <p className="text-[13px] text-[#888] mt-1.5 leading-relaxed max-w-[280px] mx-auto">Customers need to know who you are before renting.</p>
        </div>
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <label className="border-2 border-dashed border-gray-200 rounded-2xl py-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#F59032] transition relative overflow-hidden">
              {pProfilePic && <div className="absolute inset-0 bg-[#F59032]/5 flex items-center justify-center"><span className="bg-white px-3 py-1.5 rounded-full text-[12px] font-semibold text-green-600 shadow-sm">✓ Image Selected</span></div>}
              <svg className="w-8 h-8 mb-2 text-[#ccc]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              <span className="text-[14px] font-semibold text-[#555]">Upload Business Logo <span className="text-red-400">*</span></span>
              <span className="text-[11px] text-[#aaa] mt-1">PNG, JPG up to 5MB</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e)=>setPProfilePic(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Business Name <span className="text-red-400">*</span></label>
              <input type="text" placeholder="e.g. Shamiyana Rentals" value={pBusiness} onChange={(e)=>setPBusiness(e.target.value)} className="w-full bg-[#FAF7F2] border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#F59032] transition" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#555] mb-1.5">Phone <span className="text-red-400">*</span></label>
                <input type="tel" maxLength={10} placeholder="10 Digits" value={pPhone} onChange={(e)=>setPPhone(e.target.value)} className="w-full bg-[#FAF7F2] border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#F59032] transition" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#555] mb-1.5">WhatsApp</label>
                <input type="tel" maxLength={10} placeholder="Optional" value={pWhatsapp} onChange={(e)=>setPWhatsapp(e.target.value)} className="w-full bg-[#FAF7F2] border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#F59032] transition" />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Description <span className="text-red-400">*</span></label>
              <textarea placeholder="Briefly describe what you offer..." value={pDesc} onChange={(e)=>setPDesc(e.target.value)} className="w-full bg-[#FAF7F2] border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#F59032] transition h-24 resize-none" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Full Address <span className="text-red-400">*</span></label>
              <input type="text" placeholder="Street, City, Zip Code" value={pAddress} onChange={(e)=>setPAddress(e.target.value)} className="w-full bg-[#FAF7F2] border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#F59032] transition" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Map Location <span className="text-red-400">*</span></label>
              <p className="text-[11px] text-[#aaa] mb-2">Pin your exact pickup spot for listing.</p>
              <button onClick={getLocationForProfile} className={`${pLat ? 'bg-green-500' : 'bg-[#F59032]'} text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition active:scale-[0.97]`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {pLat ? "✓ GPS Acquired" : "Get GPS Location"}
              </button>
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2]/95 to-transparent pt-6 pb-6 px-5 z-50">
          <button onClick={handleSaveProfile} disabled={uploading} className="w-full bg-[#F59032] hover:bg-[#E88022] text-white font-bold py-4 rounded-2xl shadow-md transition active:scale-[0.98] disabled:opacity-50 text-[15px]">
            {uploading ? "Saving..." : "Save & Open Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Dashboard ───
  return (
    <div className="bg-[#FAF7F2] pb-28 min-h-screen font-sans text-[#1A1A1A]">
      <ErrorPopup />
      <div className="bg-white/95 backdrop-blur-lg px-5 py-4 flex justify-between items-center border-b border-gray-100 z-40 sticky top-0">
        <div>
          <h1 className="text-[18px] font-bold">Dashboard</h1>
          <p className="text-[12px] text-[#999]">{profile?.business_name || "Shamiyana"}</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[12px] bg-[#FAF7F2] text-[#888] px-4 py-2 rounded-xl font-semibold hover:bg-gray-100 transition">Logout</button>
      </div>

      {/* Application Approval Banner */}
      <div className="px-5 mt-4">
        {profile?.is_verified ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center text-lg font-bold shrink-0">✓</div>
              <div>
                <h4 className="text-[14px] font-bold text-green-900">Application Approved & Verified</h4>
                <p className="text-[11px] text-green-700 mt-0.5">Your profile and inventory items are live for customers.</p>
              </div>
            </div>
            <button onClick={toggleAdminVerification} className="text-[10px] font-semibold bg-green-200 text-green-800 px-2.5 py-1.5 rounded-lg shrink-0 hover:bg-green-300 transition">Demo: Unverify</button>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg shrink-0">⏳</div>
              <div>
                <h4 className="text-[14px] font-bold text-amber-900">Application Under Review</h4>
                <p className="text-[11px] text-amber-700 mt-0.5">We are reviewing your details. Once approved, your listings go public.</p>
              </div>
            </div>
            <button onClick={toggleAdminVerification} className="text-[10px] font-semibold bg-amber-200 text-amber-900 px-2.5 py-1.5 rounded-lg shrink-0 hover:bg-amber-300 transition">Demo: Approve Now</button>
          </div>
        )}
      </div>

      <div className="px-5 mt-6">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="font-bold text-[20px]">My Items</h2>
            <p className="text-[13px] text-[#888] mt-0.5">ನನ್ನ ವಸ್ತುಗಳು ({inventory.length})</p>
          </div>
        </div>
        <div className="space-y-3">
          {inventory.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <svg className="w-14 h-14 text-[#ddd] mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <p className="text-[15px] text-[#888] font-medium">No items yet</p>
              <p className="text-[12px] text-[#bbb] mt-1 max-w-[220px] mx-auto">Add your first service or product to start receiving bookings</p>
              <button onClick={openAddModal} className="mt-4 bg-[#F59032] text-white px-6 py-2.5 rounded-xl text-[13px] font-semibold active:scale-[0.97] transition">+ Add Item</button>
            </div>
          ) : inventory.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <img src={item.image_url || "/images/hero.png"} className="w-20 h-20 rounded-xl object-cover shrink-0 bg-gray-50" alt="item" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[15px] leading-snug truncate">{item.item_name_en}</h4>
                  <span className="inline-block text-[11px] font-medium text-[#888] bg-[#F5F5F5] px-2.5 py-0.5 rounded-full mt-1">{item.category}</span>
                  {item.description && <p className="text-[11px] text-[#999] mt-1 line-clamp-1">{item.description}</p>}
                  <div className="flex justify-between items-end mt-1.5">
                    <span className="text-[#F59032] text-[15px] font-bold">₹{item.price_per_day}<span className="text-[11px] font-normal text-[#999]">/day</span></span>
                    <span className="text-[12px] text-[#999]">Stock: {item.total_stock}</span>
                  </div>
                </div>
              </div>
              <div className="flex border-t border-gray-100">
                <button onClick={() => openEditModal(item)} className="flex-1 py-2.5 text-[12px] font-semibold text-[#555] flex items-center justify-center gap-1.5 hover:bg-gray-50 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                  Edit
                </button>
                <div className="w-px bg-gray-100" />
                <button onClick={() => handleDeleteItem(item.id)} className="flex-1 py-2.5 text-[12px] font-semibold text-red-400 flex items-center justify-center gap-1.5 hover:bg-red-50 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={openAddModal} className="fixed bottom-24 right-5 w-14 h-14 bg-[#F59032] text-white rounded-2xl shadow-lg shadow-orange-200 flex items-center justify-center text-2xl font-light active:scale-95 z-40 hover:bg-[#E88022] transition">+</button>

      {/* ─── Add / Edit Item Modal ─── */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="fixed bottom-0 left-0 w-full bg-white rounded-t-3xl z-50 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-3" />
            <div className="px-6 pb-8 max-h-[85vh] overflow-y-auto">
              <h3 className="text-[18px] font-bold mb-1">{editingItem ? "Edit Item" : "Add New Item"}</h3>
              <p className="text-[12px] text-[#999] mb-5">{editingItem ? "Update details, change photos, or adjust pricing." : "Add photos, set a price, and describe your service or product."}</p>

              {/* Image Gallery */}
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Photos <span className="text-red-400">*</span></label>
                <p className="text-[11px] text-[#aaa] mb-3">Upload up to 5 photos. First image is used as the cover.</p>
                <div className="flex gap-2 flex-wrap">
                  {existingImages.map((url, idx) => (
                    <div key={`ex-${idx}`} className="relative w-[72px] h-[72px] rounded-xl overflow-hidden border border-gray-200 group">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5 font-semibold">COVER</span>}
                      <button onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm" style={{opacity: 1}}>✕</button>
                    </div>
                  ))}
                  {imageFiles.map((file, idx) => (
                    <div key={`nw-${idx}`} className="relative w-[72px] h-[72px] rounded-xl overflow-hidden border-2 border-dashed border-[#F59032]/30 group bg-orange-50">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                      {existingImages.length === 0 && idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5 font-semibold">COVER</span>}
                      <button onClick={() => removeNewImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-sm">✕</button>
                    </div>
                  ))}
                  {(existingImages.length + imageFiles.length) < 5 && (
                    <label className="w-[72px] h-[72px] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#F59032] transition bg-[#FAFAFA]">
                      <svg className="w-5 h-5 text-[#ccc]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      <span className="text-[9px] text-[#bbb] font-medium mt-0.5">Add</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleAddImages(e.target.files)} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Service / Product Name <span className="text-red-400">*</span></label>
                  <input type="text" value={itemName} onChange={(e)=>setItemName(e.target.value)} placeholder="e.g. 20x20ft Shamiyana Tent" className="w-full bg-[#FAF7F2] border border-gray-200 py-3 px-4 rounded-xl outline-none text-[14px] focus:border-[#F59032] transition" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Category</label>
                  <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full bg-[#FAF7F2] border border-gray-200 py-3 px-4 rounded-xl outline-none font-medium text-[14px] focus:border-[#F59032] transition">
                    <option value="Tents">Tents / Shamiyana</option>
                    <option value="Chairs">Chairs & Seating</option>
                    <option value="Utensils">Utensils & Plates</option>
                    <option value="Lighting">Lighting & Sound</option>
                    <option value="Decor">Decorations</option>
                    <option value="Catering">Catering Equipment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#555] mb-1.5">Stock Available <span className="text-red-400">*</span></label>
                    <input type="number" value={stock} onChange={(e)=>setStock(e.target.value)} placeholder="e.g. 50" className="w-full bg-[#FAF7F2] border border-gray-200 py-3 px-4 rounded-xl outline-none text-[14px] focus:border-[#F59032] transition" inputMode="numeric" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#555] mb-1.5">Price / Day ₹ <span className="text-red-400">*</span></label>
                    <input type="number" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="e.g. 150" className="w-full bg-[#FAF7F2] border border-gray-200 py-3 px-4 rounded-xl outline-none text-[14px] focus:border-[#F59032] transition" inputMode="numeric" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#555] mb-1.5">Description <span className="text-[11px] font-normal text-[#aaa]">(optional)</span></label>
                  <textarea value={itemDesc} onChange={(e)=>setItemDesc(e.target.value)} placeholder="Tell customers about this item — size, material, condition, includes setup?..." className="w-full bg-[#FAF7F2] border border-gray-200 py-3 px-4 rounded-xl outline-none text-[14px] focus:border-[#F59032] transition h-24 resize-none" />
                </div>
              </div>

              <button onClick={handleSaveItem} disabled={uploading} className="w-full bg-[#F59032] text-white font-bold py-4 rounded-2xl mt-5 active:scale-[0.98] transition disabled:opacity-50 text-[15px] shadow-sm">
                {uploading ? (editingItem ? "Updating..." : "Saving...") : (editingItem ? "Save Changes" : "Add Item")}
              </button>
              {editingItem && (
                <button onClick={() => { handleDeleteItem(editingItem.id); setIsModalOpen(false); }} className="w-full text-red-400 font-semibold py-3 rounded-2xl mt-2 text-[13px] hover:bg-red-50 transition">
                  Delete This Item
                </button>
              )}
            </div>
          </div>
        </>
      )}
      <BottomNav active="profile" />
    </div>
  );
}
