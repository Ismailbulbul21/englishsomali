import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'

const AuthPage = () => {
  const [searchParams] = useSearchParams()
  const [isLogin, setIsLogin] = useState(false) // Default to signup
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  })
  const [error, setError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  // Check URL parameters to determine initial mode
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'login') {
      setIsLogin(true)
    } else {
      setIsLogin(false) // Default to signup for homepage buttons
    }
  }, [searchParams])

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
    setSignupSuccess(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password)
        if (error) throw error
        navigate('/dashboard')
      } else {
        const { error } = await signUp(formData.email, formData.password, {
          full_name: formData.fullName
        })
        if (error) throw error
        // Show email confirmation message instead of navigating
        setSignupSuccess(true)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center p-4"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(79, 70, 229, 0.9), rgba(59, 130, 246, 0.9)), url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">H</span>
            </div>
            <span className="text-2xl font-bold text-white drop-shadow-lg">HadalHub</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
            {signupSuccess ? 'Check Your Email!' : (isLogin ? 'Welcome Back!' : 'Join HadalHub')}
          </h1>
          <p className="text-lg text-white/95 drop-shadow-md mb-1">
            {signupSuccess 
              ? 'Account created successfully!' 
              : (isLogin 
                ? 'Continue your English learning journey' 
                : 'Start your English learning journey today'
              )
            }
          </p>
          <p className="text-sm text-white/80 drop-shadow-md">
            🇸🇴 {signupSuccess 
              ? 'Akoonka waa la sameeyay si guul leh!' 
              : (isLogin 
                ? 'Sii wad safarka barashada Ingiriiskaaga' 
                : 'Maanta bilow safarka barashada Ingiriiskaaga'
              )
            }
          </p>
        </div>

        {/* Email Confirmation Success Page */}
        {signupSuccess ? (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-green-600" />
              </div>
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-green-800 mb-2">
                  📧 Email Confirmation Required
                </h3>
                <h4 className="text-xl font-bold text-green-700 mb-4">
                  🇸🇴 Email Xaqiijin Loo Baahan Yahay
                </h4>
              </div>
              
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                <p className="text-blue-800 font-semibold text-lg mb-3">
                  📬 We sent a confirmation email to:
                </p>
                <p className="text-blue-600 font-bold text-xl mb-4 bg-white rounded-lg py-2 px-4 border border-blue-300">
                  {formData.email}
                </p>
                <p className="text-blue-700 font-medium text-lg">
                  🇸🇴 Waxaan kuu dirnay email xaqiijin ah:
                </p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-left">
                <h5 className="font-bold text-gray-800 mb-3 text-center">📋 What to do next / Maxaad samaysaa xiga:</h5>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 font-bold">1.</span>
                    <div>
                      <p className="text-gray-800"><strong>English:</strong> Check your email inbox</p>
                      <p className="text-gray-700">🇸🇴 <strong>Somali:</strong> Eeg sanduuqa email-kaaga</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 font-bold">2.</span>
                    <div>
                      <p className="text-gray-800"><strong>English:</strong> Click the confirmation link</p>
                      <p className="text-gray-700">🇸🇴 <strong>Somali:</strong> Riix linkiga xaqiijinta</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 font-bold">3.</span>
                    <div>
                      <p className="text-gray-800"><strong>English:</strong> Start learning English!</p>
                      <p className="text-gray-700">🇸🇴 <strong>Somali:</strong> Bilow barashada Ingiriiska!</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 font-semibold text-sm mb-2">
                  ⚠️ Can't find the email? / Ma heli kartid email-ka?
                </p>
                <div className="text-yellow-700 text-sm space-y-1">
                  <p>• Check your spam/junk folder</p>
                  <p>🇸🇴 • Eeg galka spam/qashinka</p>
                  <p>• Wait a few minutes and refresh</p>
                  <p>🇸🇴 • Sug daqiiqado yar oo cusboonaysii</p>
                </div>
              </div>
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    setSignupSuccess(false)
                    setFormData({
                      email: '',
                      password: '',
                      fullName: ''
                    })
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  ← Back to Sign Up / Ku noqo diwaangelinta
                </button>
                
                <Link 
                  to="/" 
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors text-center"
                >
                  🏠 Back to Home / Ku noqo bogga hore
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Auth Form - Only show when not in success state */
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your full name"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            {/* Toggle Auth Mode */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setError('')
                    setSignupSuccess(false)
                    setFormData({
                      email: '',
                      password: '',
                      fullName: ''
                    })
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-white/80 hover:text-white text-sm drop-shadow-md">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AuthPage 