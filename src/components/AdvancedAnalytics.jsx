import { useState, useEffect } from 'react'
import { TrendingUp, Brain, Target, Calendar, Award, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { getUserAnalytics, getUserAnswersForAnalysis, saveUserAnalytics } from '../lib/supabase'

const AdvancedAnalytics = ({ user, userProgress }) => {
  const [analytics, setAnalytics] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [learningPatterns, setLearningPatterns] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      generateAdvancedAnalytics()
    }
  }, [user, userProgress])

  const generateAdvancedAnalytics = async () => {
    try {
      setLoading(true)
      
      // Get user data
      const { data: userAnswers } = await getUserAnswersForAnalysis(user.id)
      const { data: existingAnalytics } = await getUserAnalytics(user.id)
      
      // Generate comprehensive analytics
      const comprehensiveAnalytics = analyzeUserPerformance(userProgress, userAnswers || [])
      const progressPredictions = predictLearningProgress(userProgress, userAnswers || [])
      const patterns = identifyLearningPatterns(userAnswers || [], userProgress)
      
      setAnalytics(comprehensiveAnalytics)
      setPredictions(progressPredictions)
      setLearningPatterns(patterns)
      
      // Save updated analytics
      await saveUserAnalytics(user.id, {
        ...comprehensiveAnalytics,
        predictions: progressPredictions,
        learning_patterns: patterns
      })
      
    } catch (error) {
      console.error('Error generating advanced analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeUserPerformance = (progress, answers) => {
    const analysis = {
      overallProgress: calculateOverallProgress(progress),
      skillBreakdown: analyzeSkillBreakdown(answers),
      consistencyMetrics: calculateConsistencyMetrics(progress, answers),
      improvementRate: calculateImprovementRate(answers),
      challengeAreas: identifyChallengeAreas(answers),
      strengths: identifyStrengths(answers),
      timeAnalysis: analyzeTimePatterns(answers),
      culturalAdaptation: assessCulturalAdaptation(answers)
    }
    
    return analysis
  }

  const calculateOverallProgress = (progress) => {
    if (!progress || progress.length === 0) return 0
    
    const totalLevels = progress.reduce((sum, p) => sum + (p.total_levels || 10), 0)
    const completedLevels = progress.reduce((sum, p) => sum + p.completed_levels.length, 0)
    
    return Math.round((completedLevels / totalLevels) * 100)
  }

  const analyzeSkillBreakdown = (answers) => {
    if (!answers || answers.length === 0) {
      return {
        grammar: 0,
        pronunciation: 0,
        fluency: 0,
        relevance: 0,
        overall: 0
      }
    }

    const skills = {
      grammar: answers.filter(a => a.grammar_score).map(a => a.grammar_score),
      pronunciation: answers.filter(a => a.pronunciation_score).map(a => a.pronunciation_score),
      fluency: answers.filter(a => a.fluency_score).map(a => a.fluency_score),
      relevance: answers.filter(a => a.relevance_score).map(a => a.relevance_score)
    }

    const breakdown = {}
    Object.keys(skills).forEach(skill => {
      const scores = skills[skill]
      breakdown[skill] = scores.length > 0 
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0
    })

    breakdown.overall = Math.round(
      Object.values(breakdown).reduce((sum, score) => sum + score, 0) / 4
    )

    return breakdown
  }

  const calculateConsistencyMetrics = (progress, answers) => {
    const metrics = {
      studyFrequency: calculateStudyFrequency(answers),
      performanceVariability: calculatePerformanceVariability(answers),
      engagementLevel: calculateEngagementLevel(progress, answers),
      retentionRate: calculateRetentionRate(answers)
    }

    return metrics
  }

  const calculateStudyFrequency = (answers) => {
    if (!answers || answers.length < 2) return 0

    const dates = answers.map(a => new Date(a.created_at).toDateString())
    const uniqueDates = [...new Set(dates)]
    const daysSinceStart = Math.max(1, 
      (new Date() - new Date(answers[answers.length - 1].created_at)) / (1000 * 60 * 60 * 24)
    )

    return Math.round((uniqueDates.length / daysSinceStart) * 7) // Sessions per week
  }

  const calculatePerformanceVariability = (answers) => {
    if (!answers || answers.length < 3) return 0

    const scores = answers.map(a => a.score || 0)
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    const standardDeviation = Math.sqrt(variance)

    // Lower variability is better (more consistent)
    return Math.max(0, 100 - Math.round(standardDeviation))
  }

  const calculateEngagementLevel = (progress, answers) => {
    const pathsStarted = progress?.length || 0
    const totalAnswers = answers?.length || 0
    const avgSessionLength = calculateAverageSessionLength(answers)

    // Engagement score based on multiple factors
    const pathScore = Math.min(pathsStarted * 20, 40) // Max 40 points for paths
    const activityScore = Math.min(totalAnswers * 2, 40) // Max 40 points for activity
    const sessionScore = Math.min(avgSessionLength * 4, 20) // Max 20 points for session length

    return Math.round(pathScore + activityScore + sessionScore)
  }

  const calculateAverageSessionLength = (answers) => {
    if (!answers || answers.length < 2) return 0

    // Group answers by date to identify sessions
    const sessions = {}
    answers.forEach(answer => {
      const date = new Date(answer.created_at).toDateString()
      if (!sessions[date]) sessions[date] = []
      sessions[date].push(answer)
    })

    const sessionLengths = Object.values(sessions).map(session => session.length)
    return sessionLengths.length > 0 
      ? sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length
      : 0
  }

  const calculateRetentionRate = (answers) => {
    if (!answers || answers.length < 5) return 0

    // Check if user is still active (answered in last 7 days)
    const lastAnswer = new Date(answers[0].created_at)
    const daysSinceLastActivity = (new Date() - lastAnswer) / (1000 * 60 * 60 * 24)

    if (daysSinceLastActivity > 7) return Math.max(0, 100 - daysSinceLastActivity * 5)
    return 100
  }

  const calculateImprovementRate = (answers) => {
    if (!answers || answers.length < 5) return 0

    const recentScores = answers.slice(0, 5).map(a => a.score || 0)
    const olderScores = answers.slice(-5).map(a => a.score || 0)

    const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length
    const olderAvg = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length

    return Math.round(((recentAvg - olderAvg) / Math.max(olderAvg, 1)) * 100)
  }

  const identifyChallengeAreas = (answers) => {
    if (!answers || answers.length === 0) return []

    const challenges = []
    
    // Grammar challenges
    const grammarScores = answers.filter(a => a.grammar_score).map(a => a.grammar_score)
    if (grammarScores.length > 0 && grammarScores.reduce((sum, s) => sum + s, 0) / grammarScores.length < 60) {
      challenges.push({
        area: 'Grammar',
        severity: 'high',
        description: 'Consistent grammar difficulties, especially with articles and verb tenses',
        recommendation: 'Focus on daily grammar exercises with Somali-English comparisons'
      })
    }

    // Pronunciation challenges
    const pronScores = answers.filter(a => a.pronunciation_score).map(a => a.pronunciation_score)
    if (pronScores.length > 0 && pronScores.reduce((sum, s) => sum + s, 0) / pronScores.length < 60) {
      challenges.push({
        area: 'Pronunciation',
        severity: 'medium',
        description: 'Difficulty with English sounds not found in Somali',
        recommendation: 'Practice with pronunciation coach focusing on P/B and TH sounds'
      })
    }

    // Fluency challenges
    const fluencyScores = answers.filter(a => a.fluency_score).map(a => a.fluency_score)
    if (fluencyScores.length > 0 && fluencyScores.reduce((sum, s) => sum + s, 0) / fluencyScores.length < 60) {
      challenges.push({
        area: 'Fluency',
        severity: 'medium',
        description: 'Speaking pace and natural flow need improvement',
        recommendation: 'Increase conversation practice with AI tutor daily'
      })
    }

    return challenges
  }

  const identifyStrengths = (answers) => {
    if (!answers || answers.length === 0) return []

    const strengths = []

    // Check each skill area
    const skills = ['grammar_score', 'pronunciation_score', 'fluency_score', 'relevance_score']
    
    skills.forEach(skill => {
      const scores = answers.filter(a => a[skill]).map(a => a[skill])
      if (scores.length > 0) {
        const average = scores.reduce((sum, s) => sum + s, 0) / scores.length
        if (average >= 75) {
          strengths.push({
            area: skill.replace('_score', '').charAt(0).toUpperCase() + skill.replace('_score', '').slice(1),
            score: Math.round(average),
            description: `Strong performance in ${skill.replace('_score', '').replace('_', ' ')}`
          })
        }
      }
    })

    return strengths
  }

  const analyzeTimePatterns = (answers) => {
    if (!answers || answers.length === 0) return null

    const hourCounts = {}
    const dayCounts = {}

    answers.forEach(answer => {
      const date = new Date(answer.created_at)
      const hour = date.getHours()
      const day = date.getDay()

      hourCounts[hour] = (hourCounts[hour] || 0) + 1
      dayCounts[day] = (dayCounts[day] || 0) + 1
    })

    const bestHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    )

    const bestDay = Object.keys(dayCounts).reduce((a, b) => 
      dayCounts[a] > dayCounts[b] ? a : b
    )

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    return {
      optimalStudyTime: `${bestHour}:00`,
      mostActiveDay: dayNames[bestDay],
      studyPattern: analyzeStudyPattern(answers)
    }
  }

  const analyzeStudyPattern = (answers) => {
    const dates = answers.map(a => new Date(a.created_at).toDateString())
    const uniqueDates = [...new Set(dates)]
    
    if (uniqueDates.length < 3) return 'Irregular'
    
    const gaps = []
    for (let i = 1; i < uniqueDates.length; i++) {
      const gap = (new Date(uniqueDates[i-1]) - new Date(uniqueDates[i])) / (1000 * 60 * 60 * 24)
      gaps.push(gap)
    }

    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length

    if (avgGap <= 1.5) return 'Daily'
    if (avgGap <= 3) return 'Regular'
    if (avgGap <= 7) return 'Weekly'
    return 'Irregular'
  }

  const assessCulturalAdaptation = (answers) => {
    // This would analyze how well the user is adapting to English cultural norms
    // Based on their responses and progress in cultural scenarios
    
    return {
      adaptationScore: 75, // Placeholder - would be calculated based on cultural scenario performance
      areas: [
        { aspect: 'Workplace Communication', progress: 80 },
        { aspect: 'Social Interactions', progress: 70 },
        { aspect: 'Formal Situations', progress: 65 }
      ]
    }
  }

  const predictLearningProgress = (progress, answers) => {
    const predictions = {
      fluencyTimeline: predictFluencyTimeline(progress, answers),
      nextMilestones: predictNextMilestones(progress, answers),
      riskFactors: identifyRiskFactors(progress, answers),
      recommendations: generatePredictiveRecommendations(progress, answers)
    }

    return predictions
  }

  const predictFluencyTimeline = (progress, answers) => {
    const currentLevel = calculateCurrentFluencyLevel(progress, answers)
    const improvementRate = calculateImprovementRate(answers)
    
    const levels = ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced']
    const currentIndex = levels.indexOf(currentLevel)
    
    if (currentIndex === -1 || improvementRate <= 0) {
      return {
        currentLevel,
        timeToNext: 'Unable to predict',
        timeToFluency: 'Continue practicing regularly'
      }
    }

    // Estimate based on current progress rate
    const weeksToNextLevel = Math.max(4, Math.round(20 / Math.max(improvementRate, 1)))
    const weeksToFluency = weeksToNextLevel * (levels.length - currentIndex - 1)

    return {
      currentLevel,
      timeToNext: `${weeksToNextLevel} weeks`,
      timeToFluency: `${Math.round(weeksToFluency / 4)} months`
    }
  }

  const calculateCurrentFluencyLevel = (progress, answers) => {
    const totalCompleted = progress?.reduce((sum, p) => sum + p.completed_levels.length, 0) || 0
    const avgScore = answers?.length > 0 
      ? answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length 
      : 0

    const combinedScore = totalCompleted * 5 + avgScore

    if (combinedScore < 50) return 'Beginner'
    if (combinedScore < 150) return 'Elementary'
    if (combinedScore < 300) return 'Intermediate'
    if (combinedScore < 500) return 'Upper-Intermediate'
    return 'Advanced'
  }

  const predictNextMilestones = (progress, answers) => {
    const milestones = []
    
    // Based on current progress, predict next achievements
    const totalCompleted = progress?.reduce((sum, p) => sum + p.completed_levels.length, 0) || 0
    
    if (totalCompleted < 10) {
      milestones.push({
        milestone: 'Complete 10 Levels',
        estimatedTime: '2 weeks',
        description: 'Build foundation skills'
      })
    }
    
    if (totalCompleted < 25) {
      milestones.push({
        milestone: 'Reach Intermediate Level',
        estimatedTime: '6 weeks',
        description: 'Comfortable with daily conversations'
      })
    }

    milestones.push({
      milestone: 'Master Job Interview English',
      estimatedTime: '3 months',
      description: 'Ready for professional opportunities'
    })

    return milestones.slice(0, 3)
  }

  const identifyRiskFactors = (progress, answers) => {
    const risks = []
    
    // Inactivity risk
    if (answers?.length > 0) {
      const daysSinceLastActivity = (new Date() - new Date(answers[0].created_at)) / (1000 * 60 * 60 * 24)
      if (daysSinceLastActivity > 3) {
        risks.push({
          factor: 'Inactivity',
          level: daysSinceLastActivity > 7 ? 'high' : 'medium',
          description: 'Extended break from learning',
          mitigation: 'Set daily reminders and start with short sessions'
        })
      }
    }

    // Performance decline risk
    const improvementRate = calculateImprovementRate(answers)
    if (improvementRate < -10) {
      risks.push({
        factor: 'Performance Decline',
        level: 'medium',
        description: 'Recent scores are lower than previous performance',
        mitigation: 'Review fundamentals and adjust difficulty level'
      })
    }

    return risks
  }

  const generatePredictiveRecommendations = (progress, answers) => {
    const recommendations = []
    
    // Based on analytics, generate specific recommendations
    const skillBreakdown = analyzeSkillBreakdown(answers)
    
    if (skillBreakdown.grammar < 60) {
      recommendations.push({
        priority: 'high',
        action: 'Focus on Grammar',
        description: 'Spend 15 minutes daily on grammar exercises',
        expectedImpact: 'Improve grammar scores by 20% in 2 weeks'
      })
    }

    if (skillBreakdown.pronunciation < 60) {
      recommendations.push({
        priority: 'high',
        action: 'Pronunciation Practice',
        description: 'Use voice coach for P/B and TH sounds daily',
        expectedImpact: 'Clearer speech in 3 weeks'
      })
    }

    recommendations.push({
      priority: 'medium',
      action: 'Cultural Integration',
      description: 'Practice workplace scenarios 3x per week',
      expectedImpact: 'Better cultural adaptation in professional settings'
    })

    return recommendations
  }

  const identifyLearningPatterns = (answers, progress) => {
    return {
      preferredDifficulty: identifyPreferredDifficulty(answers),
      learningStyle: identifyLearningStyle(answers),
      motivationFactors: identifyMotivationFactors(progress, answers),
      optimalSessionLength: calculateOptimalSessionLength(answers)
    }
  }

  const identifyPreferredDifficulty = (answers) => {
    // Analyze which difficulty levels user performs best at
    return 'Intermediate' // Placeholder
  }

  const identifyLearningStyle = (answers) => {
    // Analyze whether user prefers visual, audio, or practice-based learning
    return 'Mixed' // Placeholder
  }

  const identifyMotivationFactors = (progress, answers) => {
    return [
      'Achievement badges',
      'Progress tracking',
      'Cultural context learning'
    ]
  }

  const calculateOptimalSessionLength = (answers) => {
    return '15-20 minutes' // Placeholder
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-6 h-6 text-purple-600 animate-pulse" />
          <h3 className="text-xl font-semibold text-gray-800">Advanced Analytics</h3>
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
      {/* Performance Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-800">Performance Analytics</h3>
        </div>

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.overallProgress}%</div>
              <div className="text-sm text-blue-700">Overall Progress</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.skillBreakdown.overall}%</div>
              <div className="text-sm text-green-700">Skill Average</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{analytics.consistencyMetrics.engagementLevel}%</div>
              <div className="text-sm text-purple-700">Engagement</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{analytics.improvementRate}%</div>
              <div className="text-sm text-orange-700">Improvement Rate</div>
            </div>
          </div>
        )}

        {/* Skill Breakdown */}
        {analytics?.skillBreakdown && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Skill Breakdown</h4>
            <div className="space-y-3">
              {Object.entries(analytics.skillBreakdown).filter(([key]) => key !== 'overall').map(([skill, score]) => (
                <div key={skill} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{skill}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-10">{score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Predictions */}
      {predictions && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Target className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-800">Learning Predictions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fluency Timeline */}
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-3">Fluency Timeline</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">Current Level:</span>
                  <span className="font-medium text-green-800">{predictions.fluencyTimeline.currentLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">Next Level:</span>
                  <span className="font-medium text-green-800">{predictions.fluencyTimeline.timeToNext}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">Fluency Goal:</span>
                  <span className="font-medium text-green-800">{predictions.fluencyTimeline.timeToFluency}</span>
                </div>
              </div>
            </div>

            {/* Next Milestones */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3">Upcoming Milestones</h4>
              <div className="space-y-2">
                {predictions.nextMilestones.map((milestone, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-blue-800">{milestone.milestone}</div>
                      <div className="text-xs text-blue-600">{milestone.estimatedTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Risk Factors */}
          {predictions.riskFactors.length > 0 && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-800">Areas to Watch</h4>
              </div>
              <div className="space-y-2">
                {predictions.riskFactors.map((risk, idx) => (
                  <div key={idx} className="bg-white rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800">{risk.factor}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        risk.level === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {risk.level} risk
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                    <p className="text-sm text-blue-600 font-medium">{risk.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictive Recommendations */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-3">AI Recommendations</h4>
            <div className="space-y-3">
              {predictions.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-purple-800">{rec.action}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="text-sm text-purple-700 mb-2">{rec.description}</p>
                  <p className="text-sm text-green-600 font-medium">Expected: {rec.expectedImpact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Learning Patterns */}
      {learningPatterns && analytics?.timeAnalysis && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Clock className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-semibold text-gray-800">Learning Patterns</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-orange-600">{analytics.timeAnalysis.optimalStudyTime}</div>
              <div className="text-sm text-orange-700">Best Study Time</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-orange-600">{analytics.timeAnalysis.mostActiveDay}</div>
              <div className="text-sm text-orange-700">Most Active Day</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-orange-600">{analytics.timeAnalysis.studyPattern}</div>
              <div className="text-sm text-orange-700">Study Pattern</div>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Optimization Suggestions</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <p>• Your peak performance time is {analytics.timeAnalysis.optimalStudyTime} - schedule important lessons then</p>
              <p>• You're most active on {analytics.timeAnalysis.mostActiveDay}s - plan intensive practice sessions</p>
              <p>• Your {analytics.timeAnalysis.studyPattern.toLowerCase()} pattern works well - maintain consistency</p>
              <p>• Optimal session length: {learningPatterns.optimalSessionLength} for best retention</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedAnalytics 