import { Link } from 'react-router-dom'
import { Play, Users, Trophy, Globe } from 'lucide-react'

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">EnglishMaster</h1>
          </div>
          <Link 
            to="/auth" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-800 mb-6">
            Learn English Through 
            <span className="text-blue-600"> Real Conversations</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Practice speaking English with AI-powered feedback designed specifically for Somali learners. 
            Build confidence for job interviews, school, travel, and daily life.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              to="/auth" 
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>Start Learning Now</span>
            </Link>
            <a 
              href="#features" 
              className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors font-medium text-lg"
            >
              Learn More
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">5</div>
              <div className="text-gray-600">Learning Paths</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">AI</div>
              <div className="text-gray-600">Powered Feedback</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Available Practice</div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Why Choose EnglishMaster?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-2">For Somali Learners</h4>
              <p className="text-gray-600">
                Designed specifically for Somali speakers with cultural context and relevant scenarios.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-2">Voice-Based Learning</h4>
              <p className="text-gray-600">
                Practice speaking and get instant feedback on pronunciation, grammar, and fluency.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-2">Progress Tracking</h4>
              <p className="text-gray-600">
                See your improvement over time with detailed analytics and achievement badges.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-2">Real-World Skills</h4>
              <p className="text-gray-600">
                Learn English for job interviews, school, travel, business, and daily conversations.
              </p>
            </div>
          </div>
        </section>

        {/* Learning Paths Preview */}
        <section className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Choose Your Learning Path
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Job Interview English', icon: '💼', description: 'Prepare for job interviews with confidence' },
              { name: 'School English', icon: '📚', description: 'Essential English for academic success' },
              { name: 'Travel English', icon: '✈️', description: 'Navigate the world with confidence' },
              { name: 'Daily Conversation', icon: '💬', description: 'Master everyday English conversations' },
              { name: 'Business English', icon: '🏢', description: 'Professional communication skills' }
            ].map((path, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">{path.icon}</div>
                <h4 className="text-xl font-semibold text-gray-800 mb-2">{path.name}</h4>
                <p className="text-gray-600 mb-4">{path.description}</p>
                <div className="text-sm text-blue-600 font-medium">Multiple levels available</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-white rounded-2xl p-12 shadow-lg">
          <h3 className="text-3xl font-bold text-gray-800 mb-4">
            Ready to Start Your English Journey?
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of Somali learners improving their English skills every day.
          </p>
          <Link 
            to="/auth" 
            className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg inline-flex items-center space-x-2"
          >
            <Play className="w-5 h-5" />
            <span>Start Learning Free</span>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 EnglishMaster. Designed for Somali learners worldwide.</p>
        </div>
      </footer>
    </div>
  )
}

export default HomePage 