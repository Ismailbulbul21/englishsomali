import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

const supabaseUrl = env.SUPABASE_URL
const supabaseKey = env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Auth helper functions
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

// Database helper functions
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  return { data, error }
}

export const getUserProgress = async (userId) => {
  const { data, error } = await supabase
    .from('user_progress')
    .select('user_id, category_id, current_level, completed_levels, total_score, started_at')
    .eq('user_id', userId)
  return { data, error }
}

export const getLevelsForCategory = async (categoryId) => {
  const { data, error } = await supabase
    .from('levels')
    .select('*')
    .eq('category_id', categoryId)
    .order('level_number')
  return { data, error }
}

export const saveAnswer = async (answerData) => {
  const { data, error } = await supabase
    .from('answers')
    .insert([answerData])
    .select()
  return { data, error }
}

export const updateUserProgress = async (userId, categoryId, progressData) => {
  const { data, error } = await supabase
    .from('user_progress')
    .upsert([{
      user_id: userId,
      category_id: categoryId,
      ...progressData
    }])
    .select()
  return { data, error }
}

// AI Features Functions

// Save AI conversation
export const saveAIConversation = async (userId, conversationType, scenario, messages, feedback) => {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        conversation_type: conversationType,
        scenario: scenario,
        messages: messages,
        ai_feedback: feedback
      })
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error saving AI conversation:', error)
    return { data: null, error }
  }
}

// Get user's AI conversations
export const getUserAIConversations = async (userId, scenario = null) => {
  try {
    let query = supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (scenario) {
      query = query.eq('scenario', scenario)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching AI conversations:', error)
    return { data: null, error }
  }
}

// Save/Update learning analytics
export const saveUserAnalytics = async (userId, analytics) => {
  try {
    const { data, error } = await supabase
      .from('learning_analytics')
      .upsert({
        user_id: userId,
        ...analytics,
        last_analysis_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error saving user analytics:', error)
    return { data: null, error }
  }
}

// Get user analytics
export const getUserAnalytics = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('learning_analytics')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching user analytics:', error)
    return { data: null, error }
  }
}

// Get cultural contexts
export const getCulturalContexts = async (scenario = null, limit = 10) => {
  try {
    let query = supabase
      .from('cultural_contexts')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (scenario) {
      query = query.eq('scenario', scenario)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching cultural contexts:', error)
    return { data: null, error }
  }
}

// Update cultural context usage
export const updateCulturalContextUsage = async (contextId) => {
  try {
    const { data, error } = await supabase
      .rpc('increment_usage_count', { context_id: contextId })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating cultural context usage:', error)
    return { data: null, error }
  }
}

// Save AI recommendations
export const saveAIRecommendations = async (userId, recommendations) => {
  try {
    const recommendationsWithUserId = recommendations.map(rec => ({
      ...rec,
      user_id: userId
    }))

    const { data, error } = await supabase
      .from('ai_recommendations')
      .insert(recommendationsWithUserId)
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error saving AI recommendations:', error)
    return { data: null, error }
  }
}

// Get user recommendations
export const getUserRecommendations = async (userId, includeCompleted = false) => {
  try {
    let query = supabase
      .from('ai_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (!includeCompleted) {
      query = query.eq('is_completed', false)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching user recommendations:', error)
    return { data: null, error }
  }
}

// Mark recommendation as completed
export const completeRecommendation = async (recommendationId) => {
  try {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', recommendationId)
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error completing recommendation:', error)
    return { data: null, error }
  }
}

// Save grammar correction
export const saveGrammarCorrection = async (userId, originalText, correctedText, errorType, explanation, confidence) => {
  try {
    const { data, error } = await supabase
      .from('grammar_corrections')
      .insert({
        user_id: userId,
        original_text: originalText,
        corrected_text: correctedText,
        error_type: errorType,
        explanation: explanation,
        confidence_score: confidence,
        context: 'ai_chat'
      })
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error saving grammar correction:', error)
    return { data: null, error }
  }
}

// Get user's grammar corrections for analysis
export const getUserGrammarCorrections = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('grammar_corrections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching grammar corrections:', error)
    return { data: null, error }
  }
}

// Get user answers for AI analysis
export const getUserAnswersForAnalysis = async (userId, limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('answers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching user answers:', error)
    return { data: null, error }
  }
}

// Update user profile with AI insights
export const updateUserProfileWithAI = async (userId, aiInsights) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        ...aiInsights,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating user profile with AI insights:', error)
    return { data: null, error }
  }
}

// Get cultural contexts by scenario
export const getCulturalContextsByScenario = async (scenario) => {
  try {
    const { data, error } = await supabase
      .from('cultural_contexts')
      .select('*')
      .eq('scenario', scenario)
      .order('usage_count', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting cultural contexts by scenario:', error)
    return { data: null, error }
  }
}

// Save learning analytics
export const saveLearningAnalytics = async (userId, analyticsData) => {
  try {
    const { data, error } = await supabase
      .from('learning_analytics')
      .upsert({
        user_id: userId,
        ...analyticsData,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error saving learning analytics:', error)
    return { data: null, error }
  }
}

// Get learning analytics
export const getLearningAnalytics = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('learning_analytics')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting learning analytics:', error)
    return { data: null, error }
  }
}

// Group Chat Functions
export const getGroupRooms = async () => {
  const { data, error } = await supabase
    .from('group_rooms')
    .select('*')
    .eq('is_active', true)
    .order('name')
  return { data, error }
}

export const getChatMessages = async (roomId, limit = 20) => {
  try {
    // First, run cleanup to remove old messages from database
    await cleanupOldMessages()
    
    // Fetch messages first
    const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit * 2) // Get more to account for filtering
  
  if (error) {
      console.error('Error fetching recent messages:', error)
    return { data: [], error }
  }
    
    // Then fetch user profiles for all unique user IDs
    const userIds = [...new Set(messages?.map(m => m.user_id).filter(Boolean))]
    
    let userProfiles = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds)
      
      // Create a lookup map
      profiles?.forEach(profile => {
        userProfiles[profile.user_id] = profile
      })
    }
    
    // Add user profiles to messages
    const messagesWithProfiles = messages?.map(message => ({
      ...message,
      user_profiles: userProfiles[message.user_id] || null
    }))
  
  // Filter messages by age on client side
  const now = new Date()
    const filteredMessages = messagesWithProfiles?.filter(message => {
    const messageAge = new Date(message.created_at)
    const hoursDiff = (now - messageAge) / (1000 * 60 * 60)
    
    // Both text and voice messages: only show if less than 24 hours old
    return hoursDiff < 24
  }).slice(0, limit) || []
  
    return { data: filteredMessages, error: null }
  } catch (error) {
    console.error('Error in getChatMessages:', error)
    return { data: [], error }
  }
}

export const sendChatMessage = async (roomId, userId, message, messageType = 'text', metadata = {}) => {
  try {
    // Insert the message
    const { data: messageData, error: insertError } = await supabase
    .from('chat_messages')
    .insert([{
      room_id: roomId,
      user_id: userId,
      message,
      message_type: messageType,
      metadata
    }])
    .select()
    
    if (insertError) {
      return { data: null, error: insertError }
    }
    
    // Fetch user profile separately
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single()
    
    // Add profile to the message data
    const messageWithProfile = messageData?.[0] ? {
      ...messageData[0],
      user_profiles: profile
    } : null
    
    return { data: messageWithProfile ? [messageWithProfile] : [], error: null }
  } catch (error) {
    console.error('Error sending message:', error)
    return { data: null, error }
  }
}

// Voice message functions
export const checkVoiceMessageLimit = async (userId) => {
  const { data, error } = await supabase
    .rpc('check_voice_message_limit', { user_uuid: userId })
  return { data, error }
}

export const getRemainingVoiceMessages = async (userId) => {
  const { data, error } = await supabase
    .rpc('get_remaining_voice_messages', { user_uuid: userId })
  return { data, error }
}

export const uploadVoiceMessage = async (file, userId, roomId) => {
  console.log('uploadVoiceMessage called with:', { 
    fileSize: file.size, 
    fileType: file.type, 
    userId, 
    roomId 
  })
  
  if (!file || file.size === 0) {
    const error = new Error('Invalid or empty audio file')
    console.error('Upload error:', error)
    return { data: null, error }
  }

  const fileName = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`
  const filePath = `voice_messages/${userId}/${fileName}`
  
  console.log('Uploading to path:', filePath)
  
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        contentType: file.type || 'audio/webm',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return { data: null, error: uploadError }
    }
    
    console.log('Upload successful:', uploadData)
    
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath)
    
    console.log('Public URL generated:', urlData.publicUrl)
    
    return { data: { ...uploadData, publicUrl: urlData.publicUrl }, error: null }
  } catch (error) {
    console.error('Unexpected upload error:', error)
    return { data: null, error }
  }
}

export const sendVoiceMessage = async (roomId, userId, voiceUrl, duration) => {
  console.log('sendVoiceMessage called with:', { roomId, userId, voiceUrl, duration })
  
  try {
    // Check if user can send voice message
    console.log('Checking voice message limit...')
    const { data: canSend, error: limitError } = await checkVoiceMessageLimit(userId)
    
    if (limitError) {
      console.error('Limit check error:', limitError)
      return { 
        data: null, 
        error: limitError
      }
    }
    
    if (!canSend) {
      const error = new Error('Daily voice message limit reached (10 messages)')
      console.error('Limit reached:', error)
      return { 
        data: null, 
        error
      }
    }
    
    console.log('Limit check passed, inserting message...')
    
    const messageData = {
      room_id: roomId,
      user_id: userId,
      message: `Voice message (${duration}s)`,
      message_type: 'voice',
      voice_url: voiceUrl,
      voice_duration: duration
    }
    
    console.log('Inserting message data:', messageData)
    
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([messageData])
      .select()
    
    if (error) {
      console.error('Database insert error:', error)
      return { data: null, error }
    }
    
    console.log('Voice message inserted successfully:', data)
    return { data, error: null }
    
  } catch (error) {
    console.error('Unexpected sendVoiceMessage error:', error)
    return { data: null, error }
  }
}

// Utility function to filter old messages from cache or any message array
export const filterRecentMessages = (messages) => {
  if (!messages || !Array.isArray(messages)) return []
  
  const now = new Date()
  return messages.filter(message => {
    const messageAge = new Date(message.created_at)
    const hoursDiff = (now - messageAge) / (1000 * 60 * 60)
    
    // Both voice and text messages: only show if less than 24 hours old
    return hoursDiff < 24
  })
}

// Clean up localStorage chat cache for a specific room
export const cleanupChatCache = (roomId) => {
  try {
    const cacheKey = `chat_${roomId}`
    const cachedMessages = localStorage.getItem(cacheKey)
    
    if (cachedMessages) {
      const parsed = JSON.parse(cachedMessages)
      const filteredMessages = filterRecentMessages(parsed)
      
      if (filteredMessages.length !== parsed.length) {
        // Update cache with filtered messages silently
        localStorage.setItem(cacheKey, JSON.stringify(filteredMessages))
      }
      
      return filteredMessages
    }
  } catch (error) {
    localStorage.removeItem(`chat_${roomId}`)
  }
  
  return []
}

export const cleanupOldMessages = async () => {
  const { data, error } = await supabase
    .rpc('cleanup_old_messages')
  
  // Silent cleanup - no logging
  return { data, error }
}

// User Attempts Functions
export const getUserAttempts = async (userId, levelId, questionId) => {
  const { data, error } = await supabase
    .from('user_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('level_id', levelId)
    .eq('question_id', questionId)
    .order('attempt_number', { ascending: false })
  return { data, error }
}

export const saveUserAttempt = async (attemptData) => {
  const { data, error } = await supabase
    .from('user_attempts')
    .insert([attemptData])
    .select()
  return { data, error }
}

export const getFailedAttempts = async (userId, levelId, questionId) => {
  const { data, error } = await supabase
    .from('user_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('level_id', levelId)
    .eq('question_id', questionId)
    .eq('passed', false)
  return { data, error }
}

// Example Answers Functions
export const getExampleAnswer = async (levelId, questionId) => {
  const { data, error } = await supabase
    .from('example_answers')
    .select('*')
    .eq('level_id', levelId)
    .eq('question_id', questionId)
    .single()
  return { data, error }
}

// Enhanced Progress Functions
export const canUserProceed = async (userId, levelId, questionId) => {
  const { data, error } = await supabase
    .from('user_attempts')
    .select('passed, score')
    .eq('user_id', userId)
    .eq('level_id', levelId)
    .eq('question_id', questionId)
    .eq('passed', true)
    .limit(1)
  
  return { canProceed: data && data.length > 0, error }
}

export const getUserLevelProgress = async (userId, levelId) => {
  const { data, error } = await supabase
    .from('user_attempts')
    .select('question_id, passed, score')
    .eq('user_id', userId)
    .eq('level_id', levelId)
    .eq('passed', true)
  
  return { data, error }
}

// Track user presence on specific learning paths
export const trackUserPresence = async (userId, categoryId, action = 'join') => {
  if (!userId || !categoryId) return { data: null, error: null }
  
  try {
    if (action === 'join') {
      // First try to update existing record
      const { data: updateData, error: updateError } = await supabase
        .from('user_presence')
        .update({
          last_seen: new Date().toISOString(),
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .select()
      
      // If no rows were updated, insert a new record
      if (updateData && updateData.length === 0) {
        const { data: insertData, error: insertError } = await supabase
          .from('user_presence')
          .insert({
            user_id: userId,
            category_id: categoryId,
            last_seen: new Date().toISOString(),
            is_active: true
          })
          .select()
        
        return { data: insertData, error: insertError }
      }
      
      return { data: updateData, error: updateError }
    } else if (action === 'leave') {
      // Mark user as inactive
      const { data, error } = await supabase
        .from('user_presence')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .select()
      
      return { data, error }
    }
  } catch (error) {
    console.error('Error tracking user presence:', error)
    return { data: null, error }
  }
}

// Get users currently active on a specific learning path
export const getActiveUsersOnPath = async (categoryId) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    // First get active user presence records
    const { data: presenceData, error } = await supabase
      .from('user_presence')
      .select('user_id, last_seen')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .gte('last_seen', fiveMinutesAgo)
    
    if (error || !presenceData?.length) {
      return { data: [], error }
    }
    
    // Then fetch user profiles for all active users
    const userIds = presenceData.map(p => p.user_id)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name')
      .in('user_id', userIds)
    
    // Create a lookup map
    const profileMap = {}
    profiles?.forEach(profile => {
      profileMap[profile.user_id] = profile
    })
    
    // Combine presence data with profiles
    const activeUsersWithProfiles = presenceData.map(presence => ({
      ...presence,
      user_profiles: profileMap[presence.user_id] || null
    }))
    
    return { data: activeUsersWithProfiles, error: null }
  } catch (error) {
    console.error('Error getting active users:', error)
    return { data: [], error }
  }
}

// Real-time subscriptions for chat
export const subscribeToChatMessages = (roomId, callback) => {
  return supabase
    .channel(`chat_${roomId}`)
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
    }, async (payload) => {
      // Fetch user profile for the new message
      if (payload.new.user_id) {
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('user_id', payload.new.user_id)
            .single()
          
          // Add profile to the message
          payload.new.user_profiles = profile || null
        } catch (error) {
          console.error('Error fetching user profile for new message:', error)
          payload.new.user_profiles = null
        }
      } else {
        payload.new.user_profiles = null
      }
      
      callback(payload)
    })
    .subscribe()
}

// Demo Data Functions for Non-Authenticated Users
export const getDemoProgress = () => {
  return [
    {
      category_id: '85d9e02c-b07b-4852-bbea-e4ee4966a491', // Job Interview
      current_level: 1,
      completed_levels: [],
      total_score: 0,
      started_at: new Date().toISOString()
    },
    {
      category_id: 'efd71803-0cd8-4120-9b71-115ea5216bdc', // School English
      current_level: 1,
      completed_levels: [],
      total_score: 0,
      started_at: new Date().toISOString()
    },
    {
      category_id: 'dca42dc2-4a2d-4077-9a32-5ce2dda6cbed', // Travel English
      current_level: 1,
      completed_levels: [],
      total_score: 0,
      started_at: new Date().toISOString()
    },
    {
      category_id: '9a3642df-bee7-4d36-be18-fd64a5d21d9e', // Daily Conversation
      current_level: 1,
      completed_levels: [],
      total_score: 0,
      started_at: new Date().toISOString()
    },
    {
      category_id: 'fc2bf869-e37f-4378-bc7e-1894760b62a4', // Business English
      current_level: 1,
      completed_levels: [],
      total_score: 0,
      started_at: new Date().toISOString()
    }
  ]
}

export const getDemoAnalytics = () => {
  return {
    weak_areas: ['pronunciation', 'grammar'],
    strong_areas: ['vocabulary', 'listening'],
    learning_style: 'visual',
    confidence_score: 65,
    consistency_score: 78,
    improvement_trend: 'improving',
    estimated_fluency_level: 'Intermediate',
    strongest_skill: 'Daily Conversation',
    total_ai_interactions: 45,
    last_analysis_date: new Date().toISOString()
  }
}

export const getDemoChatMessages = (roomId) => {
  const demoMessages = [
    {
      id: 'demo-1',
      user_id: 'demo-user-1',
      message: 'Hello everyone! I\'m practicing my English pronunciation today. Any tips?',
      message_type: 'text',
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      metadata: { user_name: 'Ahmed', user_location: 'Somalia' }
    },
    {
      id: 'demo-2',
      user_id: 'demo-user-2',
      message: 'Try recording yourself and listening back! It really helps.',
      message_type: 'text',
      created_at: new Date(Date.now() - 3500000).toISOString(),
      metadata: { user_name: 'Fatima', user_location: 'UK' }
    },
    {
      id: 'demo-3',
      user_id: 'demo-user-3',
      message: 'I just completed Level 3 in Job Interview English! The AI feedback is amazing 🎉',
      message_type: 'text',
      created_at: new Date(Date.now() - 3000000).toISOString(),
      metadata: { user_name: 'Omar', user_location: 'Canada' }
    },
    {
      id: 'demo-4',
      user_id: 'demo-user-4',
      message: '🎵 Voice message: "Good luck with your practice everyone!"',
      message_type: 'voice',
      voice_duration: 3,
      created_at: new Date(Date.now() - 2400000).toISOString(),
      metadata: { user_name: 'Amina', user_location: 'USA' }
    },
    {
      id: 'demo-5',
      user_id: 'demo-user-5',
      message: 'Waa ku mahadsan tihiin! Thanks everyone for the support. This community is wonderful.',
      message_type: 'text',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      metadata: { user_name: 'Hassan', user_location: 'Australia' }
    },
    {
      id: 'demo-6',
      user_id: 'demo-user-6',
      message: 'Does anyone know how to improve my "th" sound pronunciation?',
      message_type: 'text',
      created_at: new Date(Date.now() - 900000).toISOString(),
      metadata: { user_name: 'Khadija', user_location: 'Sweden' }
    },
    {
      id: 'demo-7',
      user_id: 'demo-user-7',
      message: 'Put your tongue between your teeth gently and blow air. Practice "think" and "this".',
      message_type: 'text',
      created_at: new Date(Date.now() - 600000).toISOString(),
      metadata: { user_name: 'Mohamed', user_location: 'Netherlands' }
    }
  ]

  return demoMessages
}

export const getDemoUserProfile = () => {
  return {
    full_name: 'Demo User',
    preferred_language: 'so',
    total_speaking_time: 0,
    streak_days: 0,
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
}

export const getDemoAttempts = () => {
  return [
    {
      attempt_number: 1,
      score: 75,
      transcript: 'Hello, my name is Ahmed and I am very excited to be here today for this interview.',
      feedback_somali: 'Wanaagsan! Codkaagu waa cad yahay laakiin isku day inaad ka fiirsato dhawaaqida "excited".',
      passed: true,
      recording_duration: 8,
      created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      attempt_number: 2,
      score: 85,
      transcript: 'I have experience in customer service and I believe I can contribute positively to your team.',
      feedback_somali: 'Aad u fiican! Naxwahaagu waa hagaagsan yahay. Sii wad sidaas!',
      passed: true,
      recording_duration: 12,
      created_at: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
    }
  ]
}

export const isDemoMode = (user) => {
  return !user || user === null
}

// Get recent attempts for a specific question (for non-authenticated users to see examples)
export const getRecentAttemptsForQuestion = async (levelId, questionId, limit = 3) => {
  try {
    // First get the attempts
    const { data: attempts, error } = await supabase
      .from('user_attempts')
      .select('*')
      .eq('level_id', levelId)
      .eq('question_id', questionId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    
    if (!attempts?.length) {
      return { data: [], error: null }
    }
    
    // Then fetch user profiles for all unique user IDs
    const userIds = [...new Set(attempts.map(a => a.user_id).filter(Boolean))]
    
    let userProfiles = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds)
      
      // Create a lookup map
      profiles?.forEach(profile => {
        userProfiles[profile.user_id] = profile
      })
    }
    
    // Add user profiles to attempts
    const attemptsWithProfiles = attempts.map(attempt => ({
      ...attempt,
      user_profiles: userProfiles[attempt.user_id] || null
    }))
    
    return { data: attemptsWithProfiles, error: null }
  } catch (error) {
    console.error('Error fetching recent attempts:', error)
    return { data: null, error }
  }
}