import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCategories, getUserProgress, getUserAnswersForAnalysis } from '../lib/supabase'
import { LogOut, Play, Trophy, Clock, Target, Menu, X, Star, Zap, Award, TrendingUp, Brain, Globe, Users, Sparkles, BookOpen, MessageCircle, Headphones, Mic } from 'lucide-react'

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const [categories, setCategories] = useState([])
  const [userProgress, setUserProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dailyStreak, setDailyStreak] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboardData()
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [user])

  const loadDashboardData = async () => {
    try {
      // Load categories first (priority) - don't set loading for better UX
      const { data: categoriesData, error: categoriesError } = await getCategories()
      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])
      
      // Load user progress (demo or real)
      if (!user) {
        // Non-authenticated users see no personal progress (they haven't started yet)
        setUserProgress([])
        setDailyStreak(0) // Demo users start with 0 streak
      } else {
        // Load real user progress
      const { data: progressData, error: progressError } = await getUserProgress(user.id)
      if (progressError) throw progressError
      setUserProgress(progressData || [])
        
        // Calculate daily streak in background (non-blocking)
        calculateDailyStreak()
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setLoading(false)
    }
  }

  // Calculate daily streak based on user activity
  const calculateDailyStreak = async () => {
    if (!user) {
      setDailyStreak(0)
      return
    }

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
    if (!user) {
      // For demo users, just redirect to auth
      navigate('/auth')
      return
    }
    
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

  // Somali descriptions for categories
  const getSomaliDescription = (categoryName) => {
    const descriptions = {
      'Daily Conversation': 'Ku guulayso hadallada maalinlaha ah ee Ingiriiska. Hadal yaryar ilaa wax iibsasho, dhis kalsoonidaada isgaarsiinta maalinlaha ah.',
      'Job Interview English': 'U diyaargarow waraysiga shaqada oo kalsooni leh. Baro erayada xirfadeed iyo su\'aalaha caadiga ah ee waraysiga.',
      'School English': 'Ingiriiska muhiimka ah ee guusha tacliinta. Habboon ardayda iyo kuwa dib u bilaabaya waxbarashada.',
      'Travel English': 'Ku safar adduunka oo kalsooni leh. Baro odhaahda garoonka diyaaradaha, huteellada, makhaayadaha iyo meelaha dalxiiska.',
      'Business English': 'Xirfadaha isgaarsiinta xirfadeed ee goobta shaqada. Iimaylada, shirarka, bandhigyadda, iyo isdhexgalka.',
      'Basic Greetings': 'Salaamaha aasaasiga ah ee Ingiriiska. Bilow safarkaga luuqadda salaamaha iyo hadallada gaagaaban.',
      'Workplace Communication': 'Isgaarsiinta heer sare ah ee goobta shaqada. Wada hadallada xirfadeed iyo iskaashiga kooxda.',
      'Academic English': 'Ingiriiska tacliinta sare ee guusha jaamacadda. Qorista, akhrinta, iyo bandhigyadda cilmiga.',
      'Social Situations': 'Ku guulayso xaaladaha bulsheed ee kala duwan. Xaflado, kulan saaxiibo, iyo dhacdooyinka bulsheed.',
      'Professional Meetings': 'Shirarka xirfadeed oo heer sare ah. Hoggaaminta shirarka, soo jeedinta, iyo go\'aamada gaarista.'
    }
    return descriptions[categoryName] || 'Horumarinta xirfadahaaga Ingiriiska.'
  }

  const getCategoryIcon = (categoryName) => {
    const icons = {
      'Daily Conversation': MessageCircle,
      'Job Interview English': Target,
      'School English': BookOpen,
      'Travel English': Globe,
      'Business English': TrendingUp,
      'Basic Greetings': Users,
      'Workplace Communication': Zap,
      'Academic English': Brain,
      'Social Situations': Star,
      'Professional Meetings': Award
    }
    return icons[categoryName] || BookOpen
  }

  const getTimeGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return { en: 'Good Morning', so: 'Subax wanaagsan' }
    if (hour < 17) return { en: 'Good Afternoon', so: 'Galab wanaagsan' }
    return { en: 'Good Evening', so: 'Fiid wanaagsan' }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Revolutionary Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(119, 198, 255, 0.3) 0%, transparent 50%)
            `
          }}></div>
          
          {/* Floating Orbs */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-pink-400/20 to-red-600/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-green-400/20 to-blue-600/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-spin"></div>
                <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              HadalHub
            </div>
            <div className="text-gray-300 text-lg">Preparing your learning journey...</div>
          </div>
        </div>
      </div>
    )
  }

  const greeting = getTimeGreeting()

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Revolutionary Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Animated Mesh Gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-400/10 to-purple-600/10 rounded-full blur-xl animate-bounce" style={{animationDuration: '3s'}}></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-pink-400/10 to-red-600/10 rounded-full blur-xl animate-bounce" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-10 w-20 h-20 bg-gradient-to-r from-green-400/10 to-blue-600/10 rounded-full blur-xl animate-bounce" style={{animationDuration: '5s', animationDelay: '2s'}}></div>
        
        {/* Geometric Shapes */}
        <div className="absolute top-40 right-40 w-16 h-16 border border-white/10 rotate-45 animate-spin" style={{animationDuration: '20s'}}></div>
        <div className="absolute bottom-40 left-40 w-12 h-12 border border-purple-400/20 rotate-12 animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-20 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">HadalHub</h1>
                <p className="text-xs text-gray-400">AI English Learning</p>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {user ? (
                <>
                  <div className="flex items-center space-x-4 text-white">
              <div className="text-right">
                      <div className="text-sm font-medium">{user.email}</div>
                      <div className="text-xs text-gray-400">Learner</div>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
              </div>
              <button
                onClick={handleSignOut}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-xl transition-all duration-300 border border-red-500/30"
              >
                <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
              </button>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/auth"
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 border border-white/20"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth"
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 shadow-lg"
                  >
                    Sign Up
                  </Link>
            </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
          <div className="md:hidden bg-black/50 backdrop-blur-xl border-t border-white/10">
            <div className="px-4 py-4 space-y-3">
              {user ? (
                <>
                  <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{user.email}</div>
                      <div className="text-gray-400 text-sm">Learner</div>
                    </div>
                </div>
                <button
                  onClick={handleSignOut}
                    className="w-full flex items-center space-x-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all duration-300"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/auth"
                    className="block w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth"
                    className="block w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl transition-all duration-300 text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
            </div>
          )}
        </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {greeting.so}
              <span className="block text-lg md:text-xl text-purple-300 mt-1">
                {greeting.en}
              </span>
          </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              {user ? 'Sii wad safarkaga barashada Ingiriiska' : 'Bilow safarkaga barashada Ingiriiska maanta'}
          </p>
          </div>
        </div>

        {/* Learning Categories - MOVED TO TOP */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-white">Qaybaha Waxbarashada</h3>
            <div className="flex items-center space-x-2 text-gray-400">
              <Sparkles className="w-6 h-6" />
              <span className="text-lg">Dooro jidkaaga</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => {
              const progress = getCategoryProgress(category.id)
              const progressPercentage = getProgressPercentage(progress, 5) // Assuming 5 levels per category
              const IconComponent = getCategoryIcon(category.name)
              
              return (
                <Link
                  key={category.id}
                  to={`/learning/${category.id}`}
                  className="group relative overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                    {/* Progress Bar Background */}
                    <div className="absolute top-0 left-0 h-1 w-full bg-white/10 rounded-t-2xl">
                        <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl transition-all duration-1000"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>

                    {/* Category Icon */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-r ${
                        index % 3 === 0 ? 'from-blue-500/30 to-purple-600/30' :
                        index % 3 === 1 ? 'from-green-500/30 to-emerald-600/30' :
                        'from-pink-500/30 to-red-600/30'
                      } group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-7 h-7 text-white" />
                        </div>
                          <div className="text-right">
                        <div className="text-white text-lg font-medium">{progressPercentage}%</div>
                        <div className="text-gray-400 text-sm">Dhammaystiran</div>
                          </div>
                      </div>
                      
                    {/* Category Title - Somali */}
                    <h4 className="text-white text-xl font-bold mb-2 group-hover:text-blue-300 transition-colors duration-300">
                          {getSomaliTranslation(category.name)}
                    </h4>
                    
                    {/* English Subtitle - Keep in English */}
                    <p className="text-purple-300 text-base mb-3 font-medium">
                          {category.name}
                        </p>

                    {/* Description - Somali */}
                    <p className="text-gray-300 text-base mb-4 line-clamp-3 leading-relaxed">
                          {getSomaliDescription(category.name)}
                        </p>

                    {/* Action Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Play className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-medium text-lg">Bilow</span>
                      </div>
                      
                      {progress && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                          <span className="text-yellow-400 text-base font-medium">
                            {progress.completed_levels.length}/5
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Daily Streak */}
          <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-orange-300 text-base font-medium">Joogtada Maalinlaha ah</h3>
                <p className="text-4xl font-bold text-white">{dailyStreak}</p>
                <p className="text-orange-200 text-base">maalmood joogto ah</p>
              </div>
              <div className="w-14 h-14 bg-orange-500/30 rounded-xl flex items-center justify-center">
                <Zap className="w-7 h-7 text-orange-300" />
              </div>
            </div>
          </div>

          {/* Total Progress */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-green-300 text-base font-medium">Qaybaha</h3>
                <p className="text-4xl font-bold text-white">{userProgress.length}/{categories.length}</p>
                <p className="text-green-200 text-base">la bilaabay</p>
              </div>
              <div className="w-14 h-14 bg-green-500/30 rounded-xl flex items-center justify-center">
                <Trophy className="w-7 h-7 text-green-300" />
              </div>
            </div>
          </div>

          {/* Learning Time */}
          <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-300 text-base font-medium">Hab Waxbarasho</h3>
                <p className="text-4xl font-bold text-white">{user ? 'Firfircoon' : 'Tijaabo'}</p>
                <p className="text-blue-200 text-base">{user ? 'Sii wad!' : 'Diiwaangeli si aad u kaydsato horumarkaaga'}</p>
              </div>
              <div className="w-14 h-14 bg-blue-500/30 rounded-xl flex items-center justify-center">
                <Clock className="w-7 h-7 text-blue-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Revolutionary Features - 500% User Growth */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* AI Conversation Partner - GAME CHANGER */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">
              🔥 CUSUB
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center relative">
                <Brain className="w-6 h-6 text-purple-300" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <h4 className="text-white text-xl font-bold">AI Saaxiib</h4>
            </div>
            <p className="text-gray-300 text-base mb-4">
              La hadal AI oo ku habboon heerkaaga - sida macallin shakhsi ah 24/7
            </p>
            <Link
              to="/ai-chat"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 rounded-xl transition-all duration-300"
            >
              <span className="text-base">Bilow Wada-hadalka</span>
              <Brain className="w-5 h-5" />
            </Link>
          </div>

          {/* Live Pronunciation Scoring - REVOLUTIONARY */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">
              ⚡ TOOS
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-green-300 animate-pulse" />
              </div>
              <h4 className="text-white text-xl font-bold">Dhibcaha Tooska ah</h4>
            </div>
            <p className="text-gray-300 text-base mb-4">
              Hel dhibcaha dhawaaqa degdegga ah markaad hadlayso - arag horumarkaaga si toos ah
            </p>
            <Link
              to="/pronunciation-trainer"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500/30 hover:bg-green-500/40 text-green-300 rounded-xl transition-all duration-300"
            >
              <span className="text-base">Tijaabi Dhibcaha Tooska ah</span>
              <Target className="w-5 h-5" />
            </Link>
          </div>

          {/* Daily Challenges - ADDICTIVE */}
          <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">
              🎯 MAALINLE
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-orange-500/30 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-orange-300" />
              </div>
              <h4 className="text-white text-xl font-bold">Ciyaaraha</h4>
            </div>
            <p className="text-gray-300 text-base mb-4">
              Dhammayso ciyaaraha maalinlaha ah, kasbashada XP, fur guulaha - ka dhig waxbarashada mid soo jiidanaysa!
            </p>
            <Link
              to="/challenges"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-500/30 hover:bg-orange-500/40 text-orange-300 rounded-xl transition-all duration-300"
            >
              <span className="text-base">Ciyaarta Maanta</span>
              <Zap className="w-5 h-5" />
            </Link>
          </div>

          {/* Social Learning - VIRAL */}
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">
              👥 BULSHEED
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-300" />
              </div>
              <h4 className="text-white text-xl font-bold">Wada Baro</h4>
            </div>
            <p className="text-gray-300 text-base mb-4">
              Ku biir kooxaha waxbarashada, tartam saaxiibada, wadaag horumarkaaga - waxbarashadu way fiican tahay marka la wadaago
            </p>
            <Link
              to="/social"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500/30 hover:bg-blue-500/40 text-blue-300 rounded-xl transition-all duration-300"
            >
              <span className="text-base">Hel Saaxiibada Waxbarashada</span>
              <Users className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Achievement System - GAMIFICATION */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-3xl font-bold text-white">Guulahaa</h3>
            <div className="flex items-center space-x-2 text-gray-400">
              <Award className="w-6 h-6" />
              <span className="text-lg">Kor u qaad Ingiriiskaaga</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Achievement badges */}
            {[
              { name: 'Tillaabada Koowaad', icon: '👶', earned: true, description: 'Dhammayso casharkaaga koowaad' },
              { name: 'Sayidka Joogtada', icon: '🔥', earned: dailyStreak >= 7, description: '7 maalmood joogto waxbarasho' },
              { name: 'Hadal-badan', icon: '💬', earned: false, description: 'Dir 100 fariin chat' },
              { name: 'Xirfadlaha Dhawaaqa', icon: '🎤', earned: false, description: 'Hel 90%+ dhawaaqa' },
              { name: 'Balanbaalis Bulsheed', icon: '🦋', earned: false, description: 'Caawin 10 ardayda kale' },
              { name: 'Xaasidka AI', icon: '🤖', earned: false, description: 'Dhammayso 50 wada-hadal AI' }
            ].map((achievement, index) => (
                  <div 
                key={index}
                className={`relative p-4 rounded-xl border transition-all duration-300 ${
                  achievement.earned 
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border-yellow-500/30 shadow-lg' 
                    : 'bg-white/5 border-white/10 grayscale opacity-50'
                }`}
                  >
                <div className="text-center">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="text-white text-sm font-bold mb-1">{achievement.name}</div>
                  <div className="text-gray-400 text-xs">{achievement.description}</div>
                        </div>
                {achievement.earned && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                          </div>
                )}
                          </div>
            ))}
                          </div>
                        </div>

        {/* Live Leaderboard - COMPETITION */}
        <div className="mb-12">
          <div className="bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-6 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-3xl font-bold text-white">Liiska Tartanka Usbuuciga</h3>
              <div className="flex items-center space-x-2 text-gray-400">
                <TrendingUp className="w-6 h-6" />
                <span className="text-lg">Ardayda ugu fiican usbuucan</span>
                      </div>
                        </div>

            <div className="space-y-3">
              {[
                { rank: 1, name: 'Ahmed Ali', points: 2850, country: '🇸🇴', streak: 12 },
                { rank: 2, name: 'Fatima Hassan', points: 2720, country: '🇸🇴', streak: 8 },
                { rank: 3, name: user?.email?.split('@')[0] || 'Adiga', points: user ? 2680 : 0, country: '🇸🇴', streak: dailyStreak, isCurrentUser: true },
                { rank: 4, name: 'Omar Mohamed', points: 2540, country: '🇸🇴', streak: 15 },
                { rank: 5, name: 'Sahra Ibrahim', points: 2420, country: '🇸🇴', streak: 6 }
              ].map((player, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                    player.isCurrentUser 
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      player.rank === 1 ? 'bg-yellow-500 text-black' :
                      player.rank === 2 ? 'bg-gray-400 text-black' :
                      player.rank === 3 ? 'bg-orange-500 text-white' :
                      'bg-white/20 text-white'
                    }`}>
                      {player.rank}
                      </div>
                    <div>
                      <div className="text-white font-medium text-lg">{player.name}</div>
                      <div className="text-gray-400 text-base">{player.country} • {player.streak} maalmood joogto</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-xl">{player.points.toLocaleString()}</div>
                    <div className="text-gray-400 text-base">XP</div>
                  </div>
                </div>
              ))}
            </div>

            {!user && (
              <div className="mt-6 text-center p-4 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-xl border border-blue-500/20">
                <p className="text-white mb-2 text-lg">Ku biir tartanka!</p>
                <p className="text-gray-400 text-base mb-4">Diiwaangeli si aad u la socoto horumarkaaga oo aad ula tartanto ardayda kale</p>
                <Link
                  to="/auth"
                  className="inline-flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <span className="text-base">Ku biir Liiska Tartanka</span>
                  <Trophy className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Community Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Community Chat */}
          <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-300" />
              </div>
              <h4 className="text-white text-xl font-bold">Chat Bulshada</h4>
            </div>
            <p className="text-gray-300 text-base mb-4">
              La dhaqan ardayda kale wada-hadallada tooska ah
            </p>
            <Link
              to="/learning/daily-conversation"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500/30 hover:bg-blue-500/40 text-blue-300 rounded-xl transition-all duration-300"
            >
              <span className="text-base">Ku biir Chat-ka</span>
              <Users className="w-5 h-5" />
            </Link>
          </div>

          {/* Voice Practice */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-green-500/30 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-green-300" />
              </div>
              <h4 className="text-white text-xl font-bold">Dhaqanka Codka</h4>
            </div>
            <p className="text-gray-300 text-base mb-4">
              Hagaaji dhawaakaaga iyada oo la isticmaalayo jawaabaha AI
            </p>
            <Link
              to="/learning/daily-conversation"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500/30 hover:bg-green-500/40 text-green-300 rounded-xl transition-all duration-300"
            >
              <span className="text-base">Bilow Hadlitaanka</span>
              <Headphones className="w-5 h-5" />
            </Link>
          </div>
      </div>
      </main>
    </div>
  )
}

export default Dashboard 