import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Users, Trophy, Globe, Menu, X } from 'lucide-react'

const HomePage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url('/homepage-bg.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <header className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="/hadalhub-icon.svg" 
              alt="HadalHub" 
              className="w-8 h-8 sm:w-10 sm:h-10"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-white">HadalHub</h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center space-x-4">
            <Link 
              to="/auth?mode=login" 
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/auth" 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-4 bg-white/95 backdrop-blur-lg rounded-lg shadow-lg border border-white/30">
            <div className="p-4 space-y-3">
              <Link 
                to="/auth?mode=login" 
                className="block text-gray-700 hover:text-gray-900 font-medium transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link 
                to="/auth" 
                className="block bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg">
            Baro Ingiriiska Iyada oo 
            <span className="text-yellow-300"> Hadal Dhabta ah</span>
          </h2>
          <p className="text-lg sm:text-xl text-white/90 mb-6 sm:mb-8 leading-relaxed drop-shadow-md px-2">
            Ku celceli hadlaha Ingiriiska oo hel jawaab celin AI ah oo loogu talagalay dadka Soomaalida. 
            Dhis kalsoonida shaqo raadinta, dugsiga, safarka, iyo nolosha maalinlaha ah.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
            <Link 
              to="/auth" 
              className="bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-base sm:text-lg flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Hadda Bilow Barashada</span>
            </Link>
            <a 
              href="#features" 
              className="border-2 border-blue-600 text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-50 transition-colors font-medium text-base sm:text-lg"
            >
              Wax Badan Baro
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-300 mb-2 drop-shadow-lg">5</div>
              <div className="text-sm sm:text-base text-white/80 drop-shadow-md">Wadooyin Barasho</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-300 mb-2 drop-shadow-lg">AI</div>
              <div className="text-sm sm:text-base text-white/80 drop-shadow-md">Jawaab Celin Casri ah</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-300 mb-2 drop-shadow-lg">24/7</div>
              <div className="text-sm sm:text-base text-white/80 drop-shadow-md">Celcelin La Heli Karo</div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="mb-12 sm:mb-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 sm:mb-12 drop-shadow-lg px-4">
            Maxay HadalHub Kaa Gaarka Tahay?
          </h3>
          

          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Dadka Soomaalida</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Loogu talagalay dadka Soomaalida oo leh dhaqan iyo xaalado la xidhiidha.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Barasho Codka ku Salaysan</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Ku celceli hadlaha oo hel jawaab celin degdeg ah oo ku saabsan dhawaaqida, naxwaha, iyo fasaxa.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Raacitaanka Horumarinta</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Arag horumarkaaga waqti ka dib oo leh faahfaahin iyo shahaado guul.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Xirfado Dhabta ah</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Baro Ingiriiska shaqo raadinta, dugsiga, safarka, ganacsiga, iyo hadallada maalinlaha ah.
              </p>
            </div>
          </div>
        </section>

        {/* Learning Paths Preview */}
        <section className="mb-12 sm:mb-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 sm:mb-12 drop-shadow-lg px-4">
            Dooro Jidkaaga Barashada
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { name: 'Job Interview English', icon: '💼', description: 'Prepare for job interviews with confidence' },
              { name: 'School English', icon: '📚', description: 'Essential English for academic success' },
              { name: 'Travel English', icon: '✈️', description: 'Navigate the world with confidence' },
              { name: 'Daily Conversation', icon: '💬', description: 'Master everyday English conversations' },
              { name: 'Business English', icon: '🏢', description: 'Professional communication skills' }
            ].map((path, index) => (
              <div key={index} className="bg-white p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{path.icon}</div>
                <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">{path.name}</h4>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{path.description}</p>
                <div className="text-xs sm:text-sm text-blue-600 font-medium">Multiple levels available</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-white rounded-2xl p-6 sm:p-12 shadow-lg mx-2 sm:mx-0">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">
            Ma Diyaar u tahay inaad Bilowdo Safarka Ingiriiska?
          </h3>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">
            Ku biir kumanaan dadka Soomaalida ah oo maalin walba horumarinaya xirfadahooda Ingiriiska.
          </p>
          <Link 
            to="/auth" 
            className="bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-base sm:text-lg inline-flex items-center space-x-2"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Bilow Barasho Bilaash ah</span>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 sm:py-8 mt-12 sm:mt-16 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p className="text-sm sm:text-base">&copy; 2024 HadalHub. Loogu talagalay dadka Soomaalida adduunka oo dhan.</p>
        </div>
      </footer>
    </div>
  )
}

export default HomePage 