import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Mic, MicOff, Play, ArrowLeft, ArrowRight, Trophy, Target, 
  Volume2, RotateCcw, MessageCircle, Users, Send, HelpCircle,
  Clock, CheckCircle, XCircle, Star
} from 'lucide-react'
import { aiService } from '../services/aiService'
import { 
  getCategories, getLevelsForCategory, getUserAttempts, saveUserAttempt,
  getFailedAttempts, getExampleAnswer, canUserProceed, getUserLevelProgress,
  getGroupRooms, getChatMessages, sendChatMessage, subscribeToChatMessages
} from '../lib/supabase'

const SpeakingLearning = () => {
  const { categoryId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
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
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false)
  
  // Silence detection state
  const [lastSpeechTime, setLastSpeechTime] = useState(0)
  const [silenceCountdown, setSilenceCountdown] = useState(0)
  const [showSilenceWarning, setShowSilenceWarning] = useState(false)
  
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
  
  // UI state
  const [showNewUserGuide, setShowNewUserGuide] = useState(false)
  const [showResultPopup, setShowResultPopup] = useState(false)
  const [resultData, setResultData] = useState(null)
  
  // Refs
  const mediaRecorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const audioChunksRef = useRef([])
  const chatSubscriptionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const silenceCountdownRef = useRef(null)

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

  // Auto-open chat when component loads
  useEffect(() => {
    setShowChat(true)
  }, [])

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
    } catch (error) {
      console.error('Error loading category and levels:', error)
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
      // Load from localStorage first for instant display
      const cachedMessages = localStorage.getItem(`chat_${groupRoom.id}`)
      if (cachedMessages) {
        try {
          const parsed = JSON.parse(cachedMessages)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatMessages(parsed)
          }
        } catch (e) {
          console.warn('Failed to parse cached messages:', e)
          localStorage.removeItem(`chat_${groupRoom.id}`)
        }
      }

      // Then load fresh data from server
      const { data: messages, error } = await getChatMessages(groupRoom.id)
      if (error) {
        console.error('Error loading chat messages from server:', error)
        return
      }
      
      if (messages && messages.length > 0) {
        // Messages come in descending order, reverse to get chronological order
        const chronologicalMessages = [...messages].reverse()
        setChatMessages(chronologicalMessages)
        
        // Cache messages for persistence
        localStorage.setItem(`chat_${groupRoom.id}`, JSON.stringify(chronologicalMessages))
        
        // Update online users count based on recent activity
        const activeCount = getActiveUsersCount(chronologicalMessages)
        setOnlineUsers(activeCount)
      }
    } catch (error) {
      console.error('Error loading chat messages:', error)
    }
  }

  const setupChatSubscription = () => {
    if (!groupRoom || chatSubscriptionRef.current) return
    
    console.log('Setting up chat subscription for room:', groupRoom.id)
    setConnectionStatus('connecting')
    
    chatSubscriptionRef.current = subscribeToChatMessages(groupRoom.id, (payload) => {
      console.log('Received real-time message:', payload.new)
      setConnectionStatus('connected')
      
      setChatMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg.id === payload.new.id)
        if (messageExists) {
          console.log('Message already exists, skipping duplicate')
          return prev
        }
        
        // Add new message to the end (chronological order)
        const newMessages = [...prev, payload.new]
        
        // Cache updated messages
        try {
          localStorage.setItem(`chat_${groupRoom.id}`, JSON.stringify(newMessages))
        } catch (e) {
          console.warn('Failed to cache messages:', e)
        }
        
        // Update online count when new messages arrive
        const activeCount = getActiveUsersCount(newMessages)
        setOnlineUsers(activeCount)
        
        return newMessages
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
    
    // Get unique users who sent messages in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    const recentMessages = messages.filter(msg => 
      new Date(msg.created_at) > thirtyMinutesAgo
    )
    
    const uniqueUsers = new Set(recentMessages.map(msg => msg.user_id))
    return Math.max(uniqueUsers.size, 1) // At least 1 (current user)
  }

  const loadCurrentQuestion = async () => {
    if (!currentLevel || !currentLevel.questions || questionIndex >= currentLevel.questions.length) {
      return
    }

    const question = currentLevel.questions[questionIndex]
    setCurrentQuestion(question)
    
    // Load user attempts for this question
    try {
      const { data: userAttempts } = await getUserAttempts(user.id, currentLevel.id, question.id)
      setAttempts(userAttempts || [])
      
      // Check if user needs help (2+ failed attempts)
      const { data: failedAttempts } = await getFailedAttempts(user.id, currentLevel.id, question.id)
      if (failedAttempts && failedAttempts.length >= 2) {
        const { data: example } = await getExampleAnswer(currentLevel.id, question.id)
        setExampleAnswer(example)
        setShowHelp(true)
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
    setIsAutoSubmitting(false)
    
    // Reset silence detection
    setLastSpeechTime(0)
    setSilenceCountdown(0)
    setShowSilenceWarning(false)
    
    // Clean up any running timers
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current) // Changed from clearTimeout to clearInterval
      silenceTimerRef.current = null
    }
    
    if (silenceCountdownRef.current) {
      clearInterval(silenceCountdownRef.current)
      silenceCountdownRef.current = null
    }
  }

  const checkIfNewUser = () => {
    const hasUsedVoiceFeature = localStorage.getItem('hasUsedVoiceFeature')
    if (!hasUsedVoiceFeature) {
      setShowNewUserGuide(true)
    }
  }

  const startRecording = async () => {
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

      // Speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = ''
          let interimTranscript = ''
          let hasNewSpeech = false
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
              hasNewSpeech = true
            } else {
              interimTranscript += event.results[i][0].transcript
            }
          }
          
          // Update transcript with final results
          if (finalTranscript) {
            setTranscript(prev => prev + ' ' + finalTranscript)
          }
          
          // Update last speech time for ANY speech (final or interim)
          if (hasNewSpeech || interimTranscript.trim().length > 0) {
            console.log('Speech detected:', finalTranscript || interimTranscript)
            setLastSpeechTime(Date.now())
            setShowSilenceWarning(false)
            setSilenceCountdown(0)
            
            // Clear any existing silence countdown
            if (silenceCountdownRef.current) {
              clearInterval(silenceCountdownRef.current)
              silenceCountdownRef.current = null
            }
          }
        }

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
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
      
      // Progressive timer logic based on level
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          const levelConfig = getLevelConfig(currentLevel.level_number)
          const minimumTime = levelConfig.minTime
          const maximumTime = levelConfig.maxTime
          
          // Enable submit after minimum time
          if (newTime >= minimumTime) {
            setCanSubmit(true)
          }
          
          // Auto-submit at maximum time
          if (newTime >= maximumTime) {
            stopRecording()
            setTimeout(() => {
              setIsAutoSubmitting(true)
              analyzeAnswer()
            }, 1000)
            return maximumTime
          }
          return newTime
        })
      }, 1000)
      
      // Separate silence detection timer
      const silenceCheckInterval = setInterval(() => {
        const currentTime = Date.now()
        const timeSinceLastSpeech = currentTime - lastSpeechTime
        const silenceThreshold = 5000 // 5 seconds of silence
        
        // Only trigger silence detection if we have some recording time and reached minimum
        if (recordingTime >= getLevelConfig(currentLevel.level_number).minTime && 
            timeSinceLastSpeech > silenceThreshold && 
            !showSilenceWarning && 
            !silenceCountdownRef.current &&
            isRecording) {
          
          console.log('Silence detected, starting countdown...')
          setShowSilenceWarning(true)
          setSilenceCountdown(3)
          
          silenceCountdownRef.current = setInterval(() => {
            setSilenceCountdown(prev => {
              if (prev <= 1) {
                // Auto-submit due to silence
                clearInterval(silenceCountdownRef.current)
                silenceCountdownRef.current = null
                setShowSilenceWarning(false)
                
                console.log('Auto-submitting due to silence...')
                stopRecording()
                setTimeout(() => {
                  setIsAutoSubmitting(true)
                  analyzeAnswer()
                }, 500)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }
      }, 1000)
      
      // Store silence check interval for cleanup
      silenceTimerRef.current = silenceCheckInterval
      
      // Initialize speech tracking
      setLastSpeechTime(Date.now())

    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    // Prevent stopping before minimum time
    const levelConfig = getLevelConfig(currentLevel.level_number)
    const minimumTime = levelConfig.minTime
    
    if (recordingTime < minimumTime) {
      alert(`⚠️ Ma joojin kartid! Ugu yaraan ${minimumTime} ilbiriqsi ayaa loo baahan yahay. Hadda: ${recordingTime} ilbiriqsi. Sii hadal!`)
      return // Don't stop recording
    }

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
    
    // Clean up silence detection timers
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    
    if (silenceCountdownRef.current) {
      clearInterval(silenceCountdownRef.current)
      silenceCountdownRef.current = null
    }
    
    setIsRecording(false)
    setShowSilenceWarning(false)
    setSilenceCountdown(0)
  }

  const startNewRecording = () => {
    // Reset everything for a fresh start
    setTranscript('')
    setAudioBlob(null)
    setRecordingTime(0)
    setCanSubmit(false)
    setLastSpeechTime(0)
    setSilenceCountdown(0)
    setShowSilenceWarning(false)
    
    // Start recording
    startRecording()
  }

  const analyzeAnswer = async () => {
    const levelConfig = getLevelConfig(currentLevel.level_number)
    const minimumTime = levelConfig.minTime
    
    if (!transcript.trim() || !currentQuestion || recordingTime < minimumTime) {
      alert(`Please record for at least ${minimumTime} seconds before submitting.`)
      setIsAutoSubmitting(false)
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
      setIsAutoSubmitting(false)
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
      // Level completed, move to next level
      const nextLevelIndex = levels.findIndex(l => l.id === currentLevel.id) + 1
      if (nextLevelIndex < levels.length) {
        setCurrentLevel(levels[nextLevelIndex])
        setQuestionIndex(0)
      } else {
        // Category completed!
        alert('🎉 Congratulations! You completed this category!')
        navigate('/dashboard')
      }
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !groupRoom) return

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
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.90), rgba(51, 65, 85, 0.85)), url('https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=2125&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      
      {/* Futuristic Header */}
      <div className="bg-slate-900/95 backdrop-blur-xl shadow-2xl border-b border-cyan-500/30 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-1 sm:space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <div className="h-4 sm:h-6 w-px bg-cyan-500/50 hidden sm:block"></div>
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <span className="text-xl sm:text-2xl lg:text-3xl flex-shrink-0">{category.icon}</span>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-white truncate">{category.name}</h1>
                  <p className="text-xs sm:text-sm text-cyan-300 truncate">
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
                className="relative flex items-center space-x-1 sm:space-x-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-2 sm:px-4 py-2 rounded-lg transition-colors border border-cyan-500/30"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Chat</span>
                <div className="flex items-center space-x-1 text-xs">
                  <Users className="w-3 h-3" />
                  <span className="hidden lg:inline">{onlineUsers}</span>
                </div>
              </button>
              
              {/* Score Display */}
              <div className="text-right">
                <div className="text-xs text-cyan-400 hidden sm:block">Score</div>
                <div className="text-base sm:text-lg lg:text-2xl font-bold text-white">
                  {feedback?.overallScore || 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className={`transition-all duration-300 ${showChat ? 'lg:w-2/3' : 'w-full max-w-4xl mx-auto'}`}>
            {/* Futuristic Progress Bar */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium text-cyan-300 drop-shadow-lg">
                  Level {currentLevel.level_number} Progress
                </span>
                <span className="text-xs sm:text-sm text-cyan-400/80 drop-shadow-lg">
                  {questionIndex + 1}/{currentLevel.questions.length}
                </span>
              </div>
              <div className="w-full bg-slate-800/50 rounded-full h-2 sm:h-3 backdrop-blur-sm border border-cyan-500/30">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 sm:h-3 rounded-full transition-all duration-500 shadow-lg shadow-cyan-500/50"
                  style={{ width: `${((questionIndex + 1) / currentLevel.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Futuristic Question Card */}
            <div className="bg-slate-900/90 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 border border-cyan-500/30 transition-all duration-500 hover:shadow-cyan-500/20 hover:shadow-2xl">
              <div className="text-center mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                    Question {questionIndex + 1}
                  </h2>
                  <button
                    onClick={speakQuestion}
                    className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/20 hover:bg-cyan-500/30 px-3 py-1 rounded-lg border border-cyan-500/30"
                  >
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm">Listen</span>
                  </button>
                </div>
                <p className="text-base sm:text-lg lg:text-xl text-cyan-100 mb-4 leading-relaxed">{currentQuestion.text}</p>
                <div className="flex items-center justify-center space-x-4 text-xs sm:text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{getLevelConfig(currentLevel.level_number).minTime}s - {getLevelConfig(currentLevel.level_number).maxTime}s</span>
                  </div>
                </div>
              </div>

              {/* Recording Section */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="relative inline-block mb-4">
                  {!isRecording ? (
                    <button
                      onClick={transcript ? startNewRecording : startRecording}
                      disabled={isAnalyzing}
                      className={`w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full flex flex-col items-center justify-center text-white font-bold text-base sm:text-lg transition-all duration-300 transform bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 hover:scale-105 shadow-lg shadow-cyan-500/50 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''} border-2 border-white/20`}
                    >
                      <Mic className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mb-1" />
                      <span className="text-sm sm:text-base font-bold">{transcript ? 'CUSUB' : 'BILOW'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      disabled={isAnalyzing}
                      className={`w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full flex flex-col items-center justify-center text-white font-bold text-base sm:text-lg transition-all duration-300 transform bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 scale-110 animate-pulse shadow-lg shadow-red-500/50 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''} border-2 border-white/20`}
                    >
                      <MicOff className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mb-1" />
                      <span className="text-sm sm:text-base font-bold">JOOJI</span>
                    </button>
                  )}
                  
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full border-2 sm:border-4 border-cyan-400 animate-ping"></div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <p className="text-base sm:text-lg lg:text-xl font-medium text-cyan-100 px-2">
                    {isAutoSubmitting 
                      ? '🎯 Jawaabka la gudbinayaa...'
                      : isRecording 
                      ? `🎤 Duubista... ${formatTime(recordingTime)} - Sii hadal!` 
                      : transcript 
                      ? '🎯 CUSUB riix si aad duub cusub u bilowdo'
                      : '🎯 BILOW riix si aad u bilowdo duubista'}
                  </p>
                  
                  {isRecording && (
                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                        <span className="text-sm sm:text-base font-medium text-cyan-300">DUUBISTA SOCOTA</span>
                        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-sm sm:text-base text-cyan-400 px-4">
                        💡 Si cad oo dabiici ah u hadal. Ma joojin kartid ilaa aad gaadhid ugu yaraan {getLevelConfig(currentLevel.level_number).minTime} ilbiriqsi.
                      </p>
                    </div>
                  )}
                  
                  {recordingTime > 0 && (
                    <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-2 sm:px-4">
                      {(() => {
                        const levelConfig = getLevelConfig(currentLevel.level_number)
                        const minTime = levelConfig.minTime
                        const maxTime = levelConfig.maxTime
                        const progress = (recordingTime / maxTime) * 100
                        
                        return (
                          <>
                            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-300 mb-2">
                              <span>0:00</span>
                              <span className={`text-center px-2 py-1 rounded-lg font-medium ${
                                recordingTime >= minTime ? 'text-green-300 bg-green-500/20' : 'text-orange-300 bg-orange-500/20'
                              }`}>
                                {recordingTime >= minTime ? '🎯 Diyaar!' : `${Math.max(minTime - recordingTime, 0)}s ugu yaraan`}
                              </span>
                              <span>{Math.floor(maxTime/60)}:{(maxTime%60).toString().padStart(2,'0')}</span>
                            </div>
                            <div className="w-full bg-slate-700/50 rounded-full h-4 mb-3 border border-cyan-500/30">
                              <div
                                className={`h-4 rounded-full transition-all duration-300 shadow-lg ${
                                  recordingTime >= minTime ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-orange-400 to-orange-500'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              ></div>
                            </div>
                          </>
                        )
                      })()}
                      {(() => {
                        const levelConfig = getLevelConfig(currentLevel.level_number)
                        const minTime = levelConfig.minTime
                        
                        return recordingTime >= minTime && isRecording && !isAutoSubmitting && (
                          <div className="mt-3 text-center space-y-3">
                            {showSilenceWarning && (
                              <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3 mb-3">
                                <p className="text-yellow-200 font-medium text-sm sm:text-base">
                                  ⚠️ {silenceCountdown} ilbiriqsi gudaha jawaabka la gudbinayaa...
                                </p>
                                <button
                                  onClick={() => {
                                    setShowSilenceWarning(false)
                                    setSilenceCountdown(0)
                                    setLastSpeechTime(Date.now())
                                    if (silenceCountdownRef.current) {
                                      clearInterval(silenceCountdownRef.current)
                                      silenceCountdownRef.current = null
                                    }
                                  }}
                                  className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                  Sii Hadal
                                </button>
                              </div>
                            )}
                            <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-3">
                              <p className="text-green-200 font-medium text-sm sm:text-base mb-2">
                                ✅ Waqtigaaga ugu yaraan waa la gaaray! Hadda waad joojin kartaa.
                              </p>
                              <button
                                onClick={() => {
                                  stopRecording()
                                  setTimeout(() => {
                                    setIsAutoSubmitting(true)
                                    analyzeAnswer()
                                  }, 500)
                                }}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-colors text-base shadow-lg"
                              >
                                🎯 Jooji oo Gudbi
                              </button>
                            </div>
                          </div>
                        )
                      })()}
                      {isAutoSubmitting && (
                        <div className="mt-4 text-center">
                          <div className="bg-gradient-to-r from-blue-500/20 to-green-500/20 border border-blue-400/50 rounded-lg p-4">
                            <div className="flex items-center justify-center space-x-3">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-300 border-t-blue-600"></div>
                              <span className="text-blue-200 font-medium text-sm sm:text-base">🎯 Jawaabkaaga waan gudbinayaa...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modern Transcript - Always visible when there's content */}
              {(transcript || (!isRecording && recordingTime > 0)) && (
                <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-cyan-500/30">
                  <h3 className="font-semibold text-cyan-300 mb-3 text-base sm:text-lg">
                    {transcript ? 'Waxaad tidhi:' : 'Duubista la dhammeeyay - Eeg qoraalka:'}
                  </h3>
                  
                  {transcript ? (
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="w-full p-3 sm:p-4 bg-slate-900/50 border border-cyan-500/30 rounded-lg resize-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 text-sm sm:text-base text-cyan-100 placeholder-cyan-400 min-h-[100px]"
                      rows="4"
                      placeholder="Haddii loo baahdo wax ka beddel..."
                    />
                  ) : (
                    <div className="w-full p-3 sm:p-4 bg-slate-900/50 border border-cyan-500/30 rounded-lg min-h-[100px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-300 border-t-cyan-600 mx-auto mb-2"></div>
                        <p className="text-cyan-300 text-sm">Qoraalka la soo sarayaa...</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-3">
                    {/* Audio playback button */}
                    {audioBlob && (
                      <div className="flex justify-center">
                        <button
                          onClick={playAudio}
                          className="flex items-center space-x-2 text-purple-300 hover:text-purple-100 transition-colors bg-purple-500/20 hover:bg-purple-500/30 px-4 py-2 rounded-lg font-medium border border-purple-500/30"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span className="text-sm">🎧 Dhegayso Duubkaaga</span>
                        </button>
                      </div>
                    )}
                    
                    {/* Help text */}
                    <p className="text-xs sm:text-sm text-cyan-400 text-center px-2">
                      💡 Haddii codka aqoonsiga khalad sameeyo wax ka beddeli karto
                    </p>
                    
                    {/* Submit button - Always visible when conditions are met */}
                    {!feedback && !isAnalyzing && !isAutoSubmitting && canSubmit && transcript && (
                      <button
                        onClick={analyzeAnswer}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-4 rounded-lg font-bold transition-colors text-base sm:text-lg shadow-lg animate-pulse"
                      >
                        ✓ Jawaabka Gudbi ({formatTime(recordingTime)})
                      </button>
                    )}
                    
                    {/* Auto-submitting state */}
                    {isAutoSubmitting && (
                      <div className="w-full bg-cyan-500/20 text-cyan-300 px-6 py-4 rounded-lg font-bold animate-pulse text-center text-base sm:text-lg border border-cyan-500/30">
                        🎯 Jawaabka la gudbinayaa...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Analysis Loading */}
              {isAnalyzing && (
                <div className="text-center py-12 bg-gradient-to-r from-blue-50/80 to-purple-50/80 rounded-xl backdrop-blur-sm">
                  <div className="relative mb-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                    <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-lg font-semibold text-cyan-100 animate-pulse">🤖 AI wuxuu falanqaynayaa jawaabkaaga...</p>
                    <p className="text-sm text-cyan-300 animate-fade-in-out">Dhawaaqa, naxwaha, iyo fasaaxada waa la falanqaynayaa...</p>
                    <div className="flex justify-center space-x-1 mt-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Compact Feedback */}
              {feedback && (
                <div className="space-y-4">
                  {/* Score Overview - Compact */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className={`text-center p-3 rounded-lg ${feedback.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className={`text-lg font-bold ${feedback.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {feedback.overallScore}%
                      </div>
                      <div className={`text-xs ${feedback.passed ? 'text-green-700' : 'text-red-700'}`}>
                        Overall
                      </div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{feedback.grammarScore}%</div>
                      <div className="text-xs text-blue-700">Grammar</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">{feedback.pronunciationScore}%</div>
                      <div className="text-xs text-purple-700">Speech</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">{feedback.fluencyScore}%</div>
                      <div className="text-xs text-orange-700">Fluency</div>
                    </div>
                  </div>

                  {/* Main Feedback - Compact */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">
                        {feedback.passed ? '🎉' : '📝'}
                    </div>
                      <div className="flex-1">
                        <p className="text-blue-800 font-medium text-sm leading-relaxed">
                          {feedback.feedback_somali}
                        </p>
                    {feedback.encouragement_somali && (
                          <p className="text-green-700 font-medium text-sm mt-2">
                            💪 {feedback.encouragement_somali}
                          </p>
                        )}
                      </div>
                      </div>
                  </div>

                  {/* Action Buttons - Compact */}
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={retryQuestion}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Ku celi</span>
                    </button>
                    
                    {feedback.passed ? (
                      <button
                        onClick={nextQuestion}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>Xigta</span>
                      </button>
                    ) : (
                      <div className="text-center">
                        <p className="text-red-600 font-medium text-xs mb-2">
                          {getLevelConfig(currentLevel.level_number).passRate}% loo baahan yahay
                        </p>
                        {attempts.length >= 2 && (
                          <button
                            onClick={() => setShowHelp(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                          >
                            <HelpCircle className="w-4 h-4" />
                            <span>Tusaale</span>
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
            <div className={`${showChat ? 'block' : 'hidden'} lg:w-1/3 w-full bg-slate-900/90 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl border border-cyan-500/30 h-fit lg:sticky lg:top-24 transition-all duration-500 mt-6 lg:mt-0`}>
                              <div className="p-3 sm:p-4 border-b border-cyan-500/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white text-sm sm:text-base">
                      {category?.name} Chat
                    </h3>
                    <div className="flex items-center space-x-1 text-xs sm:text-sm text-cyan-300">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">
                        {onlineUsers === 1 ? "You're online" : `${onlineUsers} active`}
                      </span>
                      <span className="sm:hidden">{onlineUsers}</span>
                      {/* Connection status indicator */}
                      <div className={`w-2 h-2 rounded-full ml-2 ${
                        connectionStatus === 'connected' ? 'bg-green-400' : 
                        connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} title={`Connection: ${connectionStatus}`}></div>
                    </div>
                  </div>
                </div>
              
              <div className="h-64 sm:h-80 lg:h-96 overflow-y-auto p-3 sm:p-4 space-y-3">
                {chatMessages.map((message, idx) => {
                  const isCurrentUser = message.user_id === user.id
                  const displayName = isCurrentUser ? "You" : `User ${message.user_id.slice(-4)}`
                  const avatarColor = isCurrentUser ? "bg-blue-500" : "bg-purple-500"
                  
                  return (
                    <div key={message.id || idx} className={`flex space-x-2 sm:space-x-3 ${message.isTemporary ? 'opacity-60' : ''} ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 ${avatarColor} rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium flex-shrink-0`}>
                        {isCurrentUser ? 'Y' : message.user_id.slice(-1).toUpperCase()}
                      </div>
                      <div className={`flex-1 min-w-0 ${isCurrentUser ? 'text-right' : ''}`}>
                        <div className={`flex items-center space-x-2 mb-1 ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <span className={`text-xs sm:text-sm font-medium truncate ${isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>
                            {displayName}
                          </span>
                          <span className="text-xs text-cyan-400 flex-shrink-0">
                            {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          {message.isTemporary && (
                            <span className="text-xs text-cyan-500">Sending...</span>
                          )}
                        </div>
                        <div className={`${isCurrentUser ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-slate-800/50 border border-slate-600/30'} rounded-lg p-2`}>
                          <p className="text-xs sm:text-sm text-cyan-100 break-words">
                            {message.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {chatMessages.length === 0 && (
                  <div className="text-center text-cyan-400 py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>
              
              <div className="p-3 sm:p-4 border-t border-cyan-500/30">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-2 sm:px-3 py-2 bg-slate-800/50 border border-cyan-500/30 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 text-sm text-cyan-100 placeholder-cyan-400"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg transition-colors flex-shrink-0"
                  >
                    <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
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