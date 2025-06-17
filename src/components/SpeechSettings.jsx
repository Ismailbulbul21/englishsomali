import { useState, useEffect } from 'react'
import { Settings, Mic, Volume2, Clock, Globe, CheckCircle, AlertCircle } from 'lucide-react'

const SpeechSettings = ({ isOpen, onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState({
    speakingSpeed: 'normal', // slow, normal, fast
    microphoneSensitivity: 'high', // low, medium, high
    pauseTolerance: 'long', // short, medium, long
    accentAdaptation: 'somali', // somali, general, mixed
    confidenceThreshold: 0.5, // 0.3 to 0.8
    autoCorrection: true,
    culturalNames: true,
    bilingualMode: false
  })

  const [testRecording, setTestRecording] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('hadalHubSpeechSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    // Save to localStorage
    localStorage.setItem('hadalHubSpeechSettings', JSON.stringify(newSettings))
    
    // Notify parent component
    if (onSettingsChange) {
      onSettingsChange(newSettings)
    }
  }

  const testMicrophone = async () => {
    setTestRecording(true)
    setTestResult(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Test for 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop())
        setTestRecording(false)
        setTestResult({
          success: true,
          message: 'Makarafoonka si fiican ayuu u shaqeynayaa! (Microphone working well!)',
          icon: 'success'
        })
      }, 3000)

    } catch (error) {
      setTestRecording(false)
      setTestResult({
        success: false,
        message: 'Makarafoonka lama gaadhsiisan karo - hubi ogolaanshaha (Cannot access microphone - check permissions)',
        icon: 'error'
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Speech Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-2xl text-gray-500">&times;</span>
            </button>
          </div>
          <p className="text-gray-600 mt-2">Customize speech recognition for Somali speakers</p>
          <p className="text-blue-600 text-sm">Hagaaji celcelinta codka dadka Soomaalida</p>
        </div>

        {/* Settings Content */}
        <div className="p-6 space-y-8">
          
          {/* Speaking Speed */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Speaking Speed</h3>
            </div>
            <p className="text-sm text-gray-600">Xawaarta hadlakaaga (How fast you speak)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'slow', label: 'Slow / Tartiib', desc: 'Best for beginners' },
                { value: 'normal', label: 'Normal / Caadi', desc: 'Standard speed' },
                { value: 'fast', label: 'Fast / Dhaqso', desc: 'For advanced users' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSetting('speakingSpeed', option.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings.speakingSpeed === option.value
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Microphone Sensitivity */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mic className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Microphone Sensitivity</h3>
            </div>
            <p className="text-sm text-gray-600">Dareenka makarafoonka (How sensitive the microphone is)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'low', label: 'Low / Hoose', desc: 'Less sensitive' },
                { value: 'medium', label: 'Medium / Dhex', desc: 'Balanced' },
                { value: 'high', label: 'High / Sare', desc: 'Most sensitive' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSetting('microphoneSensitivity', option.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings.microphoneSensitivity === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pause Tolerance */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">Pause Tolerance</h3>
            </div>
            <p className="text-sm text-gray-600">Waqtiga la sugo markii aad aamusto (How long to wait during pauses)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'short', label: 'Short / Gaaban', desc: '1-2 seconds' },
                { value: 'medium', label: 'Medium / Dhex', desc: '3-4 seconds' },
                { value: 'long', label: 'Long / Dheer', desc: '5+ seconds' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSetting('pauseTolerance', option.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings.pauseTolerance === option.value
                      ? 'border-purple-500 bg-purple-50 text-purple-800'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Adaptation */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-800">Accent Adaptation</h3>
            </div>
            <p className="text-sm text-gray-600">Hagaajinta codka Soomaalida (Optimization for Somali accent)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'somali', label: 'Somali Optimized', desc: 'Best for Somali speakers' },
                { value: 'general', label: 'General English', desc: 'Standard recognition' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSetting('accentAdaptation', option.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings.accentAdaptation === option.value
                      ? 'border-orange-500 bg-orange-50 text-orange-800'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Advanced Options</h3>
            
            {[
              {
                key: 'autoCorrection',
                label: 'Auto-Correction',
                labelSomali: 'Hagaajin Otomaatig ah',
                description: 'Automatically fix common Somali pronunciation errors'
              },
              {
                key: 'culturalNames',
                label: 'Cultural Names Recognition',
                labelSomali: 'Aqoonsiga Magacyada Dhaqanka',
                description: 'Better recognition of Somali names and places'
              },
              {
                key: 'bilingualMode',
                label: 'Bilingual Mode (Experimental)',
                labelSomali: 'Hab Laba Luqadood (Tijaabo)',
                description: 'Allow mixing Somali and English words'
              }
            ].map((option) => (
              <div key={option.key} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-800">{option.label}</h4>
                    <span className="text-sm text-blue-600">({option.labelSomali})</span>
                  </div>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
                <button
                  onClick={() => updateSetting(option.key, !settings[option.key])}
                  className={`ml-4 w-12 h-6 rounded-full flex items-center transition-colors ${
                    settings[option.key] ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    settings[option.key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>

          {/* Microphone Test */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Test Your Microphone</h3>
            <p className="text-sm text-gray-600">Tijaabi makarafoonkaaga (Test your microphone)</p>
            
            <button
              onClick={testMicrophone}
              disabled={testRecording}
              className={`w-full p-4 rounded-lg font-medium transition-all ${
                testRecording
                  ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {testRecording ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                  <span>Testing microphone...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Mic className="w-5 h-5" />
                  <span>Test Microphone</span>
                </div>
              )}
            </button>

            {testResult && (
              <div className={`p-4 rounded-lg flex items-center space-x-3 ${
                testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {testResult.success ? 
                  <CheckCircle className="w-5 h-5 text-green-600" /> : 
                  <AlertCircle className="w-5 h-5 text-red-600" />
                }
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Save Settings / Kaydi Hagaajinta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpeechSettings 