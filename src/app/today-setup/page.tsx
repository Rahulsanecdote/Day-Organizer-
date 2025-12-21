'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DatabaseService } from '@/lib/database';
import { parseTextInput } from '@/lib/scheduling-engine';
import { DailyInput, FixedEvent, UserPreferences } from '@/types';

export default function TodaySetupPage() {
  const [dailyInput, setDailyInput] = useState<DailyInput>({
    date: format(new Date(), 'yyyy-MM-dd'),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sleep: {
      start: '23:30',
      end: '07:30',
    },
    fixedEvents: [],
    constraints: {
      buffersBetweenBlocksMin: 10,
      protectDowntimeMin: 30,
    },
  });

  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState<'form' | 'text'>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<FixedEvent, 'title' | 'start' | 'end'>>({
    type: 'work',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const prefs = await DatabaseService.getPreferences();
    if (prefs) {
      setPreferences(prefs);
      setDailyInput(prev => ({
        ...prev,
        sleep: {
          start: prefs.defaultSleepStart,
          end: prefs.defaultSleepEnd,
        },
        constraints: {
          buffersBetweenBlocksMin: prefs.defaultBuffers,
          protectDowntimeMin: prefs.defaultDowntimeProtection,
        },
      }));
    }

    // Load existing daily input for today
    const existingInput = await DatabaseService.getDailyInput(
      dailyInput.date,
      dailyInput.timezone
    );
    if (existingInput) {
      setDailyInput(existingInput);
    }
  };

  const handleAddEvent = () => {
    const title = prompt('Event title:');
    if (!title) return;

    const startTime = prompt('Start time (HH:MM):');
    const endTime = prompt('End time (HH:MM):');
    
    if (!startTime || !endTime) return;

    const event: FixedEvent = {
      title,
      start: startTime,
      end: endTime,
      type: newEvent.type,
    };

    setDailyInput(prev => ({
      ...prev,
      fixedEvents: [...prev.fixedEvents, event],
    }));
  };

  const handleParseText = () => {
    const parsed = parseTextInput(textInput);
    const newEvents: FixedEvent[] = parsed.items.map(item => ({
      title: item.title,
      start: item.start,
      end: item.end,
      type: item.type as FixedEvent['type'],
    }));

    setDailyInput(prev => ({
      ...prev,
      fixedEvents: [...prev.fixedEvents, ...newEvents],
    }));

    setTextInput('');
    alert(`Parsed ${newEvents.length} events. ${parsed.unparsedText ? `Could not parse: ${parsed.unparsedText}` : 'All text parsed successfully!'}`);
  };

  const handleRemoveEvent = (index: number) => {
    setDailyInput(prev => ({
      ...prev,
      fixedEvents: prev.fixedEvents.filter((_, i) => i !== index),
    }));
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    
    try {
      // Save daily input
      await DatabaseService.saveDailyInput(dailyInput);
      
      // Generate and save plan
      const habits = await DatabaseService.getAllHabits();
      const tasks = await DatabaseService.getAllTasks();
      
      if (preferences) {
        const { SchedulingEngine } = await import('@/lib/scheduling-engine');
        const scheduler = new SchedulingEngine(
          dailyInput,
          habits,
          tasks,
          preferences.gymSettings,
          preferences
        );
        const plan = scheduler.generatePlan();
        await DatabaseService.savePlan(plan);
        
        // Redirect to plan page
        window.location.href = '/plan';
      }
    } catch (error) {
      console.error('Failed to generate plan:', error);
      alert('Failed to generate plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSleepChange = (field: 'start' | 'end', value: string) => {
    setDailyInput(prev => ({
      ...prev,
      sleep: {
        ...prev.sleep,
        [field]: value,
      },
    }));
  };

  const handleConstraintChange = (field: keyof DailyInput['constraints'], value: number) => {
    setDailyInput(prev => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        [field]: value,
      },
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Today's Setup</h1>
        <p className="text-gray-600">
          Enter your work schedule and commitments to generate an optimized daily plan.
        </p>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={dailyInput.date}
              onChange={(e) => setDailyInput(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <input
              type="text"
              value={dailyInput.timezone}
              onChange={(e) => setDailyInput(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Sleep Schedule */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sleep Schedule</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sleep Time
            </label>
            <input
              type="time"
              value={dailyInput.sleep.start}
              onChange={(e) => handleSleepChange('start', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wake Time
            </label>
            <input
              type="time"
              value={dailyInput.sleep.end}
              onChange={(e) => handleSleepChange('end', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Constraints */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Planning Constraints</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buffer Between Blocks (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="30"
              value={dailyInput.constraints.buffersBetweenBlocksMin}
              onChange={(e) => handleConstraintChange('buffersBetweenBlocksMin', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Protect Downtime (minutes)
            </label>
            <input
              type="number"
              min="0"
              max="120"
              value={dailyInput.constraints.protectDowntimeMin}
              onChange={(e) => handleConstraintChange('protectDowntimeMin', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Fixed Events */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Fixed Events & Commitments</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setInputMode('form')}
              className={`px-3 py-1 text-sm rounded ${
                inputMode === 'form'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Form
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`px-3 py-1 text-sm rounded ${
                inputMode === 'text'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Text
            </button>
          </div>
        </div>

        {inputMode === 'form' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value as FixedEvent['type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="work">Work</option>
                  <option value="meal">Meal</option>
                  <option value="appointment">Appointment</option>
                  <option value="call">Call</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="md:col-span-3">
                <button
                  onClick={handleAddEvent}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste Schedule Text
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Work 9:30am-6pm; Lunch 12-1; Dinner 7-8"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Format: "Event HH:MM-HH:MM" or "Event HH:MMam-HH:MMpm"
              </p>
            </div>
            <button
              onClick={handleParseText}
              disabled={!textInput.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-300"
            >
              Parse Text
            </button>
          </div>
        )}

        {/* Events List */}
        {dailyInput.fixedEvents.length > 0 && (
          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-900 mb-3">Scheduled Events</h3>
            <div className="space-y-2">
              {dailyInput.fixedEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{event.title}</span>
                      <span className="text-sm text-gray-500 px-2 py-1 bg-white rounded">
                        {event.type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {event.start} - {event.end}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveEvent(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate Plan Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className="w-full px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Plan...
            </span>
          ) : (
            'Generate Optimized Plan'
          )}
        </button>
      </div>
    </div>
  );
}