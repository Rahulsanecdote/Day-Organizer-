'use client';

import { useState, useEffect } from 'react';
import { format, parse, differenceInMinutes } from 'date-fns';
import { DatabaseService } from '@/lib/database';
import { PlanOutput, ScheduledBlock, UserPreferences } from '@/types';

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanOutput | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    const prefs = await DatabaseService.getPreferences();
    if (prefs) setPreferences(prefs);

    const today = format(new Date(), 'yyyy-MM-dd');
    const existingPlan = await DatabaseService.getPlan(today);
    
    if (existingPlan) {
      setPlan(existingPlan);
    } else {
      // If no plan exists, redirect to today setup
      window.location.href = '/today-setup';
    }
  };

  const handleReoptimize = async () => {
    if (!preferences) return;

    setIsOptimizing(true);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const dailyInput = await DatabaseService.getDailyInput(today, preferences.timezone);
      
      if (!dailyInput) {
        alert('No daily input found. Please set up your day first.');
        return;
      }

      const habits = await DatabaseService.getAllHabits();
      const tasks = await DatabaseService.getAllTasks();
      
      const { SchedulingEngine } = await import('@/lib/scheduling-engine');
      const scheduler = new SchedulingEngine(
        dailyInput,
        habits,
        tasks,
        preferences.gymSettings,
        preferences
      );
      const newPlan = scheduler.generatePlan();
      
      await DatabaseService.savePlan(newPlan);
      setPlan(newPlan);
    } catch (error) {
      console.error('Failed to reoptimize:', error);
      alert('Failed to reoptimize plan. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleToggleCompletion = async (blockId: string) => {
    if (!plan) return;

    const updatedBlocks = plan.blocks.map(block => 
      block.id === blockId 
        ? { ...block, completed: !block.completed }
        : block
    );

    const updatedPlan = { ...plan, blocks: updatedBlocks };
    setPlan(updatedPlan);
    
    // Save updated plan
    await DatabaseService.savePlan(updatedPlan);
  };

  const handleToggleLock = (blockId: string) => {
    if (!plan) return;

    const updatedBlocks = plan.blocks.map(block => 
      block.id === blockId 
        ? { ...block, locked: !block.locked }
        : block
    );

    setPlan({ ...plan, blocks: updatedBlocks });
  };

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlock(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    
    if (!plan || !draggedBlock || draggedBlock === targetBlockId) return;

    const draggedIndex = plan.blocks.findIndex(b => b.id === draggedBlock);
    const targetIndex = plan.blocks.findIndex(b => b.id === targetBlockId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newBlocks = [...plan.blocks];
    const draggedBlock = newBlocks[draggedIndex];
    
    // Remove dragged block and insert at target position
    newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, draggedBlock);
    
    // Update times based on new positions
    const updatedBlocks = updateBlockTimes(newBlocks);
    
    setPlan({ ...plan, blocks: updatedBlocks });
    setDraggedBlock(null);
  };

  const updateBlockTimes = (blocks: ScheduledBlock[]): ScheduledBlock[] => {
    const updatedBlocks = [...blocks];
    let currentTime = parse('06:00', 'HH:mm', new Date());
    
    for (let i = 0; i < updatedBlocks.length; i++) {
      const block = updatedBlocks[i];
      const duration = differenceInMinutes(
        parse(block.end, 'HH:mm', new Date()),
        parse(block.start, 'HH:mm', new Date())
      );
      
      const newStart = format(currentTime, 'HH:mm');
      const newEnd = format(new Date(currentTime.getTime() + duration * 60000), 'HH:mm');
      
      updatedBlocks[i] = {
        ...block,
        start: newStart,
        end: newEnd,
      };
      
      currentTime = new Date(currentTime.getTime() + (duration + 10) * 60000); // 10 min buffer
    }
    
    return updatedBlocks;
  };

  const getBlockColor = (type: ScheduledBlock['type']) => {
    switch (type) {
      case 'work': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'gym': return 'bg-green-100 border-green-300 text-green-800';
      case 'habit': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'task': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'meal': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'break': return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'sleep': return 'bg-indigo-100 border-indigo-300 text-indigo-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getBlockIcon = (type: ScheduledBlock['type']) => {
    switch (type) {
      case 'work': return '💼';
      case 'gym': return '💪';
      case 'habit': return '🔄';
      case 'task': return '✅';
      case 'meal': return '🍽️';
      case 'break': return '☕';
      case 'sleep': return '😴';
      default: return '📅';
    }
  };

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">No plan found for today. Please set up your day first.</p>
          <button
            onClick={() => window.location.href = '/today-setup'}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Set Up Today
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Today's Plan</h1>
            <p className="text-gray-600">{format(new Date(plan.date), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              {showStats ? 'Hide' : 'Show'} Stats
            </button>
            <button
              onClick={handleReoptimize}
              disabled={isOptimizing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isOptimizing ? 'Optimizing...' : 'Re-optimize'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{plan.stats.workHours}h</div>
              <div className="text-sm text-gray-600">Work Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{plan.stats.gymMinutes}m</div>
              <div className="text-sm text-gray-600">Gym Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{plan.stats.habitsCompleted}</div>
              <div className="text-sm text-gray-600">Habits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{plan.stats.tasksCompleted}</div>
              <div className="text-sm text-gray-600">Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{plan.stats.focusBlocks}</div>
              <div className="text-sm text-gray-600">Focus Blocks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{plan.stats.freeTimeRemaining}m</div>
              <div className="text-sm text-gray-600">Free Time</div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Timeline</h2>
        
        <div className="space-y-3">
          {plan.blocks.map((block, index) => (
            <div
              key={block.id}
              draggable={!block.locked}
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, block.id)}
              className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                block.locked 
                  ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
              } ${getBlockColor(block.type)} ${
                block.completed ? 'opacity-75' : ''
              }`}
            >
              {/* Timeline connector */}
              {index < plan.blocks.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-6 bg-gray-300"></div>
              )}
              
              {/* Time */}
              <div className="flex-shrink-0 w-24 text-sm font-mono text-gray-600">
                {block.start}
                <br />
                <span className="text-xs">- {block.end}</span>
              </div>
              
              {/* Block content */}
              <div className="flex-1 ml-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getBlockIcon(block.type)}</span>
                    <div>
                      <h3 className="font-semibold">{block.title}</h3>
                      <p className="text-sm opacity-75">
                        {block.type.charAt(0).toUpperCase() + block.type.slice(1)}
                        {block.energyLevel && ` • ${block.energyLevel} energy`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Lock button */}
                    <button
                      onClick={() => handleToggleLock(block.id)}
                      className={`p-1 rounded ${
                        block.locked 
                          ? 'text-red-600 hover:text-red-800' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={block.locked ? 'Unlock' : 'Lock'}
                    >
                      {block.locked ? '🔒' : '🔓'}
                    </button>
                    
                    {/* Completion checkbox */}
                    <button
                      onClick={() => handleToggleCompletion(block.id)}
                      className={`p-1 rounded ${
                        block.completed 
                          ? 'text-green-600 hover:text-green-800' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={block.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {block.completed ? '✅' : '⭕'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Schedule Explanation</h2>
        <p className="text-gray-700">{plan.explanation}</p>
      </div>

      {/* Unscheduled Items */}
      {plan.unscheduled.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Unscheduled Items</h2>
          <div className="space-y-2">
            {plan.unscheduled.map((item, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-yellow-800">{item.title}</h4>
                    <p className="text-sm text-yellow-700">{item.reason}</p>
                  </div>
                  {item.priority && (
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      Priority {item.priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Day Suggestions */}
      {plan.nextDaySuggestions && plan.nextDaySuggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Suggestions for Tomorrow</h2>
          <ul className="space-y-2">
            {plan.nextDaySuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">💡</span>
                <span className="text-gray-700">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}