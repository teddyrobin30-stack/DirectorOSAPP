import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, Calendar, Tag, AlertCircle, Paperclip, LayoutList, Columns, Briefcase, X, Download } from 'lucide-react';
import { Task, UserSettings, Group } from '../types';
import { TASK_TYPES } from '../constants';
import KanbanView from './KanbanView';

interface TasksViewProps {
  todos: Task[];
  userSettings: UserSettings;
  groups: Group[]; // Needed for linking
  onAdd: () => void;
  onToggle: (id: string | number) => void;
  onTaskClick: (task: Task) => void;
  onDelete: (id: string | number) => void;
  onStatusChange?: (id: string | number, status: 'Pas commencé' | 'En cours' | 'Terminé') => void;
}

const TasksView: React.FC<TasksViewProps> = ({ todos, userSettings, groups, onAdd, onToggle, onTaskClick, onDelete, onStatusChange }) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [activeTag, setActiveTag] = useState<string>('ALL');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const filtered = todos.filter(t => {
    if (activeTag !== 'ALL') return t.tag === activeTag;
    return true;
  });

  const themeColor = userSettings.themeColor;

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case 'High': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'Medium': return 'text-violet-500 bg-violet-50 dark:bg-violet-900/20';
      default: return 'text-slate-500 bg-slate-100 dark:bg-slate-700';
    }
  };

  return (
    <div className="px-6 py-6 space-y-6 animate-in fade-in h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-black">Plan d'Action</h2>
        <div className="flex gap-2">
           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}
              >
                <LayoutList size={18}/>
              </button>
              <button 
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}
              >
                <Columns size={18}/>
              </button>
           </div>
           <button 
            onClick={onAdd}
            className={`p-2 rounded-xl text-white bg-${themeColor}-600 shadow-lg hover:opacity-90 active:scale-95 transition-all`}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Interactive Tag Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 shrink-0">
        <button 
          onClick={() => setActiveTag('ALL')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap border-2 ${activeTag === 'ALL' ? `border-${themeColor}-600 bg-${themeColor}-50 text-${themeColor}-600` : 'border-slate-100 dark:border-slate-800 text-slate-400 bg-white dark:bg-slate-800'}`}
        >
          Tous
        </button>
        {TASK_TYPES.map(tag => (
          <button 
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap border-2 ${activeTag === tag ? `border-indigo-600 bg-indigo-50 text-indigo-600` : 'border-slate-100 dark:border-slate-800 text-slate-400 bg-white dark:bg-slate-800'}`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {viewMode === 'kanban' ? (
          <KanbanView 
            tasks={filtered} 
            userSettings={userSettings} 
            groups={groups}
            onTaskClick={onTaskClick}
            onStatusChange={(id, status) => onStatusChange && onStatusChange(id, status)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {filtered.map(task => {
              const linkedGroup = groups.find(g => g.id.toString() === task.linkedGroupId?.toString());
              // Find first image attachment
              const imageAttachment = task.attachments?.find(a => a.type.startsWith('image/'));

              return (
              <div 
                key={task.id} 
                className={`p-5 rounded-3xl border transition-all flex items-start gap-4 hover:shadow-md relative overflow-hidden ${task.done ? 'opacity-50' : ''} ${userSettings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
              >
                {/* Priority Stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-violet-500' : 'bg-slate-300'}`} />

                <button 
                  onClick={() => onToggle(task.id)}
                  className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}
                >
                  {task.done && <CheckSquare size={12} className="text-white" />}
                </button>
                <div className="flex-1 cursor-pointer min-w-0" onClick={() => onTaskClick(task)}>
                  {linkedGroup && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase mb-1">
                      <Briefcase size={10} /> {linkedGroup.name}
                    </div>
                  )}
                  <p className={`text-sm font-bold leading-snug break-words ${task.done ? 'line-through text-slate-400' : ''}`}>{task.text}</p>
                  
                  {/* Affiche la photo si elle existe */}
                  {imageAttachment && (
                    <div className="mt-3">
                        <img
                        src={imageAttachment.url}
                        alt="Rendu tâche"
                        // Style copié de Maintenance : largeur max, hauteur fixe, coins arrondis, curseur main
                        className="w-full h-32 object-cover rounded-lg cursor-pointer border border-slate-200 hover:opacity-90 transition-opacity"
                        // Au clic, on définit cette image comme "agrandie"
                        onClick={(e) => {
                            e.stopPropagation(); // Important : ne pas ouvrir le détail de la tâche
                            setEnlargedImage(imageAttachment.url);
                        }}
                        />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'High' ? 'Urgent' : task.priority === 'Medium' ? 'Normal' : 'Bas'}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300`}>
                      <Tag size={10} /> {task.tag}
                    </span>
                    {task.date && (
                      <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-500 flex items-center gap-1">
                        <Calendar size={10} /> {new Date(task.date).toLocaleDateString('fr-FR', {day: 'numeric', month:'short'})}
                      </span>
                    )}
                    {task.attachments && task.attachments.length > 0 && !imageAttachment && (
                      <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-indigo-100 text-indigo-600 flex items-center gap-1">
                        <Paperclip size={10} />
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => onDelete(task.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )})}
            {filtered.length === 0 && (
              <div className="col-span-full p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[40vh]">
                <CheckSquare size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Aucune tâche trouvée.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal pour image agrandie */}
      {enlargedImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setEnlargedImage(null)}>
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            {/* Bouton Fermer (Croix) */}
            <button onClick={() => setEnlargedImage(null)} className="absolute -top-4 -right-4 p-2 bg-white rounded-full text-slate-800 shadow-lg hover:bg-slate-100 z-10">
                <X size={20} />
            </button>

            {/* L'image en grand */}
            <img src={enlargedImage} alt="Agrandissement" className="w-full h-full object-contain rounded-lg shadow-2xl max-h-[80vh]" />

            {/* Bouton Télécharger (en bas) */}
            <div className="absolute -bottom-16 left-0 right-0 flex justify-center">
                <a 
                href={enlargedImage} 
                download={`tache-photo-${Date.now()}.jpg`} // Nom du fichier téléchargé
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                onClick={(e) => e.stopPropagation()} // Empêche la fermeture du modal au téléchargement
                >
                <Download size={20} />
                <span>Télécharger l'image</span>
                </a>
            </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TasksView;