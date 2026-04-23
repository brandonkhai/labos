import React, { useState, useMemo } from 'react';
import {
  CheckSquare, Square, Trash2, Plus, Loader2, CalendarDays, Flag,
} from 'lucide-react';
import { useLab, XP } from '@/src/lib/context';
import { cn } from '@/src/lib/utils';

type Filter = 'active' | 'done' | 'all';

export function TodoPage() {
  const { todos, addTodo, completeTodo, uncompleteTodo, deleteTodo, awardXP } = useLab();

  const [newText, setNewText] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'high'>('normal');
  const [filter, setFilter] = useState<Filter>('active');
  const [saving, setSaving] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setSaving(true);
    try {
      addTodo({
        text: newText.trim(),
        dueDate: newDueDate || undefined,
        priority: newPriority,
      });
      setNewText('');
      setNewDueDate('');
      setNewPriority('normal');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = (id: string, done: boolean) => {
    if (done) {
      uncompleteTodo(id);
    } else {
      completeTodo(id);
      awardXP(XP.TODO);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.done);
    if (filter === 'done') return todos.filter((t) => t.done);
    return todos;
  }, [todos, filter]);

  const activeCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;

  const today = new Date().toISOString().slice(0, 10);

  function dueDateLabel(date?: string): { label: string; overdue: boolean } | null {
    if (!date) return null;
    const overdue = date < today;
    const d = new Date(date + 'T00:00:00');
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { label, overdue };
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-900 text-slate-900 dark:text-slate-100">Tasks</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {activeCount} remaining
          {doneCount > 0 && <span className="ml-1 text-brand-600 font-medium">· {doneCount} completed</span>}
        </p>
      </div>

      {/* Add task form */}
      <form
        onSubmit={handleAdd}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add a new task…"
            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={!newText.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Due date */}
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Due:</span>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </label>
          {/* Priority */}
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Flag className="w-3.5 h-3.5" />
            <span>Priority:</span>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as 'normal' | 'high')}
              className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
      </form>

      {/* Filter tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 w-fit">
        {(['active', 'done', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize',
              filter === f
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            )}
          >
            {f === 'active' ? `Active (${activeCount})` : f === 'done' ? `Done (${doneCount})` : 'All'}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            {filter === 'active' ? (
              <>
                <p className="text-4xl mb-3">✅</p>
                <p className="font-display font-800 text-lg text-slate-700 dark:text-slate-300 mb-1">
                  All clear!
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add a task above to get started.
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Nothing here yet.</p>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((todo) => {
              const due = dueDateLabel(todo.dueDate);
              return (
                <li
                  key={todo.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 group transition-colors',
                    todo.done
                      ? 'bg-slate-50/50 dark:bg-slate-800/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleComplete(todo.id, todo.done)}
                    className={cn(
                      'mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                      todo.done
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : todo.priority === 'high'
                          ? 'border-red-400 hover:border-brand-500'
                          : 'border-slate-300 dark:border-slate-600 hover:border-brand-500',
                    )}
                    title={todo.done ? 'Mark as active' : 'Complete'}
                  >
                    {todo.done && <CheckSquare className="w-3 h-3" />}
                    {!todo.done && <Square className="w-3 h-3 opacity-0 group-hover:opacity-30" />}
                  </button>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm leading-snug',
                      todo.done
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : todo.priority === 'high'
                          ? 'text-slate-900 dark:text-slate-100 font-medium'
                          : 'text-slate-800 dark:text-slate-200',
                    )}>
                      {todo.priority === 'high' && !todo.done && (
                        <span className="inline-flex items-center mr-1.5">
                          <Flag className="w-3 h-3 text-red-400 inline" />
                        </span>
                      )}
                      {todo.text}
                    </p>
                    {due && (
                      <p className={cn(
                        'text-xs mt-0.5 flex items-center gap-1',
                        due.overdue && !todo.done
                          ? 'text-red-500'
                          : 'text-slate-400 dark:text-slate-500',
                      )}>
                        <CalendarDays className="w-3 h-3" />
                        {due.overdue && !todo.done ? 'Overdue · ' : ''}{due.label}
                      </p>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="shrink-0 p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Completions encouragement */}
      {doneCount >= 3 && filter !== 'done' && (
        <div className="bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <p className="text-sm text-brand-700 dark:text-brand-300 font-medium">
            You've completed {doneCount} tasks — great momentum!
          </p>
        </div>
      )}
    </div>
  );
}
