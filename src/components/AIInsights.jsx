import { useState, useEffect } from 'react'
import { Brain, TrendingUp, Globe, Lightbulb, Target, Clock, Star } from 'lucide-react'
import { aiService } from '../services/aiService'
import { getUserAnswersForAnalysis, getUserAnalytics, saveUserAnalytics } from '../lib/supabase'

const AIInsights = ({ userProgress, userAnswers = [], user }) => {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [culturalTipOfDay, setCulturalTipOfDay] = useState(null)

  useEffect(() => {
    generateInsights()
    setCulturalTipOfDay(getDailyCulturalTip())
  }, [userProgress, userAnswers])

  const generateInsights = async () => {
    try {
      setLoading(true)
      
      // Get real user data
      const { data: userAnswersData } = await getUserAnswersForAnalysis(user?.id)
      const { data: existingAnalytics } = await getUserAnalytics(user?.id)
      
      const answersToAnalyze = userAnswersData || userAnswers
      
      // Analyze user progress with AI
      const analysis = aiService.analyzeUserProgress(userProgress, answersToAnalyze)
      
      // Generate personalized recommendations
      const recommendations = generatePersonalizedRecommendations(analysis, userProgress)
      
      // Calculate learning metrics
      const metrics = calculateLearningMetrics(userProgress, answersToAnalyze)
      
      // Save analytics to database
      const analyticsToSave = {
        weak_areas: analysis.weakAreas,
        strong_areas: analysis.strongAreas,
        confidence_score: metrics.averageScore,
        consistency_score: metrics.consistencyScore,
        improvement_trend: metrics.improvementTrend,
        estimated_fluency_level: metrics.estimatedFluencyLevel,
        strongest_skill: metrics.strongestSkill,
        total_ai_interactions: (existingAnalytics?.total_ai_interactions || 0) + 1
      }
      
      await saveUserAnalytics(user?.id, analyticsToSave)
      
      setInsights({
        analysis,
        recommendations,
        metrics,
        nextBestAction: getNextBestAction(analysis, userProgress),
        motivationalMessage: getMotivationalMessage(metrics, user)
      })
    } catch (error) {
      console.error('Error generating insights:', error)
      setInsights(getFallbackInsights())
    } finally {
      setLoading(false)
    }
  }

  const generatePersonalizedRecommendations = (analysis, progress) => {
    const recommendations = []

    // Based on weak areas
    if (analysis.weakAreas.includes('articles')) {
      recommendations.push({
        type: 'grammar',
        priority: 'high',
        title: 'Master English Articles',
        description: 'Focus on "a", "an", and "the" - these don\'t exist in Somali',
        action: 'Practice 10 minutes daily',
        culturalNote: 'English uses articles to show if something is specific or general',
        icon: '📝'
      })
    }

    if (analysis.weakAreas.includes('pronunciation')) {
      recommendations.push({
        type: 'speaking',
        priority: 'high',
        title: 'Pronunciation Practice',
        description: 'Work on English sounds that don\'t exist in Somali',
        action: 'Use voice exercises daily',
        culturalNote: 'Clear pronunciation builds confidence in conversations',
        icon: '🗣️'
      })
    }

    // Based on progress level
    if (progress.length === 0) {
      recommendations.push({
        type: 'start',
        priority: 'medium',
        title: 'Begin Your Journey',
        description: 'Start with Daily Conversation to build confidence',
        action: 'Complete first lesson today',
        culturalNote: 'Every expert was once a beginner',
        icon: '🚀'
      })
    }

    // Cultural recommendations
    recommendations.push({
      type: 'cultural',
      priority: 'medium',
      title: 'Cultural Bridge Learning',
      description: 'Understand English communication styles vs Somali customs',
      action: 'Read daily cultural tips',
      culturalNote: 'Understanding culture makes language learning easier',
      icon: '🌍'
    })

    return recommendations.slice(0, 3) // Show top 3
  }

  const calculateLearningMetrics = (progress, answers) => {
    const totalLevelsCompleted = progress.reduce((sum, p) => sum + p.completed_levels.length, 0)
    const averageScore = progress.length > 0 
      ? Math.round(progress.reduce((sum, p) => sum + p.total_score, 0) / progress.length)
      : 0

    const consistencyScore = calculateConsistency(progress)
    const improvementTrend = calculateImprovement(answers)
    const estimatedFluencyLevel = calculateFluencyLevel(totalLevelsCompleted, averageScore)

    return {
      totalLevelsCompleted,
      averageScore,
      consistencyScore,
      improvementTrend,
      estimatedFluencyLevel,
      strongestSkill: getStrongestSkill(answers),
      timeToNextLevel: estimateTimeToNextLevel(progress)
    }
  }

  const calculateConsistency = (progress) => {
    if (progress.length === 0) return 0
    
    // Simple consistency based on number of paths started
    const pathsStarted = progress.length
    const maxPaths = 5 // Assuming 5 total categories
    return Math.min(Math.round((pathsStarted / maxPaths) * 100), 100)
  }

  const calculateImprovement = (answers) => {
    if (answers.length < 2) return 'stable'
    
    const recentAnswers = answers.slice(-5)
    const olderAnswers = answers.slice(-10, -5)
    
    if (recentAnswers.length === 0 || olderAnswers.length === 0) return 'stable'
    
    const recentAvg = recentAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / recentAnswers.length
    const olderAvg = olderAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / olderAnswers.length
    
    if (recentAvg > olderAvg + 5) return 'improving'
    if (recentAvg < olderAvg - 5) return 'declining'
    return 'stable'
  }

  const calculateFluencyLevel = (levelsCompleted, averageScore) => {
    const totalScore = levelsCompleted * 10 + averageScore
    
    if (totalScore < 50) return 'Beginner'
    if (totalScore < 150) return 'Elementary'
    if (totalScore < 300) return 'Intermediate'
    if (totalScore < 500) return 'Upper-Intermediate'
    return 'Advanced'
  }

  const getStrongestSkill = (answers) => {
    if (answers.length === 0) return 'Getting Started'
    
    const skills = {
      grammar: answers.filter(a => a.grammar_score > 70).length,
      pronunciation: answers.filter(a => a.pronunciation_score > 70).length,
      fluency: answers.filter(a => a.fluency_score > 70).length,
      relevance: answers.filter(a => a.relevance_score > 70).length
    }
    
    const strongest = Object.entries(skills).reduce((a, b) => skills[a[0]] > skills[b[0]] ? a : b)
    return strongest[0].charAt(0).toUpperCase() + strongest[0].slice(1)
  }

  const estimateTimeToNextLevel = (progress) => {
    if (progress.length === 0) return 'Start your first lesson!'
    
    const avgProgress = progress.reduce((sum, p) => sum + p.completed_levels.length, 0) / progress.length
    const levelsToNext = Math.ceil(avgProgress) + 1 - avgProgress
    
    return `${Math.ceil(levelsToNext * 2)} days with daily practice`
  }

  const getNextBestAction = (analysis, progress) => {
    if (progress.length === 0) {
      return {
        title: 'Start Your English Journey',
        description: 'Begin with Daily Conversation to build confidence',
        action: 'Start First Lesson',
        urgency: 'high'
      }
    }

    if (analysis.weakAreas.includes('pronunciation')) {
      return {
        title: 'Improve Your Pronunciation',
        description: 'Practice speaking to sound more natural',
        action: 'Use Voice Practice',
        urgency: 'high'
      }
    }

    if (analysis.weakAreas.includes('articles')) {
      return {
        title: 'Master English Articles',
        description: 'Learn when to use "a", "an", and "the"',
        action: 'Practice Grammar',
        urgency: 'medium'
      }
    }

    return {
      title: 'Continue Your Progress',
      description: 'You\'re doing great! Keep practicing consistently',
      action: 'Continue Learning',
      urgency: 'low'
    }
  }

  const getMotivationalMessage = (metrics, user) => {
    const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
    
    if (metrics.totalLevelsCompleted === 0) {
      return `Welcome ${name}! Every expert was once a beginner. Your English journey starts now! 🌟`
    }

    if (metrics.improvementTrend === 'improving') {
      return `Amazing progress ${name}! Your scores are improving. Keep up the excellent work! 📈`
    }

    if (metrics.averageScore > 80) {
      return `Outstanding ${name}! Your ${metrics.averageScore}% average shows real mastery. You're becoming fluent! 🏆`
    }

    if (metrics.consistencyScore > 70) {
      return `Great consistency ${name}! Regular practice is the key to fluency. You're on the right path! 💪`
    }

    return `Keep going ${name}! Every lesson brings you closer to fluency. You've got this! 🚀`
  }

  const getDailyCulturalTip = () => {
    const tips = [
      {
        title: "Greeting Differences",
        english: "In English, 'How are you?' is often just a greeting",
        somali: "In Somali culture, this question expects a real answer about health",
        tip: "In English, just say 'Fine, thanks' and ask back"
      },
      {
        title: "Eye Contact",
        english: "Direct eye contact shows confidence and respect",
        somali: "In Somali culture, direct eye contact with elders can be disrespectful",
        tip: "In English settings, maintain gentle eye contact during conversations"
      },
      {
        title: "Time Concepts",
        english: "Being 'on time' means arriving exactly at the scheduled time",
        somali: "Somali culture is more flexible with time",
        tip: "For work and appointments, arrive 5-10 minutes early"
      },
      {
        title: "Personal Space",
        english: "English speakers prefer about arm's length distance in conversations",
        somali: "Somali culture often involves closer physical proximity",
        tip: "Watch for comfort cues and maintain respectful distance"
      },
      {
        title: "Small Talk",
        english: "Weather and general topics are common conversation starters",
        somali: "Conversations often start with family and health inquiries",
        tip: "Try 'Nice weather today' or 'How was your weekend?'"
      }
    ]

    const today = new Date().getDay()
    return tips[today % tips.length]
  }

  const getFallbackInsights = () => ({
    analysis: { weakAreas: [], strongAreas: [], recommendations: [] },
    recommendations: [{
      type: 'start',
      priority: 'medium',
      title: 'Begin Learning',
      description: 'Start your English journey today',
      action: 'Choose a learning path',
      icon: '🚀'
    }],
    metrics: {
      totalLevelsCompleted: 0,
      averageScore: 0,
      estimatedFluencyLevel: 'Beginner'
    },
    nextBestAction: {
      title: 'Start Learning',
      description: 'Choose your first learning path',
      action: 'Get Started'
    },
    motivationalMessage: 'Welcome to your English learning journey!'
  })

  if (loading) {
    return (
      <div className="glass-container rounded-xl p-6 animate-fade-in-up">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-6 h-6 text-purple-600 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-800">AI Insights</h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Card */}
      <div className="glass-container rounded-xl p-6 animate-fade-in-up">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">AI Learning Insights</h3>
        </div>

        {/* Motivational Message */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-4">
          <p className="text-gray-700 font-medium">{insights.motivationalMessage}</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{insights.metrics.totalLevelsCompleted}</div>
            <div className="text-xs text-gray-600">Levels Done</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{insights.metrics.averageScore}%</div>
            <div className="text-xs text-gray-600">Avg Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{insights.metrics.estimatedFluencyLevel}</div>
            <div className="text-xs text-gray-600">Level</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{insights.metrics.strongestSkill}</div>
            <div className="text-xs text-gray-600">Strongest</div>
          </div>
        </div>

        {/* Next Best Action */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-blue-800">{insights.nextBestAction.title}</h4>
          </div>
          <p className="text-blue-700 text-sm mb-2">{insights.nextBestAction.description}</p>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            {insights.nextBestAction.action}
          </button>
        </div>
      </div>

      {/* Cultural Tip of the Day */}
      {culturalTipOfDay && (
        <div className="glass-container rounded-xl p-6 animate-fade-in-up">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Cultural Tip of the Day</h3>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">{culturalTipOfDay.title}</h4>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">English: </span>
                <span className="text-gray-600">{culturalTipOfDay.english}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Somali: </span>
                <span className="text-gray-600">{culturalTipOfDay.somali}</span>
              </div>
              <div className="bg-green-100 p-2 rounded">
                <span className="font-medium text-green-800 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Tip: 
                </span>
                <span className="text-green-700">{culturalTipOfDay.tip}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personalized Recommendations */}
      <div className="glass-container rounded-xl p-6 animate-fade-in-up">
        <div className="flex items-center space-x-3 mb-4">
          <Star className="w-6 h-6 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-800">Personalized Recommendations</h3>
        </div>

        <div className="space-y-3">
          {insights.recommendations.map((rec, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{rec.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{rec.description}</p>
                  <p className="text-blue-600 text-sm font-medium">{rec.action}</p>
                  {rec.culturalNote && (
                    <p className="text-purple-600 text-xs mt-1 italic">💡 {rec.culturalNote}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AIInsights 