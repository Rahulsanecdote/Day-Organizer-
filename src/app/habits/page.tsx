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
      category: 'personal',
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
      category: editingHabit.category || 'personal',
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
        return `Specific days: ${habit.specificDays?.map(d => days[d]).join(', ')}`;
      case 'x-times-per-week':
        return `${habit.timesPerWeek}x per week`;
      default:
        return habit.frequency;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-600';
      case 2: return 'text-orange-600';
      case 3: return 'text-yellow-600';
      case 4: return 'text-blue-600';
      case 5: return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: Habit['category']) => {
    switch (category) {
      case 'health': return '🏃‍♂️';
      case 'learning': return '📚';
      case 'personal': return '🧘‍♂️';
      case 'work': return '💼';
      case 'creative': return '🎨';
      case 'social': return '👥';
      default: return '⭐';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Habit Library</h1>
            <p className="text-gray-600">
              Manage your habits that will be automatically scheduled into your daily plans.
            </p>
          </div>
          <button
            onClick={handleAddHabit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Habit
          </button>
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
              habit.isActive 
                ? 'border-green-400' 
                : 'border-gray-300 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getCategoryIcon(habit.category)}</span>
                <h3 className="text-lg font-semibold text-gray-900">{habit.name}</h3>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleToggleActive(habit)}
                  className={`p-1 rounded ${
                    habit.isActive 
                      ? 'text-green-600 hover:text-green-800' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={habit.isActive ? 'Deactivate' : 'Activate'}
                >
                  {habit.isActive ? '✅' : '⭕'}
                </button>
                <button
                  onClick={() => handleEditHabit(habit)}
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteHabit(habit)}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{habit.duration} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frequency:</span>
                <span className="font-medium">{getFrequencyText(habit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Priority:</span>
                <span className={`font-medium ${getPriorityColor(habit.priority)}`}>
                  {'★'.repeat(habit.priority)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time Preference:</span>
                <span className="font-medium capitalize">
                  {habit.preferredTimeWindow || 'Flexible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Energy Level:</span>
                <span className="font-medium capitalize">{habit.energyLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Flexibility:</span>
                <span className="font-medium capitalize">{habit.flexibility}</span>
              </div>
              {habit.minimumViableDuration && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Min Duration:</span>
                  <span className="font-medium">{habit.minimumViableDuration} min</span>
                </div>
              )}
              {habit.cooldownDays && habit.cooldownDays > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Cooldown:</span>
                  <span className="font-medium">{habit.cooldownDays} days</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {habits.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🔄</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No habits yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first habit to start building your daily routine.
          </p>
          <button
            onClick={handleAddHabit}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Your First Habit
          </button>
        </div>
      )}

      {/* Habit Form Modal */}
      {showForm && editingHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingHabit.id ? 'Edit Habit' : 'Add New Habit'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setEditingHabit(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Habit Name *
                    </label>
                    <input
                      type="text"
                      value={editingHabit.name || ''}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Morning Meditation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={editingHabit.category || 'personal'}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, category: e.target.value as Habit['category'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="health">Health</option>
                      <option value="learning">Learning</option>
                      <option value="personal">Personal</option>
                      <option value="work">Work</option>
                      <option value="creative">Creative</option>
                      <option value="social">Social</option>
                    </select>
                  </div>
                </div>

                {/* Duration and Frequency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="240"
                      value={editingHabit.duration || 30}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Viable Duration
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={editingHabit.minimumViableDuration || ''}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, minimumViableDuration: parseInt(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={editingHabit.frequency || 'daily'}
                    onChange={(e) => setEditingHabit(prev => ({ ...prev, frequency: e.target.value as Habit['frequency'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="specific-days">Specific Days</option>
                    <option value="x-times-per-week">X Times Per Week</option>
                  </select>

                  {editingHabit.frequency === 'specific-days' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            className={`px-3 py-1 rounded-full text-sm ${
                              editingHabit.specificDays?.includes(index)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {editingHabit.frequency === 'x-times-per-week' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Times Per Week
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="7"
                        value={editingHabit.timesPerWeek || 3}
                        onChange={(e) => setEditingHabit(prev => ({ ...prev, timesPerWeek: parseInt(e.target.value) }))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Time Preferences */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Time Window
                    </label>
                    <select
                      value={editingHabit.preferredTimeWindow || ''}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, preferredTimeWindow: e.target.value as Habit['preferredTimeWindow'] || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Flexible</option>
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                      <option value="explicit">Specific Time</option>
                    </select>
                  </div>

                  {editingHabit.preferredTimeWindow === 'explicit' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={editingHabit.explicitStartTime || ''}
                          onChange={(e) => setEditingHabit(prev => ({ ...prev, explicitStartTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={editingHabit.explicitEndTime || ''}
                          onChange={(e) => setEditingHabit(prev => ({ ...prev, explicitEndTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority and Energy */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority (1-5)
                    </label>
                    <select
                      value={editingHabit.priority || 3}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, priority: parseInt(e.target.value) as Habit['priority'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1 - Low</option>
                      <option value={2}>2 - Medium-Low</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4 - High</option>
                      <option value={5}>5 - Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Energy Level
                    </label>
                    <select
                      value={editingHabit.energyLevel || 'medium'}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, energyLevel: e.target.value as Habit['energyLevel'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flexibility
                    </label>
                    <select
                      value={editingHabit.flexibility || 'flexible'}
                      onChange={(e) => setEditingHabit(prev => ({ ...prev, flexibility: e.target.value as Habit['flexibility'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="semi-flex">Semi-flexible</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                </div>

                {/* Cooldown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cooldown Days (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={editingHabit.cooldownDays || ''}
                    onChange={(e) => setEditingHabit(prev => ({ ...prev, cooldownDays: parseInt(e.target.value) || undefined }))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Days to wait between occurrences (e.g., 1 for gym every other day)
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setEditingHabit(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveHabit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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