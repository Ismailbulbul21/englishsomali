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
  
  // UI state
  const [showNewUserGuide, setShowNewUserGuide] = useState(false)
  
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
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop())
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
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
  }, [groupRoom])

  // Auto-open chat when component loads
  useEffect(() => {
    setShowChat(true)
  }, [])

  const loadCategoryAndLevels = async () => {
    try {
      const { data: categories } = await getCategories()
      const foundCategory = categories?.find(cat => cat.id === categoryId)
      setCategory(foundCategory)

      const { data: levelsData } = await getLevelsForCategory(categoryId)
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
        const parsed = JSON.parse(cachedMessages)
        setChatMessages(parsed)
      }

      // Then load fresh data from server
      const { data: messages } = await getChatMessages(groupRoom.id)
      const reversedMessages = messages?.reverse() || []
      setChatMessages(reversedMessages)
      
      // Cache messages for persistence
      localStorage.setItem(`chat_${groupRoom.id}`, JSON.stringify(reversedMessages))
      
      // Update online users count based on recent activity
      const activeCount = getActiveUsersCount(reversedMessages)
      setOnlineUsers(activeCount)
    } catch (error) {
      console.error('Error loading chat messages:', error)
    }
  }

  const setupChatSubscription = () => {
    if (!groupRoom || chatSubscriptionRef.current) return
    
    chatSubscriptionRef.current = subscribeToChatMessages(groupRoom.id, (payload) => {
      setChatMessages(prev => {
        const newMessages = [...prev, payload.new]
        // Cache updated messages
        localStorage.setItem(`chat_${groupRoom.id}`, JSON.stringify(newMessages))
        // Update online count when new messages arrive
        const activeCount = getActiveUsersCount(newMessages)
        setOnlineUsers(activeCount)
        return newMessages
      })
    })
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
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            }
          }
          if (finalTranscript) {
            setTranscript(prev => prev + ' ' + finalTranscript)
          }
        }

        recognitionRef.current.start()
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Timer with dynamic requirements based on expected duration
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          const expectedDuration = currentQuestion?.expected_duration || 60
          const minimumTime = Math.min(60, expectedDuration) // At least 60s or expected time if less
          
          // Enable submit after reaching minimum time OR expected time
          if (newTime >= minimumTime) {
            setCanSubmit(true)
          }
          
          // 🎯 Smart Target-Based Auto-Submit: Stop and auto-submit when reaching expected time
          if (newTime >= expectedDuration) {
            stopRecording()
            // Auto-submit after 2 seconds delay
            setTimeout(() => {
              setIsAutoSubmitting(true)
              analyzeAnswer()
            }, 2000)
            return newTime
          }
          
          // Auto-stop at 180 seconds (3 minutes max) as fallback
          if (newTime >= 180) {
            stopRecording()
            return 180
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
  }

  const analyzeAnswer = async () => {
    const expectedDuration = currentQuestion?.expected_duration || 60
    const minimumTime = Math.min(60, expectedDuration)
    
    if (!transcript.trim() || !currentQuestion || recordingTime < minimumTime) {
      alert(`Please record for at least ${minimumTime} seconds before submitting.`)
      setIsAutoSubmitting(false) // Reset auto-submit state if validation fails
      return
    }

    setIsAnalyzing(true)
    
    try {
      const analysis = await aiService.analyzeAnswer(
        currentQuestion.text,
        transcript,
        {
          category: category.name.toLowerCase(),
          level: currentLevel.level_number,
          expectedLength: currentQuestion.expected_duration,
          recordingTime: recordingTime
        }
      )

      setFeedback(analysis)
      
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
      
      // Share progress in chat if passed
      if (analysis.passed && groupRoom) {
        await sendChatMessage(
          groupRoom.id,
          user.id,
          `🎉 I just scored ${analysis.overallScore}% on "${currentQuestion.text}"!`,
          'progress_share',
          { score: analysis.overallScore, question: currentQuestion.text }
        )
      }

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
      setIsAutoSubmitting(false) // Reset auto-submit state when analysis completes
    }
  }

  const nextQuestion = async () => {
    if (!feedback?.passed) {
      alert('You need to score 60% or higher to proceed to the next question.')
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
    const tempMessage = {
      id: Date.now(),
      message: messageText,
      user_profiles: { full_name: user.user_metadata?.full_name || 'You' },
      created_at: new Date().toISOString(),
      user_id: user.id
    }

    // Add message to local state immediately for better UX
    setChatMessages(prev => [...prev, tempMessage])
    setNewMessage('')

    try {
      await sendChatMessage(groupRoom.id, user.id, messageText)
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove the temporary message if sending failed
      setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      setNewMessage(messageText) // Restore the message text
      alert('Failed to send message. Please try again.')
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      
      {/* Modern Header */}
      <div className="bg-white/90 backdrop-blur-lg shadow-lg border-b border-white/30 sticky top-0 z-40 transition-all duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{category.icon}</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{category.name}</h1>
                  <p className="text-sm text-gray-600">
                    Level {currentLevel.level_number} • Question {questionIndex + 1}/{currentLevel.questions.length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Chat Toggle */}
              <button
                onClick={() => setShowChat(!showChat)}
                className="relative flex items-center space-x-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Chat</span>
                <div className="flex items-center space-x-1 text-xs">
                  <Users className="w-3 h-3" />
                  <span>Chat</span>
                </div>
              </button>
              
              {/* Score Display */}
              <div className="text-right">
                <div className="text-sm text-gray-600">Current Score</div>
                <div className="text-2xl font-bold text-blue-600">
                  {feedback?.overallScore || 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className={`transition-all duration-300 ${showChat ? 'w-2/3' : 'w-full max-w-4xl mx-auto'}`}>
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Level {currentLevel.level_number} Progress
                </span>
                <span className="text-sm text-gray-500">
                  {questionIndex + 1}/{currentLevel.questions.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${((questionIndex + 1) / currentLevel.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 mb-8 border border-white/30 transition-all duration-500 hover:shadow-3xl">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Question {questionIndex + 1}
                  </h2>
                  <button
                    onClick={speakQuestion}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span className="text-sm">Listen</span>
                  </button>
                </div>
                <p className="text-xl text-gray-700 mb-4">{currentQuestion.text}</p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Expected: {currentQuestion.expected_duration}s</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="w-4 h-4" />
                    <span>Minimum: {Math.min(60, currentQuestion?.expected_duration || 60)}s</span>
                  </div>
                </div>
              </div>

              {/* Recording Section */}
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isAnalyzing}
                    className={`w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-300 transform ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
                        : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
                    } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''} shadow-2xl`}
                  >
                    {isRecording ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
                  </button>
                  
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <p className="text-lg font-medium text-gray-700">
                    {isAutoSubmitting 
                      ? '🎯 Auto-submitting your answer...'
                      : isRecording 
                      ? `Recording... ${formatTime(recordingTime)}${recordingTime >= (currentQuestion?.expected_duration || 60) ? ' (Target reached! Auto-submitting soon...)' : recordingTime >= Math.min(60, currentQuestion?.expected_duration || 60) ? ' (Minimum reached, keep going to target!)' : ''}` 
                      : 'Click to start recording'}
                  </p>
                  
                  {recordingTime > 0 && (
                    <div className="w-80 mx-auto">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>0:00</span>
                        <span className={
                          recordingTime >= (currentQuestion?.expected_duration || 60) 
                            ? 'text-green-600 font-medium' 
                            : recordingTime >= Math.min(60, currentQuestion?.expected_duration || 60)
                            ? 'text-blue-600 font-medium'
                            : 'text-orange-600'
                        }>
                          {recordingTime >= (currentQuestion?.expected_duration || 60) 
                            ? '🎯 Target reached!' 
                            : recordingTime >= Math.min(60, currentQuestion?.expected_duration || 60)
                            ? `${Math.max((currentQuestion?.expected_duration || 60) - recordingTime, 0)}s to target`
                            : `${Math.max(Math.min(60, currentQuestion?.expected_duration || 60) - recordingTime, 0)}s to minimum`
                          }
                        </span>
                        <span>3:00</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            recordingTime >= (currentQuestion?.expected_duration || 60) 
                              ? 'bg-green-500' 
                              : recordingTime >= Math.min(60, currentQuestion?.expected_duration || 60)
                              ? 'bg-blue-500'
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min((recordingTime / 180) * 100, 100)}%` }}
                        ></div>
                      </div>
                      {recordingTime >= Math.min(60, currentQuestion?.expected_duration || 60) && isRecording && !isAutoSubmitting && (
                        <div className="mt-2 text-center space-y-2">
                          <button
                            onClick={stopRecording}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              recordingTime >= (currentQuestion?.expected_duration || 60)
                                ? 'bg-green-500 hover:bg-green-600 text-white animate-pulse'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            {recordingTime >= (currentQuestion?.expected_duration || 60)
                              ? '🎯 Perfect! Stop Recording'
                              : 'Stop Recording (Can continue to target)'
                            }
                          </button>
                          {recordingTime < (currentQuestion?.expected_duration || 60) && (
                            <p className="text-xs text-gray-600">
                              💡 You can stop now, but recording to {currentQuestion?.expected_duration}s is recommended
                            </p>
                          )}
                        </div>
                      )}
                      {isAutoSubmitting && (
                        <div className="mt-4 text-center">
                          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-center space-x-3">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-300 border-t-blue-600"></div>
                              <span className="text-blue-700 font-medium">🎯 Target reached! Auto-submitting your answer...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">What you said:</h3>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    placeholder="Edit your transcript if needed..."
                  />
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4">
                      {audioBlob && (
                        <button
                          onClick={playAudio}
                          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          <span className="text-sm">Play Recording</span>
                        </button>
                      )}
                      <span className="text-xs text-gray-500">
                        💡 You can edit the text above if speech recognition made mistakes
                      </span>
                    </div>
                    {!feedback && !isAnalyzing && !isAutoSubmitting && canSubmit && (
                      <button
                        onClick={analyzeAnswer}
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors animate-pulse"
                      >
                        ✓ Submit Answer ({formatTime(recordingTime)})
                      </button>
                    )}
                    {isAutoSubmitting && (
                      <div className="bg-blue-100 text-blue-700 px-6 py-2 rounded-lg font-medium animate-pulse">
                        🎯 Auto-submitting in 2 seconds...
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
                    <p className="text-lg font-semibold text-gray-700 animate-pulse">🤖 AI wuxuu falanqaynayaa jawaabkaaga...</p>
                    <p className="text-sm text-gray-600 animate-fade-in-out">Analyzing your pronunciation, grammar, and fluency...</p>
                    <div className="flex justify-center space-x-1 mt-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div className="space-y-6">
                  {/* Score Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`text-center p-4 rounded-xl ${feedback.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className={`text-3xl font-bold ${feedback.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {feedback.overallScore}%
                      </div>
                      <div className={`text-sm ${feedback.passed ? 'text-green-700' : 'text-red-700'}`}>
                        Overall {feedback.passed ? '✓' : '✗'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600">{feedback.grammarScore}%</div>
                      <div className="text-sm text-blue-700">Grammar</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600">{feedback.pronunciationScore}%</div>
                      <div className="text-sm text-purple-700">Pronunciation</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-xl">
                      <div className="text-2xl font-bold text-orange-600">{feedback.fluencyScore}%</div>
                      <div className="text-sm text-orange-700">Fluency</div>
                    </div>
                  </div>

                  {/* Somali Feedback */}
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h3 className="font-semibold text-blue-800 mb-3 text-lg">📝 Jawaab Faahfaahisan:</h3>
                      <p className="text-blue-700 text-lg leading-relaxed">{feedback.feedback_somali}</p>
                    </div>
                    
                    {feedback.encouragement_somali && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                        <h3 className="font-semibold text-green-800 mb-3 text-lg">💪 Dhiirrigelin:</h3>
                        <p className="text-green-700 text-lg font-medium leading-relaxed">{feedback.encouragement_somali}</p>
                      </div>
                    )}

                    {feedback.strengths_somali?.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                        <h3 className="font-semibold text-yellow-800 mb-3 text-lg flex items-center">
                          <Trophy className="w-5 h-5 mr-2" />
                          Waxa aad si fiican u samaysay:
                        </h3>
                        <ul className="space-y-2">
                          {feedback.strengths_somali.map((strength, idx) => (
                            <li key={idx} className="text-yellow-700 text-lg flex items-start">
                              <Star className="w-4 h-4 mr-2 mt-1 flex-shrink-0" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {feedback.improvements_somali?.length > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                        <h3 className="font-semibold text-orange-800 mb-3 text-lg flex items-center">
                          <Target className="w-5 h-5 mr-2" />
                          Meelaha loo baahan yahay horumar:
                        </h3>
                        <ul className="space-y-2">
                          {feedback.improvements_somali.map((improvement, idx) => (
                            <li key={idx} className="text-orange-700 text-lg flex items-start">
                              <span className="w-4 h-4 mr-2 mt-1 flex-shrink-0">•</span>
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {feedback.pronunciation_tips && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                        <h3 className="font-semibold text-purple-800 mb-3 text-lg">🗣️ Talooyinka ku dhawaaqista:</h3>
                        <p className="text-purple-700 text-lg leading-relaxed">{feedback.pronunciation_tips}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-4 pt-4">
                    <button
                      onClick={retryQuestion}
                      className="flex items-center space-x-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors"
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>Try Again</span>
                    </button>
                    
                    {feedback.passed ? (
                      <button
                        onClick={nextQuestion}
                        className="flex items-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
                      >
                        <ArrowRight className="w-5 h-5" />
                        <span>Next Question</span>
                      </button>
                    ) : (
                      <div className="text-center">
                        <p className="text-red-600 font-medium mb-2">
                          Score 60% or higher to proceed
                        </p>
                        {attempts.length >= 2 && (
                          <button
                            onClick={() => setShowHelp(true)}
                            className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
                          >
                            <HelpCircle className="w-5 h-5" />
                            <span>Show Example</span>
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

          {/* Chat Sidebar */}
          {showChat && groupRoom && (
            <div className="w-1/3 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 h-fit sticky top-24 transition-all duration-500 animate-slide-in-right">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    {category?.name} Chat
                  </h3>
                                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>
                        {onlineUsers === 1 ? "You're online" : `${onlineUsers} recently active`}
                      </span>
                    </div>
                </div>
              </div>
              
              <div className="h-96 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((message, idx) => (
                  <div key={idx} className="flex space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {message.user_profiles?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-800">
                          {message.user_profiles?.full_name || 'User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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