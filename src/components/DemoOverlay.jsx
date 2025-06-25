import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Mic, MessageCircle, Trophy, X } from 'lucide-react'

const DemoOverlay = ({ 
  type = 'general', 
  title, 
  description, 
  className = '',
  showModal = false,
  onClose = () => {}
}) => {
  const [isModalOpen, setIsModalOpen] = useState(showModal)

  const overlayContent = {
    voice: {
      icon: <Mic className="w-8 h-8 text-blue-500" />,
      title: title || 'Diiwaangeli si aad u celceliso codkaaga!',
      titleEn: 'Sign up to practice your voice!',
      description: description || 'Hel jawaab celin AI ah oo ku saabsan dhawaaqida, naxwaha, iyo fasaxa.',
      descriptionEn: 'Get AI feedback on pronunciation, grammar, and fluency.',
      features: [
        '🎤 Voice recording and analysis',
        '🤖 AI feedback in Somali + English', 
        '📊 Progress tracking',
        '🏆 Achievement badges'
      ]
    },
    chat: {
      icon: <MessageCircle className="w-8 h-8 text-green-500" />,
      title: title || 'Ku biir wadahadalka!',
      titleEn: 'Join the conversation!',
      description: description || 'La hadal ardayda kale oo soo dir fariimo codka ah.',
      descriptionEn: 'Chat with other learners and send voice messages.',
      features: [
        '💬 Real-time chat with learners',
        '🎵 Voice messages (10 per day)',
        '👥 Community support',
        '🌍 Connect with Somali learners worldwide'
      ]
    },
    progress: {
      icon: <Trophy className="w-8 h-8 text-yellow-500" />,
      title: title || 'Raaci horumarkaaga!',
      titleEn: 'Track your progress!',
      description: description || 'Arag horumarkaaga waqti ka dib oo hel shahaado guul.',
      descriptionEn: 'See your progress over time and earn certificates.',
      features: [
        '📈 Detailed analytics',
        '🎯 Personal learning goals',
        '🔥 Daily streak tracking',
        '📜 Completion certificates'
      ]
    }
  }

  const content = overlayContent[type] || overlayContent.voice

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => {
    setIsModalOpen(false)
    onClose()
  }

  return (
    <>
      {/* Inline Overlay */}
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center z-10">
          <div className="text-center p-4">
            <div className="mb-3 flex justify-center">
              <div className="p-3 bg-white rounded-full shadow-lg">
                {content.icon}
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{content.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{content.titleEn}</p>
            <button
              onClick={openModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              🚀 Bilow Barasho - Start Learning
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {content.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{content.title}</h2>
                    <p className="text-sm text-gray-600">{content.titleEn}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-gray-700 mb-2">{content.description}</p>
                <p className="text-sm text-gray-600">{content.descriptionEn}</p>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Maxaad heli doontaa: / What you'll get:</h3>
                <ul className="space-y-2">
                  {content.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                      <span className="text-green-500">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  to="/auth"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center block"
                >
                  🚀 Samee Akoon Cusub - Create Account
                </Link>
                <Link
                  to="/auth?mode=login"
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center block"
                >
                  🔑 Gal Akoonkaaga - Sign In
                </Link>
              </div>

              {/* Footer */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Bilaash ah - 100% Free • Dhaqan Soomaali ah - Somali Culture Focused
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DemoOverlay 