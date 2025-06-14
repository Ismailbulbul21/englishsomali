import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Play, Pause, RotateCcw, Volume2, Target, TrendingUp, Award } from 'lucide-react'
import { aiService } from '../services/aiService'
import { saveGrammarCorrection } from '../lib/supabase'

const VoicePronunciationCoach = ({ isOpen, onClose, targetPhrase, difficulty = 'beginner', user }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcription, setTranscription] = useState('')
  const [pronunciationAnalysis, setPronunciationAnalysis] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [currentExercise, setCurrentExercise] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recognitionRef = useRef(null)

  // Somali-specific pronunciation challenges
  const somaliChallenges = {
    'p_vs_b': {
      title: 'P vs B Sounds',
      description: 'These sounds don\'t exist distinctly in Somali',
      exercises: [
        { phrase: 'Park the car', focus: 'P sound at beginning' },
        { phrase: 'Big problem', focus: 'B and P distinction' },
        { phrase: 'Paper bag', focus: 'Both P and B sounds' }
      ]
    },
    'th_sounds': {
      title: 'TH Sounds',
      description: 'Voiced and voiceless TH don\'t exist in Somali',
      exercises: [
        { phrase: 'Think about this', focus: 'Voiceless TH' },
        { phrase: 'The weather', focus: 'Voiced TH' },
        { phrase: 'Thank you', focus: 'TH at beginning' }
      ]
    },
    'vowel_sounds': {
      title: 'English Vowel Sounds',
      description: 'English has more vowel sounds than Somali',
      exercises: [
        { phrase: 'Bit and beat', focus: 'Short vs long I' },
        { phrase: 'Cat and cut', focus: 'A vs U sounds' },
        { phrase: 'Book and buck', focus: 'OO vs U sounds' }
      ]
    },
    'final_consonants': {
      title: 'Final Consonants',
      description: 'Somali words rarely end in consonants',
      exercises: [
        { phrase: 'Good job', focus: 'Final D and B' },
        { phrase: 'First step', focus: 'Final ST and P' },
        { phrase: 'Next week', focus: 'Final XT and K' }
      ]
    }
  }

  useEffect(() => {
    if (isOpen && !currentExercise) {
      selectExerciseForUser()
    }
  }, [isOpen])

  const selectExerciseForUser = () => {
    // Select exercise based on difficulty and common Somali challenges
    const challengeKeys = Object.keys(somaliChallenges)
    const selectedChallenge = somaliChallenges[challengeKeys[0]] // Start with P vs B
    const exercise = selectedChallenge.exercises[0]
    
    setCurrentExercise({
      ...exercise,
      challenge: selectedChallenge,
      challengeType: challengeKeys[0]
    })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Setup MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setAudioBlob(audioBlob)
        processAudio(audioBlob)
      }

      // Setup Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          setTranscription(transcript)
        }

        recognitionRef.current.start()
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setAttempts(prev => prev + 1)

    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    
    setIsRecording(false)
  }

  const processAudio = async (audioBlob) => {
    setLoading(true)
    
    try {
      // Analyze pronunciation using our AI service
      const analysis = await analyzePronunciation(transcription, currentExercise.phrase, currentExercise.challengeType)
      
      setPronunciationAnalysis(analysis)
      
      // Update best score
      if (analysis.overallScore > bestScore) {
        setBestScore(analysis.overallScore)
      }

      // Save to database for learning analytics
      if (user?.id && analysis.corrections.length > 0) {
        await saveGrammarCorrection(
          user.id,
          transcription,
          currentExercise.phrase,
          'pronunciation',
          analysis.feedback,
          analysis.overallScore
        )
      }

    } catch (error) {
      console.error('Error processing audio:', error)
      setPronunciationAnalysis({
        overallScore: 50,
        feedback: 'Could not analyze pronunciation right now. Keep practicing!',
        corrections: [],
        somaliTips: []
      })
    } finally {
      setLoading(false)
    }
  }

  const analyzePronunciation = async (userText, targetText, challengeType) => {
    // Advanced pronunciation analysis for Somali speakers
    const analysis = {
      overallScore: 0,
      feedback: '',
      corrections: [],
      somaliTips: [],
      strengths: [],
      improvements: []
    }

    // Basic similarity check
    const similarity = calculateSimilarity(userText.toLowerCase(), targetText.toLowerCase())
    analysis.overallScore = Math.round(similarity * 100)

    // Specific analysis for Somali challenges
    switch (challengeType) {
      case 'p_vs_b':
        analysis.corrections = analyzePvsBSounds(userText, targetText)
        analysis.somaliTips = [
          "In Somali, P and B sounds are similar. In English, they're different.",
          "For P: Don't use your voice, just air. For B: Use your voice.",
          "Practice: Put your hand on your throat. B should vibrate, P shouldn't."
        ]
        break
        
      case 'th_sounds':
        analysis.corrections = analyzeThSounds(userText, targetText)
        analysis.somaliTips = [
          "TH sounds don't exist in Somali. Put your tongue between your teeth.",
          "For 'think': No voice, just air through teeth.",
          "For 'this': Use voice while tongue touches teeth."
        ]
        break
        
      case 'vowel_sounds':
        analysis.corrections = analyzeVowelSounds(userText, targetText)
        analysis.somaliTips = [
          "English has more vowel sounds than Somali.",
          "Listen carefully to the difference between 'bit' and 'beat'.",
          "Practice with a mirror to see mouth shape changes."
        ]
        break
        
      case 'final_consonants':
        analysis.corrections = analyzeFinalConsonants(userText, targetText)
        analysis.somaliTips = [
          "Somali words rarely end in consonants, but English words often do.",
          "Make sure to pronounce the final sound clearly.",
          "Don't add extra vowel sounds at the end."
        ]
        break
    }

    // Generate feedback
    if (analysis.overallScore >= 90) {
      analysis.feedback = "Excellent pronunciation! You're mastering this sound."
    } else if (analysis.overallScore >= 70) {
      analysis.feedback = "Good job! A few small improvements will make it perfect."
    } else if (analysis.overallScore >= 50) {
      analysis.feedback = "You're getting there! Focus on the specific sounds highlighted."
    } else {
      analysis.feedback = "Keep practicing! Remember the Somali-specific tips below."
    }

    return analysis
  }

  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  const levenshteinDistance = (str1, str2) => {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  const analyzePvsBSounds = (userText, targetText) => {
    const corrections = []
    const pWords = targetText.match(/\b[Pp]\w*/g) || []
    const bWords = targetText.match(/\b[Bb]\w*/g) || []
    
    pWords.forEach(word => {
      if (!userText.toLowerCase().includes(word.toLowerCase())) {
        corrections.push({
          word: word,
          issue: 'P sound may be pronounced as B',
          tip: 'Remember: P is voiceless (no throat vibration)'
        })
      }
    })
    
    return corrections
  }

  const analyzeThSounds = (userText, targetText) => {
    const corrections = []
    const thWords = targetText.match(/\b\w*[Tt]h\w*/g) || []
    
    thWords.forEach(word => {
      if (!userText.toLowerCase().includes(word.toLowerCase())) {
        corrections.push({
          word: word,
          issue: 'TH sound may be pronounced as T or D',
          tip: 'Put tongue between teeth for TH sound'
        })
      }
    })
    
    return corrections
  }

  const analyzeVowelSounds = (userText, targetText) => {
    // Simplified vowel analysis
    return []
  }

  const analyzeFinalConsonants = (userText, targetText) => {
    const corrections = []
    const words = targetText.split(' ')
    
    words.forEach(word => {
      const lastChar = word.slice(-1)
      if (/[bcdfghjklmnpqrstvwxyz]/i.test(lastChar)) {
        if (!userText.toLowerCase().includes(word.toLowerCase())) {
          corrections.push({
            word: word,
            issue: `Final ${lastChar.toUpperCase()} sound may be missing`,
            tip: `Make sure to pronounce the final ${lastChar.toUpperCase()} sound`
          })
        }
      }
    })
    
    return corrections
  }

  const playTargetAudio = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentExercise.phrase)
      utterance.lang = 'en-US'
      utterance.rate = 0.7 // Slower for learning
      utterance.pitch = 1
      
      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      
      speechSynthesis.speak(utterance)
    }
  }

  const nextExercise = () => {
    const challengeKeys = Object.keys(somaliChallenges)
    const currentIndex = challengeKeys.indexOf(currentExercise.challengeType)
    const nextChallengeKey = challengeKeys[(currentIndex + 1) % challengeKeys.length]
    const nextChallenge = somaliChallenges[nextChallengeKey]
    
    setCurrentExercise({
      ...nextChallenge.exercises[0],
      challenge: nextChallenge,
      challengeType: nextChallengeKey
    })
    
    // Reset state
    setTranscription('')
    setPronunciationAnalysis(null)
    setAudioBlob(null)
    setAttempts(0)
    setBestScore(0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Pronunciation Coach</h3>
              <p className="text-sm opacity-90">
                {currentExercise?.challenge.title} - {currentExercise?.challenge.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Exercise */}
          {currentExercise && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-800">Practice This Phrase:</h4>
                <button
                  onClick={playTargetAudio}
                  disabled={isPlaying}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>Listen</span>
                </button>
              </div>
              <p className="text-2xl font-bold text-blue-900 mb-2">{currentExercise.phrase}</p>
              <p className="text-sm text-blue-700">Focus: {currentExercise.focus}</p>
            </div>
          )}

          {/* Recording Controls */}
          <div className="text-center space-y-4">
            <div className="flex justify-center space-x-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
              </button>

              {audioBlob && (
                <button
                  onClick={() => setAudioBlob(null)}
                  className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Try Again</span>
                </button>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Analyzing pronunciation...</span>
              </div>
            )}
          </div>

          {/* Results */}
          {transcription && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">What you said:</h4>
              <p className="text-lg text-gray-700">"{transcription}"</p>
            </div>
          )}

          {/* Pronunciation Analysis */}
          {pronunciationAnalysis && (
            <div className="space-y-4">
              {/* Score */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">Pronunciation Score</h4>
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">
                      {pronunciationAnalysis.overallScore}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      pronunciationAnalysis.overallScore >= 70 ? 'bg-green-500' :
                      pronunciationAnalysis.overallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pronunciationAnalysis.overallScore}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{pronunciationAnalysis.feedback}</p>
              </div>

              {/* Corrections */}
              {pronunciationAnalysis.corrections.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-3">Areas to Improve:</h4>
                  <div className="space-y-2">
                    {pronunciationAnalysis.corrections.map((correction, idx) => (
                      <div key={idx} className="bg-white rounded p-3">
                        <p className="font-medium text-gray-800">"{correction.word}"</p>
                        <p className="text-sm text-gray-600">{correction.issue}</p>
                        <p className="text-sm text-blue-600 font-medium">{correction.tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Somali-Specific Tips */}
              {pronunciationAnalysis.somaliTips.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-3">Tips for Somali Speakers:</h4>
                  <div className="space-y-2">
                    {pronunciationAnalysis.somaliTips.map((tip, idx) => (
                      <p key={idx} className="text-sm text-purple-700">• {tip}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{attempts}</div>
              <div className="text-sm text-blue-700">Attempts</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{bestScore}%</div>
              <div className="text-sm text-green-700">Best Score</div>
            </div>
          </div>

          {/* Next Exercise */}
          <button
            onClick={nextExercise}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            Next Exercise
          </button>
        </div>
      </div>
    </div>
  )
}

export default VoicePronunciationCoach 