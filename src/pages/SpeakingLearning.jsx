import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Mic, MicOff, Play, ArrowLeft, ArrowRight, Trophy, Target, 
  Volume2, RotateCcw, MessageCircle, Users, Send, HelpCircle,
  Clock, CheckCircle, XCircle, Star
} from 'lucide-react'
import VoiceRecorder from '../components/VoiceRecorder'
import { aiService } from '../services/aiService'
import { 
  getCategories, getLevelsForCategory, getUserAttempts, saveUserAttempt,
  getFailedAttempts, getExampleAnswer, canUserProceed, getUserLevelProgress,
  getGroupRooms, getChatMessages, sendChatMessage, subscribeToChatMessages,
  getUserProgress, updateUserProgress, getRemainingVoiceMessages, 
  uploadVoiceMessage, sendVoiceMessage, filterRecentMessages, cleanupChatCache,
  getDemoChatMessages, getDemoAttempts, isDemoMode
} from '../lib/supabase'
import SignUpBanner from '../components/SignUpBanner'
import DemoOverlay from '../components/DemoOverlay'

const SpeakingLearning = () => {
  const { categoryId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Demo mode detection
  const isDemo = isDemoMode(user)
  
  // Core state
  const [category, setCategory] = useState(null)
  const [levels, setLevels] = useState([])
  const [currentLevel, setCurrentLevel] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [canSubmit, setCanSubmit] = useState(false)
  
  // Recording status
  const [recordingStatus, setRecordingStatus] = useState('idle') // idle, recording, stopped
  
  // Feedback state
  const [feedback, setFeedback] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [attempts, setAttempts] = useState([])
  const [showHelp, setShowHelp] = useState(false)
  const [exampleAnswer, setExampleAnswer] = useState(null)
  
  // Chat state
  const [showChat, setShowChat] = useState(false)
  const [groupRoom, setGroupRoom] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [onlineUsers, setOnlineUsers] = useState(1) // Start with just current user
  const [connectionStatus, setConnectionStatus] = useState('connecting') // connecting, connected, disconnected
  
  // Voice message state
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [remainingVoiceMessages, setRemainingVoiceMessages] = useState(10)
  const [isUploadingVoice, setIsUploadingVoice] = useState(false)
  
  // UI state
  const [showNewUserGuide, setShowNewUserGuide] = useState(false)
  const [showResultPopup, setShowResultPopup] = useState(false)
  const [resultData, setResultData] = useState(null)
  const [showBanner, setShowBanner] = useState(true)
  
  // Refs
  const mediaRecorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const audioChunksRef = useRef([])
  const chatSubscriptionRef = useRef(null)
  const chatMessagesEndRef = useRef(null)


  useEffect(() => {
    loadCategoryAndLevels()
    loadGroupRoom()
    checkIfNewUser()
    return () => {
      // Cleanup function to prevent memory leaks
      console.log('Cleaning up SpeakingLearning component')
      
      if (chatSubscriptionRef.current) {
        console.log('Unsubscribing from chat')
        try {
          chatSubscriptionRef.current.unsubscribe()
          chatSubscriptionRef.current = null
        } catch (e) {
          console.warn('Error unsubscribing from chat:', e)
        }
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      if (mediaRecorderRef.current && isRecording) {
        try {
          mediaRecorderRef.current.stop()
          mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop())
        } catch (e) {
          console.warn('Error stopping media recorder:', e)
        }
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.warn('Error stopping speech recognition:', e)
        }
      }
    }
  }, [categoryId, user])

  useEffect(() => {
    if (currentLevel && questionIndex >= 0) {
      loadCurrentQuestion()
    }
  }, [currentLevel, questionIndex])

  useEffect(() => {
    if (groupRoom) {
      loadChatMessages()
      setupChatSubscription()
      loadRemainingVoiceMessages()
    }
    
    // Cleanup previous subscription when groupRoom changes
    return () => {
      if (chatSubscriptionRef.current) {
        console.log('Cleaning up previous chat subscription')
        try {
          chatSubscriptionRef.current.unsubscribe()
          chatSubscriptionRef.current = null
        } catch (e) {
          console.warn('Error cleaning up chat subscription:', e)
        }
      }
    }
  }, [groupRoom])

  // Auto-open chat on all devices
  useEffect(() => {
    setShowChat(true)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  // Periodic cleanup of old messages every 5 minutes
  useEffect(() => {
    if (!groupRoom) return

    const cleanupInterval = setInterval(() => {
      setChatMessages(prevMessages => {
        const filteredMessages = filterRecentMessages(prevMessages)
        
        // Update cache silently if messages were filtered
        if (filteredMessages.length !== prevMessages.length) {
          localStorage.setItem(`chat_${groupRoom.id}`, JSON.stringify(filteredMessages))
        }
        
        return filteredMessages
      })
    }, 5 * 60 * 1000) // Every 5 minutes

    return () => clearInterval(cleanupInterval)
  }, [groupRoom])

  const loadCategoryAndLevels = async () => {
    try {
      const { data: categories, error: categoriesError } = await getCategories()
      if (categoriesError) {
        console.error('Error loading categories:', categoriesError)
        return
      }
      
      const foundCategory = categories?.find(cat => cat.id === categoryId)
      setCategory(foundCategory)

      const { data: levelsData, error: levelsError } = await getLevelsForCategory(categoryId)
      if (levelsError) {
        console.error('Error loading levels:', levelsError)
        return
      }
      
      setLevels(levelsData || [])
      
      if (levelsData && levelsData.length > 0) {
        setCurrentLevel(levelsData[0]) // Start with first level
      }

      // Initialize user progress for this category
      if (foundCategory && user?.id) {
        await initializeUserProgress(foundCategory, levelsData)
      }
    } catch (error) {
      console.error('Error loading category and levels:', error)
    }
  }

  // Initialize user progress when starting a category
  const initializeUserProgress = async (category, levels) => {
    try {
      // Check if user already has progress for this category
      const { data: existingProgress } = await getUserProgress(user.id)
      const hasProgress = existingProgress?.some(p => p.category_id === category.id)
      
      if (!hasProgress) {
        // Initialize progress for new users
        const totalLevels = levels?.length || 10 // Default to 10 if not specified
        const progressData = {
          user_id: user.id,
          category_id: category.id,
          current_level: 1,
          completed_levels: [],
          total_score: 0,
          total_levels: totalLevels,
          started_at: new Date().toISOString()
        }
        
        await updateUserProgress(user.id, category.id, progressData)
        console.log('Initialized progress for category:', category.name)
      }
    } catch (error) {
      console.error('Error initializing user progress:', error)
    }
  }

  const loadGroupRoom = async () => {
    try {
      const { data: rooms } = await getGroupRooms()
      const room = rooms?.find(r => r.category_id === categoryId)
      setGroupRoom(room)
    } catch (error) {
      console.error('Error loading group room:', error)
    }
  }

  const loadChatMessages = async () => {
    if (!groupRoom) return
    
    try {
      if (isDemo) {
        // Use demo data for non-authenticated users
        const demoMessages = getDemoChatMessages(groupRoom.id)
        setChatMessages(demoMessages)
        setOnlineUsers(7) // Show active demo community
        return
      }

      // First clean up localStorage cache for this room
      const cachedFilteredMessages = cleanupChatCache(groupRoom.id)
      
      // Load from cleaned localStorage first for instant display
      if (cachedFilteredMessages.length > 0) {
        setChatMessages(cachedFilteredMessages)
            // Update online count from cached messages
        const activeCount = getActiveUsersCount(cachedFilteredMessages)
            setOnlineUsers(activeCount)
      }

      // Then load fresh data from server (this now includes automatic cleanup)
      const { data: messages, error } = await getChatMessages(groupRoom.id)
      if (error) {
        console.error('Error loading chat messages from server:', error)
        return
      }
      
      if (messages && messages.length > 0) {
        // Messages come in descending order (newest first), reverse to get chronological order (oldest first)
        const chronologicalMessages = [...messages].reverse()
        
        // Additional client-side filtering as safety measure
        const filteredMessages = filterRecentMessages(chronologicalMessages)
        
        setChatMessages(filteredMessages)
        
        // Cache filtered messages for persistence
        localStorage.setItem(`chat_${groupRoom.id}`, JSON.stringify(filteredMessages))
        
        // Update online users count based on recent activity
        setOnlineUsers(getActiveUsersCount(filteredMessages))
      } else {
        // No messages, reset to just current user
        setChatMessages([])
        setOnlineUsers(1)
      }
    } catch (error) {
      console.error('Error loading chat messages:', error)
      setOnlineUsers(1) // Fallback to just current user
    }
  }

  const setupChatSubscription = () => {
    if (!groupRoom || chatSubscriptionRef.current) return
    
    console.log('Setting up chat subscription for room:', groupRoom.id)
    setConnectionStatus('connecting')
    
    chatSubscriptionRef.current = subscribeToChatMessages(groupRoom.id, (payload) => {
      setConnectionStatus('connected')
      
      // Check if the new message is within age limits (24 hours for both text and voice)
      const messageAge = new Date(payload.new.created_at)
      const now = new Date()
      const hoursDiff = (now - messageAge) / (1000 * 60 * 60)
      
      // Skip old messages (both text and voice after 24 hours)
      if (hoursDiff >= 24) {
        return
      }
      
      setChatMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg.id === payload.new.id)
        if (messageExists) {
          return prev
        }
        
        // Add new message to the end (chronological order)
        const newMessages = [...prev, payload.new]
        
        // Filter all messages to ensure no old ones remain
        const filteredMessages = filterRecentMessages(newMessages)
        
        // Cache updated filtered messages
        try {
          localStorage.setItem(`chat_${groupRoom.id}`, JSON.stringify(filteredMessages))
        } catch (e) {
          // Silent error handling
        }
        
        // Update online count when new messages arrive
        setOnlineUsers(getActiveUsersCount(filteredMessages))
        
        return filteredMessages
      })
    })
    
    // Set connected status after a short delay if no errors
    setTimeout(() => {
      if (chatSubscriptionRef.current) {
        setConnectionStatus('connected')
      }
    }, 1000)
  }

  const getActiveUsersCount = (messages) => {
    if (!messages || messages.length === 0) return 1
    
    // Get unique users who sent messages in the last 15 minutes (more realistic)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const recentMessages = messages.filter(msg => 
      new Date(msg.created_at) > fifteenMinutesAgo
    )
    
    const uniqueUsers = new Set(recentMessages.map(msg => msg.user_id))
    
    // Always include current user if they're active
    uniqueUsers.add(user.id)
    
    // Show realistic numbers - if only current user, show 1-3 randomly to encourage interaction
    if (uniqueUsers.size === 1) {
      return Math.floor(Math.random() * 3) + 1 // 1-3 users
    }
    
    return uniqueUsers.size
  }

  const loadCurrentQuestion = async () => {
    if (!currentLevel || !currentLevel.questions || questionIndex >= currentLevel.questions.length) {
      return
    }

    const question = currentLevel.questions[questionIndex]
    setCurrentQuestion(question)
    
    // Load user attempts for this question
    try {
      if (isDemo) {
        // Use demo data for non-authenticated users
        const demoAttempts = getDemoAttempts()
        setAttempts(demoAttempts)
      } else {
        const { data: userAttempts } = await getUserAttempts(user.id, currentLevel.id, question.id)
        setAttempts(userAttempts || [])
        
        // Check if user needs help (2+ failed attempts)
        const { data: failedAttempts } = await getFailedAttempts(user.id, currentLevel.id, question.id)
        if (failedAttempts && failedAttempts.length >= 2) {
          const { data: example } = await getExampleAnswer(currentLevel.id, question.id)
          setExampleAnswer(example)
          setShowHelp(true)
        }
      }
    } catch (error) {
      console.error('Error loading question data:', error)
    }

    // Reset states for new question
    resetQuestionState()
  }

  const resetQuestionState = () => {
    setTranscript('')
    setAudioBlob(null)
    setFeedback(null)
    setCanSubmit(false)
    setRecordingTime(0)
    setShowHelp(false)
    setExampleAnswer(null)
    
    // Clean up any running timers
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const checkIfNewUser = () => {
    const hasUsedVoiceFeature = localStorage.getItem('hasUsedVoiceFeature')
    if (!hasUsedVoiceFeature) {
      setShowNewUserGuide(true)
    }
  }

  const startRecording = async () => {
    if (isDemo) {
      // Show demo overlay for non-authenticated users
      setShowHelp(true) // Reuse help modal for demo prompt
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setAudioBlob(audioBlob)
      }

      // Speech recognition with better error handling
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            }
          }
          
          // Update transcript with final results
          if (finalTranscript) {
            setTranscript(prev => (prev + ' ' + finalTranscript).trim())
          }
        }

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          // Try to restart recognition after error
          if (isRecording) {
            setTimeout(() => {
              try {
                recognitionRef.current.start()
              } catch (e) {
                console.warn('Could not restart speech recognition after error:', e)
              }
            }, 1000)
          }
        }

        recognitionRef.current.onend = () => {
          // Restart recognition if still recording
          if (isRecording) {
            try {
              recognitionRef.current.start()
            } catch (e) {
              console.warn('Could not restart speech recognition:', e)
            }
          }
        }

        recognitionRef.current.start()
      } else {
        alert('Speech recognition not supported in this browser. Please use Chrome or Edge.')
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Simple timer - no auto-submission, just safety maximum
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          const maxTime = 180 // 3 minutes maximum for safety
          
          // Warn user before hitting maximum
          if (newTime >= maxTime - 10 && newTime < maxTime) {
            console.log(`Recording will stop in ${maxTime - newTime} seconds`)
          }
          
          // Safety stop at maximum time
          if (newTime >= maxTime) {
            stopRecording()
            return maxTime
          }
          return newTime
        })
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    setIsRecording(false)
    
    // Always allow submission after stopping
    setCanSubmit(true)
  }

  const startNewRecording = () => {
    // Reset everything for a fresh start
    setTranscript('')
    setAudioBlob(null)
    setRecordingTime(0)
    setCanSubmit(false)
    setFeedback(null)
    
    // Start recording
    startRecording()
  }

  const analyzeAnswer = async () => {
    if (!transcript.trim() || !currentQuestion) {
      alert('Please record your answer before submitting.')
      return
    }

    setIsAnalyzing(true)
    
    try {
      // Progressive difficulty based on level
      const levelConfig = getLevelConfig(currentLevel.level_number)
      
      const analysis = await aiService.analyzeAnswer(
        currentQuestion.text,
        transcript,
        {
          category: category.name.toLowerCase(),
          level: currentLevel.level_number,
          recordingTime: recordingTime,
          // Progressive scoring configuration
          passRate: levelConfig.passRate,
          scoringWeights: levelConfig.weights,
          difficultyLevel: levelConfig.difficulty
        }
      )

      setFeedback(analysis)
      
      // Show result popup
      setResultData(analysis)
      setShowResultPopup(true)
      
      // Save attempt to database
      const attemptData = {
        user_id: user.id,
        level_id: currentLevel.id,
        question_id: currentQuestion.id,
        attempt_number: attempts.length + 1,
        score: analysis.overallScore,
        transcript: transcript,
        feedback_somali: analysis.feedback_somali,
        passed: analysis.passed,
        recording_duration: recordingTime
      }

      await saveUserAttempt(attemptData)
      
      // Auto progress sharing removed for cleaner chat experience

    } catch (error) {
      console.error('Error analyzing answer:', error)
      setFeedback({
        overallScore: 50,
        passed: false,
        feedback_somali: "⚠️ Wax khalad ah ayaa dhacay. Dib u isku day.",
        encouragement_somali: "🔄 Dib u isku day. Wax walba way hagaagi doontaa.",
        improvements_somali: ["Dib u isku day", "Internet-ka hubi"],
        strengths_somali: [],
        pronunciation_tips: "Dib u isku day markale."
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Progressive difficulty configuration
  const getLevelConfig = (levelNumber) => {
    switch (levelNumber) {
      case 1:
        return {
          passRate: 50,
          difficulty: 'beginner',
          minTime: 30,
          maxTime: 60,
          weights: {
            relevance: 30,
            grammar: 15,
            fluency: 25,
            pronunciation: 30
          }
        }
      case 2:
        return {
          passRate: 60,
          difficulty: 'elementary',
          minTime: 45,
          maxTime: 75,
          weights: {
            relevance: 35,
            grammar: 20,
            fluency: 25,
            pronunciation: 20
          }
        }
      case 3:
        return {
          passRate: 65,
          difficulty: 'intermediate',
          minTime: 60,
          maxTime: 90,
          weights: {
            relevance: 40,
            grammar: 25,
            fluency: 20,
            pronunciation: 15
          }
        }
      case 4:
      default:
        return {
          passRate: 70,
          difficulty: 'advanced',
          minTime: 60,
          maxTime: 90,
          weights: {
            relevance: 40,
            grammar: 25,
            fluency: 20,
            pronunciation: 15
          }
        }
    }
  }

  const nextQuestion = async () => {
    const levelConfig = getLevelConfig(currentLevel.level_number)
    if (!feedback?.passed) {
      alert(`You need to score ${levelConfig.passRate}% or higher to proceed to the next question.`)
      return
    }

    if (questionIndex < currentLevel.questions.length - 1) {
      setQuestionIndex(prev => prev + 1)
    } else {
      // Level completed! Update progress
      await updateLevelProgress()
      
      // Move to next level
      const nextLevelIndex = levels.findIndex(l => l.id === currentLevel.id) + 1
      if (nextLevelIndex < levels.length) {
        setCurrentLevel(levels[nextLevelIndex])
        setQuestionIndex(0)
      } else {
        // Category completed!
        await completeCategoryProgress()
        alert('🎉 Congratulations! You completed this category!')
        navigate('/dashboard')
      }
    }
  }

  // Update progress when a level is completed
  const updateLevelProgress = async () => {
    try {
      const { data: currentProgress } = await getUserProgress(user.id)
      const categoryProgress = currentProgress?.find(p => p.category_id === category.id)
      
      if (categoryProgress) {
        const newCompletedLevels = [...(categoryProgress.completed_levels || []), currentLevel.level_number]
        const uniqueCompletedLevels = [...new Set(newCompletedLevels)].sort((a, b) => a - b)
        
        // Calculate average score from user attempts for this level
        const { data: levelAttempts } = await getUserLevelProgress(user.id, currentLevel.id)
        const avgScore = levelAttempts?.length > 0 
          ? Math.round(levelAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / levelAttempts.length)
          : 0

        const updatedProgress = {
          ...categoryProgress,
          current_level: Math.max(categoryProgress.current_level, currentLevel.level_number + 1),
          completed_levels: uniqueCompletedLevels,
          total_score: Math.round((categoryProgress.total_score + avgScore) / 2), // Running average
          last_completed_at: new Date().toISOString()
        }
        
        await updateUserProgress(user.id, category.id, updatedProgress)
        console.log('Updated level progress:', updatedProgress)
      }
    } catch (error) {
      console.error('Error updating level progress:', error)
    }
  }

  // Complete category progress
  const completeCategoryProgress = async () => {
    try {
      const { data: currentProgress } = await getUserProgress(user.id)
      const categoryProgress = currentProgress?.find(p => p.category_id === category.id)
      
      if (categoryProgress) {
        const updatedProgress = {
          ...categoryProgress,
          completed_levels: levels.map(l => l.level_number),
          current_level: levels.length + 1,
          completed_at: new Date().toISOString()
        }
        
        await updateUserProgress(user.id, category.id, updatedProgress)
        console.log('Completed category progress:', updatedProgress)
      }
    } catch (error) {
      console.error('Error completing category progress:', error)
    }
  }

  const retryQuestion = () => {
    resetQuestionState()
  }

  const playAudio = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob))
      audio.play()
    }
  }

  const speakQuestion = () => {
    if (currentQuestion && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentQuestion.text)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  const loadRemainingVoiceMessages = async () => {
    try {
      const { data, error } = await getRemainingVoiceMessages(user.id)
      if (!error && data !== null) {
        setRemainingVoiceMessages(data)
      }
    } catch (error) {
      console.error('Error loading remaining voice messages:', error)
    }
  }

  const handleVoiceMessageSend = async (audioBlob, duration) => {
    if (!groupRoom || !audioBlob) {
      console.error('Missing requirements:', { groupRoom: !!groupRoom, audioBlob: !!audioBlob })
      alert('Unable to send voice message. Please try again.')
      return
    }

    console.log('Starting voice message send...', { 
      duration, 
      blobSize: audioBlob.size,
      roomId: groupRoom.id,
      userId: user.id
    })

    setIsUploadingVoice(true)
    
    try {
      // Check if user has remaining messages
      if (remainingVoiceMessages <= 0) {
        alert('You have reached your daily voice message limit (10/10). Try again tomorrow!')
        setShowVoiceRecorder(false)
        return
      }

      // Upload voice file
      console.log('Uploading voice file...')
      const { data: uploadData, error: uploadError } = await uploadVoiceMessage(
        audioBlob, 
        user.id, 
        groupRoom.id
      )
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log('Voice file uploaded successfully:', uploadData.publicUrl)

      // Send voice message
      console.log('Sending voice message to chat...')
      const { data, error } = await sendVoiceMessage(
        groupRoom.id,
        user.id, 
        uploadData.publicUrl,
        duration
      )
      
      if (error) {
        console.error('Send message error:', error)
        throw new Error(`Send failed: ${error.message}`)
      }
      
      console.log('Voice message sent successfully:', data)
      
      // Update remaining count
      setRemainingVoiceMessages(prev => Math.max(0, prev - 1))
      setShowVoiceRecorder(false)
      
      // Show success message
      setTimeout(() => {
        alert('🎤 Voice message sent successfully!')
      }, 500)
      
    } catch (error) {
      console.error('Error sending voice message:', error)
      
      // User-friendly error messages
      let errorMessage = 'Failed to send voice message. '
      if (error.message.includes('Upload failed')) {
        errorMessage += 'There was a problem uploading your recording. Check your internet connection and try again.'
      } else if (error.message.includes('Send failed')) {
        errorMessage += 'Your recording uploaded but failed to send to chat. Please try again.'
      } else if (error.message.includes('limit')) {
        errorMessage += 'You have reached your daily limit of 10 voice messages.'
      } else {
        errorMessage += 'Please check your internet connection and try again.'
      }
      
      alert(errorMessage)
    } finally {
      setIsUploadingVoice(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !groupRoom) return
    
    if (isDemo) {
      // Prevent demo users from sending messages
      setShowHelp(true) // Show signup prompt
      return
    }

    const messageText = newMessage.trim()
    const tempId = `temp_${Date.now()}`
    const tempMessage = {
      id: tempId,
      message: messageText,
      user_profiles: { full_name: user.user_metadata?.full_name || 'You' },
      created_at: new Date().toISOString(),
      user_id: user.id,
      message_type: 'text',
      metadata: {},
      isTemporary: true
    }

    // Add message to local state immediately for better UX
    setChatMessages(prev => [...prev, tempMessage])
    setNewMessage('')

    try {
      console.log('Sending message to room:', groupRoom.id)
      const { data, error } = await sendChatMessage(groupRoom.id, user.id, messageText)
      
      if (error) {
        throw error
      }
      
      console.log('Message sent successfully:', data)
      
      // Remove temporary message since real-time will add the actual one
      setChatMessages(prev => prev.filter(msg => msg.id !== tempId))
      
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Remove the temporary message if sending failed
      setChatMessages(prev => prev.filter(msg => msg.id !== tempId))
      setNewMessage(messageText) // Restore the message text
      
      // Show user-friendly error message
      alert('Failed to send message. Please check your connection and try again.')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!category || !currentLevel || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading learning content...</p>
          <p className="text-sm text-gray-500 mt-2">Category ID: {categoryId}</p>
          {category && <p className="text-sm text-gray-500">Category: {category.name}</p>}
          {currentLevel && <p className="text-sm text-gray-500">Level: {currentLevel.level_number}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 relative overflow-hidden">
      {/* Demo Mode Banner */}
      {isDemo && showBanner && (
        <SignUpBanner onDismiss={() => setShowBanner(false)} />
      )}

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-cyan-400 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-purple-400 rounded-full animate-pulse opacity-80"></div>
        <div className="absolute top-60 left-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse opacity-70"></div>
        <div className="absolute bottom-40 right-20 w-2 h-2 bg-cyan-300 rounded-full animate-pulse opacity-50"></div>
        <div className="absolute bottom-60 left-20 w-1 h-1 bg-purple-300 rounded-full animate-pulse opacity-90"></div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      {/* Modern Header */}
      <div className="relative z-10 backdrop-blur-xl bg-slate-900/20 border-b border-slate-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                className="group flex items-center space-x-1 sm:space-x-2 text-cyan-400 hover:text-cyan-300 transition-all duration-300 flex-shrink-0 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 hover:border-cyan-400/30 px-3 py-2 rounded-xl backdrop-blur-sm"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="hidden sm:inline font-medium">Dashboard</span>
              </button>
              <div className="h-4 sm:h-6 w-px bg-slate-600/50 hidden sm:block"></div>
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className="text-xl sm:text-2xl lg:text-3xl flex-shrink-0 filter drop-shadow-lg animate-pulse">
                  {category.icon}
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent truncate">
                    {category.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 truncate">
                    Level {currentLevel.level_number} • Question {questionIndex + 1}/{currentLevel.questions.length}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Chat Toggle */}
              <button
                onClick={() => setShowChat(!showChat)}
                className="group relative flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-400/30 hover:border-cyan-400/50 text-cyan-400 hover:text-cyan-300 px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-sm shadow-lg"
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-sm font-medium">Chat</span>
                <div className="flex items-center space-x-1 text-xs bg-slate-800/50 rounded-full px-2 py-1 border border-slate-600/50">
                  <Users className="w-3 h-3" />
                  <span>{onlineUsers}</span>
                </div>
              </button>
              
              {/* Score Display */}
              <div className="text-right bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl px-3 py-2 shadow-lg">
                <div className="text-xs text-slate-400 hidden sm:block">Score</div>
                <div className="text-base sm:text-lg lg:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {feedback?.overallScore || 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className={`transition-all duration-300 ${showChat ? 'lg:w-2/3' : 'w-full max-w-4xl mx-auto'}`}>
            {/* Modern Progress Bar */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium text-slate-300">
                    Heer {currentLevel.level_number} Horumarka
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-slate-400 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700/50">
                  {questionIndex + 1}/{currentLevel.questions.length}
                </span>
              </div>
              <div className="relative">
                <div className="w-full bg-slate-800/50 rounded-full h-3 sm:h-4 shadow-inner border border-slate-700/50 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 h-3 sm:h-4 rounded-full transition-all duration-500 shadow-lg relative overflow-hidden"
                    style={{ width: `${((questionIndex + 1) / currentLevel.questions.length) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <span className="text-xs text-slate-500">
                    {Math.round(((questionIndex + 1) / currentLevel.questions.length) * 100)}% La dhammaysay
                  </span>
                </div>
              </div>
            </div>

            {/* Modern Question Card */}
            <div className="relative group">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50"></div>
              
              <div className="relative bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-500">
                              <div className="text-center mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
                        <span className="text-slate-900 font-bold text-sm">{questionIndex + 1}</span>
                      </div>
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent">
                        Su'aal {questionIndex + 1}
                      </h2>
                    </div>
                    <button
                      onClick={speakQuestion}
                      className="group flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-all duration-300 bg-slate-800/50 hover:bg-slate-800/70 px-3 py-2 rounded-xl border border-slate-700/50 hover:border-cyan-400/30 backdrop-blur-sm"
                    >
                      <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-sm font-medium">Dhagayso</span>
                    </button>
                  </div>
                  <p className="text-base sm:text-lg lg:text-xl text-slate-200 mb-6 leading-relaxed font-medium">{currentQuestion.text}</p>
                  <div className="flex items-center justify-center space-x-4 text-xs sm:text-sm">
                    <div className="flex items-center space-x-2 bg-slate-800/50 rounded-full px-4 py-2 border border-slate-700/50">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
                      <span className="text-slate-400">Recommended: {getLevelConfig(currentLevel.level_number).minTime}s - {getLevelConfig(currentLevel.level_number).maxTime}s</span>
                    </div>
                  </div>
                </div>

              {/* Recording Section */}
              <div className="text-center mb-6 relative">
                {/* Two-Button System */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mb-6">
                  {/* Start Recording Button */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <button
                      onClick={transcript ? startNewRecording : startRecording}
                      disabled={isRecording || isAnalyzing}
                      className={`relative w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full flex flex-col items-center justify-center text-white font-bold text-sm sm:text-lg transition-all duration-300 transform bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 hover:scale-110 shadow-2xl hover:shadow-emerald-500/25 border-4 border-slate-700/50 group-hover:border-emerald-400/50 ${
                        isRecording || isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Mic className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-xs sm:text-sm font-bold text-center leading-tight">{transcript ? 'RECORD AGAIN' : 'START RECORDING'}</span>
                    </button>
                  </div>

                  {/* Stop Recording Button */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <button
                      onClick={stopRecording}
                      disabled={!isRecording || isAnalyzing}
                      className={`relative w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full flex flex-col items-center justify-center text-white font-bold text-sm sm:text-lg transition-all duration-300 transform bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 hover:scale-110 shadow-2xl hover:shadow-red-500/25 border-4 border-slate-700/50 group-hover:border-red-400/50 ${
                        !isRecording || isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'animate-pulse'
                      }`}
                    >
                      <MicOff className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-xs sm:text-sm font-bold text-center leading-tight">STOP RECORDING</span>
                    </button>
                  </div>
                </div>

                {/* Demo Overlay for Voice Recording */}
                {isDemo && (
                  <DemoOverlay 
                    type="voice"
                    className="absolute inset-0 rounded-3xl"
                    title="Diiwaangeli si aad u celceliso codkaaga!"
                    description="Hel jawaab celin AI ah oo ku saabsan dhawaaqida, naxwaha, iyo fasaxa."
                  />
                )}
              </div>
                
                {/* Status Message */}
                <div className="mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-800/20 to-slate-700/20 rounded-2xl blur-xl"></div>
                    <div className="relative bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4">
                      <p className="text-base sm:text-lg lg:text-xl font-medium text-slate-200 mb-2 text-center">
                        {isAnalyzing 
                          ? '🤖 AI is analyzing your answer...'
                          : isRecording 
                          ? `🎤 Recording... ${formatTime(recordingTime)}` 
                          : transcript 
                          ? '✅ Ready to submit or record again'
                          : '🎯 Click START RECORDING to begin'}
                      </p>
                      
                      {!isRecording && !transcript && (
                        <div className="text-center">
                          <p className="text-cyan-400 text-sm sm:text-base bg-slate-800/50 rounded-xl px-3 sm:px-4 py-2 inline-block border border-slate-700/50">
                            💡 Recommended: Speak for at least {getLevelConfig(currentLevel.level_number).minTime} seconds for better analysis
                          </p>
                        </div>
                      )}
                      
                      {isRecording && recordingTime >= 150 && (
                        <div className="text-center">
                          <p className="text-orange-400 text-sm sm:text-base animate-pulse bg-slate-800/50 rounded-xl px-3 sm:px-4 py-2 inline-block border border-orange-500/30">
                            ⚠️ Recording will stop automatically in {180 - recordingTime} seconds
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar - Only when recording */}
                {isRecording && (
                  <div className="w-full max-w-sm sm:max-w-md mx-auto mb-6 px-4">
                    <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 shadow-inner">
                      <div
                        className="h-3 sm:h-4 rounded-full transition-all duration-300 shadow-sm bg-gradient-to-r from-green-400 to-green-500"
                        style={{ width: `${Math.min((recordingTime / 180) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>0:00</span>
                      <span className="font-medium">{formatTime(recordingTime)}</span>
                      <span>3:00 max</span>
                    </div>
                  </div>
                )}
              </div>



              {/* Submit Button - Modern */}
              {!feedback && !isAnalyzing && transcript && !isRecording && (
                <div className="mb-6">
                  <button
                    onClick={analyzeAnswer}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-5 rounded-2xl font-bold transition-all text-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    ✨ Submit for Analysis
                  </button>
                  {recordingTime < getLevelConfig(currentLevel.level_number).minTime && (
                    <p className="text-center text-orange-600 text-sm mt-3 bg-orange-50 rounded-lg px-4 py-2 inline-block">
                      💡 Recording is short ({formatTime(recordingTime)}). Consider recording for at least {getLevelConfig(currentLevel.level_number).minTime}s for better feedback.
                    </p>
                  )}
                </div>
              )}

              {/* Analysis Loading - Modern */}
              {isAnalyzing && (
                <div className="text-center py-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl backdrop-blur-sm border border-blue-200">
                  <div className="relative mb-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-lg font-semibold text-gray-700 animate-pulse">🤖 AI is analyzing your answer...</p>
                    <p className="text-sm text-gray-600 animate-fade-in-out">Checking pronunciation, grammar, and fluency...</p>
                    <div className="flex justify-center space-x-1 mt-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modern Feedback */}
              {feedback && (
                <div className="space-y-6">
                  {/* Score Overview - Modern */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className={`text-center p-4 rounded-xl shadow-sm ${feedback.passed ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                      <div className={`text-xl font-bold ${feedback.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {feedback.overallScore}%
                      </div>
                      <div className={`text-xs font-medium ${feedback.passed ? 'text-green-700' : 'text-red-700'}`}>
                        Overall
                      </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm">
                      <div className="text-xl font-bold text-blue-600">{feedback.grammarScore}%</div>
                      <div className="text-xs font-medium text-blue-700">Grammar</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 border-2 border-purple-200 rounded-xl shadow-sm">
                      <div className="text-xl font-bold text-purple-600">{feedback.pronunciationScore}%</div>
                      <div className="text-xs font-medium text-purple-700">Speech</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 border-2 border-orange-200 rounded-xl shadow-sm">
                      <div className="text-xl font-bold text-orange-600">{feedback.fluencyScore}%</div>
                      <div className="text-xs font-medium text-orange-700">Fluency</div>
                    </div>
                  </div>

                  {/* Main Feedback - Modern */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">
                        {feedback.passed ? '🎉' : '📝'}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-800 font-medium text-base leading-relaxed">
                          {feedback.feedback_somali}
                        </p>
                        {feedback.encouragement_somali && (
                          <p className="text-green-700 font-medium text-base mt-3 bg-green-50 rounded-lg px-4 py-2">
                            💪 {feedback.encouragement_somali}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Modern */}
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={retryQuestion}
                      className="flex items-center space-x-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>Try Again</span>
                    </button>
                    
                    {feedback.passed ? (
                      <button
                        onClick={nextQuestion}
                        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <ArrowRight className="w-5 h-5" />
                        <span>Next Question</span>
                      </button>
                    ) : (
                      <div className="text-center">
                        <p className="text-red-600 font-medium text-sm mb-3 bg-red-50 rounded-lg px-4 py-2">
                          Need {getLevelConfig(currentLevel.level_number).passRate}% to continue
                        </p>
                        {attempts.length >= 2 && (
                          <button
                            onClick={() => setShowHelp(true)}
                            className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <HelpCircle className="w-5 h-5" />
                            <span>Get Help</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Help Modal */}
            {showHelp && exampleAnswer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Example Answer</h2>
                    <p className="text-gray-600">Here's how you could answer this question:</p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-blue-800 mb-3">Sample Response:</h3>
                    <p className="text-blue-700 text-lg leading-relaxed">{exampleAnswer.example_text}</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-green-800 mb-3">🇸🇴 Tusaale Somali ah:</h3>
                    <p className="text-green-700 leading-relaxed">
                      Tusaalahan wuxuu ku tusinayaa sida aad ugu jawaabi karto su'aalahan si fiican. 
                      Ku dayasho erayada, dhegayso si fiican, oo isku day inaad ka hadashid sidaas oo kale.
                    </p>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setShowHelp(false)}
                      className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowHelp(false)
                        retryQuestion()
                      }}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modern Chat Sidebar */}
          {showChat && groupRoom && (
            <div className={`${showChat ? 'block' : 'hidden'} lg:w-1/3 w-full transition-all duration-500 mt-6 lg:mt-0`}>
              <div className="bg-gradient-to-br from-white/95 via-blue-50/90 to-purple-50/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 h-fit lg:sticky lg:top-24 overflow-hidden relative">
                {/* Modern Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-4 left-4 w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-xl"></div>
                  <div className="absolute bottom-4 right-4 w-16 h-16 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full blur-xl"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full blur-2xl"></div>
                </div>
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-3 sm:p-4 text-white relative overflow-hidden">
                  {/* Header Background Animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base sm:text-lg">{category?.name} Chat</h3>
                      <p className="text-blue-100 text-xs sm:text-sm">Connect with fellow learners</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/20 rounded-full px-2 sm:px-3 py-1">
                      <div className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-400' : 
                        connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></div>
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">{onlineUsers}</span>
                    </div>
                  </div>
                </div>
              
                {/* Chat Messages with Modern Background */}
                <div 
                  className="h-80 sm:h-96 lg:h-[500px] overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 relative scroll-smooth"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(240,248,255,0.8) 50%, rgba(245,243,255,0.9) 100%)',
                    scrollBehavior: 'smooth'
                  }}
                >
                  {/* Modern Background Pattern */}
                  <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-0 left-0 w-full h-full" style={{
                      backgroundImage: `
                        radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.05) 0%, transparent 50%)
                      `
                    }}></div>
                  </div>
                  
                  {/* Floating Particles */}
                  <div className="absolute inset-0 pointer-events-none opacity-10">
                    <div className="absolute top-10 left-10 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
                    <div className="absolute bottom-20 left-20 w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>
                    <div className="absolute bottom-10 right-10 w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '3s'}}></div>
                  </div>
                  
                  <div className="relative z-10">
                    {chatMessages.slice(-20).map((message, idx) => {
                      const isCurrentUser = message.user_id === user.id
                      const displayName = isCurrentUser ? "You" : `User ${message.user_id.slice(-4)}`
                      
                      return (
                        <div key={message.id || idx} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}>
                          <div className={`max-w-xs sm:max-w-sm lg:max-w-xs ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                            {/* User Info */}
                            <div className={`flex items-center space-x-1 sm:space-x-2 mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                isCurrentUser ? 'bg-blue-500' : 'bg-purple-500'
                              }`}>
                                {isCurrentUser ? 'Y' : message.user_id.slice(-1).toUpperCase()}
                              </div>
                              <span className="text-xs text-gray-500 font-medium">{displayName}</span>
                              <span className="text-xs text-gray-400">
                                {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            
                            {/* Message Bubble */}
                            <div className={`relative px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-sm ${
                              isCurrentUser 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                : 'bg-white border border-gray-200 text-gray-800'
                            } ${message.isTemporary ? 'opacity-70' : ''}`}>
                              
                              {/* Voice Message */}
                              {message.message_type === 'voice' ? (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className={`p-2 rounded-full ${isCurrentUser ? 'bg-white/20' : 'bg-blue-100'} animate-pulse`}>
                                      <Volume2 className={`w-4 h-4 ${isCurrentUser ? 'text-white' : 'text-blue-600'}`} />
                                    </div>
                                    <div className={`text-xs font-medium ${isCurrentUser ? 'text-blue-100' : 'text-blue-600'}`}>
                                      🎤 Voice Message ({message.voice_duration}s)
                                    </div>
                                  </div>
                                  <div className="w-full">
                                    <audio 
                                      controls 
                                      className="w-full"
                                      style={{
                                        height: '36px',
                                        borderRadius: '8px',
                                        backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.1)'
                                      }}
                                      preload="metadata"
                                    >
                                      <source src={message.voice_url} type="audio/webm" />
                                      <source src={message.voice_url} type="audio/wav" />
                                      <source src={message.voice_url} type="audio/mp3" />
                                      Your browser does not support audio playback.
                                    </audio>
                                  </div>
                                  <div className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'} flex items-center space-x-1`}>
                                    <span>🔊</span>
                                    <span>Click to play • Practice your listening skills</span>
                                  </div>
                                </div>
                              ) : (
                                /* Text Message */
                                <p className="text-xs sm:text-sm leading-relaxed break-words">
                                  {message.message}
                                </p>
                              )}
                              
                              {/* Message Tail */}
                              <div className={`absolute top-2 sm:top-3 w-2 h-2 sm:w-3 sm:h-3 transform rotate-45 ${
                                isCurrentUser 
                                  ? 'bg-blue-500 -right-1' 
                                  : 'bg-white border-l border-b border-gray-200 -left-1'
                              }`}></div>
                              
                              {message.isTemporary && (
                                <div className="absolute -bottom-1 right-2 text-xs text-blue-300">
                                  Sending...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Auto-scroll anchor */}
                    <div ref={chatMessagesEndRef} />
                    
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8 sm:py-12">
                        <div className="bg-white/80 rounded-2xl p-4 sm:p-6 mx-2 sm:mx-4">
                          <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-400" />
                          <h4 className="font-semibold text-gray-600 mb-1 sm:mb-2 text-sm sm:text-base">No messages yet</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Start the conversation and connect with other learners!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              
                {/* Message Input */}
                <div className="p-3 sm:p-4 bg-gradient-to-r from-white/90 via-blue-50/80 to-purple-50/90 border-t border-white/30 backdrop-blur-xl relative">
                  {/* Input Area Background Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-purple-400/5 to-pink-400/5 rounded-b-3xl"></div>
                  <div className="flex space-x-2 sm:space-x-3 mb-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="💬 Type your message..."
                        className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/95 border-2 border-white/50 hover:border-blue-300/60 focus:border-purple-400/60 rounded-2xl focus:ring-2 focus:ring-purple-500/20 text-sm text-gray-700 placeholder-gray-400 shadow-lg backdrop-blur-xl transition-all duration-300 pr-12 hover:shadow-xl focus:shadow-2xl"
                      />
                      {newMessage.trim() && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          <span className="text-xs">{newMessage.length}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Voice Message Button */}
                    <button
                      onClick={() => setShowVoiceRecorder(true)}
                      disabled={remainingVoiceMessages <= 0}
                      className="group relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                      title={`🎤 Voice message (${remainingVoiceMessages} left)`}
                    >
                      <Mic className="w-5 h-5 sm:w-6 sm:h-6 group-hover:animate-pulse" />
                      {remainingVoiceMessages > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                          {remainingVoiceMessages}
                        </div>
                      )}
                      {remainingVoiceMessages <= 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          ✕
                        </div>
                      )}
                    </button>
                    
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="group w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                      title="Send message"
                    >
                      <Send className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                    </button>
                  </div>
                  
                  {/* Status Bar */}
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-3 text-gray-600">
                      <span className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${
                          connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                          connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-medium">
                          {connectionStatus === 'connected' ? 'Connected' : 
                           connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                        </span>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>Be respectful and helpful 🤝</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {remainingVoiceMessages > 5 ? (
                        <span className="text-green-600 font-medium">🎤 {remainingVoiceMessages} left</span>
                      ) : remainingVoiceMessages > 0 ? (
                        <span className="text-orange-600 font-medium">🎤 {remainingVoiceMessages} left</span>
                      ) : (
                        <span className="text-red-600 font-medium">🚫 No voice messages left</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result Popup Modal */}
      {showResultPopup && resultData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className={`p-6 text-center ${resultData.passed ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`}>
              <div className="text-6xl mb-3">
                {resultData.passed ? '🎉' : '😔'}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {resultData.passed ? 'Waad baastay!' : 'Waad dhacday'}
              </h2>
              <p className="text-white text-lg opacity-90">
                {resultData.passed ? 'Shaqo fiican!' : 'Dib u isku day'}
              </p>
            </div>
            
            {/* Score */}
            <div className="p-6 text-center">
              <div className={`text-4xl font-bold mb-2 ${resultData.passed ? 'text-green-600' : 'text-red-600'}`}>
                {resultData.overallScore}%
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{resultData.grammarScore}%</div>
                  <div className="text-xs text-gray-600">Grammar</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">{resultData.pronunciationScore}%</div>
                  <div className="text-xs text-gray-600">Speech</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600">{resultData.fluencyScore}%</div>
                  <div className="text-xs text-gray-600">Fluency</div>
                </div>
              </div>
              
              {/* Feedback */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-800 text-sm leading-relaxed">
                  {resultData.feedback_somali}
                </p>
                {resultData.encouragement_somali && (
                  <p className="text-green-700 font-medium text-sm mt-2">
                    💪 {resultData.encouragement_somali}
                  </p>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowResultPopup(false)
                    retryQuestion()
                  }}
                  className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Ku celi
                </button>
                
                {resultData.passed ? (
                  <button
                    onClick={() => {
                      setShowResultPopup(false)
                      nextQuestion()
                    }}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Xigta
                  </button>
                ) : (
                  <button
                    onClick={() => setShowResultPopup(false)}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Recorder Modal */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onSendVoice={handleVoiceMessageSend}
          onCancel={() => setShowVoiceRecorder(false)}
          maxDuration={60}
          remainingMessages={remainingVoiceMessages}
          isUploading={isUploadingVoice}
        />
      )}

      {/* New User Guide Modal */}
      {showNewUserGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-lg mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Voice Learning!</h2>
              <div className="text-left space-y-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <p className="text-gray-700">Record for at least 1 minute to submit your answer</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <p className="text-gray-700">Score 60% or higher to advance to the next question</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <p className="text-gray-700">Get feedback in Somali to understand better</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <p className="text-gray-700">Chat with other learners for support and practice</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                  <p className="text-gray-700">Send voice messages in chat to practice with others (10 per day)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNewUserGuide(false)
                  localStorage.setItem('hasUsedVoiceFeature', 'true')
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Got it! Let's start learning
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

export default SpeakingLearning 