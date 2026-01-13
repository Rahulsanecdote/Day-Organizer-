'use client';

import { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database';
import { Habit } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Partial<Habit> | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    const allHabits = await DatabaseService.getAllHabits();
    setHabits(allHabits);
  };

  const handleAddHabit = () => {
    setEditingHabit({
      name: '',
      duration: 30,
      frequency: 'daily',
      priority: 3,
      flexibility: 'flexible',
      energyLevel: 'medium',
      category: 'work',
      isActive: true,
    });
    setShowForm(true);
    setIsEditing(true);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit({ ...habit });
    setShowForm(true);
    setIsEditing(true);
  };

  const handleSaveHabit = async () => {
    if (!editingHabit || !editingHabit.name?.trim()) {
      alert('Habit name is required');
      return;
    }

    const habit: Habit = {
      id: editingHabit.id || uuidv4(),
      name: editingHabit.name.trim(),
      duration: editingHabit.duration || 30,
      frequency: editingHabit.frequency || 'daily',
      specificDays: editingHabit.specificDays,
      timesPerWeek: editingHabit.timesPerWeek,
      preferredTimeWindow: editingHabit.preferredTimeWindow,
      explicitStartTime: editingHabit.explicitStartTime,
      explicitEndTime: editingHabit.explicitEndTime,
      priority: editingHabit.priority || 3,
      flexibility: editingHabit.flexibility || 'flexible',
      minimumViableDuration: editingHabit.minimumViableDuration,
      cooldownDays: editingHabit.cooldownDays,
      energyLevel: editingHabit.energyLevel || 'medium',
      category: editingHabit.category || 'work',
      isActive: editingHabit.isActive ?? true,
      createdAt: editingHabit.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await DatabaseService.saveHabit(habit);
    await loadHabits();

    setShowForm(false);
    setIsEditing(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = async (habit: Habit) => {
    if (confirm(`Are you sure you want to delete "${habit.name}"?`)) {
      await DatabaseService.deleteHabit(habit.id);
      await loadHabits();
    }
  };

  const handleToggleActive = async (habit: Habit) => {
    await DatabaseService.saveHabit({
      ...habit,
      isActive: !habit.isActive,
      updatedAt: new Date().toISOString(),
    });
    await loadHabits();
  };

  const getFrequencyText = (habit: Habit) => {
    switch (habit.frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'specific-days':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${habit.specificDays?.map(d => days[d]).join(', ')}`;
      case 'x-times-per-week':
        return `${habit.timesPerWeek}× weekly`;
      default:
        return habit.frequency;
    }
  };

  const getCategoryStyle = (category: Habit['category']) => {
    const styles: Record<string, { bg: string; color: string; icon: React.ReactElement }> = {
      work: {
        bg: 'rgba(122, 158, 159, 0.1)',
        color: 'var(--color-work)', // Teal
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
          </svg>
        )
      },
      'get-a-job': {
        bg: 'rgba(59, 130, 246, 0.1)',
        color: '#3B82F6', // Blue
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        )
      },
      writing: {
        bg: 'rgba(139, 92, 246, 0.1)',
        color: '#8B5CF6', // Purple
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        )
      },
      painting: {
        bg: 'rgba(236, 72, 153, 0.1)',
        color: '#EC4899', // Pink
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        )
      },
      'vibe-coding': {
        bg: 'rgba(16, 185, 129, 0.1)',
        color: '#10B981', // Emerald/Matrix Green
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        )
      },
      phd: {
        bg: 'rgba(239, 68, 68, 0.1)',
        color: '#EF4444', // Red
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
          </svg>
        )
      },
      o1b: {
        bg: 'rgba(184, 151, 107, 0.1)',
        color: 'var(--color-gold)', // Gold
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        )
      },
      health: {
        bg: 'rgba(34, 197, 94, 0.1)',
        color: '#22C55E', // Green
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        )
      },
      learning: {
        bg: 'rgba(251, 191, 36, 0.1)',
        color: '#FBBF24', // Amber
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        )
      },
    };
    return styles[category] || styles.work;
  };

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
            Habit Library
          </h1>
          <p style={{ color: 'var(--color-slate)', lineHeight: 1.6 }}>
            Manage your habits that will be automatically scheduled into your daily plans.
          </p>
        </div>
        <button
          onClick={handleAddHabit}
          className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(184, 151, 107, 0.3)'
          }}
        >
          Add Habit
        </button>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map((habit) => {
          const categoryStyle = getCategoryStyle(habit.category);
          return (
            <div
              key={habit.id}
              className="rounded-xl p-6 transition-all duration-300"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-soft)',
                opacity: habit.isActive ? 1 : 0.6
              }}
            >
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: categoryStyle.bg, color: categoryStyle.color }}
                  >
                    {categoryStyle.icon}
                  </div>
                  <h3
                    className="font-medium"
                    style={{ color: 'var(--color-charcoal)' }}
                  >
                    {habit.name}
                  </h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleToggleActive(habit)}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      color: habit.isActive ? 'var(--color-gym)' : 'var(--color-mist)'
                    }}
                    title={habit.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {habit.isActive ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleEditHabit(habit)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-mist)' }}
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteHabit(habit)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-mist)' }}
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                className="pt-5 space-y-3 text-sm"
                style={{ borderTop: '1px solid var(--color-border-light)' }}
              >
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-mist)' }}>Duration</span>
                  <span style={{ color: 'var(--color-stone)' }}>{habit.duration} min</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-mist)' }}>Frequency</span>
                  <span style={{ color: 'var(--color-stone)' }}>{getFrequencyText(habit)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-mist)' }}>Priority</span>
                  <span style={{ color: 'var(--color-gold)' }}>
                    {'★'.repeat(habit.priority)}
                    <span style={{ color: 'var(--color-border)' }}>{'★'.repeat(5 - habit.priority)}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-mist)' }}>Energy</span>
                  <span
                    className="capitalize"
                    style={{ color: 'var(--color-stone)' }}
                  >
                    {habit.energyLevel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {habits.length === 0 && (
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
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
            No habits yet
          </h3>
          <p
            className="mb-8"
            style={{ color: 'var(--color-slate)' }}
          >
            Create your first habit to start building your daily routine.
          </p>
          <button
            onClick={handleAddHabit}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(184, 151, 107, 0.3)'
            }}
          >
            Create Your First Habit
          </button>
        </div>
      )}

      {/* Habit Form Modal */}
      {showForm && editingHabit && (
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
                  {editingHabit.id ? 'Edit Habit' : 'Add New Habit'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setEditingHabit(null);
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--color-mist)' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Habit Name *
                    </label>
                    <input
                      type="text"
                      value={editingHabit.name || ''}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                      placeholder="e.g., Morning Meditation"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Category
                    </label>
                    <select
                      value={editingHabit.category || 'work'}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, category: e.target.value as Habit['category'] }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    >
                      <option value="work">Work</option>
                      <option value="get-a-job">Get a Job</option>
                      <option value="writing">Writing</option>
                      <option value="painting">Painting</option>
                      <option value="vibe-coding">Vibe Coding</option>
                      <option value="phd">PHD</option>
                      <option value="o1b">O1B</option>
                      <option value="health">Health</option>
                      <option value="learning">Learning</option>
                    </select>
                  </div>
                </div>

                {/* Duration and Frequency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="240"
                      value={editingHabit.duration || 30}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Frequency
                    </label>
                    <select
                      value={editingHabit.frequency || 'daily'}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, frequency: e.target.value as Habit['frequency'] }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="specific-days">Specific Days</option>
                      <option value="x-times-per-week">X Times Per Week</option>
                    </select>
                  </div>
                </div>

                {editingHabit.frequency === 'specific-days' && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Select Days
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            const currentDays = editingHabit.specificDays || [];
                            const newDays = currentDays.includes(index)
                              ? currentDays.filter(d => d !== index)
                              : [...currentDays, index];
                            setEditingHabit(prev => ({ ...prev, specificDays: newDays }));
                          }}
                          className="px-4 py-2 rounded-full text-sm transition-all duration-200"
                          style={{
                            background: editingHabit.specificDays?.includes(index)
                              ? 'var(--color-gold)'
                              : 'var(--color-ivory)',
                            color: editingHabit.specificDays?.includes(index)
                              ? 'white'
                              : 'var(--color-stone)',
                            border: `1px solid ${editingHabit.specificDays?.includes(index) ? 'var(--color-gold)' : 'var(--color-border)'}`
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {editingHabit.frequency === 'x-times-per-week' && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Times Per Week
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={editingHabit.timesPerWeek || 3}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, timesPerWeek: parseInt(e.target.value) }))}
                      className="w-24 px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    />
                  </div>
                )}

                {/* Priority and Energy */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Priority
                    </label>
                    <select
                      value={editingHabit.priority || 3}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, priority: parseInt(e.target.value) as Habit['priority'] }))}
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
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Energy Level
                    </label>
                    <select
                      value={editingHabit.energyLevel || 'medium'}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, energyLevel: e.target.value as Habit['energyLevel'] }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                      Flexibility
                    </label>
                    <select
                      value={editingHabit.flexibility || 'flexible'}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, flexibility: e.target.value as Habit['flexibility'] }))}
                      className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                      style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                    >
                      <option value="fixed">Fixed</option>
                      <option value="semi-flex">Semi-flexible</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                </div>

                {/* Time Preference */}
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mist)' }}>
                    Preferred Time Window
                  </label>
                  <select
                    value={editingHabit.preferredTimeWindow || ''}
                    onChange={(e) => setEditingHabit(prev => ({ ...prev, preferredTimeWindow: e.target.value as Habit['preferredTimeWindow'] || undefined }))}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-border)', color: 'var(--color-charcoal)' }}
                  >
                    <option value="">Flexible</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="explicit">Specific Time</option>
                  </select>
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
                    setIsEditing(false);
                    setEditingHabit(null);
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
                  onClick={handleSaveHabit}
                  className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(184, 151, 107, 0.3)'
                  }}
                >
                  {editingHabit.id ? 'Update' : 'Create'} Habit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}