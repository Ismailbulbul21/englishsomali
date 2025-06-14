import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCategories, getUserProgress } from '../lib/supabase'
import { LogOut, Play, Trophy, Clock, Target, Menu, X } from 'lucide-react'

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const [categories, setCategories] = useState([])
  const [userProgress, setUserProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load categories
      const { data: categoriesData, error: categoriesError } = await getCategories()
      if (categoriesError) throw categoriesError
      
      // Load user progress
      const { data: progressData, error: progressError } = await getUserProgress(user.id)
      if (progressError) throw progressError

      setCategories(categoriesData || [])
      setUserProgress(progressData || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(16, 185, 129, 0.85), rgba(59, 130, 246, 0.85)), url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl shadow-xl border-b border-white/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EnglishMaster
                </h1>
                <p className="text-sm text-gray-600 hidden md:block">
                  Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 bg-white/80 hover:bg-white/90 px-4 py-2 rounded-lg backdrop-blur-sm"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-white/80 hover:bg-white/90 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4 bg-white/95 backdrop-blur-xl">
              <div className="space-y-2">
                <div className="px-4 py-2">
                  <p className="text-sm text-gray-600">
                    Welcome, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 px-4 py-2 text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/95 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl border border-white/30 transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-gray-800">{userProgress.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Paths Started</div>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl border border-white/30 transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-gray-800">
                  {userProgress.reduce((total, progress) => total + progress.completed_levels.length, 0)}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Levels Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl border border-white/30 transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-gray-800">
                  {userProgress.length > 0 
                    ? Math.round(userProgress.reduce((total, progress) => total + progress.total_score, 0) / userProgress.length)
                    : 0
                  }%
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Average Score</div>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl border border-white/30 transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-gray-800">0</div>
                <div className="text-xs sm:text-sm text-gray-600">Day Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Paths */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center sm:text-left drop-shadow-lg">
            Choose Your Learning Path
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {categories.map((category, index) => {
              const progress = getCategoryProgress(category.id)
              const progressPercentage = getProgressPercentage(progress, category.total_levels)
              const currentLevel = progress?.current_level || 1
              
              return (
                <div 
                  key={category.id} 
                  className="bg-white/95 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl border border-white/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-3xl sm:text-4xl lg:text-5xl">{category.icon}</div>
                      {progress && (
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-medium text-blue-600">Level {currentLevel}</div>
                          <div className="text-xs text-gray-500">{progressPercentage}% Complete</div>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">{category.name}</h3>
                    <p className="text-gray-600 mb-4 text-sm sm:text-base line-clamp-2">{category.description}</p>
                    
                    {/* Progress Bar */}
                    {progress && (
                      <div className="mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                      <div className="text-xs sm:text-sm text-gray-500">
                        {category.total_levels} levels available
                      </div>
                      <Link
                        to={`/speak/${category.id}`}
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm flex items-center justify-center space-x-2 hover:scale-105"
                      >
                        <Play className="w-4 h-4" />
                        <span>{progress ? 'Continue' : 'Start'}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        {userProgress.length > 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl border border-white/30 p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Your Progress</h3>
            <div className="space-y-3 sm:space-y-4">
              {userProgress.map((progress, index) => {
                const category = categories.find(cat => cat.id === progress.category_id)
                const progressPercentage = getProgressPercentage(progress, category?.total_levels || 1)
                
                return (
                  <div 
                    key={progress.id} 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-white/80 backdrop-blur-md rounded-lg shadow-lg border border-white/20 transition-all duration-300 hover:shadow-xl space-y-2 sm:space-y-0"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="text-2xl sm:text-3xl">{category?.icon}</div>
                      <div>
                        <div className="font-medium text-gray-800 text-sm sm:text-base">{category?.name}</div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          Level {progress.current_level} • {progress.completed_levels.length} levels completed
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <div className="text-lg font-semibold text-blue-600">{progressPercentage}%</div>
                      <div className="text-xs sm:text-sm text-gray-500">Complete</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Getting Started Message */}
        {userProgress.length === 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl border border-white/30 p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-4">🎯</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Ready to Start Learning?</h3>
            <p className="text-gray-600 mb-4 text-sm sm:text-base max-w-2xl mx-auto">
              Choose a learning path above to begin your English journey. Each path is designed to help you succeed in real-world situations.
            </p>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
              Start with Daily Conversation if you're new to English, or jump into Job Interview English if you're preparing for work.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard 