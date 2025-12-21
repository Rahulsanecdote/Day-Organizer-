'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DatabaseService } from '@/lib/database';
import { Task } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('active');

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, filter]);

  const loadTasks = async () => {
    const allTasks = await DatabaseService.getAllTasks();
    setTasks(allTasks);
  };

  const filterTasks = () => {
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
    setIsEditing(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask({ ...task });
    setShowForm(true);
    setIsEditing(true);
  };

  const handleSaveTask = async () => {
    if (!editingTask || !editingTask.title?.trim()) {
      alert('Task title is required');
      return;
    }

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

    await DatabaseService.saveTask(task);
    await loadTasks();
    
    setShowForm(false);
    setIsEditing(false);
    setEditingTask(null);
  };

  const handleDeleteTask = async (task: Task) => {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      await DatabaseService.deleteTask(task.id);
      await loadTasks();
    }
  };

  const handleToggleComplete = async (task: Task) => {
    await DatabaseService.completeTask(task.id);
    await loadTasks();
  };

  const handleToggleActive = async (task: Task) => {
    await DatabaseService.saveTask({
      ...task,
      isActive: !task.isActive,
      updatedAt: new Date().toISOString(),
    });
    await loadTasks();
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-600 bg-red-50';
      case 2: return 'text-orange-600 bg-orange-50';
      case 3: return 'text-yellow-600 bg-yellow-50';
      case 4: return 'text-blue-600 bg-blue-50';
      case 5: return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: Task['category']) => {
    switch (category) {
      case 'life': return '🏠';
      case 'admin': return '📋';
      case 'learning': return '📚';
      case 'creative': return '🎨';
      case 'work': return '💼';
      case 'health': return '🏃‍♂️';
      default: return '📄';
    }
  };

  const getStatusBadge = (task: Task) => {
    if (task.isCompleted) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>;
    }
    
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 0) {
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
      } else if (daysDiff === 0) {
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Due Today</span>;
      } else if (daysDiff === 1) {
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Due Tomorrow</span>;
      } else if (daysDiff <= 7) {
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Due in {daysDiff} days</span>;
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Library</h1>
            <p className="text-gray-600">
              Manage your tasks that will be automatically scheduled into your daily plans.
            </p>
          </div>
          <button
            onClick={handleAddTask}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4">
          {[
            { key: 'active', label: 'Active', count: tasks.filter(t => t.isActive && !t.isCompleted).length },
            { key: 'completed', label: 'Completed', count: tasks.filter(t => t.isCompleted).length },
            { key: 'overdue', label: 'Overdue', count: tasks.filter(t => {
              const today = new Date();
              return t.isActive && !t.isCompleted && t.dueDate && new Date(t.dueDate) < today;
            }).length },
            { key: 'all', label: 'All', count: tasks.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
              task.isCompleted 
                ? 'border-green-400 opacity-75' 
                : task.isActive 
                  ? 'border-blue-400' 
                  : 'border-gray-300 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-xl">{getCategoryIcon(task.category)}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                  {getStatusBadge(task)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    Priority {task.priority}
                  </span>
                </div>
                
                {task.description && (
                  <p className="text-gray-600 mb-3">{task.description}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span>📏 {task.estimatedDuration} min</span>
                  <span>⚡ {task.energyLevel} energy</span>
                  {task.timeWindowPreference && (
                    <span>🕐 {task.timeWindowPreference}</span>
                  )}
                  {task.isSplittable && (
                    <span>🔀 Splittable ({task.chunkSize}min chunks)</span>
                  )}
                  {task.dueDate && (
                    <span className={new Date(task.dueDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                      📅 {formatDueDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleToggleComplete(task)}
                  className={`p-2 rounded ${
                    task.isCompleted 
                      ? 'text-green-600 hover:text-green-800' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {task.isCompleted ? '✅' : '⭕'}
                </button>
                <button
                  onClick={() => handleToggleActive(task)}
                  className={`p-2 rounded ${
                    task.isActive 
                      ? 'text-blue-600 hover:text-blue-800' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={task.isActive ? 'Deactivate' : 'Activate'}
                >
                  {task.isActive ? '👁️' : '🙈'}
                </button>
                <button
                  onClick={() => handleEditTask(task)}
                  className="p-2 text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteTask(task)}
                  className="p-2 text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filter === 'active' && 'No active tasks'}
            {filter === 'completed' && 'No completed tasks'}
            {filter === 'overdue' && 'No overdue tasks'}
            {filter === 'all' && 'No tasks yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'active' && 'All your tasks are completed or inactive.'}
            {filter === 'completed' && 'Complete some tasks to see them here.'}
            {filter === 'overdue' && 'Great! No overdue tasks.'}
            {filter === 'all' && 'Create your first task to get started.'}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 mr-4"
            >
              View All Tasks
            </button>
          )}
          <button
            onClick={handleAddTask}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Your First Task
          </button>
        </div>
      )}

      {/* Task Form Modal */}
      {showForm && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTask.id ? 'Edit Task' : 'Add New Task'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setEditingTask(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={editingTask.title || ''}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Review quarterly reports"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional details about the task..."
                  />
                </div>

                {/* Duration and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={editingTask.estimatedDuration || 30}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={editingTask.category || 'life'}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, category: e.target.value as Task['category'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                {/* Priority and Energy */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority (1-5)
                    </label>
                    <select
                      value={editingTask.priority || 3}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, priority: parseInt(e.target.value) as Task['priority'] }))}
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
                      value={editingTask.energyLevel || 'medium'}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, energyLevel: e.target.value as Task['energyLevel'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Window Preference
                    </label>
                    <select
                      value={editingTask.timeWindowPreference || ''}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, timeWindowPreference: e.target.value as Task['timeWindowPreference'] || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, dueDate: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Splitting Options */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="splittable"
                      checked={editingTask.isSplittable || false}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, isSplittable: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="splittable" className="text-sm font-medium text-gray-700">
                      Task can be split into smaller chunks
                    </label>
                  </div>
                  
                  {editingTask.isSplittable && (
                    <div className="mt-3 ml-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chunk Size (minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={editingTask.chunkSize || 25}
                        onChange={(e) => setEditingTask(prev => ({ ...prev, chunkSize: parseInt(e.target.value) }))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {editingTask.id ? 'Update' : 'Create'} Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}