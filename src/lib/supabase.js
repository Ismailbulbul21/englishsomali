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
    .select('user_id, category_id, current_level, completed_levels, total_score, total_levels, started_at')
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
    
    // Use the new function that only returns recent messages
  const { data, error } = await supabase
      .rpc('get_recent_chat_messages', { 
        room_uuid: roomId, 
        message_limit: limit 
      })
    
    if (error) {
      console.error('Error fetching recent messages:', error)
      // Fallback to old method with client-side filtering
      return getChatMessagesFallback(roomId, limit)
    }
  
  // If we have messages, add user info
  if (data && data.length > 0) {
    const messagesWithUserInfo = data.map(message => {
      // Generate a consistent user name based on user_id
      const userIdHash = message.user_id.slice(-4) // Last 4 chars of user ID
      const userName = `User ${userIdHash}`
      
      return {
        ...message,
        user_profiles: {
          full_name: userName
        }
      }
    })
      return { data: messagesWithUserInfo, error: null }
  }
  
    return { data: [], error: null }
  } catch (error) {
    console.error('Error in getChatMessages:', error)
    // Fallback to old method with client-side filtering
    return getChatMessagesFallback(roomId, limit)
  }
}

// Fallback method with client-side filtering
const getChatMessagesFallback = async (roomId, limit = 20) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit * 2) // Get more to account for filtering
  
  if (error) {
    return { data: [], error }
  }
  
  // Filter messages by age on client side
  const now = new Date()
  const filteredMessages = data?.filter(message => {
    const messageAge = new Date(message.created_at)
    const hoursDiff = (now - messageAge) / (1000 * 60 * 60)
    
    // Both text and voice messages: only show if less than 24 hours old
    return hoursDiff < 24
  }).slice(0, limit) || []
  
  // Add user info
  const messagesWithUserInfo = filteredMessages.map(message => {
    const userIdHash = message.user_id.slice(-4)
    const userName = `User ${userIdHash}`
    
    return {
      ...message,
      user_profiles: {
        full_name: userName
      }
    }
  })
  
  return { data: messagesWithUserInfo, error: null }
}

export const sendChatMessage = async (roomId, userId, message, messageType = 'text', metadata = {}) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{
      room_id: roomId,
      user_id: userId,
      message,
      message_type: messageType,
      metadata
    }])
    .select()
  return { data, error }
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

// Real-time subscriptions for chat
export const subscribeToChatMessages = (roomId, callback) => {
  const channel = supabase
    .channel(`chat_room_${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        // Add user profile info to the message
        const userIdHash = payload.new.user_id.slice(-4)
        const userName = `User ${userIdHash}`
        
        const messageWithProfile = {
          ...payload.new,
          user_profiles: {
            full_name: userName
          }
        }
        callback({ new: messageWithProfile })
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status)
    })
  
  return channel
}