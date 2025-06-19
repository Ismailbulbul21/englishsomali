import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, MessageCircle, Brain, X, Send, RotateCcw, Zap } from 'lucide-react'
import { aiService } from '../services/aiService'

const MobileOptimizedAI = ({ isOpen, onClose, user, scenario = 'daily_conversation' }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [quickActions, setQuickActions] = useState([])
  const [voiceMode, setVoiceMode] = useState(false)

  const messagesEndRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recognitionRef = useRef(null)

  const tabs = [
    { id: 'chat', label: 'Chat', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'voice', label: 'Voice', icon: <Mic className="w-4 h-4" /> },
    { id: 'quick', label: 'Quick', icon: <Zap className="w-4 h-4" /> }
  ]

  const scenarioQuickActions = {
    job_interview: [
      "Tell me about yourself",
      "Why do you want this job?",
      "What are your strengths?",
      "Do you have any questions?",
      "Thank you for your time"
    ],
    daily_conversation: [
      "How are you today?",
      "What's the weather like?",
      "Have a great day!",
      "Nice to meet you",
      "See you later"
    ],
    business: [
      "Let's schedule a meeting",
      "Could you send me the report?",
      "What's the deadline?",
      "I'll follow up on this",
      "Thank you for your help"
    ],
    travel: [
      "Where is the nearest station?",
      "How much does this cost?",
      "Excuse me, can you help?",
      "Is this the right way?",
      "Thank you very much"
    ]
  }

  useEffect(() => {
    if (isOpen) {
      initializeChat()
      setQuickActions(scenarioQuickActions[scenario] || scenarioQuickActions.daily_conversation)
    }
  }, [isOpen, scenario])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeChat = () => {
    const welcomeMessage = {
      id: Date.now(),
      type: 'ai',
      content: `Hello! I'm your AI English tutor. Let's practice ${scenario.replace('_', ' ')} together. You can type, speak, or use quick phrases below.`,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (text = inputText) => {
    if (!text.trim() || loading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setLoading(true)

    try {
      const response = await aiService.chatWithAI(text, scenario, 'beginner')
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.message,
        feedback: response.feedback,
        culturalTip: response.culturalTip,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      // Auto-play AI response if voice mode is on
      if (voiceMode) {
        speakText(response.message)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I had trouble understanding. Could you try again?',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Setup MediaRecorder for audio
      mediaRecorderRef.current = new MediaRecorder(stream)
      const audioChunks = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        // Process audio if needed
      }

      // Setup Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          sendMessage(transcript)
        }

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          setIsRecording(false)
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }

        recognitionRef.current.start()
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)

    } catch (error) {
      console.error('Error starting voice recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    
    setIsRecording(false)
  }

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.8 // Slightly slower for learning
      utterance.pitch = 1
      
      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = () => setIsPlaying(false)
      
      speechSynthesis.speak(utterance)
    }
  }

  const handleQuickAction = (action) => {
    sendMessage(action)
  }

  const clearChat = () => {
    setMessages([])
    initializeChat()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
      <div className="bg-white w-full h-full md:w-[500px] md:h-[700px] md:rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 md:rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">AI English Tutor</h3>
                <p className="text-sm opacity-90">{scenario.replace('_', ' ').toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    
                    {message.feedback && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <p className="text-yellow-800">{message.feedback}</p>
                      </div>
                    )}
                    
                    {message.culturalTip && (
                      <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                        <p className="text-purple-800">💡 {message.culturalTip}</p>
                      </div>
                    )}
                    
                    {message.type === 'ai' && (
                      <button
                        onClick={() => speakText(message.content)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Listen</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!inputText.trim() || loading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Voice Practice</h4>
              <p className="text-sm text-gray-600">Tap and hold to speak, release to send</p>
            </div>

            <div className="relative">
              <button
                onTouchStart={startVoiceRecording}
                onTouchEnd={stopVoiceRecording}
                onMouseDown={startVoiceRecording}
                onMouseUp={stopVoiceRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 scale-110 shadow-lg'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
              )}
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                {isRecording ? 'Listening...' : 'Hold to speak'}
              </p>
              
              <div className="flex items-center justify-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={voiceMode}
                    onChange={(e) => setVoiceMode(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Auto-play responses</span>
                </label>
              </div>
            </div>

            {/* Recent voice messages */}
            <div className="w-full max-h-40 overflow-y-auto">
              {messages.slice(-3).map(message => (
                <div key={message.id} className="mb-2 p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">{message.type === 'user' ? 'You' : 'AI'}:</span>
                  <span className="ml-2">{message.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions Tab */}
        {activeTab === 'quick' && (
          <div className="flex-1 p-4">
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Quick Phrases</h4>
              <p className="text-sm text-gray-600">Tap any phrase to practice</p>
            </div>

            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <span className="text-gray-800">{action}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => speakText(quickActions[0])}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2"
              >
                <Volume2 className="w-5 h-5" />
                <span>Hear Example</span>
              </button>

              <button
                onClick={clearChat}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Start Over</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MobileOptimizedAI 