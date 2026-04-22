"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  Mail, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2,
  CheckCircle,
  Crown,
  UserPlus,
  UserMinus
} from "lucide-react";

interface TeamMember {
  uid: string;
  email: string;
  displayName?: string;
  plan?: string;
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: string[]; 
  admins: string[];
}

export function TeamWorkspace({ user, userData }: { user: any, userData: any }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const isAgency = userData?.plan === 'agency';

  const fetchTeamData = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setTeam(data.team);
          setMembers(data.members);
        } else {
          setTeam(null);
          setMembers([]);
        }
      }
    } catch (e) {
      console.error("Error fetching team data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchedForRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTeam(null);
      setMembers([]);
      fetchedForRef.current = null;
      return;
    }

    if (fetchedForRef.current === user.uid) return;
    fetchedForRef.current = user.uid;

    fetchTeamData();
  }, [user]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user || !isAgency) return;
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() })
      });
      if (res.ok) {
        setIsCreating(false);
        await fetchTeamData();
      }
    } catch (e) {
      console.error("Error creating team:", e);
    }
  };

  const handleLeaveTeam = async () => {
    if (!team || !user || team.ownerId === user.uid) return;
    if (!confirm("Bist du sicher, dass du das Team verlassen möchtest? Du verlierst den Zugriff auf alle Team-Projekte.")) return;
    
    try {
      const res = await fetch('/api/teams/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid })
      });
      if (res.ok) {
        setTeam(null);
        setMembers([]);
      }
    } catch (e) {
      console.error("Error leaving team:", e);
      alert("Fehler beim Verlassen des Teams.");
    }
  };

  const handleDeleteTeam = async () => {
    if (!team || !user || team.ownerId !== user.uid) return;
    if (!confirm("Willst du das Team wirklich LÖSCHEN? Alle Mitglieder verlieren den Zugriff und diese Aktion kann NICHT rückgängig gemacht werden.")) return;

    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' });
      if (res.ok) {
        setTeam(null);
        setMembers([]);
      }
    } catch (e) {
      console.error("Error deleting team:", e);
      alert("Fehler beim Löschen des Teams.");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !team || !isAgency) return;
    
    setIsInviting(true);
    setInviteStatus(null);

    try {
      const res = await fetch('/api/teams/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteStatus({ type: 'error', msg: data.error || "Einladungs-Fehler." });
      } else {
        setInviteStatus({ type: 'success', msg: `${inviteEmail} wurde eingeladen!` });
        setInviteEmail("");
        await fetchTeamData();
      }
    } catch (e) {
      console.error("Invite error:", e);
      setInviteStatus({ type: 'error', msg: "Einladungs-Fehler." });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!team) return;
    if (!confirm("Mitglied wirklich aus dem Team entfernen?")) return;

    try {
      const res = await fetch('/api/teams/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: memberUid })
      });
      if (res.ok) {
        await fetchTeamData();
      }
    } catch (e) {
      console.error("Remove member error:", e);
    }
  };

  const handleToggleAdmin = async (targetUid: string) => {
    if (!team || team.ownerId !== user.uid) return;
    const isAdmin = team.admins.includes(targetUid);
    try {
      const res = await fetch('/api/teams/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: targetUid, isAdmin: !isAdmin })
      });
      if (res.ok) {
        await fetchTeamData();
      }
    } catch (e) {
      console.error("Toggle admin error:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!isAgency) {
    return (
      <div className="bg-[#EB5757]/5 border border-[#EB5757]/20 p-10 rounded-md text-center">
        <AlertTriangle className="w-12 h-12 text-[#EB5757] mx-auto mb-4" />
        <h2 className="text-[20px] font-black uppercase text-[#EB5757] mb-2">Agency Plan Erforderlich</h2>
        <p className="text-[14px] text-[#888] max-w-[500px] mx-auto mb-6">
          Zusammenarbeit in Teams ist exklusiv für unsere Agency-Kunden verfügbar. 
          Upgrade dein Konto, um dein eigenes Team zu gründen.
        </p>
      </div>
    );
  }

  const isUserOwner = team?.ownerId === user.uid;
  const isUserAdmin = team?.admins.includes(user.uid) || isUserOwner;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[900px]">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-[#D4AF37]" />
          <h2 className="text-[40px] font-black uppercase tracking-tighter leading-none">Team Workspace</h2>
        </div>
        <p className="text-[#888] text-[15px] font-medium leading-relaxed italic border-l-2 border-[#D4AF37] pl-4">
          &quot;Zusammen arbeiten, gemeinsam skalieren.&quot;
        </p>
      </div>

      {!team ? (
        <div className="bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 p-8 rounded-sm shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#F5F5F3] dark:bg-zinc-800 flex items-center justify-center rounded-full mb-6">
            <Plus className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h3 className="text-[18px] font-black uppercase tracking-widest mb-4 text-[#1A1A1A] dark:text-zinc-100">Gründe dein Team</h3>
          <p className="text-[13px] text-[#888] mb-8 max-w-[350px]">
            Erstelle deinen Workspace und lade andere Agency-Nutzer ein, um gemeinsam an Projekten zu arbeiten.
          </p>

          {isCreating ? (
            <div className="w-full max-w-[300px] flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Team Name"
                className="w-full bg-white dark:bg-zinc-950 border border-[#DDD] dark:border-zinc-800 py-3 px-4 text-[13px] outline-none focus:border-[#D4AF37] transition-colors"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 text-[11px] font-black uppercase text-[#888] hover:text-[#1A1A1A]"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={handleCreateTeam}
                  className="flex-1 bg-[#D4AF37] text-white py-2 text-[11px] font-black uppercase tracking-widest shadow-md hover:opacity-90"
                >
                  Gründen
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="px-10 py-4 bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 border-2 border-[#1A1A1A] dark:border-zinc-100 text-[12px] font-black uppercase tracking-[3px] hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] hover:border-[#D4AF37] transition-all"
            >
              Neues Team erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#F0F0F0] dark:border-zinc-800">
                <div className="flex flex-col">
                  <h3 className="text-[14px] font-black uppercase tracking-[2px]">{team.name} Mitglieder</h3>
                  <span className="text-[9px] font-bold text-[#888] uppercase mt-1">ID: {team.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-2 py-1 bg-[#F5F5F3] dark:bg-zinc-800">
                    {members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}
                  </span>
                  {isUserOwner && (
                    <button 
                      onClick={handleDeleteTeam}
                      className="p-2 text-[#888] hover:text-[#EB5757] transition-colors"
                      title="Team löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {members.map((member) => {
                  const isOwner = member.uid === team.ownerId;
                  const isAdmin = team.admins.includes(member.uid) || isOwner;
                  
                  return (
                    <div key={member.uid} className="flex items-center justify-between group py-2 border-b border-transparent hover:border-black/5 dark:hover:border-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 ${isAdmin ? 'bg-[#D4AF37]' : 'bg-[#1A1A1A] dark:bg-zinc-800'} text-white flex items-center justify-center font-black text-[14px]`}>
                          {member.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-2">
                            {member.displayName || member.email.split('@')[0]}
                            {isOwner && <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />}
                            {!isOwner && isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />}
                            {member.uid === user.uid && <span className="text-[9px] text-[#D4AF37] opacity-60 font-black tracking-widest">( DU )</span>}
                          </span>
                          <p className="text-[10px] text-[#888] font-medium">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 mr-2">
                           {isUserOwner && !isOwner && (
                              <button 
                                onClick={() => handleToggleAdmin(member.uid)}
                                className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest border transition-all ${
                                  team.admins.includes(member.uid) 
                                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] hover:bg-white hover:text-black' 
                                  : 'bg-white text-[#1A1A1A] border-[#EEE] hover:bg-[#D4AF37] hover:text-white hover:border-[#D4AF37]'
                                }`}
                              >
                                {team.admins.includes(member.uid) ? 'Admin entziehen' : 'Admin geben'}
                              </button>
                           )}
                           
                           {isUserAdmin && !isOwner && (member.uid !== user.uid) && (
                              <button 
                                onClick={() => handleRemoveMember(member.uid)}
                                className="p-2 text-[#888] hover:text-[#EB5757] transition-all opacity-0 group-hover:opacity-100"
                                title="Entfernen"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                           )}
                        </div>

                        {member.uid === user.uid && !isOwner && (
                          <button 
                            onClick={handleLeaveTeam}
                            className="text-[9px] font-black uppercase tracking-widest text-[#EB5757] hover:underline"
                          >
                            Team verlassen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#E5E5E5] dark:border-zinc-800 flex items-start gap-4">
               <div className="p-2 bg-black/5 dark:bg-white/5 rounded-sm">
                  <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
               </div>
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 italic">Admin-Berechtigungen</span>
                 <p className="text-[11px] text-[#888] leading-relaxed">
                   Inhaber und Team-Admins können Mitglieder einladen und entfernen. 
                   Nur der <strong className="text-[#1A1A1A] dark:text-zinc-100">Inhaber</strong> kann Co-Admins ernennen oder das Team vollständig löschen.
                 </p>
               </div>
            </div>
          </div>

          {/* Invitation Panel */}
          <div className="col-span-1">
            <div className={`p-6 text-white shadow-xl sticky top-4 ${isUserAdmin ? 'bg-[#1A1A1A] dark:bg-zinc-900' : 'bg-zinc-300 dark:bg-zinc-800 opacity-50 cursor-not-allowed'}`}>
              <h4 className="text-[12px] font-black uppercase tracking-[2px] mb-6 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#D4AF37]" /> Mitglied Einladen
              </h4>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-[#888]">E-Mail Adresse</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                    <input 
                      type="email" 
                      disabled={!isUserAdmin}
                      placeholder="kollege@agency.de"
                      className="w-full bg-white text-black dark:bg-white/5 dark:text-white border border-white/10 py-3 pl-10 pr-4 text-[12px] outline-none focus:border-[#D4AF37] transition-colors disabled:opacity-20"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail.trim() || !isUserAdmin}
                  className="w-full bg-[#D4AF37] text-white py-3 text-[10px] font-black uppercase tracking-[2px] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                >
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Einladung Senden"}
                </button>

                {inviteStatus && (
                  <div className={`mt-2 p-3 text-[9px] font-bold uppercase tracking-wider flex items-start gap-2 border ${
                    inviteStatus.type === 'success' ? 'bg-[#27AE60]/10 text-[#27AE60] border-[#27AE60]/20' : 'bg-[#EB5757]/10 text-[#EB5757] border-[#EB5757]/20'
                  }`}>
                    {inviteStatus.type === 'success' ? <CheckCircle className="w-3 h-3 shrink-0" /> : <AlertTriangle className="w-3 h-3 shrink-0" />}
                    {inviteStatus.msg}
                  </div>
                )}
                
                {!isUserAdmin && (
                  <p className="text-[9px] text-[#EB5757] italic text-center mt-4 font-bold uppercase tracking-widest">
                    Keine Admin-Rechte
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamWorkspace;
