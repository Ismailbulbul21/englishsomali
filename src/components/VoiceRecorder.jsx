import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, X, Volume2, Play, StopCircle } from 'lucide-react'

const VoiceRecorder = ({ 
  onSendVoice, 
  onCancel, 
  maxDuration = 60, 
  remainingMessages = 10,
  isUploading = false 
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [recordingStatus, setRecordingStatus] = useState('idle') // idle, recording, recorded, playing
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    return () => {
      // Cleanup
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (mediaRecorderRef.current && isRecording) {
        try {
          mediaRecorderRef.current.stop()
        } catch (e) {
          console.warn('Error stopping recorder:', e)
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      console.log('Starting recording...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      
      streamRef.current = stream
      
      // Check if webm is supported, fallback to wav
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/wav'
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('Data available:', event.data.size)
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        console.log('Recording stopped, creating blob...')
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setRecordingStatus('recorded')
        console.log('Blob created:', blob.size, 'bytes')
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setRecordingStatus('idle')
        setIsRecording(false)
        alert('Recording error occurred. Please try again.')
      }

      mediaRecorderRef.current.start(250) // Collect data every 250ms
      setIsRecording(true)
      setRecordingStatus('recording')
      setRecordingTime(0)
      console.log('Recording started')
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            console.log('Max duration reached, stopping...')
            stopRecording()
            return maxDuration
          }
          return newTime
        })
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      setRecordingStatus('idle')
      alert('Could not access microphone. Please check permissions and try again.')
    }
  }

  const stopRecording = () => {
    console.log('Stopping recording...')
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        console.warn('Error stopping recorder:', e)
      }
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      setIsPlaying(true)
      setRecordingStatus('playing')
      audioRef.current.currentTime = 0
      audioRef.current.play()
    }
  }

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setRecordingStatus('recorded')
    }
  }

  const handleSend = () => {
    console.log('Sending voice message...', { 
      hasBlob: !!audioBlob, 
      duration: recordingTime,
      blobSize: audioBlob?.size 
    })
    
    if (audioBlob && recordingTime > 0) {
      onSendVoice(audioBlob, recordingTime)
    } else {
      alert('No recording to send. Please record a message first.')
    }
  }

  const handleCancel = () => {
    if (isRecording) {
      stopRecording()
    }
    
    if (isPlaying) {
      stopPlaying()
    }
    
    // Cleanup
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    
    onCancel()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    return Math.min((recordingTime / maxDuration) * 100, 100)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">🎤 Voice Message</h3>
              <p className="text-green-100 text-sm">
                {remainingMessages} messages left today
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recording Area */}
        <div className="p-6">
          {/* Status Display */}
          <div className="text-center mb-6">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${
              recordingStatus === 'recording' 
                ? 'bg-red-100 border-4 border-red-500 shadow-lg' 
                : recordingStatus === 'recorded'
                ? 'bg-green-100 border-4 border-green-500'
                : recordingStatus === 'playing'
                ? 'bg-blue-100 border-4 border-blue-500 animate-pulse'
                : 'bg-gray-100 border-4 border-gray-300'
            }`}>
              {recordingStatus === 'recording' && (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <Mic className="w-8 h-8 text-red-500" />
                    <div className="absolute inset-0 w-8 h-8 border-2 border-red-500 rounded-full animate-ping"></div>
                    <div className="absolute inset-1 w-6 h-6 border border-red-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex space-x-1 mt-2">
                    <div className="w-1 h-2 bg-red-500 animate-bounce"></div>
                    <div className="w-1 h-3 bg-red-500 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1 h-4 bg-red-500 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-1 h-3 bg-red-500 animate-bounce" style={{animationDelay: '0.3s'}}></div>
                    <div className="w-1 h-2 bg-red-500 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                  <div className="mt-2 text-xs text-red-600 font-semibold animate-pulse">
                    🔴 RECORDING
                  </div>
                </div>
              )}
              {recordingStatus === 'recorded' && (
                <Mic className="w-8 h-8 text-green-500" />
              )}
              {recordingStatus === 'playing' && (
                <Volume2 className="w-8 h-8 text-blue-500" />
              )}
              {recordingStatus === 'idle' && (
                <Mic className="w-8 h-8 text-gray-500" />
              )}
            </div>
            
            <div className="text-3xl font-bold text-gray-800 mb-2">
              {formatTime(recordingTime)}
            </div>
            
            <div className={`text-sm font-medium ${
              recordingStatus === 'recording' ? 'text-red-600' :
              recordingStatus === 'recorded' ? 'text-green-600' :
              recordingStatus === 'playing' ? 'text-blue-600' :
              'text-gray-600'
            }`}>
              {recordingStatus === 'idle' && '🎯 Ready to record'}
              {recordingStatus === 'recording' && '🔴 Recording in progress...'}
              {recordingStatus === 'recorded' && '✅ Recording complete!'}
              {recordingStatus === 'playing' && '🔊 Playing back...'}
            </div>
          </div>

          {/* Progress Bar */}
          {(isRecording || recordingTime > 0) && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    recordingStatus === 'recording' ? 'bg-gradient-to-r from-red-400 to-red-600' : 
                    'bg-gradient-to-r from-green-400 to-green-600'
                  }`}
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0:00</span>
                <span className="font-medium">Max: {formatTime(maxDuration)}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center space-x-3">
            {recordingStatus === 'idle' && (
              <button
                onClick={startRecording}
                disabled={remainingMessages <= 0}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-full font-medium transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
              >
                <Mic className="w-5 h-5" />
                <span>Start Recording</span>
              </button>
            )}

            {recordingStatus === 'recording' && (
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-full font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                <StopCircle className="w-5 h-5" />
                <span>Stop</span>
              </button>
            )}

            {recordingStatus === 'recorded' && (
              <>
                <button
                  onClick={playRecording}
                  disabled={isPlaying}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-400 disabled:to-blue-500 text-white px-4 py-3 rounded-full font-medium transition-all transform hover:scale-105 shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  <span>Play</span>
                </button>
                
                <button
                  onClick={handleSend}
                  disabled={isUploading || recordingTime === 0}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-full font-medium transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
                >
                  <Send className="w-5 h-5" />
                  <span>{isUploading ? 'Sending...' : 'Send'}</span>
                </button>
              </>
            )}

            {recordingStatus === 'playing' && (
              <button
                onClick={stopPlaying}
                className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 rounded-full font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                <StopCircle className="w-5 h-5" />
                <span>Stop</span>
              </button>
            )}
          </div>

          {/* Status Messages */}
          {remainingMessages <= 3 && remainingMessages > 0 && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-orange-800 text-sm text-center font-medium">
                ⚠️ Only {remainingMessages} voice messages left today
              </p>
            </div>
          )}

          {remainingMessages <= 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800 text-sm text-center font-medium">
                ❌ Daily limit reached (10/10). Try again tomorrow!
              </p>
            </div>
          )}

          {isUploading && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-blue-800 text-sm font-medium">
                  Uploading voice message...
                </p>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-green-800 text-xs text-center">
              💡 <strong>Tip:</strong> Speak clearly and practice your English pronunciation! Your voice helps other learners too.
            </p>
          </div>
        </div>

        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => {
              setIsPlaying(false)
              setRecordingStatus('recorded')
            }}
            onError={(e) => {
              console.error('Audio playback error:', e)
              setIsPlaying(false)
              setRecordingStatus('recorded')
            }}
          />
        )}
      </div>
    </div>
  )
}

export default VoiceRecorder 