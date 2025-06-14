import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Mic, MicOff, Volume2, X, Lightbulb, Globe } from 'lucide-react'
import { aiService } from '../services/aiService'

const AIChatTutor = ({ isOpen, onClose, scenario = 'daily_conversation', userLevel = 'beginner' }) => {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showCulturalTip, setShowCulturalTip] = useState(false)
  const [currentCulturalTip, setCurrentCulturalTip] = useState(null)
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  const scenarioInfo = {
    daily_conversation: {
      title: "Daily Conversation Practice",
      icon: "💬",
      description: "Practice everyday English conversations"
    },
    job_interview: {
      title: "Job Interview Practice",
      icon: "💼", 
      description: "Prepare for job interviews with confidence"
    },
    business: {
      title: "Business English",
      icon: "🏢",
      description: "Professional communication skills"
    },
    travel: {
      title: "Travel English",
      icon: "✈️",
      description: "Navigate travel situations with ease"
    }
  }

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeChat()
    }
  }, [isOpen, scenario])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeChat = () => {
    const welcomeMessages = {
      daily_conversation: "Hello! I'm your AI English tutor. Let's practice everyday conversations. How are you feeling today?",
      job_interview: "Hello! I'm here to help you practice for job interviews. Let's start with a common question: Tell me about yourself.",
      business: "Hello! Let's practice professional English. Imagine we're colleagues meeting for the first time. How would you introduce yourself?",
      travel: "Hello! Let's practice travel English. Imagine you just arrived at the airport. What would you say to ask for directions?"
    }

    setMessages([{
      id: 1,
      type: 'ai',
      content: welcomeMessages[scenario],
      timestamp: new Date(),
      culturalTip: aiService.getCulturalContext(scenario)
    }])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      // Get AI response with cultural context
      const aiResponse = await aiService.chatWithAI(inputText, scenario)
      
      // Check grammar of user's message
      const grammarCheck = await aiService.checkGrammar(inputText)

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponse.message || aiResponse.response,
        timestamp: new Date(),
        feedback: Array.isArray(aiResponse.feedback) ? aiResponse.feedback : [aiResponse.feedback].filter(Boolean),
        grammarCheck: grammarCheck,
        culturalTip: aiResponse.culturalTip
      }

      setMessages(prev => [...prev, aiMessage])

      // Show cultural tip if available
      if (aiResponse.culturalTip) {
        setCurrentCulturalTip(aiResponse.culturalTip)
        setShowCulturalTip(true)
      }

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: "I'm having trouble right now, but keep practicing! Your English is improving.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onstart = () => {
      setIsListening(true)
    }

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInputText(transcript)
      setIsListening(false)
    }

    recognitionRef.current.onerror = () => {
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current.start()
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-learning text-white p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{scenarioInfo[scenario].icon}</span>
            <div>
              <h3 className="font-semibold">{scenarioInfo[scenario].title}</h3>
              <p className="text-sm opacity-90">{scenarioInfo[scenario].description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="mb-2">{message.content}</p>
                
                {/* AI message features */}
                {message.type === 'ai' && (
                  <div className="space-y-2">
                    {/* Grammar feedback */}
                    {message.grammarCheck && !message.grammarCheck.isCorrect && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
                        <p className="font-medium text-yellow-800">Grammar Tip:</p>
                        <p className="text-yellow-700">{message.grammarCheck.explanation}</p>
                        {message.grammarCheck.suggestions.map((suggestion, idx) => (
                          <p key={idx} className="text-yellow-600 text-xs">• {suggestion}</p>
                        ))}
                      </div>
                    )}

                    {/* Feedback */}
                    {message.feedback && message.feedback.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                        <p className="font-medium text-blue-800">Feedback:</p>
                        {message.feedback.map((fb, idx) => (
                          <p key={idx} className="text-blue-700 text-xs">• {fb}</p>
                        ))}
                      </div>
                    )}

                    {/* Cultural tip button */}
                    {message.culturalTip && (
                      <button
                        onClick={() => {
                          setCurrentCulturalTip(message.culturalTip)
                          setShowCulturalTip(true)
                        }}
                        className="flex items-center space-x-1 text-purple-600 hover:text-purple-800 text-sm"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Cultural Context</span>
                      </button>
                    )}

                    {/* Speak button */}
                    <button
                      onClick={() => speakText(message.content)}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Listen</span>
                    </button>
                  </div>
                )}

                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
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
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message or use voice..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-3 rounded-lg transition-colors ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cultural Tip Modal */}
      {showCulturalTip && currentCulturalTip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center space-x-2 mb-4">
              <Globe className="w-6 h-6 text-purple-600" />
              <h4 className="text-lg font-semibold text-gray-800">Cultural Context</h4>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-700">English Culture:</p>
                <p className="text-gray-600 text-sm">{currentCulturalTip.english}</p>
              </div>
              
              <div>
                <p className="font-medium text-gray-700">Somali Culture:</p>
                <p className="text-gray-600 text-sm">{currentCulturalTip.somali}</p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="font-medium text-blue-800 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Tip:
                </p>
                <p className="text-blue-700 text-sm">{currentCulturalTip.tip}</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCulturalTip(false)}
              className="w-full mt-4 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIChatTutor 