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
      await DatabaseService.saveDailyInput(dailyInput);

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

  const getEventIcon = (type: string) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'work':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
          </svg>
        );
      case 'meal':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-.75A2.25 2.25 0 0 0 6.75 6H6A2.25 2.25 0 0 1 3.75 3.75v-.75" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div
        className="rounded-xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <h1
          className="text-3xl mb-2"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-charcoal)'
          }}
        >
          Today's Setup
        </h1>
        <p style={{ color: 'var(--color-slate)', lineHeight: 1.6 }}>
          Enter your work schedule and commitments to generate an optimized daily plan.
        </p>
      </div>

      {/* Basic Info */}
      <div
        className="rounded-xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <h2
          className="text-lg mb-6"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-charcoal)'
          }}
        >
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-mist)' }}
            >
              Date
            </label>
            <input
              type="date"
              value={dailyInput.date}
              onChange={(e) => setDailyInput(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-charcoal)'
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-mist)' }}
            >
              Timezone
            </label>
            <input
              type="text"
              value={dailyInput.timezone}
              onChange={(e) => setDailyInput(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-charcoal)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Sleep Schedule */}
      <div
        className="rounded-xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <span style={{ color: 'var(--color-sleep)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          </span>
          <h2
            className="text-lg"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              color: 'var(--color-charcoal)'
            }}
          >
            Sleep Schedule
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-mist)' }}
            >
              Bedtime
            </label>
            <input
              type="time"
              value={dailyInput.sleep.start}
              onChange={(e) => handleSleepChange('start', e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-charcoal)'
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-mist)' }}
            >
              Wake Time
            </label>
            <input
              type="time"
              value={dailyInput.sleep.end}
              onChange={(e) => handleSleepChange('end', e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-charcoal)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Constraints */}
      <div
        className="rounded-xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <span style={{ color: 'var(--color-gold)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
          </span>
          <h2
            className="text-lg"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              color: 'var(--color-charcoal)'
            }}
          >
            Planning Constraints
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-mist)' }}
            >
              Buffer Between Blocks (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="30"
              value={dailyInput.constraints.buffersBetweenBlocksMin}
              onChange={(e) => handleConstraintChange('buffersBetweenBlocksMin', parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-charcoal)'
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-mist)' }}
            >
              Protect Downtime (minutes)
            </label>
            <input
              type="number"
              min="0"
              max="120"
              value={dailyInput.constraints.protectDowntimeMin}
              onChange={(e) => handleConstraintChange('protectDowntimeMin', parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-charcoal)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Fixed Events */}
      <div
        className="rounded-xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span style={{ color: 'var(--color-work)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </span>
            <h2
              className="text-lg"
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 500,
                color: 'var(--color-charcoal)'
              }}
            >
              Fixed Events & Commitments
            </h2>
          </div>
          <div className="flex gap-2">
            {['form', 'text'].map((mode) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode as 'form' | 'text')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: inputMode === mode ? 'var(--color-ivory)' : 'transparent',
                  color: inputMode === mode ? 'var(--color-charcoal)' : 'var(--color-mist)',
                  border: `1px solid ${inputMode === mode ? 'var(--color-gold-light)' : 'transparent'}`
                }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {inputMode === 'form' ? (
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label
                  className="block text-xs uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-mist)' }}
                >
                  Event Type
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value as FixedEvent['type'] }))}
                  className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-charcoal)'
                  }}
                >
                  <option value="work">Work</option>
                  <option value="meal">Meal</option>
                  <option value="appointment">Appointment</option>
                  <option value="call">Call</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                onClick={handleAddEvent}
                className="px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(184, 151, 107, 0.3)'
                }}
              >
                Add Event
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-mist)' }}
              >
                Paste Schedule Text
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Work 9:30am-6pm; Lunch 12-1; Dinner 7-8"
                rows={4}
                className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-all duration-200 resize-none"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-charcoal)'
                }}
              />
              <p
                className="text-xs mt-2"
                style={{ color: 'var(--color-mist)' }}
              >
                Format: "Event HH:MM-HH:MM" or "Event HH:MMam-HH:MMpm"
              </p>
            </div>
            <button
              onClick={handleParseText}
              disabled={!textInput.trim()}
              className="px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                background: textInput.trim()
                  ? 'linear-gradient(135deg, var(--color-gym) 0%, rgba(139, 159, 130, 0.9) 100%)'
                  : 'var(--color-ivory)',
                color: textInput.trim() ? 'white' : 'var(--color-mist)',
                boxShadow: textInput.trim() ? '0 2px 8px rgba(139, 159, 130, 0.3)' : 'none'
              }}
            >
              Parse Text
            </button>
          </div>
        )}

        {/* Events List */}
        {dailyInput.fixedEvents.length > 0 && (
          <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--color-border-light)' }}>
            <h3
              className="text-sm uppercase tracking-wider mb-4"
              style={{ color: 'var(--color-mist)' }}
            >
              Scheduled Events
            </h3>
            <div className="space-y-3">
              {dailyInput.fixedEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg transition-all duration-200"
                  style={{
                    background: 'var(--color-ivory)',
                    border: '1px solid var(--color-border-light)'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span style={{ color: 'var(--color-stone)' }}>
                      {getEventIcon(event.type)}
                    </span>
                    <div>
                      <span
                        className="font-medium"
                        style={{ color: 'var(--color-charcoal)' }}
                      >
                        {event.title}
                      </span>
                      <span
                        className="ml-3 text-xs px-2 py-1 rounded-full"
                        style={{
                          background: 'var(--color-surface)',
                          color: 'var(--color-slate)',
                          border: '1px solid var(--color-border-light)'
                        }}
                      >
                        {event.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className="text-sm"
                      style={{ color: 'var(--color-slate)' }}
                    >
                      {event.start} – {event.end}
                    </span>
                    <button
                      onClick={() => handleRemoveEvent(index)}
                      className="p-2 rounded-lg transition-all duration-200"
                      style={{ color: 'var(--color-mist)' }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate Plan Button */}
      <div
        className="rounded-xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <button
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className="w-full py-4 rounded-xl font-medium text-lg transition-all duration-300"
          style={{
            background: isGenerating
              ? 'var(--color-ivory)'
              : 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
            color: isGenerating ? 'var(--color-mist)' : 'white',
            boxShadow: isGenerating ? 'none' : '0 4px 16px rgba(184, 151, 107, 0.4)',
            letterSpacing: '0.02em'
          }}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Your Plan...
            </span>
          ) : (
            'Generate Optimized Plan'
          )}
        </button>
      </div>
    </div>
  );
}