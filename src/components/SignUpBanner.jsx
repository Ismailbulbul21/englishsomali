import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Sparkles, Users, Mic } from 'lucide-react'

const SignUpBanner = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) onDismiss()
  }

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-2 left-10 animate-bounce">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="absolute top-4 right-20 animate-bounce" style={{animationDelay: '0.5s'}}>
          <Users className="w-5 h-5" />
        </div>
        <div className="absolute bottom-2 left-1/3 animate-bounce" style={{animationDelay: '1s'}}>
          <Mic className="w-4 h-4" />
        </div>
      </div>

      <div className="relative px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Content */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm">🎉 Demo Mode</div>
                  <div className="text-xs opacity-90">Arag waxa aad heli doonto</div>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="font-semibold text-sm sm:text-base">
                <span className="sm:hidden">🎉 Demo Mode - </span>
                Diiwaangeli si aad u hesho dhammaan astaamaha!
              </div>
              <div className="text-xs sm:text-sm opacity-90">
                Sign up to unlock voice recording, AI feedback & chat features
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-4">
            <Link
              to="/auth"
              className="bg-white text-blue-600 px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium text-xs sm:text-sm whitespace-nowrap"
            >
              🚀 Bilow
            </Link>
            <Link
              to="/auth?mode=login"
              className="hidden sm:block border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors font-medium text-sm"
            >
              Gal / Sign In
            </Link>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className="h-full bg-white/40 animate-pulse"></div>
      </div>
    </div>
  )
}

export default SignUpBanner 