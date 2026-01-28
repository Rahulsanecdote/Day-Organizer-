'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { DataService } from '@/lib/sync/DataService';
import { Task } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const filterTasks = useCallback(() => {
    const today = new Date();

    switch (filter) {
      case 'active':
        setFilteredTasks(tasks.filter(task => task.isActive && !task.isCompleted));
        break;
      case 'completed':
        setFilteredTasks(tasks.filter(task => task.isCompleted));
        break;
      case 'overdue':
        setFilteredTasks(tasks.filter(task =>
          task.isActive &&
          !task.isCompleted &&
          task.dueDate &&
          new Date(task.dueDate) < today
        ));
        break;
      default:
        setFilteredTasks(tasks);
    }
  }, [tasks, filter]);

  useEffect(() => {
    filterTasks();
  }, [filterTasks]);

  const loadTasks = async () => {
    try {
      const allTasks = await DataService.getAllTasks();
      setTasks(allTasks);
    } finally {
      setIsLoading(false);
    }
  };



  const handleAddTask = () => {
    setEditingTask({
      title: '',
      estimatedDuration: 30,
      priority: 3,
      category: 'life',
      energyLevel: 'medium',
      isSplittable: false,
      isCompleted: false,
      isActive: true,
    });
    setShowForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask({ ...task });
    setShowForm(true);
  };

  const handleSaveTask = async () => {
    if (!editingTask || !editingTask.title?.trim()) {
      alert('Task title is required');
      return;
    }

    setIsSaving(true);
    try {
      const task: Task = {
        id: editingTask.id || uuidv4(),
        title: editingTask.title.trim(),
        description: editingTask.description?.trim(),
        estimatedDuration: editingTask.estimatedDuration || 30,
        dueDate: editingTask.dueDate,
        priority: editingTask.priority || 3,
        category: editingTask.category || 'life',
        energyLevel: editingTask.energyLevel || 'medium',
        timeWindowPreference: editingTask.timeWindowPreference,
        isSplittable: editingTask.isSplittable ?? false,
        chunkSize: editingTask.chunkSize,
        dependencies: editingTask.dependencies || [],
        isCompleted: editingTask.isCompleted ?? false,
        isActive: editingTask.isActive ?? true,
        createdAt: editingTask.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await DataService.saveTask(task);
      await loadTasks();

      setShowForm(false);
      setEditingTask(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      await DataService.deleteTask(task.id);
      await loadTasks();
    }
  };

  const handleToggleComplete = async (task: Task) => {
    await DataService.completeTask(task.id);
    await loadTasks();
  };

  const handleToggleActive = async (task: Task) => {
    await DataService.saveTask({
      ...task,
      isActive: !task.isActive,
      updatedAt: new Date().toISOString(),
    });
    await loadTasks();
  };

  const getCategoryStyle = (category: Task['category']) => {
    const styles: Record<string, { bg: string; color: string; icon: React.ReactElement }> = {
      life: {
        bg: 'rgba(155, 138, 160, 0.1)',
        color: 'var(--color-habit)',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        )
      },
      admin: {
        bg: 'rgba(163, 158, 154, 0.1)',
        color: 'var(--color-break)',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        )
      },
      learning: {
        bg: 'rgba(122, 158, 159, 0.1)',
        color: 'var(--color-work)',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        )
      },
      creative: {
        bg: 'rgba(201, 150, 126, 0.1)',
        color: 'var(--color-meal)',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
        )
      },
      work: {
        bg: 'rgba(122, 158, 159, 0.1)',
        color: 'var(--color-work)',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
          </svg>
        )
      },
      health: {
        bg: 'rgba(139, 159, 130, 0.1)',
        color: 'var(--color-gym)',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        )
      },
    };
    return styles[category] || styles.life;
  };

  const getStatusBadge = (task: Task) => {
    if (task.isCompleted) {
      return (
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: 'rgba(139, 159, 130, 0.15)', color: 'var(--color-gym)' }}
        >
          Completed
        </span>
      );
    }

    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 0) {
        return (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(201, 100, 100, 0.15)', color: '#c96464' }}
          >
            Overdue
          </span>
        );
      } else if (daysDiff === 0) {
        return (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(201, 150, 126, 0.15)', color: 'var(--color-meal)' }}
          >
            Due Today
          </span>
        );
      } else if (daysDiff === 1) {
        return (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(196, 163, 90, 0.15)', color: 'var(--color-task)' }}
          >
            Due Tomorrow
          </span>
        );
      }
    }

    return null;
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return format(date, 'MMM d');
    }
  };

  const filterCounts = {
    active: tasks.filter(t => t.isActive && !t.isCompleted).length,
    completed: tasks.filter(t => t.isCompleted).length,
    overdue: tasks.filter(t => {
      const today = new Date();
      return t.isActive && !t.isCompleted && t.dueDate && new Date(t.dueDate) < today;
    }).length,
    all: tasks.length,
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Skeleton Header */}
        <div
          className="rounded-xl p-8 animate-pulse"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="h-8 w-36 rounded" style={{ background: 'var(--color-ivory)' }} />
          <div className="h-4 w-72 rounded mt-2" style={{ background: 'var(--color-ivory)' }} />
        </div>
        {/* Skeleton Filters */}
        <div
          className="rounded-xl p-4 animate-pulse"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-24 rounded-lg" style={{ background: 'var(--color-ivory)' }} />
            ))}
          </div>
        </div>
        {/* Skeleton Task List */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl p-6 animate-pulse"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--color-ivory)' }} />
                <div className="flex-1">
                  <div className="h-5 w-48 rounded mb-2" style={{ background: 'var(--color-ivory)' }} />
                  <div className="h-3 w-32 rounded" style={{ background: 'var(--color-ivory)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div
        className="rounded-xl p-8 flex justify-between items-start"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <div>
          <h1
            className="text-3xl mb-2"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              color: 'var(--color-charcoal)'
            }}
          >
            Task Library
          </h1>
          <p style={{ color: 'var(--color-slate)', lineHeight: 1.6 }}>
            Manage your tasks that will be automatically scheduled into your daily plans.
          </p>
        </div>
        <button
          onClick={handleAddTask}
          className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(184, 151, 107, 0.3)'
          }}
        >
          Add Task
        </button>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <div className="flex gap-2">
          {[
            { key: 'active', label: 'Active' },
            { key: 'completed', label: 'Completed' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'all', label: 'All' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: filter === key ? 'var(--color-ivory)' : 'transparent',
                color: filter === key ? 'var(--color-charcoal)' : 'var(--color-mist)',
                border: `1px solid ${filter === key ? 'var(--color-gold-light)' : 'transparent'}`
              }}
            >
              {label} ({filterCounts[key as keyof typeof filterCounts]})
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => {
          const categoryStyle = getCategoryStyle(task.category);
          return (
            <div
              key={task.id}
              className="rounded-xl p-6 transition-all duration-300"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-soft)',
                opacity: task.isCompleted ? 0.7 : task.isActive ? 1 : 0.6,
                borderLeft: `3px solid ${categoryStyle.color}`
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: categoryStyle.bg, color: categoryStyle.color }}
                    >
                      {categoryStyle.icon}
                    </div>
                    <h3
                      className="font-medium"
                      style={{
                        color: 'var(--color-charcoal)',
                        textDecoration: task.isCompleted ? 'line-through' : 'none'
                      }}
                    >
                      {task.title}
                    </h3>
                    {getStatusBadge(task)}
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: 'var(--color-ivory)',
                        color: 'var(--color-gold-dark)',
                        border: '1px solid var(--color-border-light)'
                      }}
                    >
                      Priority {task.priority}
                    </span>
                  </div>

                  {task.description && (
                    <p
                      className="mb-4 ml-11"
                      style={{ color: 'var(--color-slate)' }}
                    >
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm ml-11" style={{ color: 'var(--color-mist)' }}>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      {task.estimatedDuration} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                      </svg>
                      {task.energyLevel} energy
                    </span>
                    {task.isSplittable && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        Splittable ({task.chunkSize}min)
                      </span>
                    )}
                    {task.dueDate && (
                      <span
                        className="flex items-center gap-1.5"
                        style={{
                          color: new Date(task.dueDate) < new Date() && !task.isCompleted
                            ? '#c96464'
                            : 'var(--color-mist)'
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        {formatDueDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 ml-4">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      color: task.isCompleted ? 'var(--color-gym)' : 'var(--color-mist)'
                    }}
                    title={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    aria-label={task.isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
                  >
                    {task.isCompleted ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleActive(task)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: task.isActive ? 'var(--color-work)' : 'var(--color-mist)' }}
                    title={task.isActive ? 'Deactivate' : 'Activate'}
                    aria-label={task.isActive ? 'Deactivate task' : 'Activate task'}
                  >
                    {task.isActive ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleEditTask(task)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-mist)' }}
                    title="Edit"
                    aria-label="Edit task"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-mist)' }}
                    title="Delete"
                    aria-label="Delete task"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div
          className="rounded-xl p-16 text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-gold)' }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h3
            className="text-xl mb-2"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              color: 'var(--color-charcoal)'
            }}
          >
            {filter === 'active' && 'No active tasks'}
            {filter === 'completed' && 'No completed tasks'}
            {filter === 'overdue' && 'No overdue tasks'}
            {filter === 'all' && 'No tasks yet'}
          </h3>
          <p
            className="mb-8"
            style={{ color: 'var(--color-slate)' }}
          >
            {filter === 'active' && 'All your tasks are completed or inactive.'}
            {filter === 'completed' && 'Complete some tasks to see them here.'}
            {filter === 'overdue' && 'Great! No overdue tasks.'}
            {filter === 'all' && 'Create your first task to get started.'}
          </p>
          <div className="flex justify-center gap-4">
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                style={{
                  background: 'transparent',
                  color: 'var(--color-stone)',
                  border: '1px solid var(--color-border)'
                }}
              >
                View All Tasks
              </button>
            )}
            <button
              onClick={handleAddTask}
              className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(184, 151, 107, 0.3)'
              }}
            >
              Create Your First Task
            </button>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showForm && editingTask && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44, 40, 37, 0.4)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-elevated)'
            }}
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2
                  className="text-2xl"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 500,
                    color: 'var(--color-charcoal)'
                  }}
                >
                  {editingTask.id ? 'Edit Task' : 'Add New Task'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingTask(null);
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--color-mist)' }}
                  aria-label="Close form"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label htmlFor="task-title" className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                    Task Title *
                  </label>
                  <input
                    id="task-title"
                    name="task-title"
                    type="text"
                    value={editingTask.title || ''}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    placeholder="e.g., Review quarterly reports"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="task-description" className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                    Description (Optional)
                  </label>
                  <textarea
                    id="task-description"
                    name="task-description"
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none resize-none"
                    style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    placeholder="Additional details about the task..."
                  />
                </div>

                {/* Duration and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="task-duration" className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Estimated Duration (min)
                    </label>
                    <input
                      id="task-duration"
                      name="task-duration"
                      type="number"
                      min="5"
                      max="480"
                      value={editingTask.estimatedDuration || 30}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="task-category" className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Category
                    </label>
                    <select
                      id="task-category"
                      name="task-category"
                      value={editingTask.category || 'life'}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, category: e.target.value as Task['category'] }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    >
                      <option value="life">Life</option>
                      <option value="admin">Admin</option>
                      <option value="learning">Learning</option>
                      <option value="creative">Creative</option>
                      <option value="work">Work</option>
                      <option value="health">Health</option>
                    </select>
                  </div>
                </div>

                {/* Priority, Energy, Time Window */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="task-priority" className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Priority
                    </label>
                    <select
                      id="task-priority"
                      name="task-priority"
                      value={editingTask.priority || 3}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, priority: parseInt(e.target.value) as Task['priority'] }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    >
                      <option value={1}>1 - Low</option>
                      <option value={2}>2 - Medium-Low</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4 - High</option>
                      <option value={5}>5 - Critical</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="task-energy" className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Energy Level
                    </label>
                    <select
                      id="task-energy"
                      name="task-energy"
                      value={editingTask.energyLevel || 'medium'}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, energyLevel: e.target.value as Task['energyLevel'] }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="task-time-preference" className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Time Preference
                    </label>
                    <select
                      id="task-time-preference"
                      name="task-time-preference"
                      value={editingTask.timeWindowPreference || ''}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, timeWindowPreference: e.target.value as Task['timeWindowPreference'] || undefined }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    >
                      <option value="">No preference</option>
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label htmlFor="task-due-date" className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                    Due Date (Optional)
                  </label>
                  <input
                    id="task-due-date"
                    name="task-due-date"
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, dueDate: e.target.value || undefined }))}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                  />
                </div>

                {/* Splitting Options */}
                <div
                  className="pt-6"
                  style={{ borderTop: '1px solid var(--color-border-light)' }}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="splittable"
                      name="splittable"
                      checked={editingTask.isSplittable || false}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, isSplittable: e.target.checked }))}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--color-gold)' }}
                    />
                    <label
                      htmlFor="splittable"
                      className="text-sm"
                      style={{ color: 'var(--color-stone)' }}
                    >
                      Task can be split into smaller chunks
                    </label>
                  </div>

                  {editingTask.isSplittable && (
                    <div className="mt-4 ml-7">
                      <label htmlFor="task-chunk-size" className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                        Chunk Size (minutes)
                      </label>
                      <input
                        id="task-chunk-size"
                        name="task-chunk-size"
                        type="number"
                        min="5"
                        max="60"
                        value={editingTask.chunkSize || 25}
                        onChange={(e) => setEditingTask(prev => ({ ...prev, chunkSize: parseInt(e.target.value) }))}
                        className="w-32 px-4 py-3 rounded-lg text-sm focus:outline-none"
                        style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div
                className="flex justify-end gap-3 mt-8 pt-6"
                style={{ borderTop: '1px solid var(--color-border-light)' }}
              >
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingTask(null);
                  }}
                  className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                  style={{
                    background: 'transparent',
                    color: 'var(--color-stone)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                  style={{
                    background: isSaving
                      ? 'var(--color-ivory)'
                      : 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                    color: isSaving ? 'var(--color-mist)' : 'white',
                    boxShadow: isSaving ? 'none' : '0 2px 8px rgba(184, 151, 107, 0.3)'
                  }}
                >
                  {isSaving ? 'Saving...' : (editingTask.id ? 'Update' : 'Create') + ' Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}