import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateChatResponse, generateMotivationalQuote } from '@/lib/ai-client'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'fitox_db'

let client = null
let db = null

async function connectDB() {
  if (db) return db
  try {
    client = new MongoClient(MONGO_URL)
    await client.connect()
    db = client.db(DB_NAME)
    console.log('✅ Connected to MongoDB')
    return db
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

// Safe connect: return null if DB is unavailable (avoid throwing 500s)
async function tryConnectDB() {
  try {
    return await connectDB()
  } catch (err) {
    console.warn('MongoDB not available:', err.message || err)
    return null
  }
}

function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

export async function GET(request) {
  const { searchParams, pathname } = new URL(request.url)
  try {
    // Auth endpoints (do not require DB)
    if (pathname === '/api/auth/user') {
      const supabase = createSupabaseServer()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return handleCORS(NextResponse.json({ user: null }, { status: 200 }))
      }
      
      return handleCORS(NextResponse.json({ user }))
    }

    // Get authenticated user
    const supabase = createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return handleCORS(NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      ))
    }

    // Get tasks (requires DB) - return empty list if DB unavailable
    if (pathname === '/api/tasks') {
      const db = await tryConnectDB()
      if (!db) {
        return handleCORS(NextResponse.json({ tasks: [] }))
      }
      const tasks = await db.collection('tasks')
        .find({ userId: user.id })
        .sort({ created_at: -1 })
        .toArray()
      return handleCORS(NextResponse.json({ tasks }))
    }

    // Get dashboard stats
    if (pathname === '/api/stats') {
      const db = await tryConnectDB()
      let tasks = []
      if (db) {
        tasks = await db.collection('tasks').find({ userId: user.id }).toArray()
      }
      const completedTasks = tasks.filter(t => t.status).length
      const pendingTasks = tasks.filter(t => !t.status).length
      
      // Calculate streak (simplified)
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      const completedToday = tasks.some(t => 
        t.status && new Date(t.updated_at).toDateString() === today
      )
      const completedYesterday = tasks.some(t => 
        t.status && new Date(t.updated_at).toDateString() === yesterday
      )
      const streak = completedToday ? (completedYesterday ? 2 : 1) : 0

      let quote = '""'
      try {
        quote = await generateMotivationalQuote()
      } catch (err) {
        console.warn('Quote generation failed:', err?.message || err)
        quote = 'Keep going — you got this!'
      }

      return handleCORS(NextResponse.json({
        completedTasks,
        pendingTasks,
        streak,
        quote
      }))
    }

    // Get chat history
    if (pathname === '/api/messages') {
      const db = await tryConnectDB()
      const sessionId = searchParams.get('sessionId') || 'default'
      if (!db) {
        return handleCORS(NextResponse.json({ messages: [] }))
      }
      const messages = await db.collection('messages')
        .find({ userId: user.id, sessionId })
        .sort({ created_at: 1 })
        .limit(50)
        .toArray()
      return handleCORS(NextResponse.json({ messages }))
    }

    return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
  } catch (error) {
    console.error('GET Error:', error)
    return handleCORS(NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    ))
  }
}

export async function POST(request) {
  const { pathname } = new URL(request.url)

  try {
    const body = await request.json()

    // Auth endpoints
    if (pathname === '/api/auth/signup') {
      try {
        const supabase = createSupabaseServer()
        const { data, error } = await supabase.auth.signUp({
          email: body.email,
          password: body.password
        })

        if (error) {
          console.error('/api/auth/signup supabase error', error)
          return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
        }

        return handleCORS(NextResponse.json({ user: data.user }))
      } catch (signupError) {
        console.error('SIGNUP handler error:', signupError)
        return handleCORS(NextResponse.json({ error: signupError.message, stack: signupError.stack }, { status: 500 }))
      }
    }

    if (pathname === '/api/auth/signin') {
      try {
        console.log('SIGNIN handler env', {
          SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        })
        const supabase = createSupabaseServer()
        const { data, error } = await supabase.auth.signInWithPassword({
          email: body.email,
          password: body.password
        })

        if (error) {
          console.error('/api/auth/signin supabase error', error)
          return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
        }

        return handleCORS(NextResponse.json({ user: data.user }))
      } catch (signinError) {
        console.error('SIGNIN handler error:', signinError)
        return handleCORS(NextResponse.json({ error: signinError.message, stack: signinError.stack }, { status: 500 }))
      }
    }

    if (pathname === '/api/auth/google') {
      const supabase = createSupabaseServer()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}`
        }
      })
      
      if (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
      }
      
      return handleCORS(NextResponse.json({ url: data.url }))
    }

    if (pathname === '/api/auth/signout') {
      const supabase = createSupabaseServer()
      await supabase.auth.signOut()
      return handleCORS(NextResponse.json({ success: true }))
    }

    // Protected routes
    const supabase = createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return handleCORS(NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      ))
    }

    // Create task - if DB unavailable, return task locally (not persisted)
    if (pathname === '/api/tasks') {
      const db = await tryConnectDB()
      const task = {
        id: uuidv4(),
        userId: user.id,
        title: body.title,
        category: body.category || 'Personal',
        priority: body.priority || 'Medium',
        due_date: body.due_date || new Date().toISOString(),
        status: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      if (db) {
        try { await db.collection('tasks').insertOne(task) } catch (err) { console.warn('Insert task failed:', err) }
        return handleCORS(NextResponse.json({ task }))
      }
      // DB down: return success with saved: false to avoid client 500
      return handleCORS(NextResponse.json({ task, saved: false }))
    }

    // AI Chat
    if (pathname === '/api/chat') {
      try {
        const { messages: chatMessages, sessionId = 'default' } = body

        const db = await tryConnectDB()

        console.log('API /api/chat called', {
          userId: user?.id,
          sessionId,
          messages: Array.isArray(chatMessages) ? chatMessages.length : 0,
          db: !!db
        })

        // Get user stats for context (fallback to empty if no DB)
        let tasks = []
        if (db) {
          try { tasks = await db.collection('tasks').find({ userId: user.id }).toArray() } catch (err) { console.warn('Failed to read tasks for chat context:', err) }
        }
        const userContext = {
          completedTasks: tasks.filter(t => t.status).length,
          pendingTasks: tasks.filter(t => !t.status).length,
          streak: 1
        }

        const aiResponse = await generateChatResponse(chatMessages, userContext)

        // Save to database if available
        if (db) {
          try {
            const messageDoc = {
              id: uuidv4(),
              userId: user.id,
              sessionId,
              message: chatMessages[chatMessages.length - 1]?.content,
              response: aiResponse?.content,
              source: aiResponse?.source,
              created_at: new Date().toISOString()
            }
            await db.collection('messages').insertOne(messageDoc)
          } catch (err) {
            console.warn('Failed to save chat message:', err)
          }
        }

        return handleCORS(NextResponse.json({
          content: aiResponse?.content,
          source: aiResponse?.source
        }))
      } catch (chatError) {
        console.error('CHAT handler error:', chatError)
        return handleCORS(NextResponse.json({ error: chatError.message, stack: chatError.stack }, { status: 500 }))
      }
    }

    return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
  } catch (error) {
    console.error('POST Error:', error)
    return handleCORS(NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    ))
  }
}

export async function PUT(request) {
  const { pathname } = new URL(request.url)

  try {
    const db = await tryConnectDB()
    const supabase = createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return handleCORS(NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ))
    }

    const body = await request.json()

    // Update task
    if (pathname.startsWith('/api/tasks/')) {
      const taskId = pathname.split('/').pop()
      const updateData = {
        ...body,
        updated_at: new Date().toISOString()
      }

      if (!db) {
        // DB unavailable: return optimistic response without persisting
        const task = { id: taskId, userId: user.id, ...updateData }
        return handleCORS(NextResponse.json({ task, saved: false }))
      }

      const result = await db.collection('tasks').updateOne(
        { id: taskId, userId: user.id },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json({ error: 'Task not found' }, { status: 404 }))
      }

      const task = await db.collection('tasks').findOne({ id: taskId })
      return handleCORS(NextResponse.json({ task }))
    }

    return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
  } catch (error) {
    console.error('PUT Error:', error)
    return handleCORS(NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    ))
  }
}

export async function DELETE(request) {
  const { pathname } = new URL(request.url)

  try {
    const db = await tryConnectDB()
    const supabase = createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return handleCORS(NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ))
    }

    // Delete task
    if (pathname.startsWith('/api/tasks/')) {
      const taskId = pathname.split('/').pop()
      if (!db) {
        // DB unavailable: return optimistic deletion result (not persisted)
        return handleCORS(NextResponse.json({ success: true, deleted: false }))
      }
      const result = await db.collection('tasks').deleteOne({
        id: taskId,
        userId: user.id
      })

      if (result.deletedCount === 0) {
        return handleCORS(NextResponse.json({ error: 'Task not found' }, { status: 404 }))
      }

      return handleCORS(NextResponse.json({ success: true, deleted: true }))
    }

    return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
  } catch (error) {
    console.error('DELETE Error:', error)
    return handleCORS(NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    ))
  }
}
