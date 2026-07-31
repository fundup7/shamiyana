"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

import MessageModal from "@/components/MessageModal";

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
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [pBusiness, setPBusiness] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pWhatsapp, setPWhatsapp] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pProfilePic, setPProfilePic] = useState<File | null>(null);
  const [pLat, setPLat] = useState<number | null>(null);
  const [pLng, setPLng] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        supabase.from("suppliers").select("*").eq("id", session.user.id).single().then(({ data: profileData }) => {
          if (!profileData || !profileData.phone_number) {
            setNeedsProfileSetup(true);
            if (profileData) setPBusiness(profileData.business_name || "");
          } else {
            setProfile(profileData);
            fetchInventory(session.user.id);
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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

      const fullPayload: any = {
        item_name_en: itemName,
        category,
        total_stock: parseInt(stock),
        price_per_day: parseFloat(price),
        image_url: mainImage,
        extra_images: extraImages,
        description: itemDesc || null
      };

      if (editingItem) {
        let { error } = await supabase.from("inventory").update(fullPayload).eq("id", editingItem.id);
        if (error && error.message.includes("Could not find")) {
          // Fallback if description or extra_images column is missing in Supabase schema cache
          const fallbackPayload = {
            item_name_en: itemName,
            category,
            total_stock: parseInt(stock),
            price_per_day: parseFloat(price),
            image_url: mainImage,
          };
          const res = await supabase.from("inventory").update(fallbackPayload).eq("id", editingItem.id);
          if (res.error) throw res.error;
        } else if (error) {
          throw error;
        }
      } else {
        fullPayload.supplier_id = user.id;
        let { error } = await supabase.from("inventory").insert([fullPayload]);
        if (error && error.message.includes("Could not find")) {
          // Fallback if description or extra_images column is missing in Supabase schema cache
          const fallbackPayload = {
            supplier_id: user.id,
            item_name_en: itemName,
            category,
            total_stock: parseInt(stock),
            price_per_day: parseFloat(price),
            image_url: mainImage,
          };
          const res = await supabase.from("inventory").insert([fallbackPayload]);
          if (res.error) throw res.error;
        } else if (error) {
          throw error;
        }
      }
      setIsModalOpen(false);
      fetchInventory(user.id);
    } catch (err: any) { showError(err.message || "Something went wrong."); }
    finally { setUploading(false); }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from("inventory").delete().eq("id", itemToDelete.id);
    if (error) showError(error.message);
    else fetchInventory(user.id);
    setItemToDelete(null);
  };

  const ErrorPopup = () => errorMsg ? (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-5 py-3.5 rounded-2xl shadow-lg z-[100] flex items-center gap-3 w-[90%] max-w-sm">
      <span className="text-lg">⚠️</span>
      <p className="text-[13px] font-medium leading-tight">{errorMsg}</p>
    </div>
  ) : null;

  const BottomNav = ({ active }: { active: string }) => (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#E8E1DA] flex justify-around items-center pt-2 pb-3 z-50 shadow-lg">
      <Link href="/" className="flex flex-col items-center group">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 ${active === 'home' ? 'bg-[#FFF6F4] border border-[#DFC0B9]' : 'group-hover:bg-[#F4EDE5]'} transition`}>
          <svg className={`w-[18px] h-[18px] ${active === 'home' ? 'text-[#C04D31]' : 'text-[#57423C]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </div>
        <span className={`text-[11px] font-medium ${active === 'home' ? 'text-[#C04D31] font-bold' : 'text-[#57423C]'}`}>Home</span>
      </Link>
      <Link href="/bookings" className="flex flex-col items-center group">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 ${active === 'bookings' ? 'bg-[#FFF6F4] border border-[#DFC0B9]' : 'group-hover:bg-[#F4EDE5]'} transition`}>
          <svg className={`w-[18px] h-[18px] ${active === 'bookings' ? 'text-[#C04D31]' : 'text-[#57423C]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <span className={`text-[11px] font-medium ${active === 'bookings' ? 'text-[#C04D31] font-bold' : 'text-[#57423C]'}`}>Bookings</span>
      </Link>
      <Link href="/suppliers" className="flex flex-col items-center group">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 ${active === 'suppliers' ? 'bg-[#FFF6F4] border border-[#DFC0B9]' : 'group-hover:bg-[#F4EDE5]'} transition`}>
          <svg className={`w-[18px] h-[18px] ${active === 'suppliers' ? 'text-[#C04D31]' : 'text-[#57423C]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
        <span className={`text-[11px] font-medium ${active === 'suppliers' ? 'text-[#C04D31] font-bold' : 'text-[#57423C]'}`}>Suppliers</span>
      </Link>
      <Link href="/login" className="flex flex-col items-center group">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-0.5 ${active === 'profile' ? 'bg-[#FFF6F4] border border-[#DFC0B9]' : 'group-hover:bg-[#F4EDE5]'} transition`}>
          <svg className={`w-[18px] h-[18px] ${active === 'profile' ? 'text-[#C04D31]' : 'text-[#57423C]'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <span className={`text-[11px] font-medium ${active === 'profile' ? 'text-[#C04D31] font-bold' : 'text-[#57423C]'}`}>Profile</span>
      </Link>
    </div>
  );

  if (!user) return <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center"><div className="w-8 h-8 border-3 border-[#C04D31] border-t-transparent rounded-full animate-spin" /></div>;

  // ─── Profile Setup ───
  if (needsProfileSetup) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] px-5 pt-10 pb-28 font-sans text-[#1E1B17]">
        <ErrorPopup />
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#C04D31] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
          </div>
          <h1 className="font-heading text-[26px] font-bold uppercase text-[#1E1B17] tracking-tight">Complete Vendor Profile</h1>
          <p className="text-[13px] text-[#57423C] font-medium mt-1.5 leading-relaxed max-w-[300px] mx-auto">Complete your setup to list tents & equipment for rental in Hubli.</p>
        </div>
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#E8E1DA] shadow-sm">
            <label className="border-2 border-dashed border-[#E8E1DA] rounded-xl py-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#C04D31] transition relative overflow-hidden bg-[#FAF7F2]">
              {pProfilePic && <div className="absolute inset-0 bg-[#FFF6F4] flex items-center justify-center border border-[#C04D31]"><span className="bg-white px-3 py-1.5 rounded-lg text-[12px] font-bold text-[#C04D31] shadow-sm border border-[#E8E1DA]">✓ Image Selected</span></div>}
              <svg className="w-8 h-8 mb-2 text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              <span className="text-[14px] font-bold text-[#1E1B17]">Upload Business Logo <span className="text-[#C04D31]">*</span></span>
              <span className="text-[11px] text-[#57423C] mt-1">PNG, JPG up to 5MB</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e)=>setPProfilePic(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E8E1DA] shadow-sm space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Business Name <span className="text-[#C04D31]">*</span></label>
              <input type="text" placeholder="e.g. Hubli Shamiyana Rentals" value={pBusiness} onChange={(e)=>setPBusiness(e.target.value)} className="w-full bg-[#FAF7F2] border border-[#1E1B17] rounded-lg px-4 py-3 text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] outline-none focus:border-[#C04D31]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Phone <span className="text-[#C04D31]">*</span></label>
                <input type="tel" maxLength={10} placeholder="10 Digits" value={pPhone} onChange={(e)=>setPPhone(e.target.value)} className="w-full bg-[#FAF7F2] border border-[#1E1B17] rounded-lg px-4 py-3 text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] outline-none focus:border-[#C04D31]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">WhatsApp</label>
                <input type="tel" maxLength={10} placeholder="Optional" value={pWhatsapp} onChange={(e)=>setPWhatsapp(e.target.value)} className="w-full bg-[#FAF7F2] border border-[#1E1B17] rounded-lg px-4 py-3 text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] outline-none focus:border-[#C04D31]" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Description <span className="text-[#C04D31]">*</span></label>
              <textarea placeholder="Briefly describe what services and equipment you provide..." value={pDesc} onChange={(e)=>setPDesc(e.target.value)} className="w-full bg-[#FAF7F2] border border-[#1E1B17] rounded-lg px-4 py-3 text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] outline-none focus:border-[#C04D31] h-24 resize-none" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E8E1DA] shadow-sm space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Full Address <span className="text-[#C04D31]">*</span></label>
              <input type="text" placeholder="Locality, City, Area" value={pAddress} onChange={(e)=>setPAddress(e.target.value)} className="w-full bg-[#FAF7F2] border border-[#1E1B17] rounded-lg px-4 py-3 text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] outline-none focus:border-[#C04D31]" />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Map Location <span className="text-[#C04D31]">*</span></label>
              <p className="text-[11px] text-[#57423C] mb-2">Acquire GPS coordinates for Google Maps navigation.</p>
              <button onClick={getLocationForProfile} className={`${pLat ? 'bg-emerald-700' : 'bg-[#C04D31] hover:bg-[#9F351C]'} text-white text-[13px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {pLat ? "✓ GPS Location Acquired" : "Get GPS Location"}
              </button>
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#E8E1DA] p-4 z-50 shadow-lg">
          <button onClick={handleSaveProfile} disabled={uploading} className="w-full bg-[#C04D31] hover:bg-[#9F351C] text-white font-bold py-3.5 rounded-xl uppercase tracking-wider transition disabled:opacity-50 text-[15px] shadow-md">
            {uploading ? "Saving Profile..." : "Save & Access Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Dashboard ───
  return (
    <div className="bg-[#FAF7F2] pb-28 min-h-screen font-sans text-[#1E1B17]">
      <ErrorPopup />
      <div className="bg-white px-5 py-4 flex justify-between items-center border-b border-[#E8E1DA] z-40 sticky top-0 shadow-sm">
        <div>
          <h1 className="font-heading text-[20px] font-bold uppercase tracking-tight text-[#1E1B17]">Vendor Dashboard</h1>
          <p className="text-[12px] text-[#57423C] font-semibold">{profile?.business_name || "Shamiyana"}</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[12px] bg-[#FAF7F2] border border-[#E8E1DA] text-[#1E1B17] px-4 py-2 rounded-lg font-bold uppercase tracking-wide hover:bg-[#1E1B17] hover:text-white transition">Logout</button>
      </div>

      {/* Application Approval Banner */}
      <div className="px-5 mt-4">
        {profile?.is_verified ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-lg font-bold shrink-0">✓</div>
              <div>
                <h4 className="font-heading text-[14px] font-bold text-emerald-900 uppercase">Vendor Profile Verified</h4>
                <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Your services and inventory are active for bookings.</p>
              </div>
            </div>
            <button onClick={toggleAdminVerification} className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1.5 rounded-md shrink-0">Demo: Unverify</button>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center text-lg shrink-0">⏳</div>
              <div>
                <h4 className="font-heading text-[14px] font-bold text-amber-900 uppercase">Application Under Verification</h4>
                <p className="text-[11px] text-amber-800 mt-0.5 font-medium">Reviewing your business profile before public launch.</p>
              </div>
            </div>
            <button onClick={toggleAdminVerification} className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1.5 rounded-md shrink-0">Demo: Approve Now</button>
          </div>
        )}
      </div>

      <div className="px-5 mt-6">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h2 className="font-heading font-bold text-[22px] uppercase text-[#1E1B17]">My Listed Equipment</h2>
            <p className="text-[12px] text-[#57423C] font-medium mt-0.5">ನನ್ನ ವಸ್ತುಗಳು ({inventory.length} items)</p>
          </div>
        </div>
        <div className="space-y-3.5">
          {inventory.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-[#E8E1DA]">
              <svg className="w-14 h-14 text-[#DFC0B9] mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <p className="font-heading font-bold text-[18px] text-[#1E1B17] uppercase">No equipment listed yet</p>
              <p className="text-[12px] text-[#57423C] mt-1 max-w-[240px] mx-auto">Add tents, chairs, plates or lighting to start taking orders</p>
              <button onClick={openAddModal} className="mt-4 bg-[#C04D31] text-white px-6 py-2.5 rounded-lg text-[13px] font-bold uppercase tracking-wider hover:bg-[#9F351C] transition shadow-sm">+ Add First Item</button>
            </div>
          ) : inventory.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-[#E8E1DA] shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <img src={item.image_url || "/images/hero.png"} className="w-20 h-20 rounded-lg object-cover shrink-0 bg-[#F4EDE5] border border-[#E8E1DA]" alt="item" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading font-bold text-[16px] uppercase leading-snug truncate text-[#1E1B17]">{item.item_name_en}</h4>
                  <span className="inline-block text-[11px] font-bold text-[#57423C] bg-[#FAF7F2] border border-[#E8E1DA] px-2.5 py-0.5 rounded-md mt-1">{item.category}</span>
                  {item.description && <p className="text-[11px] text-[#57423C] mt-1 line-clamp-1">{item.description}</p>}
                  <div className="flex justify-between items-end mt-2">
                    <span className="font-heading text-[#C04D31] text-[18px] font-bold">₹{item.price_per_day}<span className="text-[11px] font-normal text-[#57423C]">/day</span></span>
                    <span className="text-[12px] text-[#57423C] font-semibold">Stock: {item.total_stock}</span>
                  </div>
                </div>
              </div>
              <div className="flex border-t border-[#E8E1DA]">
                <button onClick={() => openEditModal(item)} className="flex-1 py-2.5 text-[12px] font-bold text-[#1E1B17] uppercase flex items-center justify-center gap-1.5 hover:bg-[#FAF7F2] transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                  Edit Item
                </button>
                <div className="w-px bg-[#E8E1DA]" />
                <button onClick={() => setItemToDelete(item)} className="flex-1 py-2.5 text-[12px] font-bold text-red-600 uppercase flex items-center justify-center gap-1.5 hover:bg-red-50 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={openAddModal} className="fixed bottom-24 right-5 w-14 h-14 bg-[#C04D31] text-white rounded-xl shadow-xl flex items-center justify-center text-2xl font-light hover:bg-[#9F351C] transition z-40">+</button>

      {/* ─── Add / Edit Item Modal ─── */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-[#1E1B17]/60 z-[80] backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="fixed bottom-0 left-0 w-full bg-white rounded-t-2xl z-[80] shadow-2xl flex flex-col max-h-[90vh] border-t border-[#E8E1DA]">
            <div className="w-12 h-1.5 bg-[#E8E1DA] rounded-full mx-auto mt-3 shrink-0" />
            <div className="px-6 pt-2 pb-36 overflow-y-auto flex-1">
              <h3 className="font-heading text-[22px] font-bold uppercase text-[#1E1B17] mb-1">{editingItem ? "Edit Equipment Item" : "Add Equipment Item"}</h3>
              <p className="text-[12px] text-[#57423C] mb-5">{editingItem ? "Update pricing, quantities, or product photos." : "Upload photos, set inventory stock and price per day."}</p>

              {/* Image Gallery */}
              <div className="mb-5">
                <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Equipment Photos <span className="text-[#C04D31]">*</span></label>
                <p className="text-[11px] text-[#57423C] mb-3">Upload up to 5 photos. First image is featured on listing cards.</p>
                <div className="flex gap-2 flex-wrap">
                  {existingImages.map((url, idx) => (
                    <div key={`ex-${idx}`} className="relative w-[72px] h-[72px] rounded-lg overflow-hidden border border-[#E8E1DA] group">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-[#1E1B17]/70 text-white text-[8px] text-center py-0.5 font-bold">COVER</span>}
                      <button onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center shadow-sm">✕</button>
                    </div>
                  ))}
                  {imageFiles.map((file, idx) => (
                    <div key={`nw-${idx}`} className="relative w-[72px] h-[72px] rounded-lg overflow-hidden border-2 border-dashed border-[#C04D31] group bg-[#FFF6F4]">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                      {existingImages.length === 0 && idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-[#1E1B17]/70 text-white text-[8px] text-center py-0.5 font-bold">COVER</span>}
                      <button onClick={() => removeNewImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center shadow-sm">✕</button>
                    </div>
                  ))}
                  {(existingImages.length + imageFiles.length) < 5 && (
                    <label className="w-[72px] h-[72px] border-2 border-dashed border-[#E8E1DA] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#C04D31] transition bg-[#FAF7F2]">
                      <svg className="w-5 h-5 text-[#57423C]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      <span className="text-[9px] text-[#57423C] font-bold uppercase mt-0.5">Add</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleAddImages(e.target.files)} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Service / Item Name <span className="text-[#C04D31]">*</span></label>
                  <input type="text" value={itemName} onChange={(e)=>setItemName(e.target.value)} placeholder="e.g. 20x20ft Waterproof Shamiyana" className="w-full bg-[#FAF7F2] border border-[#1E1B17] py-3 px-4 rounded-lg outline-none text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] focus:border-[#C04D31]" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Category</label>
                  <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full bg-white border border-[#1E1B17] py-3 px-4 rounded-lg outline-none font-bold text-[15px] text-[#1E1B17] focus:border-[#C04D31]">
                    <option value="Tents" className="text-[#1E1B17] bg-white">Tents / Shamiyana</option>
                    <option value="Chairs" className="text-[#1E1B17] bg-white">Chairs & Seating</option>
                    <option value="Utensils" className="text-[#1E1B17] bg-white">Utensils & Plates</option>
                    <option value="Lighting" className="text-[#1E1B17] bg-white">Lighting & Sound</option>
                    <option value="Decor" className="text-[#1E1B17] bg-white">Decorations</option>
                    <option value="Catering" className="text-[#1E1B17] bg-white">Catering Equipment</option>
                    <option value="Other" className="text-[#1E1B17] bg-white">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Stock Available <span className="text-[#C04D31]">*</span></label>
                    <input type="number" value={stock} onChange={(e)=>setStock(e.target.value)} placeholder="e.g. 50" className="w-full bg-[#FAF7F2] border border-[#1E1B17] py-3 px-4 rounded-lg outline-none text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] focus:border-[#C04D31]" inputMode="numeric" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Price / Day ₹ <span className="text-[#C04D31]">*</span></label>
                    <input type="number" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="e.g. 150" className="w-full bg-[#FAF7F2] border border-[#1E1B17] py-3 px-4 rounded-lg outline-none text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] focus:border-[#C04D31]" inputMode="numeric" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#1E1B17] uppercase tracking-wide mb-1.5">Description <span className="text-[11px] font-normal text-[#57423C]">(optional)</span></label>
                  <textarea value={itemDesc} onChange={(e)=>setItemDesc(e.target.value)} placeholder="Describe item size, material condition, setup options..." className="w-full bg-[#FAF7F2] border border-[#1E1B17] py-3 px-4 rounded-lg outline-none text-[15px] font-bold text-[#1E1B17] placeholder:text-[#8B716B] focus:border-[#C04D31] h-24 resize-none" />
                </div>
              </div>

              <button onClick={handleSaveItem} disabled={uploading} className="w-full bg-[#C04D31] text-white font-bold py-3.5 rounded-xl mt-6 uppercase tracking-wider transition disabled:opacity-50 text-[15px] shadow-md hover:bg-[#9F351C]">
                {uploading ? (editingItem ? "Updating..." : "Saving...") : (editingItem ? "Save Item Changes" : "Confirm & Save Item")}
              </button>
              {editingItem && (
                <button onClick={() => { setItemToDelete(editingItem); setIsModalOpen(false); }} className="w-full text-red-600 font-bold py-3 rounded-xl mt-2 text-[13px] uppercase hover:bg-red-50 transition">
                  Delete Item Permanently
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal for Delete */}
      <MessageModal
        isOpen={!!itemToDelete}
        type="confirm"
        title="Delete Item?"
        message={`Are you sure you want to delete "${itemToDelete?.item_name_en || 'this item'}" permanently? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteItem}
        onClose={() => setItemToDelete(null)}
      />

      <BottomNav active="profile" />
    </div>
  );
}
