import React, { useState } from 'react'
import { 
  CheckCircle, XCircle, AlertCircle, TrendingUp, 
  Brain, Target, BookOpen, Heart, ArrowRight,
  Lightbulb, Star, MessageCircle, Award, Sparkles,
  Zap, Bot, Trophy
} from 'lucide-react'

const EnhancedFeedbackDisplay = ({ feedback, onClose, onNextQuestion, onRetry }) => {
  const [activeTab, setActiveTab] = useState('overview')

  if (!feedback) return null

  // Debug logging
  console.log('🎯 EnhancedFeedbackDisplay received feedback:', feedback)
  console.log('🎯 Detailed feedback data:', feedback.detailed_feedback)

  const detailedFeedback = feedback.detailed_feedback || {}
  const contentAnalysis = detailedFeedback.content_analysis || {}
  const errorPatterns = detailedFeedback.error_patterns || {}
  const emotionalState = detailedFeedback.emotional_state || {}
  const improvementPlan = detailedFeedback.improvement_plan || {}

  console.log('🎯 Content analysis:', contentAnalysis)
  console.log('🎯 Error patterns:', errorPatterns)
  console.log('🎯 Emotional state:', emotionalState)

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* AI Analysis Badge */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg p-3">
        <div className="flex items-center justify-center space-x-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-purple-700">
            🤖 AI-Powered Intelligent Analysis
          </span>
          <Sparkles className="h-4 w-4 text-blue-600" />
          <Zap className="h-5 w-5 text-yellow-500" />
        </div>
        <p className="text-xs text-purple-600 text-center mt-1">
          Advanced content analysis • Error pattern detection • Personalized coaching
        </p>
      </div>

      {/* Main Score Display */}
      <div className="text-center relative">
        <div className="absolute top-0 right-0">
          <Trophy className="h-8 w-8 text-yellow-500" />
        </div>
        <div className={`text-6xl font-bold ${getScoreColor(feedback.overallScore)}`}>
          {feedback.overallScore}%
        </div>
        <div className="text-lg text-gray-600 mt-2">
          {feedback.passed ? '🎉 Excellent Work!' : '💪 Keep Growing!'}
        </div>
        {feedback.overallScore >= 90 && (
          <div className="mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800">
              <Star className="h-4 w-4 mr-1" />
              Outstanding Performance!
            </span>
          </div>
        )}
      </div>

      {/* Enhanced Score Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">Content Relevance</span>
            {getScoreIcon(feedback.relevanceScore)}
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(feedback.relevanceScore)}`}>
            {feedback.relevanceScore}%
          </div>
          <div className="text-xs text-blue-600 mt-1">
            AI analyzed: {contentAnalysis.question_elements_covered?.length || 0} key elements covered
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-700">Grammar Accuracy</span>
            {getScoreIcon(feedback.grammarScore)}
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(feedback.grammarScore)}`}>
            {feedback.grammarScore}%
          </div>
          <div className="text-xs text-green-600 mt-1">
            {(errorPatterns.grammar_errors?.length || 0) + (errorPatterns.article_errors?.length || 0)} errors detected
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-purple-700">Speaking Fluency</span>
            {getScoreIcon(feedback.fluencyScore)}
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(feedback.fluencyScore)}`}>
            {feedback.fluencyScore}%
          </div>
          <div className="text-xs text-purple-600 mt-1">
            Confidence: {emotionalState.confidence_level || 'medium'}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-orange-700">Pronunciation</span>
            {getScoreIcon(feedback.pronunciationScore)}
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(feedback.pronunciationScore)}`}>
            {feedback.pronunciationScore}%
          </div>
          <div className="text-xs text-orange-600 mt-1">
            {emotionalState.hesitation_markers > 0 ? `${emotionalState.hesitation_markers} hesitations` : 'Clear delivery'}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Brain className="h-6 w-6 text-indigo-600 mt-1" />
          <div className="flex-1">
            <h4 className="font-semibold text-indigo-900 flex items-center">
              AI Content Analysis
              <Sparkles className="h-4 w-4 ml-2 text-purple-500" />
            </h4>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-indigo-700">Question Type:</span>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                  {contentAnalysis.question_type || 'General'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-indigo-700">Content Richness:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-indigo-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${contentAnalysis.content_richness_score || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-indigo-800">
                    {contentAnalysis.content_richness_score || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personalized Encouragement */}
      <div className="bg-gradient-to-r from-pink-50 to-red-50 border border-pink-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Heart className="h-6 w-6 text-pink-600 mt-1" />
          <div>
            <h4 className="font-semibold text-pink-900">Personal Encouragement</h4>
            <p className="text-pink-800 mt-1">{feedback.encouragement_somali}</p>
          </div>
        </div>
      </div>

      {/* Content Analysis Preview */}
      {contentAnalysis.mentioned_skills?.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Star className="h-6 w-6 text-emerald-600 mt-1" />
            <div>
              <h4 className="font-semibold text-emerald-900 flex items-center">
                Detected Skills & Topics
                <Zap className="h-4 w-4 ml-2 text-yellow-500" />
              </h4>
              <p className="text-emerald-800 mt-1">
                AI identified: {contentAnalysis.mentioned_skills.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Missing Elements Alert */}
      {contentAnalysis.missing_elements?.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="h-6 w-6 text-amber-600 mt-1" />
            <div>
              <h4 className="font-semibold text-amber-900">AI Suggestions</h4>
              <p className="text-amber-800 mt-1">
                Consider mentioning: {contentAnalysis.missing_elements.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderAnalysisTab = () => (
    <div className="space-y-6">
      {/* AI Analysis Header */}
      <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 rounded-lg p-3">
        <div className="flex items-center justify-center space-x-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-semibold text-purple-700">
            🧠 Advanced AI Content Intelligence
          </span>
          <Sparkles className="h-4 w-4 text-indigo-600" />
        </div>
      </div>

      {/* Content Analysis */}
      <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 flex items-center mb-3">
          <Brain className="h-5 w-5 mr-2 text-blue-600" />
          AI Content Analysis
          <Zap className="h-4 w-4 ml-2 text-yellow-500" />
        </h4>
        
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-600">Question Type:</span>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              {contentAnalysis.question_type || 'General'}
            </span>
          </div>
          
          <div>
            <span className="text-sm text-gray-600">Content Richness:</span>
            <div className="flex items-center mt-1">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${contentAnalysis.content_richness_score || 0}%` }}
                ></div>
              </div>
              <span className="ml-2 text-sm font-medium">
                {contentAnalysis.content_richness_score || 0}%
              </span>
            </div>
          </div>

          {contentAnalysis.question_elements_covered?.length > 0 && (
            <div>
              <span className="text-sm text-gray-600">Elements Covered:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {contentAnalysis.question_elements_covered.map((element, index) => (
                  <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    ✓ {element}
                  </span>
                ))}
              </div>
            </div>
          )}

          {contentAnalysis.missing_elements?.length > 0 && (
            <div>
              <span className="text-sm text-gray-600">Missing Elements:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {contentAnalysis.missing_elements.map((element, index) => (
                  <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    ⚠ {element}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Emotional State */}
      <div className="bg-gradient-to-br from-white to-purple-50 border-2 border-purple-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 flex items-center mb-3">
          <MessageCircle className="h-5 w-5 mr-2 text-purple-600" />
          AI Emotional Intelligence Analysis
          <Heart className="h-4 w-4 ml-2 text-pink-500" />
        </h4>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Confidence Level:</span>
            <span className={`text-sm font-medium ${
              emotionalState.confidence_level === 'high' ? 'text-green-600' :
              emotionalState.confidence_level === 'medium' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {emotionalState.confidence_level || 'medium'}
            </span>
          </div>
          
          {emotionalState.hesitation_markers > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Hesitation Markers:</span>
              <span className="text-sm text-gray-900">{emotionalState.hesitation_markers}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderCorrectionsTab = () => (
    <div className="space-y-6">
      {/* AI Corrections Header */}
      <div className="bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200 rounded-lg p-3">
        <div className="flex items-center justify-center space-x-2">
          <Lightbulb className="h-5 w-5 text-orange-600" />
          <span className="text-sm font-semibold text-orange-700">
            🔍 AI-Powered Error Detection & Corrections
          </span>
          <Sparkles className="h-4 w-4 text-red-600" />
        </div>
      </div>

      {/* Somali Interference Errors */}
      {errorPatterns.somali_interference?.length > 0 && (
        <div className="bg-gradient-to-br from-white to-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 flex items-center mb-3">
            <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
            AI-Detected Language Transfer Issues
            <Bot className="h-4 w-4 ml-2 text-blue-600" />
          </h4>
          
          {errorPatterns.somali_interference.map((error, index) => (
            <div key={index} className="bg-orange-50 border border-orange-200 rounded p-3 mb-3">
              <div className="flex items-start space-x-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-red-700 font-medium">"{error.original}"</div>
                  <ArrowRight className="h-4 w-4 text-gray-400 my-1" />
                  <div className="text-green-700 font-medium">"{error.correction}"</div>
                  <p className="text-sm text-gray-600 mt-1">{error.explanation}</p>
                  <p className="text-sm text-blue-600 mt-1">🇸🇴 {error.somali_explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article Errors */}
      {errorPatterns.article_errors?.length > 0 && (
        <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 flex items-center mb-3">
            <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
            AI-Detected Article Usage Issues
            <Zap className="h-4 w-4 ml-2 text-yellow-500" />
          </h4>
          
          {errorPatterns.article_errors.map((error, index) => (
            <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-red-700">Missing article before "{error.word}"</div>
                  <div className="text-green-700 font-medium mt-1">Suggestion: "{error.suggestion}"</div>
                  <p className="text-sm text-gray-600 mt-1">{error.explanation}</p>
                  <p className="text-sm text-blue-600 mt-1">🇸🇴 {error.somali_explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Errors */}
      {(!errorPatterns.somali_interference?.length && !errorPatterns.article_errors?.length) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h4 className="font-semibold text-green-900">Excellent Grammar!</h4>
          <p className="text-green-700">No major errors detected in your speech.</p>
        </div>
      )}
    </div>
  )

  const renderImprovementTab = () => (
    <div className="space-y-6">
      {/* AI Improvement Header */}
      <div className="bg-gradient-to-r from-green-100 to-teal-100 border border-green-200 rounded-lg p-3">
        <div className="flex items-center justify-center space-x-2">
          <Target className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-700">
            🎯 AI-Personalized Learning Roadmap
          </span>
          <TrendingUp className="h-4 w-4 text-teal-600" />
        </div>
      </div>

      {/* Immediate Focus */}
      {improvementPlan.immediate_focus?.length > 0 && (
        <div className="bg-gradient-to-br from-white to-red-50 border-2 border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 flex items-center mb-3">
            <Target className="h-5 w-5 mr-2 text-red-600" />
            AI-Recommended Focus Areas (This Session)
            <Sparkles className="h-4 w-4 ml-2 text-purple-500" />
          </h4>
          
          {improvementPlan.immediate_focus.map((focus, index) => (
            <div key={index} className="bg-red-50 border border-red-200 rounded p-3 mb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-medium text-red-900">{focus.area}</h5>
                  <p className="text-red-700 text-sm mt-1">{focus.action}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  focus.priority === 'high' ? 'bg-red-200 text-red-800' :
                  focus.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-blue-200 text-blue-800'
                }`}>
                  {focus.priority} priority
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weekly Goals */}
      {improvementPlan.this_week?.length > 0 && (
        <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 flex items-center mb-3">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            AI-Generated Weekly Goals
            <Bot className="h-4 w-4 ml-2 text-purple-600" />
          </h4>
          
          {improvementPlan.this_week.map((goal, index) => (
            <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
              <h5 className="font-medium text-blue-900">{goal.goal}</h5>
              <p className="text-blue-700 text-sm mt-1">Target: {goal.target}</p>
              <p className="text-blue-600 text-sm mt-1">Practice: {goal.practice}</p>
            </div>
          ))}
        </div>
      )}

      {/* Encouragement */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Award className="h-6 w-6 text-purple-600 mt-1" />
          <div>
            <h4 className="font-semibold text-purple-900">Keep Going!</h4>
            <p className="text-purple-800 mt-1">
              Every mistake is a learning opportunity. You're making great progress! 
              🌟 Wad si fiican u socotaa! Sii wad dadaalka!
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-20">
            <Bot className="h-16 w-16" />
          </div>
          <div className="relative">
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6" />
              <h3 className="text-xl font-bold">AI-Powered Learning Analysis</h3>
              <Sparkles className="h-5 w-5 text-yellow-300" />
            </div>
            <p className="text-blue-100 mt-1 flex items-center space-x-1">
              <Zap className="h-4 w-4 text-yellow-300" />
              <span>Advanced AI content analysis • Smart error detection • Personalized coaching</span>
            </p>
            <div className="mt-2 flex items-center space-x-4 text-sm text-blue-200">
              <span className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>Content Intelligence</span>
              </span>
              <span className="flex items-center space-x-1">
                <Target className="h-4 w-4" />
                <span>Error Patterns</span>
              </span>
              <span className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span>Cultural Coaching</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'analysis', label: 'Analysis', icon: Brain },
              { id: 'corrections', label: 'Corrections', icon: Lightbulb },
              { id: 'improvement', label: 'Next Steps', icon: Target }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'analysis' && renderAnalysisTab()}
          {activeTab === 'corrections' && renderCorrectionsTab()}
          {activeTab === 'improvement' && renderImprovementTab()}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Close
          </button>
          
          <div className="flex space-x-3">
            {!feedback.passed && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Try Again
              </button>
            )}
            
            {feedback.passed && (
              <button
                onClick={onNextQuestion}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedFeedbackDisplay 