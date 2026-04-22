'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { useAuth } from './auth-provider';

function ProfileView() {
  const { user, userData, updateUser, updateUserData, error: authError } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPass, setEditPass] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [brandLogo, setBrandLogo] = useState(userData?.brandLogo || '');

  useEffect(() => {
    if (userData?.brandLogo && !brandLogo) {
      setBrandLogo(userData.brandLogo);
    }
  }, [userData, brandLogo]);

  if (!user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setSuccess(false);
    try {
      await updateUser({
        displayName: editName !== user.displayName ? editName : undefined,
        email: editEmail !== user.email ? editEmail : undefined,
        password: editPass ? editPass : undefined
      });
      
      if (userData?.plan === 'agency') {
        await updateUserData({ brandLogo });
      }
      
      setSuccess(true);
      setIsEditing(false);
      setEditPass('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {} finally {
      setIsUpdating(false);
    }
  };

  const isPasswordProvider = user?.providerData?.some((p: any) => p.providerId === 'password') || false;

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pb-10 border-b border-[#E5E5E5] dark:border-zinc-800 flex justify-between items-end gap-6">
        <div>
          <h2 className="text-[50px] md:text-[64px] font-black uppercase tracking-tighter leading-none mb-4 text-[#1A1A1A] dark:text-zinc-100">
            Dein Profil
          </h2>
          <p className="text-[14px] text-[#888] font-medium">Personalisierung und Account-Details.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-6 py-3 bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] transition-colors"
          >
            Profil bearbeiten
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-12 items-start">
        <div className="relative group shrink-0">
          {user.photoURL ? (
            <Image 
              src={user.photoURL} 
              alt="Avatar" 
              width={180} 
              height={180} 
              className="w-[180px] h-[180px] rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700 shadow-2xl border-4 border-white dark:border-zinc-900" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-[180px] h-[180px] bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-[60px] font-black rounded-sm">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 w-full max-w-[500px]">
          {isEditing ? (
            <form onSubmit={handleUpdate} className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Anzeigename</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-3 px-4 text-[14px] font-bold outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">E-Mail Adresse</label>
                <input 
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-3 px-4 text-[14px] font-bold outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              {isPasswordProvider && (
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Neues Passwort</label>
                  <input 
                    type="password"
                    value={editPass}
                    placeholder="Leer lassen für keine Änderung"
                    onChange={(e) => setEditPass(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-3 px-4 text-[14px] font-bold outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
              )}
              
              {userData?.plan === 'agency' && (
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Agentur-Logo (URL)</label>
                  <input 
                    type="url"
                    value={brandLogo}
                    placeholder="https://deine-website.de/logo.png"
                    onChange={(e) => setBrandLogo(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-3 px-4 text-[14px] font-bold outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
              )}

              {authError && (
                <div className="p-4 bg-[#EB5757]/10 border border-[#EB5757]/20 text-[#EB5757] text-[11px] font-bold">
                  {authError}
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-8 py-4 bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isUpdating ? 'Speichert...' : 'Speichern'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-8 py-4 bg-[#EEE] dark:bg-zinc-800 text-[#888] text-[10px] font-black uppercase tracking-widest"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-300">
               {success && (
                 <div className="p-4 bg-[#27AE60] text-white text-[11px] font-black uppercase tracking-widest">
                   Profil erfolgreich aktualisiert
                 </div>
               )}
               <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Anzeigename</span>
                 <div className="text-[20px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-tight border-b border-[#DDD] dark:border-zinc-800 pb-2">{user.displayName || 'Unbekannt'}</div>
               </div>
               <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">E-Mail Adresse</span>
                 <div className="text-[20px] font-bold text-[#1A1A1A] dark:text-zinc-100 tracking-tight border-b border-[#DDD] dark:border-zinc-800 pb-2">{user.email}</div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ProfileView);
