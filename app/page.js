'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  Home, Table2, MessageSquare, User, LogIn, Plus, TrendingUp,
  CheckCircle2, Clock, Flame, Sparkles, Edit2, Trash2, 
  Calendar, Filter, LogOut, Mail, Lock, Eye, EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)
  const supabase = createClient()

  // Dashboard state
  const [stats, setStats] = useState({
    completedTasks: 0,
    pendingTasks: 0,
    streak: 0,
    quote: 'Loading...'
  })

  // Tasks state
  const [tasks, setTasks] = useState([])
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')

  // Chat state
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [sessionId] = useState(() => `session-${Date.now()}`)

  // Auth state
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    category: 'Personal',
    priority: 'Medium',
    due_date: new Date().toISOString().split('T')[0]
  })
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      if (activeTab === 'dashboard') loadStats()
      if (activeTab === 'table') loadTasks()
      if (activeTab === 'chat') loadChatHistory()
    }
  }, [user, activeTab])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)
    // If a session exists, make dashboard the active view (home)
    if (session?.user) setActiveTab('dashboard')
    setLoading(false)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
      }
    )

    return () => subscription.unsubscribe()
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  async function loadChatHistory() {
    try {
      const res = await fetch(`/api/messages?sessionId=${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        const formattedMessages = []
        data.messages.forEach(msg => {
          formattedMessages.push({ role: 'user', content: msg.message })
          formattedMessages.push({ role: 'assistant', content: msg.response })
        })
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  async function handleAuth(e) {
    if (authLoading) return
    if (e && e.preventDefault) e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    
    try {
      const endpoint = authMode === 'signin' ? '/api/auth/signin' : '/api/auth/signup'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      console.log('Auth request sent', endpoint)
      const data = await res.json()
      console.log('Auth response', { status: res.status, data })
      
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed')
        return
      }

      // If server returned user, set it immediately to avoid a blank dashboard
      if (data.user) {
        setUser(data.user)
        setActiveTab('dashboard')
      } else {
        // Fallback: refresh auth state from Supabase
        await checkAuth()
        setActiveTab('dashboard')
      }
      setEmail('')
      setPassword('')
    } catch (error) {
      setAuthError('Network error. Please try again.')
    }
  }

  async function handleGoogleSignIn() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
        }
      })
      
      if (error) {
        setAuthError(error.message)
      }
    } catch (error) {
      setAuthError('Google sign-in failed')
    }
  }

  async function handleSignOut() {
    console.log('handleSignOut called')
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      await supabase.auth.signOut()
      setUser(null)
      setActiveTab('login')
    } catch (err) {
      console.error('Sign out error', err)
    }
      setAuthLoading(false)

  }

  async function handleAddTask(e) {
    e.preventDefault()
    
    try {
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskForm)
        })
        if (res.ok) {
          loadTasks()
          setEditingTask(null)
        }
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskForm)
        })
        if (res.ok) {
          loadTasks()
          loadStats()
        }
      }
      
      setShowTaskDialog(false)
      setTaskForm({
        title: '',
        category: 'Personal',
        priority: 'Medium',
        due_date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }

  async function toggleTaskStatus(task) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: !task.status })
      })
      if (res.ok) {
        loadTasks()
        loadStats()
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (res.ok) {
        loadTasks()
        loadStats()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  async function handleChat(e) {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = { role: 'user', content: chatInput }
    setMessages(prev => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sessionId
        })
      })

      const data = await res.json()
      if (!res.ok) {
        const err = data?.error || 'Chat API error'
        throw new Error(err)
      }

      if (!data?.content) {
        throw new Error('Empty response from assistant')
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (error) {
      console.error('Chat send error:', error)
      // show toast and append an assistant error reply with retry metadata
      const errorMsg = 'Sorry, I encountered an error. Tap retry.'
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMsg,
        _failed: true,
        _originalUserMessage: userMessage
      }])
      // show toast (client-only hook)
      try {
        toast({ title: 'Chat failed', description: error.message || 'Network or server error' })
      } catch {}
    } finally {
      setChatLoading(false)
    }
  }

  async function resendMessage(originalUserMessage, failedIndex) {
    if (chatLoading) return
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages.filter(m => !m._failed), originalUserMessage], sessionId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Chat API error')
      if (!data?.content) throw new Error('Empty response from assistant')

      // Replace the failed assistant message (the last assistant message) with the new content
      setMessages(prev => {
        const next = [...prev]
        // find index of the failed assistant message matching originalUserMessage
        const idx = next.findIndex(m => m._failed && m._originalUserMessage?.content === originalUserMessage.content)
        if (idx !== -1) {
          next[idx] = { role: 'assistant', content: data.content }
        } else {
          next.push({ role: 'assistant', content: data.content })
        }
        return next
      })
    } catch (error) {
      console.error('Resend error:', error)
      toast({ title: 'Retry failed', description: error.message || 'Please try again later' })
    } finally {
      setChatLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const categoryMatch = filterCategory === 'All' || task.category === filterCategory
    const priorityMatch = filterPriority === 'All' || task.priority === filterPriority
    return categoryMatch && priorityMatch
  })

  const priorityColors = {
    Low: 'bg-green-100 text-green-800 border-green-300',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    High: 'bg-red-100 text-red-800 border-red-300'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-3xl font-extrabold text-purple-600">FITOX</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              FITOX
            </h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 hidden sm:block">{user.email}</div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Dashboard */}
        {activeTab === 'dashboard' && user && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1">
                <Flame className="w-4 h-4 mr-1" />
                {stats.streak} Day Streak
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Completed Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div className="text-3xl font-bold text-gray-800">{stats.completedTasks}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Pending Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-orange-600" />
                    <div className="text-3xl font-bold text-gray-800">{stats.pendingTasks}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Current Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                    <div className="text-3xl font-bold text-gray-800">{stats.streak}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Quote */}
            <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <CardTitle>AI Motivation</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg italic">"{stats.quote}"</p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button
                onClick={() => {
                  setShowTaskDialog(true)
                  setEditingTask(null)
                  setTaskForm({
                    title: '',
                    category: 'Personal',
                    priority: 'Medium',
                    due_date: new Date().toISOString().split('T')[0]
                  })
                }}
                className="h-20 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                <Plus className="w-6 h-6 mr-2" />
                Add Task
              </Button>
              <Button
                onClick={() => setActiveTab('table')}
                className="h-20 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              >
                <Table2 className="w-6 h-6 mr-2" />
                View Table
              </Button>
              <Button
                onClick={() => setActiveTab('chat')}
                className="h-20 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <MessageSquare className="w-6 h-6 mr-2" />
                AI Coach
              </Button>
            </div>
          </div>
        )}

        {/* Table View */}
        {activeTab === 'table' && user && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-3xl font-bold text-gray-800">Task Management</h2>
              <Button
                onClick={() => {
                  setShowTaskDialog(true)
                  setEditingTask(null)
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">Filters:</span>
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      <SelectItem value="Health">Health</SelectItem>
                      <SelectItem value="Study">Study</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Priorities</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Task Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                          No tasks found. Create your first task!
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(task => (
                        <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                            <button
                              onClick={() => toggleTaskStatus(task)}
                              className="focus:outline-none"
                            >
                              {task.status ? (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                              ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-600 transition-colors" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <span className={task.status ? 'line-through text-gray-500' : 'text-gray-800'}>
                              {task.title}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline">{task.category}</Badge>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={priorityColors[task.priority]}>
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {new Date(task.due_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingTask(task)
                                  setTaskForm(task)
                                  setShowTaskDialog(true)
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTask(task.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* AI Chat */}
        {activeTab === 'chat' && user && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-gray-800">AI Habit Coach</h2>
            
            <Card className="h-[calc(100vh-280px)] flex flex-col">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  Your Personal Motivation Coach
                </CardTitle>
                <CardDescription>
                  Get guidance, motivation, and accountability for your habits
                </CardDescription>
              </CardHeader>
              
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>Start a conversation with your AI coach!</p>
                      <p className="text-sm mt-2">Ask for motivation, habit advice, or accountability.</p>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg._failed && (
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => resendMessage(msg._originalUserMessage, idx)}>
                              Retry
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <form onSubmit={handleChat} className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask for motivation or habit advice..."
                    disabled={chatLoading}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    Send
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Profile */}
        {activeTab === 'profile' && user && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-gray-800">Profile</h2>
            
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <CardTitle>{user.email}</CardTitle>
                    <CardDescription>FITOX Member</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{stats.completedTasks}</div>
                    <div className="text-sm text-gray-600 mt-1">Total Completed</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">{stats.streak}</div>
                    <div className="text-sm text-gray-600 mt-1">Active Streak</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{tasks.length}</div>
                    <div className="text-sm text-gray-600 mt-1">Total Tasks</div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSignOut}
                    variant="destructive"
                    className="w-full"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Login/Signup */}
        {activeTab === 'login' && !user && (
          <div className="max-w-md mx-auto mt-12 mb-24 animate-in fade-in duration-500">
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Flame className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl">Welcome to FITOX</CardTitle>
                <CardDescription>
                  Build better habits with AI-powered motivation
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={authLoading}
                    className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 ${authLoading ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    {authLoading ? 'Signing in...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </Button>

                <div className="text-center text-sm">
                  <button
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                      setAuthError('')
                    }}
                    className="text-purple-600 hover:underline"
                  >
                    {authMode === 'signin' 
                      ? "Don't have an account? Sign up" 
                      : 'Already have an account? Sign in'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      {user && (
        <nav style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="flex items-center h-16">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'dashboard' ? 'text-purple-600 bg-purple-50' : 'text-gray-600'
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs mt-1">Home</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'table' ? 'text-purple-600 bg-purple-50' : 'text-gray-600'
              }`}
            >
              <Table2 className="w-6 h-6" />
              <span className="text-xs mt-1">Tasks</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'chat' ? 'text-purple-600 bg-purple-50' : 'text-gray-600'
              }`}
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-xs mt-1">AI Coach</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'profile' ? 'text-purple-600 bg-purple-50' : 'text-gray-600'
              }`}
            >
              <User className="w-6 h-6" />
              <span className="text-xs mt-1">Profile</span>
            </button>
          </div>
        </nav>
      )}

      {!user && activeTab !== 'login' && (
        <nav style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="flex justify-center items-center h-16">
            <button
              onClick={() => setActiveTab('login')}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full"
            >
              <LogIn className="w-5 h-5" />
              <span className="font-medium">Sign In to Continue</span>
            </button>
          </div>
        </nav>
      )}

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Name</Label>
              <Input
                id="title"
                placeholder="Enter task name"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={taskForm.category}
                  onValueChange={(value) => setTaskForm({ ...taskForm, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Study">Study</SelectItem>
                    <SelectItem value="Work">Work</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600">
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
