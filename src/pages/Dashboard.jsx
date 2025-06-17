import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCategories, getUserProgress, getUserAnswersForAnalysis } from '../lib/supabase'
import { LogOut, Play, Trophy, Clock, Target, Menu, X, Star, Zap, Award, TrendingUp } from 'lucide-react'

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const [categories, setCategories] = useState([])
  const [userProgress, setUserProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dailyStreak, setDailyStreak] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load categories first (priority)
      const { data: categoriesData, error: categoriesError } = await getCategories()
      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])
      
      // Load user progress
      const { data: progressData, error: progressError } = await getUserProgress(user.id)
      if (progressError) throw progressError
      setUserProgress(progressData || [])
      
      setLoading(false)
      
      // Calculate daily streak in background (non-blocking)
      calculateDailyStreak()
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setLoading(false)
    }
  }

  // Calculate daily streak based on user activity
  const calculateDailyStreak = async () => {
    try {
      const { data: userAnswers } = await getUserAnswersForAnalysis(user.id, 30) // Last 30 days
      if (!userAnswers || userAnswers.length === 0) {
        setDailyStreak(0)
        return
      }

      // Get unique dates when user practiced
      const practiceDates = userAnswers.map(answer => 
        new Date(answer.created_at).toDateString()
      )
      const uniqueDates = [...new Set(practiceDates)].sort()

      // Calculate consecutive days from today backwards
      let streak = 0
      const today = new Date().toDateString()
      
      // Check if user practiced today
      if (uniqueDates.includes(today)) {
        streak = 1
        
        // Check previous days
        for (let i = 1; i < 30; i++) {
          const checkDate = new Date()
          checkDate.setDate(checkDate.getDate() - i)
          const dateString = checkDate.toDateString()
          
          if (uniqueDates.includes(dateString)) {
            streak++
          } else {
            break // Streak broken
          }
        }
      } else {
        // Check if user practiced yesterday (to maintain streak)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayString = yesterday.toDateString()
        
        if (uniqueDates.includes(yesterdayString)) {
          streak = 1
          
          // Check previous days
          for (let i = 2; i < 30; i++) {
            const checkDate = new Date()
            checkDate.setDate(checkDate.getDate() - i)
            const dateString = checkDate.toDateString()
            
            if (uniqueDates.includes(dateString)) {
              streak++
            } else {
              break
            }
          }
        }
      }

      setDailyStreak(streak)
    } catch (error) {
      console.error('Error calculating daily streak:', error)
      setDailyStreak(0)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getCategoryProgress = (categoryId) => {
    return userProgress.find(progress => progress.category_id === categoryId)
  }

  const getProgressPercentage = (progress, totalLevels) => {
    if (!progress) return 0
    return Math.round((progress.completed_levels.length / totalLevels) * 100)
  }

  // Somali translations for category names
  const getSomaliTranslation = (categoryName) => {
    const translations = {
      'Daily Conversation': 'Hadallada Maalinlaha ah',
      'Job Interview English': 'Ingiriiska Waraysiga Shaqada',
      'School English': 'Ingiriiska Dugsiga',
      'Travel English': 'Ingiriiska Safarka',
      'Business English': 'Ingiriiska Ganacsiga',
      'Basic Greetings': 'Salaamaha Aasaasiga ah',
      'Workplace Communication': 'Isgaarsiinta Goobta Shaqada',
      'Academic English': 'Ingiriiska Tacliinta Sare',
      'Social Situations': 'Xaalado Bulsheed',
      'Professional Meetings': 'Shirarka Xirfadeed'
    }
    return translations[categoryName] || categoryName
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mx-auto mb-4"></div>
          <div className="text-xl font-bold text-white mb-2">Loading Dashboard</div>
          <div className="text-gray-400 text-sm">Getting your learning paths ready...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-white relative overflow-hidden">
      {/* Optimized Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Simplified geometric shapes */}
        <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full opacity-30"></div>
        <div className="absolute top-20 right-20 w-2 h-2 bg-gray-400 rounded-full opacity-20"></div>
        <div className="absolute bottom-20 left-20 w-1.5 h-1.5 bg-white rounded-full opacity-25"></div>
        <div className="absolute bottom-10 right-10 w-1 h-1 bg-gray-300 rounded-full opacity-35"></div>
        
        {/* Single gradient orb for performance */}
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-gradient-to-r from-white/5 to-gray-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-sm bg-black/20 border-b border-gray-700/30">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img 
                src="/hadalhub-icon.svg" 
                alt="HadalHub" 
                className="w-8 h-8 sm:w-10 sm:h-10"
              />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  HadalHub
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">English Learning Platform</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white text-sm font-medium">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white hover:text-gray-200 px-3 py-2 rounded-lg border border-white/20 hover:border-white/30 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 p-3">
              <div className="space-y-3">
                <div className="text-center pb-3 border-b border-white/20">
                  <p className="text-white font-medium text-sm">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center space-x-2 bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Quick Welcome */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
            Choose Your Learning Path
          </h2>
          <p className="text-gray-400 text-sm sm:text-base">
            Select a category to start your English learning journey
          </p>
        </div>

        {/* Learning Paths - First Priority */}
        <div className="mb-8 sm:mb-12">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {categories.map((category, index) => {
              const progress = getCategoryProgress(category.id)
              const progressPercentage = getProgressPercentage(progress, category.total_levels)
              const currentLevel = progress?.current_level || 1
              
              return (
                <div key={category.id} className="group relative">
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                  
                  {/* Card */}
                  <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 overflow-hidden group-hover:scale-[1.02]">
                    {/* Progress Bar at Top */}
                    {progress && (
                      <div className="h-1 bg-black/20 relative overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-white to-gray-300 transition-all duration-700 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    )}
                    
                    <div className="p-4 sm:p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">
                          {category.icon}
                        </div>
                        {progress && (
                          <div className="text-right">
                            <div className="inline-flex items-center space-x-1 bg-white/20 rounded-full px-2 py-1 border border-white/30">
                              <Star className="w-3 h-3 text-white" />
                              <span className="text-white text-xs font-bold">Level {currentLevel}</span>
                            </div>
                            <div className="text-gray-300 text-xs mt-1">{progressPercentage}% Done</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="mb-4">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-1 group-hover:text-gray-200 transition-colors duration-300">
                          {category.name}
                        </h3>
                        <p className="text-gray-300 font-medium text-xs sm:text-sm mb-2 opacity-90">
                          {getSomaliTranslation(category.name)}
                        </p>
                        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed line-clamp-2">
                          {category.description}
                        </p>
                      </div>
                      
                      {/* Progress Visualization */}
                      {progress && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{progress.completed_levels.length}/{category.total_levels}</span>
                          </div>
                          <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-white to-gray-300 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Action Button */}
                      <Link
                        to={`/speak/${category.id}`}
                        className="block w-full bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/40 text-white hover:text-gray-200 py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-medium text-center text-sm sm:text-base"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{progress ? 'Continue' : 'Start'}</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats Overview - After Learning Paths */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
          {/* Started Paths */}
          <div className="bg-white/10 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">{userProgress.length}</div>
            <div className="text-gray-300 text-xs sm:text-sm font-medium">Started Paths</div>
            <div className="text-gray-400 text-xs">Wadooyin La Bilaabay</div>
          </div>

          {/* Completed Levels */}
          <div className="bg-white/10 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">
              {userProgress.reduce((total, progress) => total + progress.completed_levels.length, 0)}
            </div>
            <div className="text-gray-300 text-xs sm:text-sm font-medium">Completed</div>
            <div className="text-gray-400 text-xs">Heerarka La Dhammeeyay</div>
          </div>

          {/* Average Score */}
          <div className="bg-white/10 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">
              {userProgress.length > 0 
                ? Math.round(userProgress.reduce((total, progress) => total + progress.total_score, 0) / userProgress.length)
                : 0
              }%
            </div>
            <div className="text-gray-300 text-xs sm:text-sm font-medium">Avg Score</div>
            <div className="text-gray-400 text-xs">Dhibcaha Celceliska ah</div>
          </div>

          {/* Daily Streak */}
          <div className="bg-white/10 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-orange-400">🔥</div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">{dailyStreak}</div>
            <div className="text-gray-300 text-xs sm:text-sm font-medium">Day Streak</div>
            <div className="text-gray-400 text-xs">Maalmaha Joogtada ah</div>
          </div>
        </div>

        {/* Recent Activity or Getting Started */}
        {userProgress.length > 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 sm:p-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <span>Your Progress</span>
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {userProgress.map((progress, index) => {
                const category = categories.find(cat => cat.id === progress.category_id)
                const progressPercentage = getProgressPercentage(progress, category?.total_levels || 1)
                
                return (
                  <div 
                    key={progress.id} 
                    className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:border-white/30 p-3 sm:p-4 transition-all duration-300 hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="text-2xl sm:text-3xl">
                          {category?.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm sm:text-base">
                            {category?.name}
                          </div>
                          <div className="text-gray-300 text-xs sm:text-sm opacity-90">
                            {getSomaliTranslation(category?.name)}
                          </div>
                          <div className="text-gray-400 text-xs sm:text-sm">
                            Level {progress.current_level} • {progress.completed_levels.length} completed
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-2xl font-bold text-white">
                          {progressPercentage}%
                        </div>
                        <div className="text-gray-400 text-xs sm:text-sm">Done</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">🚀</div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
              Ready to Start Learning?
            </h3>
            <p className="text-gray-300 text-sm sm:text-base mb-3 sm:mb-4 max-w-2xl mx-auto leading-relaxed">
              Choose your first learning path above to begin your English journey.
            </p>
            <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto">
              Each path is designed for real-world success. Start with Daily Conversation for basics or Job Interview English for career preparation.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard 