'use client';

import React, { useState } from 'react';
import { 
  Folder, Plus, X, AlertTriangle, Edit3, Trash2, Save 
} from 'lucide-react';
import { Project } from '../../types/common';
import ProjectFavicon, { getProjectDomain } from '../project-favicon';

interface SidebarProjectsProps {
  projects: Project[];
  setProjects: (projs: Project[]) => void;
  onSelectProject?: (proj: Project) => void;
  onItemClick: (callback?: () => void) => void;
  showSuccess: (msg: string) => void;
  teamId: string | null;
}

const isValidUrl = (urlString: string) => {
  if (!urlString) return true;
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeProjectUrl = (urlString: string) => {
  const value = urlString.trim();
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

export function SidebarProjects({
  projects,
  setProjects,
  onSelectProject,
  onItemClick,
  showSuccess,
  teamId
}: SidebarProjectsProps) {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectUrl, setNewProjectUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const projectUrl = normalizeProjectUrl(newProjectUrl);
    if (projectUrl && !isValidUrl(projectUrl)) {
      setValidationError("Ungültige URL (http:// oder https://)");
      return;
    }

    try {
      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          url: projectUrl,
          teamId: teamId
        })
      });
      
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to create project");
      }

      setNewProjectName("");
      setNewProjectUrl("");
      setIsCreatingProject(false);
      setValidationError(null);
      showSuccess("Projekt erstellt");
      
      const projRes = await fetch('/api/projects');
      if (projRes.ok) setProjects(await projRes.json());
    } catch (e: any) {
      setValidationError("Fehler beim Erstellen: " + (e.message || 'Unbekannt'));
    }
  };

  const handleUpdateProject = async (id: string) => {
    if (!editName.trim()) {
      setValidationError("Name darf nicht leer sein");
      return;
    }
    const projectUrl = normalizeProjectUrl(editUrl);
    if (projectUrl && !isValidUrl(projectUrl)) {
      setValidationError("Ungültige URL (http:// oder https://)");
      return;
    }

    try {
      const resp = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          url: projectUrl,
        })
      });
      
      if (!resp.ok) throw new Error("Failed to update project");

      setEditingProjectId(null);
      setValidationError(null);
      showSuccess("Projekt erfolgreich aktualisiert");
      
      const projRes = await fetch('/api/projects');
      if (projRes.ok) setProjects(await projRes.json());
    } catch (e) {
      console.error("Failed to update project", e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const resp = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error("Failed to delete project");
      
      setConfirmDeleteId(null);
      showSuccess("Projekt gelöscht");
      
      const projRes = await fetch('/api/projects');
      if (projRes.ok) setProjects(await projRes.json());
    } catch (e) {
      console.error("Failed to delete project", e);
    }
  };

  const startEditing = (proj: Project) => {
    setEditingProjectId(proj.id);
    setEditName(proj.name);
    setEditUrl(proj.url || "");
    setValidationError(null);
  };

  return (
    <div className="px-4 py-5 border-b border-[#E5E5E5] dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] uppercase font-black text-[#888] tracking-widest flex items-center gap-1.5">
          <Folder className="w-3 h-3" /> Projekte
        </span>
        <button
          onClick={() => {
            setIsCreatingProject(!isCreatingProject);
            setValidationError(null);
          }}
          className="text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-sm transition-colors"
        >
          {isCreatingProject ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </button>
      </div>

      {isCreatingProject && (
        <div className="mb-4 px-2 py-3 bg-black/5 dark:bg-white/5 rounded-md border border-dashed border-[#D4AF37]/50 flex flex-col gap-2">
          <span className="text-[9px] uppercase font-bold text-[#888]">Projekt anlegen</span>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Name (z.B. Müller GmbH)"
            className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-1.5 px-2 text-[11px] outline-none focus:border-[#D4AF37] transition-colors"
            autoFocus
          />
          <input
            type="text"
            value={newProjectUrl}
            onChange={(e) => setNewProjectUrl(e.target.value)}
            placeholder="URL (https://...)"
            className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-1.5 px-2 text-[11px] outline-none focus:border-[#D4AF37] transition-colors"
          />
          {validationError && (
            <p className="text-[9px] text-[#EB5757] font-bold mt-1 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> {validationError}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() => { setIsCreatingProject(false); setValidationError(null); }}
              className="text-[9px] uppercase font-bold text-[#888] hover:text-[#1A1A1A] transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreateProject}
              className="text-[9px] uppercase font-bold text-white bg-[#D4AF37] px-3 py-1 rounded-sm hover:opacity-80 transition-opacity"
            >
              Erstellen
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {projects.length > 0 ? projects.map((proj) => (
          <div key={proj.id} className="group relative">
            {editingProjectId === proj.id ? (
              <div className="p-2 bg-white dark:bg-zinc-900 border border-[#D4AF37] rounded-md flex flex-col gap-2 shadow-sm">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-transparent border-b border-[#EEE] dark:border-zinc-800 py-1 text-[11px] font-bold outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full bg-transparent border-b border-[#EEE] dark:border-zinc-800 py-1 text-[11px] outline-none"
                  placeholder="https://..."
                />
                {validationError && (
                  <p className="text-[9px] text-[#EB5757] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> {validationError}
                  </p>
                )}
                <div className="flex justify-end gap-3 mt-1">
                  <button onClick={() => setEditingProjectId(null)} className="text-[9px] font-bold uppercase text-[#888]">Abbruch</button>
                  <button onClick={() => handleUpdateProject(proj.id)} className="text-[9px] font-bold uppercase text-[#27AE60] flex items-center gap-1">
                    <Save className="w-3 h-3" /> Speichern
                  </button>
                </div>
              </div>
            ) : confirmDeleteId === proj.id ? (
              <div className="p-3 bg-[#EB5757]/5 border border-[#EB5757]/20 rounded-md flex flex-col items-center text-center">
                <AlertTriangle className="w-5 h-5 text-[#EB5757] mb-2" />
                <span className="text-[10px] font-bold uppercase mb-2 text-[#EB5757]">Projekt löschen?</span>
                <div className="flex gap-4">
                  <button onClick={() => setConfirmDeleteId(null)} className="text-[9px] font-bold uppercase text-[#888]">Nein</button>
                  <button onClick={() => handleDeleteProject(proj.id)} className="text-[9px] font-bold uppercase text-[#EB5757] underline">Ja, löschen</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => onItemClick(() => onSelectProject?.(proj))}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-white dark:hover:bg-zinc-900 border border-transparent hover:border-[#E5E5E5] dark:border-zinc-800 transition-all text-left group cursor-pointer"
              >
                <ProjectFavicon url={proj.url} name={proj.name} className="h-6 w-6 rounded" iconClassName="h-3 w-3" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-wide truncate">{proj.name}</span>
                  {proj.url && <span className="text-[9px] text-[#888] truncate">{getProjectDomain(proj.url)}</span>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); startEditing(proj); }} className="p-1 hover:bg-[#D4AF37]/10 rounded transition-colors text-[#888] hover:text-[#D4AF37]"><Edit3 className="w-3 h-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(proj.id); }} className="p-1 hover:bg-[#EB5757]/10 rounded transition-colors text-[#888] hover:text-[#EB5757]"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            )}
          </div>
        )) : !isCreatingProject && (
          <button onClick={() => setIsCreatingProject(true)} className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-white dark:hover:bg-zinc-900 border border-dashed border-[#E5E5E5] dark:border-zinc-800 transition-colors opacity-70 hover:opacity-100">
            <span className="w-6 h-6 rounded flex items-center justify-center shrink-0"><Plus className="w-3 h-3 text-[#888]" /></span>
            <span className="text-[10px] font-bold text-[#888] uppercase tracking-wide">Neues Projekt</span>
          </button>
        )}
      </div>
    </div>
  );
}
