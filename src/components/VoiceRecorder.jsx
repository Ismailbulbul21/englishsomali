import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, RotateCcw, Volume2 } from 'lucide-react'
import { aiService } from '../services/aiService'

const VoiceRecorder = ({ onRecordingComplete, disabled = false, maxDuration = 60, autoStart = false }) => {
  // Simplified states
  const [recordingState, setRecordingState] = useState('idle') // 'idle', 'recording', 'recorded', 'processing'
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcription, setTranscription] = useState('')
  const [liveTranscription, setLiveTranscription] = useState('')

  // Refs
  const mediaRecorderRef = useRef(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)
  const speechRecognitionRef = useRef(null)

  // Cleanup function
  const cleanup = () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    // Stop animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    // Stop live speech recognition
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop()
      } catch (error) {
        console.log('Speech recognition already stopped')
      }
      speechRecognitionRef.current = null
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
    
    // Reset audio level
    setAudioLevel(0)
    setLiveTranscription('')
  }

  useEffect(() => {
    return cleanup
  }, [])

  // Auto-start recording if autoStart prop is true
  useEffect(() => {
    if (autoStart && recordingState === 'idle') {
      startRecording()
    }
  }, [autoStart])

  // Start recording
  const startRecording = async () => {
    if (recordingState === 'recording') {
      console.log('Already recording, ignoring start request')
      return
    }
    
    console.log('🎤 Starting recording...')
    setRecordingState('recording')
    setDuration(0)
    setAudioLevel(0)
    setLiveTranscription('')
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      })
      
      streamRef.current = stream
      
      // Setup audio visualization
      setupAudioVisualization(stream)
      
      // Setup live speech recognition
      setupLiveSpeechRecognition()
      
      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const chunks = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        console.log('📹 Recording stopped')
        
        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          setAudioBlob(audioBlob)
          
          const url = URL.createObjectURL(audioBlob)
          setAudioUrl(url)
          
          setRecordingState('processing')
          
          try {
            const transcription = await aiService.transcribeAudio(audioBlob)
            setTranscription(transcription)
            setRecordingState('recorded')
            
            if (onRecordingComplete) {
              onRecordingComplete(audioBlob, transcription)
            }
          } catch (error) {
            console.error('❌ Transcription failed:', error)
            setRecordingState('recorded')
            setTranscription('Transcription failed - please try again')
          }
        } else {
          console.warn('No audio data recorded')
          setRecordingState('idle')
        }
        
        cleanup()
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      
      // Start timer with better logic
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            console.log('⏰ Max duration reached, stopping...')
            // Use setTimeout to avoid race condition
            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                stopRecording()
              }
            }, 100)
            return maxDuration
          }
          return newDuration
        })
      }, 1000)
      
    } catch (error) {
      console.error('❌ Error starting recording:', error)
      if (error.name === 'NotAllowedError') {
        setPermissionDenied(true)
      }
      setRecordingState('idle')
      cleanup()
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (recordingState !== 'recording') {
      console.log('Not recording, ignoring stop request')
      return
    }
    
    console.log('⏹️ Stopping recording...')
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    // Don't call cleanup here - let onstop handle it
  }

  // Setup audio visualization
  const setupAudioVisualization = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    audioContextRef.current = audioContext
    
    const analyser = audioContext.createAnalyser()
    const microphone = audioContext.createMediaStreamSource(stream)
    
    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    microphone.connect(analyser)
    analyserRef.current = analyser
    
    const updateLevel = () => {
      if (analyserRef.current && recordingState === 'recording') {
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(Math.min(average / 128 * 100, 100))
        animationRef.current = requestAnimationFrame(updateLevel)
      }
    }
    
    updateLevel()
  }

  // Setup live speech recognition
  const setupLiveSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('🎤 Live speech recognition started')
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      setLiveTranscription(finalTranscript + interimTranscript)
    }

    recognition.onerror = (event) => {
      console.error('🎤 Live speech recognition error:', event.error)
    }

    recognition.onend = () => {
      console.log('🎤 Live speech recognition ended')
    }

    speechRecognitionRef.current = recognition
    recognition.start()
  }

  // Play/pause recording
  const togglePlayback = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Reset recording
  const resetRecording = () => {
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setDuration(0)
    setIsPlaying(false)
    setRecordingState('idle')
    setAudioLevel(0)
    setTranscription('')
    setLiveTranscription('')
  }

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const progressPercentage = (duration / maxDuration) * 100

  if (permissionDenied) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mic className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Microphone Access Required</h3>
        <p className="text-red-600 mb-2">Please allow microphone access to record your voice.</p>
        <p className="text-red-600 text-sm mb-4">Fadlan u oggolow gelitaanka makarafoonka si aad u duubto codkaaga.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again / Isku day mar kale
        </button>
      </div>
    )
  }

  return (
    <div className="glass-container rounded-xl p-8 card-hover animate-fade-in-up">
      <div className="text-center max-w-md mx-auto">
        
        {/* Main Recording Button */}
        <div className="relative mb-8">
          <button
            data-recording-button
            onClick={recordingState === 'recording' ? stopRecording : startRecording}
            disabled={disabled || recordingState === 'processing'}
            className={`
              w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 text-white relative overflow-hidden transform hover:scale-110 shadow-xl btn-hover-lift
              ${recordingState === 'recording' 
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse' 
                : recordingState === 'recorded'
                ? 'bg-gradient-success cursor-default'
                : recordingState === 'processing'
                ? 'bg-gradient-somali cursor-wait'
                : 'bg-gradient-learning hover:shadow-2xl'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {recordingState === 'recording' ? (
              <Square className="w-10 h-10" />
            ) : recordingState === 'recorded' ? (
              <Volume2 className="w-10 h-10" />
            ) : recordingState === 'processing' ? (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            ) : (
              <Mic className="w-10 h-10" />
            )}
            
            {/* Enhanced pulsing effect for recording */}
            {recordingState === 'recording' && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
                <div className="absolute inset-0 rounded-full bg-red-300 animate-pulse opacity-50"></div>
                <div 
                  className="absolute inset-0 rounded-full bg-red-200 animate-pulse"
                  style={{ 
                    transform: `scale(${1 + audioLevel / 150})`,
                    opacity: audioLevel / 100 * 0.3 
                  }}
                ></div>
              </>
            )}
          </button>
        </div>

        {/* Status and Instructions */}
        <div className="mb-6">
          {recordingState === 'idle' && (
            <div className="animate-fade-in">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Record</h3>
              <p className="text-gray-600">Tap the microphone to start recording</p>
              <p className="text-blue-600 text-sm">Riix makarafoonka si aad u bilowdo duubista</p>
            </div>
          )}
          
          {recordingState === 'recording' && (
            <div className="animate-pulse">
              <h3 className="text-xl font-semibold text-red-600 mb-2">🔴 Recording...</h3>
              <p className="text-gray-600">Speak clearly • Tap stop when finished</p>
              <p className="text-blue-600 text-sm">Hadal si cad • Riix jooji marka aad dhamaysato</p>
            </div>
          )}
          
          {recordingState === 'processing' && (
            <div className="animate-bounce">
              <h3 className="text-xl font-semibold text-yellow-600 mb-2">⚡ Processing...</h3>
              <p className="text-gray-600">Converting your speech to text</p>
              <p className="text-blue-600 text-sm">Waan u beddelaynaa hadalkaga qoraal</p>
            </div>
          )}
          
          {recordingState === 'recorded' && (
            <div className="animate-fade-in">
              <h3 className="text-xl font-semibold text-green-600 mb-2">✅ Recording Complete!</h3>
              <p className="text-gray-600">Play to review or re-record</p>
              <p className="text-blue-600 text-sm">Ciyaar si aad u dib u eegto ama dib u duub</p>
            </div>
          )}
        </div>

        {/* Transcription Display */}
        {transcription && recordingState === 'recorded' && (
          <div className="mb-6 p-4 glass rounded-lg animate-fade-in-up card-hover">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center justify-center text-shadow">
              <Volume2 className="w-4 h-4 mr-2" />
              Waxaad tidhi / What you said:
            </h4>
            <p className="text-blue-700 italic">"{transcription}"</p>
          </div>
        )}

        {/* Live Transcription Display */}
        {liveTranscription && recordingState === 'recording' && (
          <div className="mb-6 p-4 glass rounded-lg animate-pulse card-hover">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center justify-center text-shadow">
              <Volume2 className="w-4 h-4 mr-2" />
              Live transcription / Qoraalka tooska ah:
            </h4>
            <p className="text-green-700 italic">"{liveTranscription}"</p>
          </div>
        )}

        {/* Timer and Progress */}
        <div className="mb-8">
          <div className="text-4xl font-mono font-bold text-gray-800 mb-2 animate-count-up">
            {formatTime(duration)}
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2 shadow-inner">
            <div 
              className={`h-3 rounded-full transition-all duration-300 shadow-sm ${
                recordingState === 'recording' ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                recordingState === 'processing' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="text-sm text-gray-500">
            Max: {formatTime(maxDuration)}
          </div>
        </div>

        {/* Audio Level Visualization */}
        {recordingState === 'recording' && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-1 h-16 bg-gray-50 rounded-lg p-4">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 rounded-full transition-all duration-150 ${
                    audioLevel > (i * 7) ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                  style={{
                    height: `${Math.max(8, (audioLevel > (i * 7) ? audioLevel / 3 : 8))}px`
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Voice Level / Heerka codka</p>
          </div>
        )}

        {/* Processing Animation */}
        {recordingState === 'processing' && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 h-16 bg-yellow-50 rounded-lg p-4">
              <div className="animate-bounce w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="animate-bounce w-3 h-3 bg-yellow-500 rounded-full" style={{ animationDelay: '0.1s' }}></div>
              <div className="animate-bounce w-3 h-3 bg-yellow-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Converting speech to text...</p>
          </div>
        )}

        {/* Playback Controls */}
        {recordingState === 'recorded' && (
          <div className="flex items-center justify-center space-x-4 mb-6 animate-fade-in-up">
            <button
              onClick={togglePlayback}
              className="flex items-center space-x-2 bg-gradient-success text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 font-medium transform hover:scale-105 btn-hover-lift"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            
            <button
              onClick={resetRecording}
              className="flex items-center space-x-2 bg-gradient-somali text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 font-medium transform hover:scale-105 btn-hover-lift"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Re-record</span>
            </button>
          </div>
        )}

        {/* Hidden audio element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}

        {/* Tips */}
        <div className="text-sm text-gray-600 glass rounded-lg p-4 animate-fade-in">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span>💡</span>
            <span className="font-medium text-shadow">Recording Tips / Tilmaamaha duubista</span>
          </div>
          <div className="space-y-1 text-xs">
            <p className="transform transition-all duration-200 hover:scale-105">• Speak clearly and at normal pace</p>
            <p className="transform transition-all duration-200 hover:scale-105">• Hadal si cad oo xawli caadi ah</p>
            <p className="transform transition-all duration-200 hover:scale-105">• Find a quiet environment</p>
            <p className="transform transition-all duration-200 hover:scale-105">• Hel meel aamusan</p>
            <p className="transform transition-all duration-200 hover:scale-105">• Keep device 6-12 inches away</p>
            <p className="transform transition-all duration-200 hover:scale-105">• Qaadka halkaa 6-12 inji fog</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceRecorder 