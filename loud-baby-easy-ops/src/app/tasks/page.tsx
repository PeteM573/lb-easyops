// src/app/tasks/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

// Define types for our data for type safety
interface Task {
  id: number;
  title: string;
  description: string | null;
  is_complete: boolean;
  assigned_to: string | null;
  // The shape of the joined data remains the same in the final object
  profiles: { full_name: string }[] | null;
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
  const supabase = createClient();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the "New Task" form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string | ''>('');

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

    // THIS IS THE CORRECTED QUERY
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        is_complete,
        assigned_to,
        profiles:assigned_to ( full_name )
      `)
      .order('created_at', { ascending: false });

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name');

    if (taskError || profilesError) {
      setError('Failed to fetch data.');
      console.error(taskError || profilesError);
    } else {
      setTasks(taskData || []);
      setProfiles(profilesData || []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('tasks').insert({
      title: newTaskTitle,
      description: newTaskDesc,
      assigned_to: newTaskAssignee || null,
      created_by: user.id
    });

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
    return <div className="p-8">Loading tasks...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-10">
        <Link href="/" className="text-blue-500 hover:underline mb-4 block">&larr; Back to Dashboard</Link>
        <h1 className="text-4xl font-bold text-gray-800">Task Management</h1>
        <p className="text-lg text-gray-500">View and manage daily duties.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Current Tasks</h2>
          <ul className="divide-y divide-gray-200">
            {tasks.map(task => (
              <li key={task.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className={`font-semibold ${task.is_complete ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                  <p className="text-sm text-gray-600">{task.description}</p>
                  <p className="text-xs text-gray-400">Assigned to: {task.profiles?.[0]?.full_name || 'Unassigned'}</p>
                </div>
                <button
                  onClick={() => handleToggleComplete(task)}
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    task.is_complete
                      ? 'bg-yellow-400 hover:bg-yellow-500 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {userProfile?.role === 'Manager' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" id="title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="description" value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"></textarea>
              </div>
              <div>
                <label htmlFor="assignee" className="block text-sm font-medium text-gray-700">Assign To</label>
                <select id="assignee" value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                  <option value="">Unassigned</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Create Task</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}