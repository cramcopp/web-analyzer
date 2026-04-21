"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  Mail, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2,
  CheckCircle,
  Crown
} from "lucide-react";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot,
  arrayUnion,
  arrayRemove,
  limit
} from "firebase/firestore";

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

  useEffect(() => {
    if (!user) return;

    // Fetch team where user is owner or member
    const qOwner = query(collection(db, "teams"), where("ownerId", "==", user.uid), limit(1));
    const unsubOwner = onSnapshot(qOwner, (snap) => {
      if (!snap.empty) {
        const teamDoc = snap.docs[0];
        setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
        setLoading(false);
      } else {
        // Check if user is member of another team
        const qMember = query(collection(db, "teams"), where("members", "array-contains", user.uid), limit(1));
        const unsubMember = onSnapshot(qMember, (mSnap) => {
          if (!mSnap.empty) {
            const mTeamDoc = mSnap.docs[0];
            setTeam({ id: mTeamDoc.id, ...mTeamDoc.data() } as Team);
          } else {
            setTeam(null);
          }
          setLoading(false);
        });
        return () => unsubMember();
      }
    });

    return () => unsubOwner();
  }, [user]);

  // Fetch member details when team changes
  useEffect(() => {
    if (!team) {
      setMembers([]);
      return;
    }

    const fetchMembers = async () => {
      const uids = [team.ownerId, ...team.members];
      const memberDetails: TeamMember[] = [];
      
      // Firestore 'in' query has a limit of 10-30, but we expect small teams for now
      for (const chunk of chunkArray(uids, 10)) {
        const q = query(collection(db, "users"), where("uid", "in", chunk));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          memberDetails.push(doc.data() as TeamMember);
        });
      }
      setMembers(memberDetails);
    };

    fetchMembers();
  }, [team]);

  const chunkArray = (arr: any[], size: number) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user || !isAgency) return;
    try {
      await addDoc(collection(db, "teams"), {
        name: newTeamName.trim(),
        ownerId: user.uid,
        members: [],
        createdAt: new Date().toISOString()
      });
      setIsCreating(false);
    } catch (e) {
      console.error("Error creating team:", e);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !team || !isAgency) return;
    if (team.ownerId !== user.uid) {
      setInviteStatus({ type: 'error', msg: "Nur der Inhaber kann einladen." });
      return;
    }

    setIsInviting(true);
    setInviteStatus(null);

    try {
      // 1. Find user by email
      const q = query(collection(db, "users"), where("email", "==", inviteEmail.trim().toLowerCase()), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        setInviteStatus({ type: 'error', msg: "Nutzer nicht gefunden. Er muss sich zuerst registriert haben." });
      } else {
        const invitedUser = snap.docs[0].data();
        
        // 2. Check if they have Agency plan (User Requirement)
        if (invitedUser.plan !== 'agency') {
          setInviteStatus({ type: 'error', msg: "Nutzer benötigt ebenfalls einen Agency-Plan!" });
        } else if (team.members.includes(invitedUser.uid) || invitedUser.uid === team.ownerId) {
          setInviteStatus({ type: 'error', msg: "Dieser Nutzer ist bereits im Team." });
        } else {
          // 3. Add to members
          await updateDoc(doc(db, "teams", team.id), {
            members: arrayUnion(invitedUser.uid)
          });
          setInviteStatus({ type: 'success', msg: `${invitedUser.displayName || inviteEmail} wurde eingeladen!` });
          setInviteEmail("");
        }
      }
    } catch (e) {
      console.error("Invite error:", e);
      setInviteStatus({ type: 'error', msg: "Einladungs-Fehler." });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!team || team.ownerId !== user.uid) return;
    try {
      await updateDoc(doc(db, "teams", team.id), {
        members: arrayRemove(memberUid)
      });
    } catch (e) {
      console.error("Remove member error:", e);
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[800px]">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-[#D4AF37]" />
          <h2 className="text-[40px] font-black uppercase tracking-tighter leading-none">Team Workspace</h2>
        </div>
        <p className="text-[#888] text-[15px] font-medium leading-relaxed italic border-l-2 border-[#D4AF37] pl-4">
          &quot;Zusammen ist man weniger allein – vor allem beim Skalieren.&quot;
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
          {/* Members List */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#F0F0F0] dark:border-zinc-800">
                <h3 className="text-[14px] font-black uppercase tracking-[2px]">{team.name} Mitglieder</h3>
                <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest px-2 py-1 bg-[#F5F5F3] dark:bg-zinc-800">
                  {members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {members.map((member) => (
                  <div key={member.uid} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#1A1A1A] dark:bg-zinc-800 text-white flex items-center justify-center font-black text-[14px]">
                        {member.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-2">
                          {member.displayName || member.email.split('@')[0]}
                          {member.uid === team.ownerId && <Crown className="w-3 h-3 text-[#D4AF37]" />}
                        </span>
                        <p className="text-[10px] text-[#888] font-medium">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {member.plan === 'agency' ? (
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[#27AE60]/10 text-[#27AE60] text-[8px] font-black uppercase tracking-widest border border-[#27AE60]/20">
                          <CheckCircle className="w-2.5 h-2.5" /> Agency Active
                        </div>
                      ) : (
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[#EB5757]/10 text-[#EB5757] text-[8px] font-black uppercase tracking-widest border border-[#EB5757]/20">
                          <AlertTriangle className="w-2.5 h-2.5" /> Plan Expired
                        </div>
                      )}

                      {team.ownerId === user.uid && member.uid !== user.uid && (
                        <button 
                          onClick={() => handleRemoveMember(member.uid)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-[#888] hover:text-[#EB5757] transition-all"
                          title="Mitglied entfernen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#E5E5E5] dark:border-zinc-800">
               <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] mb-2 block">— Info —</span>
               <p className="text-[11px] text-[#888] leading-relaxed">
                 Alle Team-Mitglieder können Projekte im Workspace sehen und bearbeiten. 
                 Voraussetzung ist ein aktiver <strong className="text-[#1A1A1A] dark:text-zinc-100">Agency-Plan</strong> für jeden Account. 
                 Sollte ein Mitglied den Plan kündigen, verliert es automatisch den Zugriff auf diesen Workspace.
               </p>
            </div>
          </div>

          {/* Invitation Panel */}
          <div className="col-span-1">
            <div className="bg-[#1A1A1A] dark:bg-zinc-900 p-6 text-white shadow-xl sticky top-4">
              <h4 className="text-[12px] font-black uppercase tracking-[2px] mb-6 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#D4AF37]" /> Mitglied Einladen
              </h4>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-[#888]">E-Mail Adresse</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                    <input 
                      type="email" 
                      placeholder="kollege@agency.de"
                      className="w-full bg-white/5 border border-white/10 py-3 pl-10 pr-4 text-[12px] outline-none focus:border-[#D4AF37] transition-colors"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail.trim() || team.ownerId !== user.uid}
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
                
                {team.ownerId !== user.uid && (
                  <p className="text-[9px] text-[#888] text-center mt-4">
                    Nur der Inhaber ({members.find(m => m.uid === team.ownerId)?.displayName || 'Admin'}) kann Mitglieder einladen.
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
