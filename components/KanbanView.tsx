import React, { useRef } from 'react';
import { Task, UserSettings, Group } from '../types';
import { CheckSquare, AlertCircle, Calendar, Paperclip, Briefcase, Tag } from 'lucide-react';

interface KanbanViewProps {
  tasks: Task[];
  userSettings: UserSettings;
  groups: Group[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string | number, status: 'Pas commencé' | 'En cours' | 'Terminé') => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({ tasks, userSettings, groups, onTaskClick, onStatusChange }) => {
  const themeColor = userSettings.themeColor;

  const columns: { id: 'Pas commencé' | 'En cours' | 'Terminé', label: string, color: string }[] = [
    { id: 'Pas commencé', label: 'À Faire', color: 'bg-slate-100 text-slate-500' },
    { id: 'En cours', label: 'En Cours', color: 'bg-amber-100 text-amber-600' },
    { id: 'Terminé', label: 'Terminé', color: 'bg-emerald-100 text-emerald-600' }
  ];

  const handleDragStart = (e: React.DragEvent, taskId: string | number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: 'Pas commencé' | 'En cours' | 'Terminé') => {
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      // Tente de convertir en nombre si c'est un ID numérique legacy, sinon garde la string
      const parsedId = !isNaN(Number(taskId)) && !taskId.includes('-') ? Number(taskId) : taskId;
      onStatusChange(parsedId, newStatus);
    }
  };

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-violet-500';
      default: return 'bg-slate-300';
    }
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4 snap-x">
      {columns.map(col => (
        <div 
          key={col.id} 
          className="flex-1 min-w-[280px] snap-center flex flex-col h-full rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border-2 border-slate-100 dark:border-slate-800"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          {/* Header Column */}
          <div className="p-4 flex items-center justify-between sticky top-0 bg-transparent z-10">
             <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${col.color}`}>
               {col.label}
             </div>
             <span className="text-xs font-bold text-slate-400">{tasks.filter(t => t.status === col.id).length}</span>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-3 no-scrollbar">
            {tasks.filter(t => t.status === col.id).map(task => {
                const linkedGroup = groups.find(g => g.id.toString() === task.linkedGroupId?.toString());
                return (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onTaskClick(task)}
                    className={`p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative overflow-hidden`}
                  >
                    {/* Priority Indicator Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(task.priority)}`} />

                    <div className="pl-2">
                        {/* Linked Group Badge */}
                        {linkedGroup && (
                            <div className="flex items-center gap-1 text-[8px] font-black text-indigo-500 uppercase mb-2 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg w-fit">
                                <Briefcase size={10} /> {linkedGroup.name}
                            </div>
                        )}

                        <p className={`text-xs font-bold leading-snug ${task.done ? 'line-through opacity-50' : 'text-slate-700 dark:text-slate-200'}`}>
                            {task.text}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3 items-center">
                            <span className="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Tag size={8} /> {task.tag}
                            </span>
                            {task.date && (
                                <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                                    <Calendar size={8} /> {new Date(task.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}
                                </span>
                            )}
                            {task.attachments && task.attachments.length > 0 && (
                                <span className="text-[8px] font-bold text-indigo-400 flex items-center gap-1">
                                    <Paperclip size={8} />
                                </span>
                            )}
                        </div>
                    </div>
                  </div>
                );
            })}
            {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center opacity-50">
                    <span className="text-[9px] font-bold text-slate-400">Vide</span>
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanView;