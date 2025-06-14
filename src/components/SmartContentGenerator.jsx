import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, BookOpen, Users, Briefcase, Plane, Target, Clock } from 'lucide-react'
import { aiService } from '../services/aiService'
import { saveAIConversation, getUserAnalytics } from '../lib/supabase'

const SmartContentGenerator = ({ user, userProgress, scenario, onContentGenerated }) => {
  const [generatedContent, setGeneratedContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [contentType, setContentType] = useState('conversation')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [focusAreas, setFocusAreas] = useState([])

  const contentTypes = {
    conversation: {
      icon: <Users className="w-5 h-5" />,
      title: 'Conversation Practice',
      description: 'Real-world dialogue scenarios'
    },
    grammar: {
      icon: <BookOpen className="w-5 h-5" />,
      title: 'Grammar Exercises',
      description: 'Targeted grammar practice'
    },
    vocabulary: {
      icon: <Target className="w-5 h-5" />,
      title: 'Vocabulary Building',
      description: 'Context-based word learning'
    },
    cultural: {
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Cultural Scenarios',
      description: 'Navigate cultural differences'
    }
  }

  const scenarioTemplates = {
    job_interview: {
      conversations: [
        'Tell me about yourself',
        'Why do you want this job?',
        'What are your strengths and weaknesses?',
        'Where do you see yourself in 5 years?',
        'Do you have any questions for us?'
      ],
      vocabulary: ['experience', 'qualifications', 'responsibilities', 'teamwork', 'leadership'],
      cultural_notes: [
        'Maintain eye contact to show confidence',
        'Firm handshake is expected',
        'Arrive 10-15 minutes early',
        'Ask questions about the company'
      ]
    },
    daily_conversation: {
      conversations: [
        'How was your weekend?',
        'What do you think about the weather?',
        'Have you seen any good movies lately?',
        'What are your plans for the evening?',
        'How do you like living here?'
      ],
      vocabulary: ['weather', 'weekend', 'movies', 'plans', 'neighborhood'],
      cultural_notes: [
        'Small talk is important in English culture',
        'Weather is always a safe topic',
        'Keep conversations light and positive',
        'Show interest in others\' opinions'
      ]
    },
    business: {
      conversations: [
        'Let\'s schedule a meeting',
        'I\'d like to discuss the project timeline',
        'Could you send me the report by Friday?',
        'What\'s your opinion on this proposal?',
        'Let\'s follow up next week'
      ],
      vocabulary: ['deadline', 'proposal', 'meeting', 'timeline', 'follow-up'],
      cultural_notes: [
        'Be direct and concise',
        'Time is very important',
        'Email communication is formal',
        'Meetings start on time'
      ]
    },
    travel: {
      conversations: [
        'Excuse me, where is the nearest subway station?',
        'How much does a ticket to downtown cost?',
        'Is this seat taken?',
        'What time does the museum close?',
        'Can you recommend a good restaurant?'
      ],
      vocabulary: ['directions', 'ticket', 'museum', 'restaurant', 'subway'],
      cultural_notes: [
        'Always say please and thank you',
        'Queue politely in lines',
        'Tipping is expected in restaurants',
        'Ask permission before taking photos'
      ]
    }
  }

  useEffect(() => {
    loadUserPreferences()
  }, [user])

  const loadUserPreferences = async () => {
    if (!user?.id) return

    try {
      const { data: analytics } = await getUserAnalytics(user.id)
      if (analytics) {
        setFocusAreas(analytics.weak_areas || [])
        setDifficulty(analytics.estimated_fluency_level?.toLowerCase() || 'intermediate')
      }
    } catch (error) {
      console.error('Error loading user preferences:', error)
    }
  }

  const generateContent = async () => {
    setLoading(true)
    
    try {
      let content = null

      switch (contentType) {
        case 'conversation':
          content = await generateConversationScenario()
          break
        case 'grammar':
          content = await generateGrammarExercise()
          break
        case 'vocabulary':
          content = await generateVocabularyExercise()
          break
        case 'cultural':
          content = await generateCulturalScenario()
          break
      }

      setGeneratedContent(content)
      
      // Save to database for analytics
      if (user?.id) {
        await saveAIConversation(
          user.id,
          'content_generation',
          scenario,
          [{ type: 'generated_content', content }],
          { contentType, difficulty, focusAreas }
        )
      }

      if (onContentGenerated) {
        onContentGenerated(content)
      }

    } catch (error) {
      console.error('Error generating content:', error)
      setGeneratedContent({
        error: true,
        message: 'Could not generate content right now. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateConversationScenario = async () => {
    const template = scenarioTemplates[scenario] || scenarioTemplates.daily_conversation
    const randomConversation = template.conversations[Math.floor(Math.random() * template.conversations.length)]

    // Use AI to create a full scenario
    const prompt = `Create a realistic English conversation scenario for a Somali speaker learning English. 
    Scenario: ${scenario}
    Starting phrase: "${randomConversation}"
    Difficulty: ${difficulty}
    Focus areas: ${focusAreas.join(', ')}
    
    Include:
    1. A complete dialogue (4-6 exchanges)
    2. Cultural context explanations
    3. Key vocabulary with Somali cultural comparisons
    4. Common mistakes Somali speakers make`

    try {
      const aiResponse = await aiService.generatePersonalizedContent(difficulty, focusAreas, scenario)
      
      return {
        type: 'conversation',
        title: `${scenario.replace('_', ' ').toUpperCase()} Practice`,
        scenario: randomConversation,
        dialogue: generateDialogue(randomConversation, template),
        vocabulary: template.vocabulary.slice(0, 5),
        culturalNotes: template.cultural_notes,
        somaliTips: generateSomaliSpecificTips(scenario, focusAreas),
        practiceQuestions: generatePracticeQuestions(randomConversation)
      }
    } catch (error) {
      return generateFallbackConversation(randomConversation, template)
    }
  }

  const generateGrammarExercise = async () => {
    const grammarTopics = {
      articles: {
        title: 'Articles (a, an, the)',
        explanation: 'Somali doesn\'t have articles, but English uses them to show if something is specific or general',
        exercises: [
          { sentence: '__ car is red', answer: 'The', explanation: 'Specific car we\'re talking about' },
          { sentence: 'I need __ pen', answer: 'a', explanation: 'Any pen, not specific' },
          { sentence: 'She is __ engineer', answer: 'an', explanation: 'Job title, starts with vowel sound' }
        ]
      },
      past_tense: {
        title: 'Past Tense Verbs',
        explanation: 'English changes verb forms for past time, unlike Somali which uses time words',
        exercises: [
          { sentence: 'Yesterday I __ (go) to the store', answer: 'went', explanation: 'Irregular past tense' },
          { sentence: 'She __ (work) late last night', answer: 'worked', explanation: 'Regular past tense: add -ed' },
          { sentence: 'We __ (eat) dinner at 7pm', answer: 'ate', explanation: 'Irregular past tense' }
        ]
      },
      prepositions: {
        title: 'Prepositions (in, on, at)',
        explanation: 'English prepositions are different from Somali spatial concepts',
        exercises: [
          { sentence: 'The meeting is __ Monday', answer: 'on', explanation: 'Use "on" with days' },
          { sentence: 'I live __ London', answer: 'in', explanation: 'Use "in" with cities' },
          { sentence: 'See you __ 3 o\'clock', answer: 'at', explanation: 'Use "at" with specific times' }
        ]
      }
    }

    const focusedTopic = focusAreas.includes('articles') ? 'articles' :
                        focusAreas.includes('past_tense') ? 'past_tense' : 'prepositions'
    
    const topic = grammarTopics[focusedTopic]

    return {
      type: 'grammar',
      title: topic.title,
      explanation: topic.explanation,
      exercises: topic.exercises,
      somaliComparison: getSomaliGrammarComparison(focusedTopic),
      practiceLevel: difficulty
    }
  }

  const generateVocabularyExercise = async () => {
    const template = scenarioTemplates[scenario] || scenarioTemplates.daily_conversation
    
    return {
      type: 'vocabulary',
      title: `${scenario.replace('_', ' ').toUpperCase()} Vocabulary`,
      words: template.vocabulary.map(word => ({
        english: word,
        definition: getWordDefinition(word),
        example: getWordExample(word, scenario),
        somaliContext: getSomaliContext(word),
        pronunciation: getPhoneticPronunciation(word)
      })),
      exercises: generateVocabularyExercises(template.vocabulary),
      culturalUsage: template.cultural_notes
    }
  }

  const generateCulturalScenario = async () => {
    const culturalChallenges = {
      job_interview: {
        situation: 'You\'re in a job interview and the interviewer asks about your family',
        somaliApproach: 'In Somali culture, you would share detailed family information',
        englishApproach: 'In English/Western culture, keep it brief and professional',
        correctResponse: 'I have a supportive family that encourages my career goals',
        explanation: 'Western interviews focus on professional qualifications, not personal details'
      },
      daily_conversation: {
        situation: 'Someone asks "How are you?" in passing',
        somaliApproach: 'You would give a detailed answer about health and family',
        englishApproach: 'This is usually just a greeting, not a real question',
        correctResponse: 'Fine, thanks! How are you?',
        explanation: 'In English culture, this is often just polite small talk'
      },
      business: {
        situation: 'You need to disagree with your boss\'s idea in a meeting',
        somaliApproach: 'Direct disagreement might be seen as disrespectful',
        englishApproach: 'Polite, constructive disagreement is often valued',
        correctResponse: 'That\'s an interesting point. Have you considered this alternative?',
        explanation: 'Western business culture values different perspectives when expressed respectfully'
      }
    }

    const challenge = culturalChallenges[scenario] || culturalChallenges.daily_conversation

    return {
      type: 'cultural',
      title: 'Cultural Navigation',
      situation: challenge.situation,
      comparison: {
        somali: challenge.somaliApproach,
        english: challenge.englishApproach
      },
      recommendedResponse: challenge.correctResponse,
      explanation: challenge.explanation,
      practiceScenarios: generateCulturalPracticeScenarios(scenario),
      tips: [
        'Observe how native speakers handle similar situations',
        'When in doubt, err on the side of politeness',
        'Ask trusted colleagues for cultural guidance',
        'Remember: different doesn\'t mean wrong'
      ]
    }
  }

  // Helper functions
  const generateDialogue = (starter, template) => {
    return [
      { speaker: 'Person A', text: starter },
      { speaker: 'Person B', text: 'That sounds interesting. Tell me more.' },
      { speaker: 'Person A', text: 'Well, let me explain...' },
      { speaker: 'Person B', text: 'I see. That makes sense.' }
    ]
  }

  const generateSomaliSpecificTips = (scenario, focusAreas) => {
    const tips = []
    
    if (focusAreas.includes('pronunciation')) {
      tips.push('Remember: English P and B sounds are different from Somali')
    }
    
    if (focusAreas.includes('articles')) {
      tips.push('Unlike Somali, English uses "a/an/the" before nouns')
    }
    
    if (scenario === 'job_interview') {
      tips.push('Eye contact shows confidence in Western interviews')
    }
    
    return tips
  }

  const generatePracticeQuestions = (scenario) => {
    return [
      'How would you respond to this situation?',
      'What cultural differences do you notice?',
      'Practice saying this conversation out loud',
      'How might this be different in Somali culture?'
    ]
  }

  const generateFallbackConversation = (starter, template) => {
    return {
      type: 'conversation',
      title: 'Practice Conversation',
      scenario: starter,
      dialogue: generateDialogue(starter, template),
      vocabulary: template.vocabulary,
      culturalNotes: template.cultural_notes,
      somaliTips: ['Practice speaking slowly and clearly'],
      practiceQuestions: generatePracticeQuestions(starter)
    }
  }

  const getSomaliGrammarComparison = (topic) => {
    const comparisons = {
      articles: 'Somali: "Baabuur" can mean "car", "a car", or "the car" depending on context',
      past_tense: 'Somali: "Shalay waan tagay" (Yesterday I went) - time word shows past, verb stays same',
      prepositions: 'Somali spatial concepts are different from English in/on/at system'
    }
    return comparisons[topic] || 'Grammar works differently in Somali and English'
  }

  const getWordDefinition = (word) => {
    const definitions = {
      experience: 'knowledge or skill gained from doing something',
      weather: 'the condition of the atmosphere (rain, sun, wind)',
      deadline: 'the latest time something must be completed',
      directions: 'instructions on how to get somewhere'
    }
    return definitions[word] || 'Important word for this scenario'
  }

  const getWordExample = (word, scenario) => {
    return `"I have five years of ${word} in this field."`
  }

  const getSomaliContext = (word) => {
    return `This concept might be expressed differently in Somali culture`
  }

  const getPhoneticPronunciation = (word) => {
    const pronunciations = {
      experience: '/ɪkˈspɪriəns/',
      weather: '/ˈweðər/',
      deadline: '/ˈdedlaɪn/',
      directions: '/dɪˈrekʃənz/'
    }
    return pronunciations[word] || '/word/'
  }

  const generateVocabularyExercises = (words) => {
    return words.slice(0, 3).map(word => ({
      type: 'fill_blank',
      sentence: `The ${word} is very important in this situation.`,
      answer: word
    }))
  }

  const generateCulturalPracticeScenarios = (scenario) => {
    return [
      'Practice this situation with a friend',
      'Observe how others handle similar situations',
      'Ask for feedback from native speakers'
    ]
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h3 className="text-xl font-semibold text-gray-800">Smart Content Generator</h3>
      </div>

      {/* Content Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(contentTypes).map(([key, type]) => (
          <button
            key={key}
            onClick={() => setContentType(key)}
            className={`p-3 rounded-lg border-2 transition-all ${
              contentType === key
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              {type.icon}
              <span className="text-sm font-medium">{type.title}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Focus Areas</label>
          <div className="flex flex-wrap gap-2">
            {['articles', 'pronunciation', 'past_tense', 'vocabulary'].map(area => (
              <button
                key={area}
                onClick={() => {
                  setFocusAreas(prev => 
                    prev.includes(area) 
                      ? prev.filter(a => a !== area)
                      : [...prev, area]
                  )
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  focusAreas.includes(area)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {area.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateContent}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Generate {contentTypes[contentType].title}</span>
          </>
        )}
      </button>

      {/* Generated Content */}
      {generatedContent && !generatedContent.error && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-3">{generatedContent.title}</h4>
          
          {generatedContent.type === 'conversation' && (
            <div className="space-y-4">
              <div className="bg-white rounded p-3">
                <h5 className="font-medium mb-2">Dialogue:</h5>
                {generatedContent.dialogue.map((line, idx) => (
                  <p key={idx} className="mb-1">
                    <strong>{line.speaker}:</strong> {line.text}
                  </p>
                ))}
              </div>
              
              {generatedContent.vocabulary && (
                <div className="bg-blue-50 rounded p-3">
                  <h5 className="font-medium mb-2">Key Vocabulary:</h5>
                  <div className="flex flex-wrap gap-2">
                    {generatedContent.vocabulary.map((word, idx) => (
                      <span key={idx} className="bg-blue-200 px-2 py-1 rounded text-sm">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {generatedContent.somaliTips && (
                <div className="bg-purple-50 rounded p-3">
                  <h5 className="font-medium mb-2">Tips for Somali Speakers:</h5>
                  {generatedContent.somaliTips.map((tip, idx) => (
                    <p key={idx} className="text-sm text-purple-700">• {tip}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {generatedContent.type === 'grammar' && (
            <div className="space-y-4">
              <p className="text-gray-700">{generatedContent.explanation}</p>
              
              <div className="bg-white rounded p-3">
                <h5 className="font-medium mb-2">Practice Exercises:</h5>
                {generatedContent.exercises.map((exercise, idx) => (
                  <div key={idx} className="mb-3 p-2 bg-gray-50 rounded">
                    <p className="font-medium">{exercise.sentence}</p>
                    <p className="text-sm text-green-600">Answer: {exercise.answer}</p>
                    <p className="text-sm text-gray-600">{exercise.explanation}</p>
                  </div>
                ))}
              </div>
              
              <div className="bg-yellow-50 rounded p-3">
                <h5 className="font-medium mb-2">Somali Comparison:</h5>
                <p className="text-sm text-yellow-700">{generatedContent.somaliComparison}</p>
              </div>
            </div>
          )}

          {generatedContent.type === 'cultural' && (
            <div className="space-y-4">
              <div className="bg-white rounded p-3">
                <h5 className="font-medium mb-2">Situation:</h5>
                <p className="text-gray-700">{generatedContent.situation}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-orange-50 rounded p-3">
                  <h5 className="font-medium text-orange-800 mb-2">Somali Approach:</h5>
                  <p className="text-sm text-orange-700">{generatedContent.comparison.somali}</p>
                </div>
                <div className="bg-blue-50 rounded p-3">
                  <h5 className="font-medium text-blue-800 mb-2">English Approach:</h5>
                  <p className="text-sm text-blue-700">{generatedContent.comparison.english}</p>
                </div>
              </div>
              
              <div className="bg-green-50 rounded p-3">
                <h5 className="font-medium text-green-800 mb-2">Recommended Response:</h5>
                <p className="text-green-700 font-medium">"{generatedContent.recommendedResponse}"</p>
                <p className="text-sm text-green-600 mt-2">{generatedContent.explanation}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {generatedContent?.error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{generatedContent.message}</p>
        </div>
      )}
    </div>
  )
}

export default SmartContentGenerator 