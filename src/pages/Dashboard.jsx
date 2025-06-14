import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCategories, getUserProgress } from '../lib/supabase'
import { LogOut, Play, Trophy, Clock, Target } from 'lucide-react'

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const [categories, setCategories] = useState([])
  const [userProgress, setUserProgress] = useState([])
  const [loading, setLoading] = useState(true)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg shadow-lg border-b border-white/30 transition-all duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3 animate-fade-in">
              <div className="w-10 h-10 bg-gradient-learning rounded-full flex items-center justify-center shadow-lg animate-glow">
                <span className="text-white font-bold text-lg text-shadow">E</span>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text text-shadow">EnglishMaster</h1>
                <p className="text-sm text-gray-700">Welcome back, {user?.user_metadata?.full_name || user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 glass px-4 py-2 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/95 backdrop-blur-lg p-6 rounded-xl shadow-xl border border-white/30 animate-fade-in-up transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 animate-count-up">{userProgress.length}</div>
                <div className="text-sm text-gray-600">Paths Started</div>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg p-6 rounded-xl shadow-xl border border-white/30 animate-fade-in-up transition-all duration-300 hover:shadow-2xl" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 animate-count-up">
                  {userProgress.reduce((total, progress) => total + progress.completed_levels.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Levels Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg p-6 rounded-xl shadow-xl border border-white/30 animate-fade-in-up transition-all duration-300 hover:shadow-2xl" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 animate-count-up">
                  {userProgress.length > 0 
                    ? Math.round(userProgress.reduce((total, progress) => total + progress.total_score, 0) / userProgress.length)
                    : 0
                  }%
                </div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg p-6 rounded-xl shadow-xl border border-white/30 animate-fade-in-up transition-all duration-300 hover:shadow-2xl" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 animate-count-up">0</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Paths */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 animate-fade-in text-shadow">Choose Your Learning Path</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => {
              const progress = getCategoryProgress(category.id)
              const progressPercentage = getProgressPercentage(progress, category.total_levels)
              const currentLevel = progress?.current_level || 1
              
              return (
                <div 
                  key={category.id} 
                  className="bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/30 hover:shadow-2xl transition-all duration-300 animate-fade-in-up transform hover:scale-105"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-5xl">{category.icon}</div>
                      {progress && (
                        <div className="text-right animate-slide-in-right">
                          <div className="text-sm font-medium text-blue-600">Level {currentLevel}</div>
                          <div className="text-xs text-gray-500">{progressPercentage}% Complete</div>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mb-2 text-shadow">{category.name}</h3>
                    <p className="text-gray-600 mb-4 text-sm">{category.description}</p>
                    
                    {/* Progress Bar */}
                    {progress && (
                      <div className="mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-learning h-2 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {category.total_levels} levels available
                      </div>
                      <Link
                        to={`/speak/${category.id}`}
                        className="bg-gradient-learning text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow duration-200 font-medium text-sm flex items-center space-x-2"
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
          <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/30 p-6 animate-fade-in-up transition-all duration-300">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-shadow">Your Progress</h3>
            <div className="space-y-4">
              {userProgress.map((progress, index) => {
                const category = categories.find(cat => cat.id === progress.category_id)
                const progressPercentage = getProgressPercentage(progress, category?.total_levels || 1)
                
                return (
                  <div 
                    key={progress.id} 
                    className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-md rounded-lg shadow-lg border border-white/20 card-hover animate-fade-in-up transition-all duration-300"
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{category?.icon}</div>
                      <div>
                        <div className="font-medium text-gray-800 text-shadow">{category?.name}</div>
                        <div className="text-sm text-gray-600">
                          Level {progress.current_level} • {progress.completed_levels.length} levels completed
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600 animate-count-up">{progressPercentage}%</div>
                      <div className="text-sm text-gray-500">Complete</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Getting Started Message */}
        {userProgress.length === 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/30 p-8 text-center animate-fade-in-up transition-all duration-300">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 animate-fade-in text-shadow">Ready to Start Learning?</h3>
            <p className="text-gray-600 mb-4 animate-fade-in" style={{animationDelay: '0.2s'}}>
              Choose a learning path above to begin your English journey. Each path is designed to help you succeed in real-world situations.
            </p>
            <p className="text-sm text-gray-500 animate-fade-in" style={{animationDelay: '0.4s'}}>
              Start with Daily Conversation if you're new to English, or jump into Job Interview English if you're preparing for work.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard 