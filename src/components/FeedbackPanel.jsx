import { CheckCircle, AlertCircle, TrendingUp, Lightbulb, Volume2, Star, Target, Award, MessageCircle } from 'lucide-react'
import { aiService } from '../services/aiService'
import LoadingSpinner from './LoadingSpinner'

const FeedbackPanel = ({ feedback, transcription, onNext, onRetry, isLoading = false, targetAnswer = '' }) => {
  if (isLoading) {
    return (
      <LoadingSpinner 
        isLoading={true}
        type="analysis"
        showProgress={true}
        duration={4000}
      />
    )
  }

  if (!feedback) return null

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100 border-green-200'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    return 'text-red-600 bg-red-100 border-red-200'
  }

  const getScoreIcon = (score) => {
    if (score >= 80) return <Award className="w-6 h-6 text-green-600" />
    if (score >= 60) return <Target className="w-6 h-6 text-yellow-600" />
    return <AlertCircle className="w-6 h-6 text-red-600" />
  }

  const getOverallMessage = (score) => {
    if (score >= 80) return { 
      somali: "Shaqo aad u fiican! Waxaad u hadlaysaa sida khibradda leh!" 
    }
    if (score >= 60) return { 
      somali: "Shaqo wanaagsan! Waxaad samaysaa horumar weyn!" 
    }
    return { 
      somali: "Sii wad tababarka! Isku day kastaa wuu ku fiicnayaa!" 
    }
  }

  const speakSuggestion = async () => {
    try {
      await aiService.speakText(feedback.suggested_response)
    } catch (error) {
      console.error('Text-to-speech error:', error)
    }
  }

  const overallMessage = getOverallMessage(feedback.overall_score)

  return (
    <div className="glass-container rounded-xl p-6 space-y-6 card-hover animate-fade-in-up">
      
      {/* Header with Overall Score */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          {getScoreIcon(feedback.overall_score)}
          <h3 className="text-2xl font-bold text-gray-800 ml-3 text-shadow">Natiijaadaada / Your Results</h3>
        </div>
        
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold mb-4 transition-all duration-700 animate-glow ${getScoreColor(feedback.overall_score)}`}>
          {feedback.overall_score}%
        </div>
        
        <div className="space-y-2">
          <p className="bg-gradient-learning bg-clip-text text-transparent font-medium text-lg">{overallMessage.somali}</p>
        </div>
      </div>

      {/* What You Said */}
      {transcription && (
        <div className="p-4 glass rounded-lg card-hover">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center text-shadow">
            <Volume2 className="w-4 h-4 mr-2" />
            Waxaad tidhi / What you said:
          </h4>
          <p className="text-blue-700 italic">"{transcription}"</p>
        </div>
      )}

      {/* Somali Feedback Only */}
      {feedback.feedback_somali && (
        <div className="p-4 glass rounded-lg card-hover">
          <h4 className="font-semibold text-purple-800 mb-3 flex items-center text-shadow">
            <MessageCircle className="w-4 h-4 mr-2" />
            Jawaab Macallin / Teacher Feedback
          </h4>
          <p className="text-purple-700 text-lg">{feedback.feedback_somali}</p>
        </div>
      )}

      {/* Strengths in Somali */}
      {feedback.strengths_somali && feedback.strengths_somali.length > 0 && (
        <div className="p-4 glass rounded-lg card-hover">
          <h4 className="font-semibold text-green-800 mb-3 flex items-center text-shadow">
            <CheckCircle className="w-4 h-4 mr-2" />
            Waxaad si fiican u samaysay / What You Did Well
          </h4>
          <div className="space-y-2">
            {feedback.strengths_somali.map((strength, index) => (
              <div key={index} className="text-green-700 flex items-start">
                <span className="text-green-500 mr-2 mt-1">✓</span>
                <span>{strength}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements in Somali */}
      {feedback.improvements_somali && feedback.improvements_somali.length > 0 && (
        <div className="p-4 glass rounded-lg card-hover">
          <h4 className="font-semibold text-orange-800 mb-3 flex items-center text-shadow">
            <TrendingUp className="w-4 h-4 mr-2" />
            Meelaha loo baahan yahay horumar / Areas for Improvement
          </h4>
          <div className="space-y-2">
            {feedback.improvements_somali.map((improvement, index) => (
              <div key={index} className="text-orange-700 flex items-start">
                <span className="text-orange-500 mr-2 mt-1">•</span>
                <span>{improvement}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pronunciation Tips in Somali */}
      {feedback.pronunciation_tips_somali && (
        <div className="p-4 glass rounded-lg card-hover">
          <h4 className="font-semibold text-yellow-800 mb-3 flex items-center text-shadow">
            <Volume2 className="w-4 h-4 mr-2" />
            Tilmaamaha ku dhawaaqista / Pronunciation Tips
          </h4>
          <p className="text-yellow-700">{feedback.pronunciation_tips_somali}</p>
        </div>
      )}

      {/* Suggested Response */}
      {feedback.suggested_response && (
        <div className="p-4 glass rounded-lg card-hover">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-purple-800 flex items-center text-shadow">
              <Star className="w-4 h-4 mr-2" />
              Jawaab fiican / Better Answer
            </h4>
            <button
              onClick={speakSuggestion}
              className="text-purple-600 hover:text-purple-800 p-2 rounded-full hover:bg-purple-100 transition-all duration-200 transform hover:scale-110"
              title="Listen to suggestion"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-purple-700 italic text-lg">"{feedback.suggested_response}"</p>
        </div>
      )}

      {/* Next Steps in Somali */}
      {feedback.next_steps_somali && (
        <div className="p-4 glass rounded-lg card-hover">
          <h4 className="font-semibold text-indigo-800 mb-3 flex items-center text-shadow">
            <Target className="w-4 h-4 mr-2" />
            Waxaad ku celcelin doonto / What to Practice Next
          </h4>
          <p className="text-indigo-700">{feedback.next_steps_somali}</p>
        </div>
      )}

      {/* Encouragement */}
      {feedback.encouragement_somali && (
        <div className="text-center p-4 glass rounded-lg card-hover">
          <div className="text-2xl mb-2">🌟</div>
          <p className="bg-gradient-learning bg-clip-text text-transparent font-medium text-lg">{feedback.encouragement_somali}</p>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 text-shadow">Horumarkaaga / Your Progress</span>
          <span className="text-sm text-gray-500">{feedback.overall_score}% / 70% loo baahan yahay</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ${
              feedback.overall_score >= 70 ? 'bg-gradient-success' : 'bg-gradient-learning'
            }`}
            style={{ width: `${Math.min(feedback.overall_score, 100)}%` }}
          ></div>
        </div>
        {feedback.overall_score >= 70 && (
          <div className="text-center p-3 glass rounded-lg animate-bounce">
            <p className="text-green-600 font-medium flex items-center justify-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Shaqo fiican! Waxaad diyaar u tahay heerka xiga!
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons - Only Continue and Try Again */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={onNext}
          className="flex-1 bg-gradient-success text-white py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-lg flex items-center justify-center space-x-2 transform hover:scale-105 btn-hover-lift"
        >
          <CheckCircle className="w-5 h-5" />
          <span>Sii wad / Continue</span>
        </button>
        <button
          onClick={onRetry}
          className="bg-gradient-learning text-white py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-200 font-medium transform hover:scale-105 btn-hover-lift"
        >
          Dib u isku day / Try Again
        </button>
      </div>
    </div>
  )
}

export default FeedbackPanel 