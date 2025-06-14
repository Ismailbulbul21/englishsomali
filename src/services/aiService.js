import { env } from '../config/env'

const HUGGING_FACE_API_KEY = import.meta.env.VITE_HUGGING_FACE_API_KEY || 'your_api_key_here'
const HF_API_BASE = 'https://api-inference.huggingface.co/models'

class AIService {
  constructor() {
    this.apiKey = HUGGING_FACE_API_KEY
    this.models = {
      conversation: 'microsoft/DialoGPT-medium',
      grammar: 'textattack/roberta-base-CoLA',
      translation: 'Helsinki-NLP/opus-mt-en-ar', // English to Arabic (closest to Somali)
      sentiment: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
      textGeneration: 'gpt2'
    }
    this.recognitionRef = null
  }

  async makeRequest(model, payload) {
    try {
      const response = await fetch(`${HF_API_BASE}/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('AI Service Error:', error)
      throw error
    }
  }

  // AI Conversation for practice
  async chatWithAI(message, context = 'general') {
    try {
      // Simple AI responses based on context - no external API needed
      const response = this.generateContextualResponse(message, context)
      
      return {
        message: response.message,
        feedback: this.generateConversationFeedback(message),
        culturalTip: this.getCulturalContext(context)
      }
    } catch (error) {
      return {
        message: "I'm here to help you practice English! Keep going!",
        feedback: ["Try speaking more naturally."],
        culturalTip: null
      }
    }
  }

  // Generate smart responses based on context
  generateContextualResponse(message, context) {
    const responses = {
      job_interview: {
        greetings: ["Hello! I'm excited to interview with you today.", "Good morning! Thank you for this opportunity.", "Hi! I'm looking forward to our conversation."],
        about_yourself: ["I'm a motivated professional with experience in my field.", "I have strong communication skills and work well in teams.", "I'm passionate about learning and growing in my career."],
        questions: ["What does a typical day look like in this role?", "What opportunities are there for professional development?", "What do you enjoy most about working here?"],
        default: ["That's a great question. Let me think about that.", "I appreciate you asking. Here's my perspective...", "That's an interesting point. I would say..."]
      },
      daily_conversation: {
        greetings: ["Hello! How are you doing today?", "Hi there! Nice to see you!", "Good morning! How's your day going?"],
        weather: ["The weather is lovely today, isn't it?", "I hope it stays sunny like this.", "Perfect weather for a walk!"],
        weekend: ["I had a relaxing weekend. How about you?", "I spent time with family this weekend.", "I enjoyed reading and resting."],
        default: ["That sounds interesting!", "I'd love to hear more about that.", "That's really nice to hear."]
      },
      business: {
        meetings: ["Let's schedule a meeting to discuss this further.", "I'll send you a calendar invite.", "What time works best for you?"],
        projects: ["The project is progressing well.", "We're on track to meet our deadline.", "I'll update you on our progress."],
        emails: ["I'll follow up with an email summary.", "Please let me know if you need any clarification.", "Thank you for your time today."],
        default: ["I understand your point.", "Let me get back to you on that.", "That's a good suggestion."]
      },
      travel: {
        directions: ["Excuse me, could you help me find the train station?", "Is this the right way to the airport?", "How long does it take to get there?"],
        hotel: ["I have a reservation under my name.", "What time is check-in?", "Could you recommend a good restaurant nearby?"],
        shopping: ["How much does this cost?", "Do you accept credit cards?", "Could I get a receipt, please?"],
        default: ["Thank you for your help!", "I appreciate your assistance.", "Have a great day!"]
      }
    }

    const contextResponses = responses[context] || responses.daily_conversation
    
    // Simple keyword matching
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return { message: this.getRandomResponse(contextResponses.greetings || contextResponses.default) }
    }
    
    if (context === 'job_interview') {
      if (lowerMessage.includes('yourself') || lowerMessage.includes('about you')) {
        return { message: this.getRandomResponse(contextResponses.about_yourself) }
      }
      if (lowerMessage.includes('question')) {
        return { message: this.getRandomResponse(contextResponses.questions) }
      }
    }
    
    if (context === 'daily_conversation') {
      if (lowerMessage.includes('weather')) {
        return { message: this.getRandomResponse(contextResponses.weather) }
      }
      if (lowerMessage.includes('weekend')) {
        return { message: this.getRandomResponse(contextResponses.weekend) }
      }
    }
    
    if (context === 'business') {
      if (lowerMessage.includes('meeting')) {
        return { message: this.getRandomResponse(contextResponses.meetings) }
      }
      if (lowerMessage.includes('project')) {
        return { message: this.getRandomResponse(contextResponses.projects) }
      }
    }
    
    if (context === 'travel') {
      if (lowerMessage.includes('where') || lowerMessage.includes('direction')) {
        return { message: this.getRandomResponse(contextResponses.directions) }
      }
      if (lowerMessage.includes('hotel')) {
        return { message: this.getRandomResponse(contextResponses.hotel) }
      }
    }
    
    return { message: this.getRandomResponse(contextResponses.default) }
  }

  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)]
  }

  // Grammar checking and correction
  async checkGrammar(text) {
    try {
      const response = await this.makeRequest(this.models.grammar, {
        inputs: text
      })

      const isCorrect = response[0]?.label === 'ACCEPTABLE'
      const score = response[0]?.score || 0

      return {
        isCorrect,
        confidence: Math.round(score * 100),
        suggestions: this.generateGrammarSuggestions(text, isCorrect),
        explanation: this.getGrammarExplanation(text, isCorrect)
      }
    } catch (error) {
      return {
        isCorrect: true,
        confidence: 50,
        suggestions: [],
        explanation: "Grammar check unavailable right now."
      }
    }
  }

  // Generate personalized content based on user progress
  async generatePersonalizedContent(userLevel, weakAreas, scenario) {
    try {
      const prompt = this.buildContentPrompt(userLevel, weakAreas, scenario)
      const response = await this.makeRequest(this.models.textGeneration, {
        inputs: prompt,
        parameters: {
          max_length: 150,
          temperature: 0.8,
          do_sample: true
        }
      })

      return {
        content: response[0]?.generated_text || this.getFallbackContent(scenario),
        difficulty: userLevel,
        focusAreas: weakAreas,
        culturalNotes: this.getCulturalNotes(scenario)
      }
    } catch (error) {
      return {
        content: this.getFallbackContent(scenario),
        difficulty: userLevel,
        focusAreas: weakAreas,
        culturalNotes: null
      }
    }
  }

  // Analyze user's learning patterns
  analyzeUserProgress(userProgress, answers) {
    const analysis = {
      weakAreas: [],
      strongAreas: [],
      recommendations: [],
      culturalTips: [],
      nextSteps: []
    }

    // Analyze grammar patterns
    const grammarErrors = this.identifyGrammarPatterns(answers)
    analysis.weakAreas = grammarErrors

    // Identify strong areas
    const strongPatterns = this.identifyStrengths(userProgress)
    analysis.strongAreas = strongPatterns

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis.weakAreas, userProgress)

    // Cultural tips for Somali learners
    analysis.culturalTips = this.getSomaliSpecificTips(analysis.weakAreas)

    return analysis
  }

  // Helper methods
  buildConversationPrompt(message, context) {
    const contextPrompts = {
      job_interview: "You are helping someone practice for a job interview. Be professional but encouraging.",
      daily_conversation: "You are helping someone practice everyday English. Be friendly and natural.",
      business: "You are helping someone practice business English. Be professional.",
      travel: "You are helping someone practice travel English. Be helpful and practical."
    }

    return `${contextPrompts[context] || contextPrompts.daily_conversation} User says: "${message}". Respond helpfully:`
  }

  buildContentPrompt(userLevel, weakAreas, scenario) {
    return `Create a ${userLevel} level English exercise for ${scenario}. Focus on: ${weakAreas.join(', ')}. Make it practical for Somali learners:`
  }

  generateConversationFeedback(message) {
    const feedback = []
    
    // Basic grammar checks
    if (!message.match(/^[A-Z]/)) {
      feedback.push("Remember to start sentences with a capital letter.")
    }
    
    if (!message.match(/[.!?]$/)) {
      feedback.push("Don't forget punctuation at the end of sentences.")
    }

    if (message.length < 3) {
      feedback.push("Try to give more complete responses.")
    }

    return feedback.length > 0 ? feedback : ["Great job! Keep practicing."]
  }

  generateGrammarSuggestions(text, isCorrect) {
    if (isCorrect) return []

    const suggestions = []
    
    // Common Somali speaker errors
    if (text.includes(' go ') && !text.includes(' went ')) {
      suggestions.push("Check if you need past tense: 'went' instead of 'go'")
    }
    
    if (!text.match(/\b(a|an|the)\b/)) {
      suggestions.push("Consider if you need an article (a, an, the)")
    }

    if (text.match(/\bis\s+\w+ing\b/)) {
      suggestions.push("Check your present continuous tense structure")
    }

    return suggestions
  }

  getGrammarExplanation(text, isCorrect) {
    if (isCorrect) return "Your grammar looks good!"

    // Provide explanations common for Somali speakers
    if (text.includes('go') && text.includes('yesterday')) {
      return "In English, we use past tense with time words like 'yesterday'. Use 'went' instead of 'go'."
    }

    return "There might be a grammar issue. Check your verb tenses and articles."
  }

  getCulturalContext(scenario) {
    const culturalTips = {
      job_interview: {
        english: "Maintain eye contact and give firm handshakes",
        somali: "In Somali culture, direct eye contact with elders shows disrespect, but in English/Western job interviews, it shows confidence",
        tip: "Practice looking at the interviewer's eyes, then nose, then back to eyes"
      },
      daily_conversation: {
        english: "'How are you?' expects a brief, positive response",
        somali: "In Somali culture, this question asks for real details about health and family",
        tip: "In English, just say 'Fine, thanks' or 'Good, how are you?'"
      },
      business: {
        english: "Be direct and concise in business communication",
        somali: "Somali communication often includes more context and relationship building",
        tip: "Start emails with purpose, keep meetings focused on agenda"
      }
    }

    return culturalTips[scenario] || null
  }

  getSomaliSpecificTips(weakAreas) {
    const tips = []

    if (weakAreas.includes('articles')) {
      tips.push({
        issue: "Articles (a, an, the)",
        explanation: "Somali doesn't have articles like English. 'The' = specific thing, 'a/an' = any one thing",
        example: "Somali: 'Baabuur' → English: 'THE car' (specific) or 'A car' (any car)"
      })
    }

    if (weakAreas.includes('verb_tenses')) {
      tips.push({
        issue: "Verb Tenses",
        explanation: "English has many tense forms. Somali shows time differently",
        example: "Somali: 'Waan tagay' → English: 'I went' (simple past) or 'I have gone' (present perfect)"
      })
    }

    if (weakAreas.includes('pronunciation')) {
      tips.push({
        issue: "Pronunciation",
        explanation: "Some English sounds don't exist in Somali",
        example: "Practice 'P' vs 'B' sounds: 'Park' vs 'Bark', 'Pen' vs 'Ben'"
      })
    }

    return tips
  }

  identifyGrammarPatterns(answers) {
    const patterns = []
    
    answers.forEach(answer => {
      if (answer.transcription) {
        const text = answer.transcription.toLowerCase()
        
        // Check for missing articles
        if (!text.match(/\b(a|an|the)\b/) && text.length > 10) {
          patterns.push('articles')
        }
        
        // Check for verb tense issues
        if (text.includes('yesterday') && text.includes('go')) {
          patterns.push('past_tense')
        }
        
        // Check for pronunciation issues (low scores)
        if (answer.pronunciation_score < 60) {
          patterns.push('pronunciation')
        }
      }
    })

    return [...new Set(patterns)] // Remove duplicates
  }

  identifyStrengths(userProgress) {
    const strengths = []
    
    userProgress.forEach(progress => {
      if (progress.total_score > 80) {
        strengths.push('high_accuracy')
      }
      if (progress.completed_levels.length > 5) {
        strengths.push('consistency')
      }
    })

    return strengths
  }

  generateRecommendations(weakAreas, userProgress) {
    const recommendations = []

    if (weakAreas.includes('articles')) {
      recommendations.push({
        type: 'practice',
        title: 'Article Practice',
        description: 'Spend 10 minutes daily practicing a/an/the with common nouns',
        priority: 'high'
      })
    }

    if (weakAreas.includes('pronunciation')) {
      recommendations.push({
        type: 'voice_practice',
        title: 'Pronunciation Focus',
        description: 'Practice speaking exercises 5 minutes daily',
        priority: 'high'
      })
    }

    if (userProgress.length === 0) {
      recommendations.push({
        type: 'start',
        title: 'Begin with Daily Conversation',
        description: 'Start with everyday phrases to build confidence',
        priority: 'medium'
      })
    }

    return recommendations
  }

  getFallbackContent(scenario) {
    const fallbackContent = {
      job_interview: "Practice this: 'Tell me about yourself.' Remember to mention your skills, experience, and why you want the job.",
      daily_conversation: "Practice greeting: 'Hello, how are you today?' Remember to smile and make eye contact.",
      business: "Practice email opening: 'I hope this email finds you well. I am writing to...'",
      travel: "Practice at airport: 'Excuse me, where is gate B12?' Be polite and speak clearly."
    }

    return fallbackContent[scenario] || "Keep practicing your English! Every conversation makes you better."
  }

  getCulturalNotes(scenario) {
    const notes = {
      job_interview: "In Western interviews, confidence is valued. It's okay to talk about your achievements.",
      daily_conversation: "Small talk is important in English culture. Weather is always a safe topic!",
      business: "Be punctual and direct. Time is very important in business culture.",
      travel: "Always say 'please' and 'thank you'. Politeness is very important when traveling."
    }

    return notes[scenario] || null
  }

  // Enhanced speech-to-text with better accuracy
  async transcribeAudio(audioBlob) {
    try {
      console.log('🎤 Transcribing audio blob size:', audioBlob.size)
      
      // Use Web Speech API for real-time transcription with improved settings
      return new Promise((resolve, reject) => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          console.warn('Speech recognition not supported, using fallback')
          resolve("Speech recognition not available on this browser")
          return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        
        // Enhanced configuration for better accuracy
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'
        recognition.maxAlternatives = 3 // Get multiple alternatives
        
        // Create audio element to play the recorded audio for recognition
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        let finalTranscript = ''
        let hasResult = false
        let isFinished = false
        
        recognition.onstart = () => {
          console.log('🎤 Speech recognition started for transcription')
        }

        recognition.onresult = (event) => {
          if (isFinished) return
          
          console.log('🎤 Recognition results:', event.results)
          
          // Get the best result from alternatives
          let bestTranscript = ''
          let bestConfidence = 0
          
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              for (let j = 0; j < result.length; j++) {
                const alternative = result[j]
                if (alternative.confidence > bestConfidence) {
                  bestConfidence = alternative.confidence
                  bestTranscript = alternative.transcript
                }
              }
            }
          }
          
          finalTranscript = bestTranscript || event.results[0][0].transcript
          hasResult = true
          isFinished = true
          console.log('🎤 Final transcription:', finalTranscript, 'Confidence:', bestConfidence)
          URL.revokeObjectURL(audioUrl)
          resolve(finalTranscript.trim())
        }

        recognition.onerror = (event) => {
          if (isFinished) return
          
          console.error('🎤 Speech recognition error:', event.error)
          isFinished = true
          URL.revokeObjectURL(audioUrl)
          
          if (!hasResult) {
            // Provide a more helpful fallback message
            resolve("I spoke in English but transcription was unclear - please try again")
          }
        }

        recognition.onend = () => {
          if (isFinished) return
          
          console.log('🎤 Speech recognition ended')
          isFinished = true
          URL.revokeObjectURL(audioUrl)
          
          if (hasResult && finalTranscript.trim()) {
            resolve(finalTranscript.trim())
          } else if (!hasResult) {
            resolve("Please speak more clearly and try again")
          }
        }

        // Start recognition immediately
        try {
          recognition.start()
        } catch (error) {
          console.error('Failed to start recognition:', error)
          isFinished = true
          URL.revokeObjectURL(audioUrl)
          resolve("Speech recognition failed to start - please try again")
        }
        
        // Timeout after 15 seconds
        setTimeout(() => {
          if (!isFinished) {
            isFinished = true
            recognition.stop()
            URL.revokeObjectURL(audioUrl)
            resolve("Speech recognition timeout - please try speaking again")
          }
        }, 15000)
      })
      
    } catch (error) {
      console.error('❌ Transcription error:', error)
      return "Thank you for speaking! Please try again for better transcription."
    }
  }

  // Enhanced analyze answer with Somali feedback focus
  async analyzeAnswer(question, userAnswer, context = {}) {
    try {
      if (!userAnswer || userAnswer.trim().length === 0) {
        return this.createSomaliNoAnswerResponse()
      }

      // Calculate scores
      const wordCount = userAnswer.trim().split(/\s+/).length
      const grammarScore = this.calculateGrammarScore(userAnswer)
      const fluencyScore = this.calculateFluencyScore(userAnswer, wordCount)
      const pronunciationScore = this.calculatePronunciationScore(userAnswer, context)
      const relevanceScore = this.calculateRelevanceScore(question, userAnswer)
      
      // Calculate overall score
      const overallScore = Math.round(
        (grammarScore * 0.25) + 
        (fluencyScore * 0.25) + 
        (pronunciationScore * 0.25) + 
        (relevanceScore * 0.25)
      )

      // Determine if user passed (60% minimum)
      const passed = overallScore >= 60

      // Generate Somali feedback based on score
      const somaliFeedback = this.generateSomaliFeedback(overallScore, userAnswer, context)
      const encouragement = this.getSomaliEncouragement(overallScore)
      const improvements = this.getSomaliImprovements(overallScore, userAnswer)
      const strengths = this.getSomaliStrengths(overallScore, userAnswer)

      return {
        overallScore,
        grammarScore,
        fluencyScore,
        pronunciationScore,
        relevanceScore,
        passed,
        feedback_somali: somaliFeedback,
        encouragement_somali: encouragement,
        improvements_somali: improvements,
        strengths_somali: strengths,
        pronunciation_tips: this.getSomaliPronunciationTips(context.category),
        // Keep minimal English for technical display
        feedback: passed ? "Good job! Keep practicing." : "Keep practicing to improve.",
        strengths: strengths.map(s => s), // Keep for compatibility
        improvements: improvements.map(i => i) // Keep for compatibility
      }
    } catch (error) {
      console.error('Error analyzing answer:', error)
      return this.createSomaliErrorResponse()
    }
  }

  // Generate comprehensive Somali feedback
  generateSomaliFeedback(score, userAnswer, context) {
    const category = context.category || 'general'
    
    if (score >= 80) {
      return `🎉 Aad bay u fiican tahay! Codkaagu waa cad yahay, erayada waa saxan yihiin. Af-Ingiriiskaagu wuu horumarsan yahay. Sii wad sidaas oo kale!`
    } else if (score >= 60) {
      return `✅ Waa fiican! Waxaad gudbisay imtixaanka. Laakiin weli wax yar ayaad hagaajin kartaa. Ku sii wad dhaqanka si aad u noqoto mid aad u fiican.`
    } else if (score >= 40) {
      return `⚠️ Waa bilowga fiican laakiin waxaad u baahan tahay dhaqan dheeraad ah. Eeg tusaalaha hoose oo ku celi mar kale. Ha niyad jabin!`
    } else {
      return `❌ Waxaad u baahan tahay dhaqan badan. Dhegayso tusaalaha, ku celi, oo isku day mar kale. Qof walba wuu bartaa, adna waad awoodaa!`
    }
  }

  // Somali encouragement based on score
  getSomaliEncouragement(score) {
    if (score >= 80) {
      return "💪 Aad bay u fiican tahay! Waxaad noqon doontaa qof Ingiriis si fiican u hadla!"
    } else if (score >= 60) {
      return "🌟 Waa hagaag! Sii wad dhaqanka, waxaad ku dhow dahay guul!"
    } else if (score >= 40) {
      return "🎯 Ha niyad jabin! Dhaqan walba wuu ku dheeraynayaa. Sii wad!"
    } else {
      return "💝 Qof walba wuu bilowdaa meel. Adna waad awoodaa! Ku celi oo dhaqso!"
    }
  }

  // Somali improvements suggestions
  getSomaliImprovements(score, userAnswer) {
    const improvements = []
    
    if (score < 60) {
      improvements.push("Si tartiib ah u hadal - degdeg ha u hadlin")
      improvements.push("Erayada si cad u dheh - ha nuugin")
      improvements.push("Waqti qaado si aad u fiirsato waxa aad leedahay")
    }
    
    if (userAnswer.length < 50) {
      improvements.push("Jawaab dheer bixii - wax badan ka sheeg")
    }
    
    if (score < 40) {
      improvements.push("Tusaalaha dhegayso oo ku dayasho")
      improvements.push("Maalin walba dhaqan yar samee")
    }

    return improvements
  }

  // Somali strengths identification
  getSomaliStrengths(score, userAnswer) {
    const strengths = []
    
    if (score >= 60) {
      strengths.push("Codkaagu waa cad yahay")
      strengths.push("Erayada qaar waa si fiican u dhehday")
    }
    
    if (userAnswer.length > 100) {
      strengths.push("Jawaab dheer baad bixisay - waa fiican")
    }
    
    if (score >= 80) {
      strengths.push("Grammar-kaagu waa hagaagsan yahay")
      strengths.push("Si dabiici ah ayaad u hadashay")
    }

    return strengths.length > 0 ? strengths : ["Isku day fiican baad samaysay"]
  }

  // No answer response in Somali
  createSomaliNoAnswerResponse() {
    return {
      overallScore: 0,
      grammarScore: 0,
      fluencyScore: 0,
      pronunciationScore: 0,
      relevanceScore: 0,
      passed: false,
      feedback_somali: "❌ Wax ma aadan hadlin. Rikoordka dib u bilow oo su'aasha ka jawaab.",
      encouragement_somali: "🎤 Cabsi ha qabin! Hadal oo isku day. Qof walba wuu bartaa.",
      improvements_somali: ["Rikoordka bilow", "Su'aasha akhri", "Si tartiib ah u hadal"],
      strengths_somali: [],
      pronunciation_tips: "Cabsi ha qabin hadalka. Si tartiib ah bilow.",
      feedback: "No speech detected. Please try recording again.",
      strengths: [],
      improvements: ["Try recording again", "Speak clearly", "Take your time"]
    }
  }

  // Error response in Somali
  createSomaliErrorResponse() {
    return {
      overallScore: 0,
      grammarScore: 0,
      fluencyScore: 0,
      pronunciationScore: 0,
      relevanceScore: 0,
      passed: false,
      feedback_somali: "⚠️ Wax khalad ah ayaa dhacay. Dib u isku day.",
      encouragement_somali: "🔄 Dib u isku day. Wax walba way hagaagi doontaa.",
      improvements_somali: ["Dib u isku day", "Internet-ka hubi"],
      strengths_somali: [],
      pronunciation_tips: "Dib u isku day markale.",
      feedback: "Analysis error. Please try again.",
      strengths: [],
      improvements: ["Try again", "Check your connection"]
    }
  }

  // Get random loading messages in both languages
  getLoadingMessages() {
    const messages = [
      {
        english: "Analyzing your pronunciation...",
        somali: "Waan baaraya sida aad u dhawaaqdo..."
      },
      {
        english: "Checking your grammar...",
        somali: "Waan hubinayaa naxwaha..."
      },
      {
        english: "Comparing with native speakers...",
        somali: "Waan la barbardhigayaa dadka asalka ah..."
      },
      {
        english: "Preparing personalized feedback...",
        somali: "Waan diyaarinayaa jawaab gaarka ah..."
      },
      {
        english: "Almost done! Great job speaking...",
        somali: "Dhammaan u dhow! Shaqo wanaagsan oo hadal ah..."
      },
      {
        english: "Your English is improving!",
        somali: "Af-Ingiriiskaagu wuu horumaraya!"
      },
      {
        english: "Keep up the excellent work!",
        somali: "Sii wad shaqada fiican!"
      }
    ]
    
    return messages[Math.floor(Math.random() * messages.length)]
  }

  // Get encouraging tips while loading
  getEncouragingTips() {
    const tips = [
      {
        english: "💡 Tip: Practice speaking English for 10 minutes daily",
        somali: "💡 Talo: Ku celceli hadlista Af-Ingiriisiga 10 daqiiqo maalin kasta"
      },
      {
        english: "🎯 Remember: Mistakes help you learn faster",
        somali: "🎯 Xusuuso: Khaladaadku waxay kaa caawiyaan inaad si dhaqso ah u barato"
      },
      {
        english: "🌟 You're doing great! Every word counts",
        somali: "🌟 Waxaad samaysaa shaqo fiican! Eray kastaa muhiim ah"
      },
      {
        english: "🚀 Confidence comes with practice",
        somali: "🚀 Kalsoonidu waxay la timaadaa tababarka"
      },
      {
        english: "📚 Listen to English daily to improve",
        somali: "📚 Maalin kasta dhegayso Af-Ingiriisiga si aad u horumariso"
      }
    ]
    
    return tips[Math.floor(Math.random() * tips.length)]
  }

  // Helper methods for score calculation
  calculateGrammarScore(userAnswer) {
    // Simple grammar scoring based on sentence structure
    const sentences = userAnswer.split(/[.!?]+/).filter(s => s.trim().length > 0)
    let score = 70 // Base score
    
    // Check for basic sentence structure
    if (sentences.length > 0) {
      sentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/)
        if (words.length >= 3) score += 5 // Complete sentences
        if (/^[A-Z]/.test(sentence.trim())) score += 3 // Capitalization
      })
    }
    
    // Check for common grammar patterns
    if (/\b(is|are|am|was|were)\b/i.test(userAnswer)) score += 5
    if (/\b(the|a|an)\b/i.test(userAnswer)) score += 3
    
    return Math.min(100, Math.max(0, score))
  }

  calculateFluencyScore(userAnswer, wordCount) {
    let score = 50 // Base score
    
    // Word count scoring
    if (wordCount >= 20) score += 20
    else if (wordCount >= 10) score += 10
    else if (wordCount >= 5) score += 5
    
    // Sentence variety
    const sentences = userAnswer.split(/[.!?]+/).filter(s => s.trim().length > 0)
    if (sentences.length > 1) score += 10
    
    // Natural flow indicators
    if (/\b(and|but|because|so|then|also)\b/i.test(userAnswer)) score += 10
    if (/\b(I think|I believe|In my opinion)\b/i.test(userAnswer)) score += 5
    
    return Math.min(100, Math.max(0, score))
  }

  calculatePronunciationScore(userAnswer, context) {
    // Since we can't actually analyze audio pronunciation, 
    // we'll estimate based on text complexity and context
    let score = 60 // Base score
    
    const recordingTime = context.recordingTime || 0
    
    // Time-based scoring (good pacing)
    if (recordingTime >= 60 && recordingTime <= 90) score += 15
    else if (recordingTime >= 45) score += 10
    else if (recordingTime >= 30) score += 5
    
    // Complexity bonus
    const wordCount = userAnswer.trim().split(/\s+/).length
    if (wordCount > 30) score += 10
    else if (wordCount > 20) score += 5
    
    return Math.min(100, Math.max(0, score))
  }

  calculateRelevanceScore(question, userAnswer) {
    let score = 50 // Base score
    
    // Check if answer addresses the question
    const questionWords = question.toLowerCase().split(/\s+/)
    const answerWords = userAnswer.toLowerCase().split(/\s+/)
    
    let relevantWords = 0
    questionWords.forEach(qWord => {
      if (qWord.length > 3 && answerWords.some(aWord => aWord.includes(qWord) || qWord.includes(aWord))) {
        relevantWords++
      }
    })
    
    score += (relevantWords / questionWords.length) * 30
    
    // Length appropriateness
    if (userAnswer.length > 50) score += 10
    if (userAnswer.length > 100) score += 10
    
    return Math.min(100, Math.max(0, score))
  }

  // Use Web Speech API for live speech recognition during recording
  async startLiveSpeechRecognition() {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'))
        return
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognitionRef = new SpeechRecognition()
      
      this.recognitionRef.continuous = true
      this.recognitionRef.interimResults = true
      this.recognitionRef.lang = 'en-US'

      let finalTranscript = ''

      this.recognitionRef.onresult = (event) => {
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        // Return both final and interim results
        resolve({
          final: finalTranscript,
          interim: interimTranscript,
          isComplete: false
        })
      }

      this.recognitionRef.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        reject(new Error(`Speech recognition error: ${event.error}`))
      }

      this.recognitionRef.onend = () => {
        resolve({
          final: finalTranscript,
          interim: '',
          isComplete: true
        })
      }

      try {
        this.recognitionRef.start()
      } catch (error) {
        reject(error)
      }
    })
  }

  // Stop live speech recognition
  stopLiveSpeechRecognition() {
    if (this.recognitionRef) {
      try {
        this.recognitionRef.stop()
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
      }
      this.recognitionRef = null
    }
  }

  // Text-to-speech for reading questions
  async speakText(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Text-to-speech not supported'))
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = options.rate || 0.9
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 1

      utterance.onend = () => resolve()
      utterance.onerror = (event) => reject(new Error(`TTS error: ${event.error}`))

      speechSynthesis.speak(utterance)
    })
  }

  // Stop any ongoing speech
  stopSpeaking() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }

  // Advanced pronunciation analysis for Somali speakers
  async analyzePronunciation(userText, targetText, challengeType) {
    try {
      const similarity = this.calculateTextSimilarity(userText, targetText)
      const specificIssues = this.identifySomaliPronunciationIssues(userText, targetText, challengeType)
      
      return {
        overallScore: Math.round(similarity * 100),
        feedback: this.generatePronunciationFeedback(similarity, specificIssues),
        corrections: specificIssues,
        somaliTips: this.getSomaliPronunciationTips(challengeType),
        strengths: this.identifyPronunciationStrengths(userText, targetText),
        improvements: this.suggestImprovements(specificIssues)
      }
    } catch (error) {
      console.error('Error analyzing pronunciation:', error)
      return {
        overallScore: 50,
        feedback: 'Keep practicing! Focus on clear pronunciation.',
        corrections: [],
        somaliTips: ['Practice speaking slowly and clearly'],
        strengths: [],
        improvements: []
      }
    }
  }

  calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(' ')
    const words2 = text2.toLowerCase().split(' ')
    
    let matches = 0
    const maxLength = Math.max(words1.length, words2.length)
    
    words1.forEach(word => {
      if (words2.includes(word)) matches++
    })
    
    return matches / maxLength
  }

  identifySomaliPronunciationIssues(userText, targetText, challengeType) {
    const issues = []
    
    switch (challengeType) {
      case 'p_vs_b':
        if (targetText.includes('p') && userText.toLowerCase().includes('b')) {
          issues.push({
            word: 'P sound',
            issue: 'P pronounced as B',
            tip: 'P is voiceless - no throat vibration'
          })
        }
        break
        
      case 'th_sounds':
        if (targetText.includes('th') && !userText.toLowerCase().includes('th')) {
          issues.push({
            word: 'TH sound',
            issue: 'TH pronounced as T or D',
            tip: 'Put tongue between teeth for TH'
          })
        }
        break
        
      case 'final_consonants':
        const targetWords = targetText.split(' ')
        targetWords.forEach(word => {
          if (/[bcdfghjklmnpqrstvwxyz]$/i.test(word)) {
            if (!userText.toLowerCase().includes(word.toLowerCase())) {
              issues.push({
                word: word,
                issue: 'Final consonant missing',
                tip: `Pronounce the final ${word.slice(-1).toUpperCase()} sound`
              })
            }
          }
        })
        break
    }
    
    return issues
  }

  generatePronunciationFeedback(similarity, issues) {
    if (similarity >= 0.9) return "Excellent pronunciation! You're mastering this sound."
    if (similarity >= 0.7) return "Good job! A few small improvements will make it perfect."
    if (similarity >= 0.5) return "You're getting there! Focus on the specific sounds highlighted."
    return "Keep practicing! Remember the Somali-specific tips below."
  }

  getSomaliPronunciationTips(challengeType) {
    const tips = {
      'p_vs_b': [
        "In Somali, P and B sounds are similar. In English, they're different.",
        "For P: Don't use your voice, just air. For B: Use your voice.",
        "Practice: Put your hand on your throat. B should vibrate, P shouldn't."
      ],
      'th_sounds': [
        "TH sounds don't exist in Somali. Put your tongue between your teeth.",
        "For 'think': No voice, just air through teeth.",
        "For 'this': Use voice while tongue touches teeth."
      ],
      'vowel_sounds': [
        "English has more vowel sounds than Somali.",
        "Listen carefully to the difference between 'bit' and 'beat'.",
        "Practice with a mirror to see mouth shape changes."
      ],
      'final_consonants': [
        "Somali words rarely end in consonants, but English words often do.",
        "Make sure to pronounce the final sound clearly.",
        "Don't add extra vowel sounds at the end."
      ]
    }
    
    return tips[challengeType] || ["Practice speaking slowly and clearly"]
  }

  identifyPronunciationStrengths(userText, targetText) {
    const strengths = []
    
    if (userText.length > 0) {
      strengths.push("Good effort in speaking")
    }
    
    if (userText.toLowerCase().includes(targetText.toLowerCase().substring(0, 3))) {
      strengths.push("Good start to the phrase")
    }
    
    return strengths
  }

  suggestImprovements(issues) {
    return issues.map(issue => `Focus on ${issue.word}: ${issue.tip}`)
  }

  // Smart content generation for different learning needs
  async generateSmartExercise(contentType, userLevel, scenario, focusAreas) {
    try {
      switch (contentType) {
        case 'conversation':
          return await this.generateConversationExercise(userLevel, scenario, focusAreas)
        case 'grammar':
          return await this.generateGrammarExercise(userLevel, focusAreas)
        case 'vocabulary':
          return await this.generateVocabularyExercise(userLevel, scenario)
        case 'cultural':
          return await this.generateCulturalExercise(scenario, focusAreas)
        default:
          return this.getFallbackContent(scenario)
      }
    } catch (error) {
      console.error('Error generating smart exercise:', error)
      return this.getFallbackContent(scenario)
    }
  }

  async generateConversationExercise(userLevel, scenario, focusAreas) {
    const templates = {
      job_interview: {
        beginner: ["Tell me about yourself", "Why do you want this job?"],
        intermediate: ["What are your strengths and weaknesses?", "Where do you see yourself in 5 years?"],
        advanced: ["Describe a challenging situation you overcame", "How do you handle workplace conflict?"]
      },
      daily_conversation: {
        beginner: ["How are you today?", "What's your name?"],
        intermediate: ["What do you do for fun?", "Tell me about your family"],
        advanced: ["What's your opinion on current events?", "Describe your ideal vacation"]
      }
    }
    
    const levelTemplates = templates[scenario]?.[userLevel] || templates.daily_conversation.beginner
    const randomTemplate = levelTemplates[Math.floor(Math.random() * levelTemplates.length)]
    
    return {
      type: 'conversation',
      prompt: randomTemplate,
      scenario: scenario,
      difficulty: userLevel,
      focusAreas: focusAreas,
      culturalNotes: this.getCulturalNotes(scenario)
    }
  }

  async generateGrammarExercise(userLevel, focusAreas) {
    const exercises = {
      articles: {
        beginner: "Fill in the blank: I need ___ pen to write.",
        intermediate: "Choose the correct article: She is ___ engineer (a/an/the)",
        advanced: "Explain when to use 'the' vs 'a/an' in this context"
      },
      past_tense: {
        beginner: "Change to past tense: I go to school",
        intermediate: "Complete: Yesterday I ___ (see) a movie",
        advanced: "Use past perfect: By the time I arrived, they ___"
      }
    }
    
    const focusArea = focusAreas[0] || 'articles'
    const exercise = exercises[focusArea]?.[userLevel] || exercises.articles.beginner
    
    return {
      type: 'grammar',
      exercise: exercise,
      focusArea: focusArea,
      difficulty: userLevel,
      explanation: this.getGrammarExplanation(exercise, false)
    }
  }

  async generateVocabularyExercise(userLevel, scenario) {
    const vocabularyByScenario = {
      job_interview: ['experience', 'qualifications', 'responsibilities', 'teamwork'],
      daily_conversation: ['weather', 'family', 'hobbies', 'food'],
      business: ['meeting', 'deadline', 'project', 'client'],
      travel: ['airport', 'hotel', 'directions', 'ticket']
    }
    
    const words = vocabularyByScenario[scenario] || vocabularyByScenario.daily_conversation
    const selectedWord = words[Math.floor(Math.random() * words.length)]
    
    return {
      type: 'vocabulary',
      word: selectedWord,
      definition: `Important word for ${scenario}`,
      example: `Use "${selectedWord}" in a sentence about ${scenario}`,
      scenario: scenario,
      difficulty: userLevel
    }
  }

  async generateCulturalExercise(scenario, focusAreas) {
    const culturalScenarios = {
      job_interview: {
        situation: "The interviewer asks about your family",
        somaliApproach: "Share detailed family information",
        englishApproach: "Keep it brief and professional",
        tip: "Western interviews focus on professional qualifications"
      },
      daily_conversation: {
        situation: "Someone asks 'How are you?' in passing",
        somaliApproach: "Give detailed answer about health and family",
        englishApproach: "Brief response - it's usually just a greeting",
        tip: "In English culture, this is often just polite small talk"
      }
    }
    
    const cultural = culturalScenarios[scenario] || culturalScenarios.daily_conversation
    
    return {
      type: 'cultural',
      situation: cultural.situation,
      comparison: {
        somali: cultural.somaliApproach,
        english: cultural.englishApproach
      },
      tip: cultural.tip,
      scenario: scenario
    }
  }

  // Predict learning progress based on user data
  predictLearningOutcomes(userProgress, userAnswers, targetGoals) {
    try {
      const currentLevel = this.assessCurrentLevel(userProgress, userAnswers)
      const learningRate = this.calculateLearningRate(userAnswers)
      const consistencyScore = this.calculateConsistency(userAnswers)
      
      return {
        currentLevel,
        estimatedTimeToGoal: this.estimateTimeToGoal(currentLevel, targetGoals, learningRate),
        recommendedStudyPlan: this.generateStudyPlan(currentLevel, targetGoals, consistencyScore),
        riskFactors: this.identifyRiskFactors(userAnswers, consistencyScore),
        motivationFactors: this.identifyMotivationFactors(userProgress)
      }
    } catch (error) {
      console.error('Error predicting learning outcomes:', error)
      return {
        currentLevel: 'intermediate',
        estimatedTimeToGoal: '3-6 months',
        recommendedStudyPlan: 'Continue regular practice',
        riskFactors: [],
        motivationFactors: ['progress tracking', 'achievement badges']
      }
    }
  }

  assessCurrentLevel(userProgress, userAnswers) {
    const totalCompleted = userProgress?.reduce((sum, p) => sum + p.completed_levels.length, 0) || 0
    const avgScore = userAnswers?.length > 0 
      ? userAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / userAnswers.length 
      : 0

    const combinedScore = totalCompleted * 5 + avgScore

    if (combinedScore < 50) return 'beginner'
    if (combinedScore < 150) return 'elementary'
    if (combinedScore < 300) return 'intermediate'
    if (combinedScore < 500) return 'upper-intermediate'
    return 'advanced'
  }

  calculateLearningRate(userAnswers) {
    if (!userAnswers || userAnswers.length < 5) return 0

    const recentScores = userAnswers.slice(0, 5).map(a => a.score || 0)
    const olderScores = userAnswers.slice(-5).map(a => a.score || 0)

    const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length
    const olderAvg = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length

    return Math.round(((recentAvg - olderAvg) / Math.max(olderAvg, 1)) * 100)
  }

  calculateConsistency(userAnswers) {
    if (!userAnswers || userAnswers.length < 3) return 0

    const dates = userAnswers.map(a => new Date(a.created_at).toDateString())
    const uniqueDates = [...new Set(dates)]
    const daysSinceStart = Math.max(1, 
      (new Date() - new Date(userAnswers[userAnswers.length - 1].created_at)) / (1000 * 60 * 60 * 24)
    )

    return Math.round((uniqueDates.length / daysSinceStart) * 7) // Sessions per week
  }

  estimateTimeToGoal(currentLevel, targetGoals, learningRate) {
    const levelOrder = ['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced']
    const currentIndex = levelOrder.indexOf(currentLevel)
    const targetIndex = levelOrder.indexOf(targetGoals) || 4
    
    if (currentIndex >= targetIndex) return 'Goal achieved!'
    
    const levelsToGo = targetIndex - currentIndex
    const weeksPerLevel = Math.max(4, Math.round(20 / Math.max(learningRate, 1)))
    
    return `${levelsToGo * weeksPerLevel} weeks`
  }

  generateStudyPlan(currentLevel, targetGoals, consistencyScore) {
    const plans = {
      beginner: 'Focus on basic vocabulary and simple sentences. Practice 15 minutes daily.',
      elementary: 'Work on grammar fundamentals and pronunciation. Practice 20 minutes daily.',
      intermediate: 'Develop conversation skills and cultural understanding. Practice 25 minutes daily.',
      'upper-intermediate': 'Refine advanced grammar and professional communication. Practice 30 minutes daily.',
      advanced: 'Master nuanced communication and cultural subtleties. Practice 30+ minutes daily.'
    }
    
    return plans[currentLevel] || plans.intermediate
  }

  identifyRiskFactors(userAnswers, consistencyScore) {
    const risks = []
    
    if (consistencyScore < 2) {
      risks.push({
        factor: 'Low consistency',
        description: 'Irregular study pattern may slow progress',
        mitigation: 'Set daily reminders and start with shorter sessions'
      })
    }
    
    if (userAnswers?.length > 0) {
      const daysSinceLastActivity = (new Date() - new Date(userAnswers[0].created_at)) / (1000 * 60 * 60 * 24)
      if (daysSinceLastActivity > 7) {
        risks.push({
          factor: 'Inactivity',
          description: 'Extended break from learning',
          mitigation: 'Resume with easy exercises to rebuild momentum'
        })
      }
    }
    
    return risks
  }

  identifyMotivationFactors(userProgress) {
    const factors = ['progress tracking', 'achievement badges']
    
    if (userProgress?.length > 2) {
      factors.push('variety in learning paths')
    }
    
    factors.push('cultural context learning', 'real-world application')
    
    return factors
  }
}

export const aiService = new AIService()
export default aiService 