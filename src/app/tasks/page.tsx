// src/app/tasks/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { CheckCircle2, Circle, Plus, User, Calendar, Loader2 } from 'lucide-react';

// Define types for our data for type safety
interface Task {
  id: number;
  title: string;
  description: string | null;
  is_complete: boolean;
  assigned_to: string | null;
  completed_at: string | null;
  profiles: { full_name: string } | null; // Supabase returns single object for FK
}

interface Profile {
  id: string;
  full_name: string;
}

interface UserProfile {
  id: string;
  role: string;
}

export default function TasksPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the "New Task" form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all necessary data on component mount
  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single();
      if (profileError) console.error('Error fetching user profile:', profileError);
      else setUserProfile(profileData);
    }

    // Get today's date at start of day (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        is_complete,
        assigned_to,
        completed_at,
        profiles:assigned_to ( full_name )
      `)
      .order('created_at', { ascending: false });

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name');

    if (taskError || profilesError) {
      setError('Failed to fetch data.');
      console.log(taskError || profilesError);
    } else {
      console.log('Raw task data from Supabase:', taskData);
      console.log('First task profiles:', taskData?.[0]?.profiles);
      setTasks((taskData as unknown as Task[]) || []);
      setProfiles(profilesData || []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('tasks').insert({
      title: newTaskTitle,
      description: newTaskDesc,
      assigned_to: newTaskAssignee || null,
      created_by: user.id
    });

    setIsSubmitting(false);

    if (error) {
      alert(`Error creating task: ${error.message}`);
    } else {
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      fetchData();
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_complete: !task.is_complete })
      .eq('id', task.id);

    if (error) {
      alert(`Error updating task: ${error.message}`);
    } else {
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const incompleteTasks = tasks.filter(t => !t.is_complete);
  // Filter completed tasks to only show those completed today (last 24 hours)
  const completedTasks = tasks.filter(t => {
    if (!t.is_complete) return false;
    if (!t.completed_at) return true; // Show old completed tasks without timestamp
    const completedDate = new Date(t.completed_at);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return completedDate >= twentyFourHoursAgo;
  });

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Header */}
      <div className="sticky top-0 bg-background z-10 pt-6 pb-4 px-4 md:px-8 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-sm text-gray-500 hover:text-foreground transition-colors">
              ← Back
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
              <p className="text-sm text-gray-500">View and manage daily duties</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Tasks List */}
          <div className="lg:col-span-2 space-y-6">

            {/* Incomplete Tasks */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Circle size={18} className="text-primary" />
                  Active Tasks
                </h2>
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                  {incompleteTasks.length}
                </span>
              </div>
              <div className="divide-y divide-border">
                {incompleteTasks.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Circle size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No active tasks</p>
                    <p className="text-sm mt-1">All caught up! 🎉</p>
                  </div>
                ) : (
                  incompleteTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className="mt-0.5 text-gray-400 hover:text-primary transition-colors"
                        >
                          <Circle size={20} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <User size={12} />
                            <span>{task.profiles?.full_name || 'Unassigned'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-600" />
                    Completed Today
                  </h2>
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                    {completedTasks.length}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {completedTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 hover:bg-gray-50 transition-colors opacity-60"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className="mt-0.5 text-green-600 hover:text-primary transition-colors"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground line-through">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1 line-through">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <User size={12} />
                            <span>{task.profiles?.full_name || 'Unassigned'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Create Task Form (Manager Only) */}
          {userProfile?.role?.toLowerCase() === 'manager' && (
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden h-fit sticky top-24">
              <div className="bg-gray-50 px-6 py-3 border-b border-border">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Plus size={18} />
                  Create New Task
                </h2>
              </div>
              <form onSubmit={handleCreateTask} className="p-6 space-y-4">

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                    placeholder="e.g., Morning Temp Check"
                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    rows={3}
                    placeholder="Add details..."
                    className="block w-full px-4 py-3 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="assignee" className="block text-sm font-medium text-foreground mb-2">
                    Assign To
                  </label>
                  <select
                    id="assignee"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-base"
                  >
                    <option value="">Unassigned</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Create Task
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}