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
  
  // Inventory Form State
  const [itemName, setItemName] = useState("");
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Tents");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Profile Form State
  const [pBusiness, setPBusiness] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pWhatsapp, setPWhatsapp] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pProfilePic, setPProfilePic] = useState<File | null>(null);
  const [pLat, setPLat] = useState<number | null>(null);
  const [pLng, setPLng] = useState<number | null>(null);

  // Popup state
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 4000);
  };

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
        (err) => showError("Please allow GPS permissions in your browser so customers can find you.")
      );
    } else {
      showError("Geolocation is not supported by your browser.");
    }
  };

  const handleSaveProfile = async () => {
    if (!pProfilePic) return showError("Please upload a Business Logo.");
    if (!pBusiness.trim()) return showError("Business Name is required.");
    
    const phoneRegex = /^\d{10}$/;
    const cleanPhone = pPhone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) return showError("Please enter a valid 10-digit phone number.");
    
    if (pWhatsapp) {
      const cleanWhatsapp = pWhatsapp.replace(/\D/g, '');
      if (!phoneRegex.test(cleanWhatsapp)) return showError("Please enter a valid 10-digit WhatsApp number.");
    }

    if (!pDesc.trim()) return showError("Please write a short Business Description.");
    if (!pAddress.trim()) return showError("Please enter your Full Address.");
    if (!pLat || !pLng) return showError("Please pin your Map Location using the Get GPS button.");

    setUploading(true);
    let profileUrl = null;

    try {
      const ext = pProfilePic.name.split('.').pop();
      const path = `${user.id}/profile_${Math.random()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('inventory_images').upload(path, pProfilePic);
      
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('inventory_images').getPublicUrl(path);
      profileUrl = data.publicUrl;

      const { error: upsertError } = await supabase.from("suppliers").upsert({
        id: user.id, 
        business_name: pBusiness, 
        phone_number: cleanPhone, 
        whatsapp_number: pWhatsapp ? pWhatsapp.replace(/\D/g, '') : cleanPhone, 
        area_name: pAddress, 
        description: pDesc, 
        google_rating: 0, 
        latitude: pLat, 
        longitude: pLng, 
        profile_picture: profileUrl, 
        is_verified: true
      }, { onConflict: 'id' });

      if (upsertError) throw upsertError;
      
      setNeedsProfileSetup(false);
      checkUser();
    } catch (err: any) {
      showError(err.message || "Something went wrong saving the profile.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = async () => {
    if (!imageFile) return showError("Please upload an item photo.");
    if (!itemName.trim()) return showError("Item name is required.");
    if (!stock || parseInt(stock) <= 0) return showError("Please enter a valid stock quantity.");
    if (!price || parseFloat(price) <= 0) return showError("Please enter a valid price per day.");

    setUploading(true);
    let publicUrl = null;

    try {
      const ext = imageFile.name.split('.').pop();
      const path = `${user.id}/item_${Math.random()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('inventory_images').upload(path, imageFile);
      
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('inventory_images').getPublicUrl(path);
      publicUrl = data.publicUrl;

      const { error: insertError } = await supabase.from("inventory").insert([{
        supplier_id: user.id, 
        item_name_en: itemName, 
        category: category, 
        total_stock: parseInt(stock), 
        price_per_day: parseFloat(price), 
        image_url: publicUrl 
      }]);

      if (insertError) throw insertError;

      setIsModalOpen(false); 
      setItemName(""); 
      setStock(""); 
      setPrice(""); 
      setImageFile(null); 
      fetchInventory(user.id);
    } catch (err: any) {
      showError(err.message || "Something went wrong adding the item.");
    } finally {
      setUploading(false);
    }
  };

  const ErrorPopup = () => (
    errorMsg ? (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#E53935] text-white px-5 py-3 rounded-xl shadow-lg z-[100] flex items-center gap-3 w-[90%] max-w-sm animate-in fade-in slide-in-from-top-4">
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <p className="text-[13px] font-bold leading-tight">{errorMsg}</p>
      </div>
    ) : null
  );

  if (!user) return <div className="p-8 text-center text-[#F59032] font-bold min-h-screen bg-[#FBF6ED]">Loading...</div>;

  if (needsProfileSetup) {
    return (
      <div className="min-h-screen bg-[#FBF6ED] px-4 pt-12 pb-28 font-sans">
        <ErrorPopup />
        
        <div className="text-center mb-8">
          <h1 className="text-[22px] font-extrabold text-[#D8812E] tracking-wide mb-2 leading-tight">
            ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ /<br/>COMPLETE PROFILE
          </h1>
          <p className="text-[13px] text-[#505762] px-4 leading-relaxed">
            Customers need to know who you are before renting.<br/>
            (ಬಾಡಿಗೆಗೆ ನೀಡುವ ಮೊದಲು ಗ್ರಾಹಕರು ನಿಮ್ಮನ್ನು ತಿಳಿದುಕೊಳ್ಳಬೇಕು)
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Logo Upload Card */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <label className="border-[1.5px] border-dashed border-[#D8812E] rounded-xl py-6 flex flex-col items-center justify-center bg-[#FDF8F0] cursor-pointer text-[#505762] relative overflow-hidden">
              {pProfilePic && (
                <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                  <span className="bg-white px-3 py-1 rounded text-[11px] font-bold text-green-600 shadow-sm">Image Selected</span>
                </div>
              )}
              <div className="flex items-center gap-3 mb-1">
                <svg className="w-6 h-6 text-[#D8812E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <span className="text-[14px] font-bold text-[#1F1F1F] leading-tight">
                  ಅಪ್‌ಲೋಡ್ ಮಾಡಿ /<br/>Upload Business Logo <span className="text-red-500">*</span>
                </span>
              </div>
              <span className="text-[11px] text-gray-500 mt-2 font-medium">PNG, JPG up to 5MB</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e)=>setPProfilePic(e.target.files?.[0] || null)} />
            </label>
          </div>

          {/* Business Details Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-[#1F1F1F] mb-1.5">ವ್ಯಾಪಾರದ ಹೆಸರು / Business Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="e.g. Shamiyana Rentals" value={pBusiness} onChange={(e)=>setPBusiness(e.target.value)} className="w-full bg-white border border-[#D8812E] rounded-full px-4 py-2.5 text-[14px] outline-none focus:ring-1 focus:ring-[#D8812E]" />
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[12px] font-bold text-[#1F1F1F] mb-1.5 leading-tight">ಫೋನ್ ಸಂಖ್ಯೆ /<br/>Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <svg className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <input type="tel" maxLength={10} placeholder="10 Digits" value={pPhone} onChange={(e)=>setPPhone(e.target.value)} className="w-full bg-white border border-[#D8812E] rounded-full pl-9 pr-3 py-2.5 text-[14px] outline-none focus:ring-1 focus:ring-[#D8812E]" />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[12px] font-bold text-[#1F1F1F] mb-1.5 leading-tight"><br/>WhatsApp (Optional)</label>
                <div className="relative">
                  <svg className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <input type="tel" maxLength={10} placeholder="10 Digits" value={pWhatsapp} onChange={(e)=>setPWhatsapp(e.target.value)} className="w-full bg-white border border-[#D8812E] rounded-full pl-9 pr-3 py-2.5 text-[14px] outline-none focus:ring-1 focus:ring-[#D8812E]" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#1F1F1F] mb-1.5">ವ್ಯಾಪಾರದ ವಿವರಣೆ / Business Description <span className="text-red-500">*</span></label>
              <textarea placeholder="Briefly describe what you offer..." value={pDesc} onChange={(e)=>setPDesc(e.target.value)} className="w-full bg-white border border-[#D8812E] rounded-2xl px-4 py-3 text-[14px] outline-none focus:ring-1 focus:ring-[#D8812E] h-24"></textarea>
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-[#1F1F1F] mb-1.5">ಪೂರ್ಣ ವಿಳಾಸ / Full Address <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Street, City, Zip Code" value={pAddress} onChange={(e)=>setPAddress(e.target.value)} className="w-full bg-white border border-[#D8812E] rounded-full px-4 py-2.5 text-[14px] outline-none focus:ring-1 focus:ring-[#D8812E]" />
            </div>

            <div>
              <div className="mb-2">
                <h3 className="text-[13px] font-bold text-[#1F1F1F]">ಭೂಪಟ ಸ್ಥಳ / Map Location <span className="text-red-500">*</span></h3>
                <p className="text-[11px] text-[#69727B]">Pin your exact pickup spot. Mandatory for listing.</p>
              </div>
              <button onClick={getLocationForProfile} className={`${pLat ? 'bg-green-600 hover:bg-green-700' : 'bg-[#D8812E] hover:bg-[#C27328]'} text-white text-[12px] font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm mb-4 transition-colors`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {pLat ? "GPS Acquired!" : "ಜಿಪಿಎಸ್ ಪಡೆಯಿರಿ / Get GPS"}
              </button>
              
              <div className={`relative w-full h-36 bg-gray-100 rounded-xl overflow-hidden border ${pLat ? 'border-green-500' : 'border-gray-200'}`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm flex flex-col items-center border border-gray-100">
                    <svg className={`w-6 h-6 mb-1 ${pLat ? 'text-green-600' : 'text-[#D8812E]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-[11px] font-bold text-[#1F1F1F] leading-tight text-center">
                      {pLat ? "Location Verified ✓" : "ಸ್ಥಳವನ್ನು ಹೊಂದಿಸಲಾಗಿಲ್ಲ\nLocation not set"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#FBF6ED] via-[#FBF6ED]/90 to-transparent pt-8 pb-6 px-4 z-50 pointer-events-none">
          <button onClick={handleSaveProfile} disabled={uploading} className="w-full bg-[#E38528] hover:bg-[#D8812E] text-white font-bold py-3 rounded-xl shadow-lg pointer-events-auto leading-tight flex flex-col items-center justify-center relative transition active:scale-95">
            <span className="text-[14px]">ಉಳಿಸಿ ಮತ್ತು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ</span>
            <span className="text-[13px] tracking-wide mt-0.5">SAVE & OPEN DASHBOARD</span>
            {!uploading && <svg className="w-5 h-5 absolute right-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
          </button>
        </div>
      </div>
    );
  }

  // --- DASHBOARD SCREEN ---
  return (
    <div className="bg-[#FBF6ED] pb-24 min-h-screen font-sans text-[#1F1F1F]">
      <ErrorPopup />
      
      {/* Header */}
      <div className="bg-white px-4 py-4 flex justify-between items-center border-b border-gray-100 z-40 sticky top-0">
        <h1 className="text-[17px] font-bold text-[#1F1F1F]">Dashboard | ಶ್ಯಾಮಿಯಾನ ಹುಬ್ಬಳ್ಳಿ</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-[11px] bg-gray-100 text-[#505762] px-3 py-1.5 rounded font-bold active:scale-95 transition">Logout</button>
      </div>

      <div className="px-4 mt-6 relative z-10 space-y-4">
        <div className="mb-6">
          <h3 className="font-bold text-[#1F1F1F] text-[20px] leading-tight">My Items ({inventory.length})</h3>
          <h4 className="font-bold text-[#1F1F1F] text-[18px] leading-tight mt-0.5">ನನ್ನ ವಸ್ತುಗಳು ({inventory.length})</h4>
        </div>
        
        <div className="space-y-4">
          {inventory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <svg className="w-12 h-12 text-[#D8812E] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <p className="text-sm text-[#505762] font-bold">No items yet. Tap + to add!</p>
            </div>
          ) : (
            inventory.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-start gap-4">
                <img src={item.image_url || "/images/hero.png"} className="w-[84px] h-[84px] rounded-xl object-cover shrink-0 bg-gray-100" alt="item" />
                <div className="flex-1 pt-1">
                  <h4 className="font-bold text-[16px] text-[#1F1F1F] leading-snug">{item.item_name_en}</h4>
                  <div className="mt-1.5 mb-2">
                    <span className="text-[10px] font-bold text-[#505762] bg-[#F2F4F7] px-2 py-1 rounded">{item.category}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-[15px] font-bold text-[#1F1F1F]">₹{item.price_per_day}/day</p>
                    <p className="text-[13px] text-[#1F1F1F] font-medium">Stock: {item.total_stock}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Add Item Button */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-20 right-6 w-14 h-14 bg-[#F59032] hover:bg-[#E88022] text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light active:scale-95 z-40">
        +
      </button>

      {/* Add Inventory Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="fixed bottom-0 left-0 w-full bg-[#FFFDFD] rounded-t-2xl z-50 pt-2 pb-safe shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 mt-2"></div>
            <div className="px-6 pb-8 max-h-[85vh] overflow-y-auto">
              <h3 className="text-[17px] font-bold text-[#1F1F1F] mb-4">Add Inventory Item</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="w-full h-28 border-[1.5px] border-dashed border-[#F59032] rounded-xl flex flex-col items-center justify-center cursor-pointer bg-[#FDF8F0] relative overflow-hidden">
                    {imageFile && (
                      <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                         <span className="bg-white px-3 py-1 rounded text-[11px] font-bold text-green-600 shadow-sm">Image Selected</span>
                      </div>
                    )}
                    <svg className="w-6 h-6 mb-2 text-[#F59032]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-[12px] font-bold text-[#1F1F1F]">Upload Item Photo <span className="text-red-500">*</span></span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                
                <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full bg-white border border-[#D8812E] py-3 px-4 rounded-full outline-none font-bold text-[14px] text-[#1F1F1F] focus:ring-1 focus:ring-[#D8812E]">
                  <option value="Tents">Tents / Shamiyana</option>
                  <option value="Chairs">Chairs</option>
                  <option value="Utensils">Utensils & Plates</option>
                  <option value="Lighting">Lighting</option>
                  <option value="Decor">Decorations</option>
                </select>

                <input type="text" value={itemName} onChange={(e)=>setItemName(e.target.value)} placeholder="Item Name (e.g. VIP Red Chair) *" className="w-full bg-white border border-[#D8812E] py-3 px-4 rounded-full outline-none font-bold text-[14px] text-[#1F1F1F] focus:ring-1 focus:ring-[#D8812E]" />
                
                <div className="flex gap-4">
                  <input type="number" value={stock} onChange={(e)=>setStock(e.target.value)} placeholder="Total Stock *" className="flex-1 bg-white border border-[#D8812E] py-3 px-4 rounded-full outline-none font-bold text-[14px] text-[#1F1F1F] focus:ring-1 focus:ring-[#D8812E]" pattern="[0-9]*" inputMode="numeric" />
                  <input type="number" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="Price ₹/Day *" className="flex-1 bg-white border border-[#D8812E] py-3 px-4 rounded-full outline-none font-bold text-[14px] text-[#1F1F1F] focus:ring-1 focus:ring-[#D8812E]" pattern="[0-9]*" inputMode="numeric" />
                </div>
              </div>

              <button onClick={handleAddItem} disabled={uploading} className="w-full bg-[#F59032] hover:bg-[#E88022] text-white font-bold py-3.5 rounded-xl mt-6 active:scale-95 transition disabled:opacity-50 text-[14px] shadow-sm">
                {uploading ? "Saving..." : "Add to Database"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center py-2 pb-safe z-40 h-[56px]">
        <Link href="/" className="flex flex-col items-center cursor-pointer text-[#69727B] hover:text-[#1F1F1F] transition">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[9px] font-bold leading-tight">Home</span>
          <span className="text-[8px] font-medium leading-tight">ಮುಖಪುಟ</span>
        </Link>
        <Link href="/" className="flex flex-col items-center cursor-pointer text-[#69727B] hover:text-[#1F1F1F] transition">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          <span className="text-[9px] font-bold leading-tight">Suppliers</span>
          <span className="text-[8px] font-medium leading-tight">ಪೂರೈಕೆದಾರರು</span>
        </Link>
        <div className="flex flex-col items-center cursor-pointer text-[#F59032] hover:text-[#E88022] transition">
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[9px] font-bold leading-tight">Profile</span>
          <span className="text-[8px] font-medium leading-tight">ಪ್ರೊಫೈಲ್</span>
        </div>
      </div>

    </div>
  );
}
