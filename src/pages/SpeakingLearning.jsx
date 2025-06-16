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

  // Auto-open chat only on desktop
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024 // lg breakpoint
    setShowChat(isDesktop)
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
        backgroundImage: `url('/learning-bg.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      
      {/* Modern Header */}
      <div className="bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-1 sm:space-x-2 text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline font-medium">Dashboard</span>
              </button>
              <div className="h-4 sm:h-6 w-px bg-gray-300 hidden sm:block"></div>
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <span className="text-xl sm:text-2xl lg:text-3xl flex-shrink-0">{category.icon}</span>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-800 truncate">{category.name}</h1>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
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
                className="relative flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Chat</span>
                <div className="flex items-center space-x-1 text-xs bg-white/20 rounded-full px-2 py-1">
                  <Users className="w-3 h-3" />
                  <span>{onlineUsers}</span>
                </div>
              </button>
              
              {/* Score Display */}
              <div className="text-right bg-white/80 rounded-lg px-3 py-2 shadow-sm">
                <div className="text-xs text-gray-500 hidden sm:block">Score</div>
                <div className="text-base sm:text-lg lg:text-2xl font-bold text-gray-800">
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
            {/* Modern Progress Bar */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium text-gray-700">
                  Level {currentLevel.level_number} Progress
                </span>
                <span className="text-xs sm:text-sm text-gray-500">
                  {questionIndex + 1}/{currentLevel.questions.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 sm:h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${((questionIndex + 1) / currentLevel.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Modern Question Card */}
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 border border-gray-200/50 transition-all duration-500 hover:shadow-2xl">
              <div className="text-center mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                    Question {questionIndex + 1}
                  </h2>
                  <button
                    onClick={speakQuestion}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200"
                  >
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm font-medium">Listen</span>
                  </button>
                </div>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-4 leading-relaxed">{currentQuestion.text}</p>
                <div className="flex items-center justify-center space-x-4 text-xs sm:text-sm text-gray-500">
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-full px-3 py-1">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{getLevelConfig(currentLevel.level_number).minTime}s - {getLevelConfig(currentLevel.level_number).maxTime}s</span>
                  </div>
                </div>
              </div>

              {/* Recording Section */}
              <div className="text-center mb-6">
                {/* Two-Button System */}
                <div className="flex justify-center space-x-6 mb-6">
                  {/* Start Recording Button */}
                  <button
                    onClick={transcript ? startNewRecording : startRecording}
                    disabled={isRecording || isAnalyzing}
                    className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center text-white font-bold text-lg transition-all duration-300 transform bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105 shadow-lg hover:shadow-xl border-4 border-white ${
                      isRecording || isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Mic className="w-10 h-10 sm:w-12 sm:h-12 mb-2" />
                    <span className="text-sm font-bold">{transcript ? 'RECORD AGAIN' : 'START RECORDING'}</span>
                  </button>

                  {/* Stop Recording Button */}
                  <button
                    onClick={stopRecording}
                    disabled={!isRecording || isAnalyzing}
                    className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center text-white font-bold text-lg transition-all duration-300 transform bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:scale-105 shadow-lg hover:shadow-xl border-4 border-white ${
                      !isRecording || isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'animate-pulse'
                    }`}
                  >
                    <MicOff className="w-10 h-10 sm:w-12 sm:h-12 mb-2" />
                    <span className="text-sm font-bold">STOP RECORDING</span>
                  </button>
                </div>
                
                {/* Status Message */}
                <div className="mb-6">
                  <p className="text-lg sm:text-xl font-medium text-gray-700 mb-2">
                    {isAnalyzing 
                      ? '🤖 Analyzing your answer...'
                      : isRecording 
                      ? `🎤 Recording... ${formatTime(recordingTime)}` 
                      : transcript 
                      ? '✅ Ready to submit or record again'
                      : '🎯 Click START RECORDING to begin'}
                  </p>
                  
                  {!isRecording && !transcript && (
                    <p className="text-blue-600 text-base bg-blue-50 rounded-lg px-4 py-2 inline-block">
                      💡 Recommended: Speak for at least {getLevelConfig(currentLevel.level_number).minTime} seconds for better analysis
                    </p>
                  )}
                  
                  {isRecording && recordingTime >= 150 && (
                    <p className="text-orange-600 text-base animate-pulse bg-orange-50 rounded-lg px-4 py-2 inline-block">
                      ⚠️ Recording will stop automatically in {180 - recordingTime} seconds
                    </p>
                  )}
                </div>

                {/* Progress Bar - Only when recording */}
                {isRecording && (
                  <div className="w-full max-w-md mx-auto mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                      <div
                        className="h-4 rounded-full transition-all duration-300 shadow-sm bg-gradient-to-r from-green-400 to-green-500"
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

              {/* Transcript Section - Modern */}
              {transcript && (
                <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 mb-6 border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-700 mb-3 text-lg flex items-center">
                    <span className="mr-2">📝</span>
                    What you said:
                  </h3>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full p-4 bg-white border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-gray-700 placeholder-gray-400 min-h-[120px] shadow-sm"
                    rows="4"
                    placeholder="Edit your transcript if needed..."
                  />
                </div>
              )}

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
              <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 h-fit lg:sticky lg:top-24 overflow-hidden">
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{category?.name} Chat</h3>
                      <p className="text-blue-100 text-sm">Connect with fellow learners</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                      <div className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-400' : 
                        connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></div>
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">{onlineUsers}</span>
                    </div>
                  </div>
                </div>
              
                {/* Chat Messages with Dotted Background */}
                <div 
                  className="h-80 lg:h-96 overflow-y-auto p-4 space-y-4 relative"
                  style={{
                    backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px'
                  }}
                >
                  {/* Overlay to soften the dots */}
                  <div className="absolute inset-0 bg-white/60 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    {chatMessages.slice(-20).map((message, idx) => {
                      const isCurrentUser = message.user_id === user.id
                      const displayName = isCurrentUser ? "You" : `User ${message.user_id.slice(-4)}`
                      
                      return (
                        <div key={message.id || idx} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
                          <div className={`max-w-xs lg:max-w-sm ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                            {/* User Info */}
                            <div className={`flex items-center space-x-2 mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
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
                            <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                              isCurrentUser 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                : 'bg-white border border-gray-200 text-gray-800'
                            } ${message.isTemporary ? 'opacity-70' : ''}`}>
                              <p className="text-sm leading-relaxed break-words">
                                {message.message}
                              </p>
                              
                              {/* Message Tail */}
                              <div className={`absolute top-3 w-3 h-3 transform rotate-45 ${
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
                    
                    {chatMessages.length === 0 && (
                      <div className="text-center py-12">
                        <div className="bg-white/80 rounded-2xl p-6 mx-4">
                          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <h4 className="font-semibold text-gray-600 mb-2">No messages yet</h4>
                          <p className="text-sm text-gray-500">Start the conversation and connect with other learners!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              
                {/* Message Input */}
                <div className="p-4 bg-gray-50/80 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 placeholder-gray-400 shadow-sm transition-all"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-full transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    💬 Chat with other learners • Be respectful and helpful
                  </p>
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