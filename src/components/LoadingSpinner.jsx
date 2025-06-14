import { useState, useEffect } from 'react'

const LoadingSpinner = ({ isLoading = false, type = "analysis", showProgress = false, duration = 4000 }) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isLoading || !showProgress) return

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100
        return prev + (100 / (duration / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isLoading, showProgress, duration])

  if (!isLoading) return null

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 transform transition-all duration-500 animate-fade-in-up">
      <div className="text-center max-w-md mx-auto">
        
        {/* Car Drifting Animation */}
        <div className="relative h-32 mb-8 overflow-hidden">
          {/* Road */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-400 rounded"></div>
          <div className="absolute bottom-1 left-0 right-0 h-px bg-yellow-400"></div>
          
          {/* Car */}
          <div className="absolute bottom-2 car-drift">
            <div className="text-4xl">🚗</div>
          </div>
          
          {/* Smoke trails */}
          <div className="absolute bottom-3 left-1/4">
            <div className="smoke-trail text-gray-400 text-sm">💨</div>
          </div>
          <div className="absolute bottom-3 left-1/2" style={{animationDelay: '0.3s'}}>
            <div className="smoke-trail text-gray-400 text-sm">💨</div>
          </div>
          <div className="absolute bottom-3 right-1/4" style={{animationDelay: '0.6s'}}>
            <div className="smoke-trail text-gray-400 text-sm">💨</div>
          </div>
        </div>

        {/* Somali "Wait" Message */}
        <div className="mb-6">
          <h3 className="text-3xl font-bold text-blue-600 mb-2 animate-pulse">Sug</h3>
          <p className="text-gray-600 text-lg">Waan ku falanqaynaynaa jawaabkaaga...</p>
          <p className="text-blue-500 text-sm">Analyzing your answer...</p>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out shadow-sm"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500 mt-2">{Math.round(progress)}%</div>
          </div>
        )}

        {/* Simple loading dots */}
        <div className="flex justify-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner 