/**
 * 🚀 AI SERVICE INTEGRATOR V3 - SMART ENFORCEMENT & PROGRESSIVE DIFFICULTY
 * 
 * Seamlessly integrates multiple AI services with smart fallbacks and comprehensive
 * enforcement across all levels. Includes progressive difficulty, Somali feedback,
 * and enhanced user experience.
 */

import { env } from '../config/env.js'
import UltimateProgressiveLearningAIV5 from './revolutionaryAISystemV4.js'

class AIServiceIntegrator {
  constructor() {
    // 🎯 Initialize multiple AI systems with failover support
    this.systems = {
      primary: new UltimateProgressiveLearningAIV5(),
      fallback: this.createFallbackSystem()
    }
    
    // 🔧 Configuration with browser-safe environment access
    this.config = {
      useAI: env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY !== 'demo-mode',
      maxRetries: 3,
      timeout: 30000, // 30 seconds
      fallbackEnabled: true
    }
    
    // 📊 Progressive enforcement settings (SMART - not draconian)
    this.enforcementSettings = {
      minRelevanceThreshold: 30, // Changed from 40% to 30% (less harsh)
      enableProgressiveThresholds: true,
      enableSmartScoring: true,
      enableSomaliFeedback: true,
      enableLevelValidation: true
    }
    
    console.log('🚀 AI Service Integrator V3 initialized!')
    console.log('⚡ Features: Smart enforcement + Progressive difficulty + Somali feedback')
    console.log('🔧 AI Available:', this.config.useAI ? 'Yes' : 'Demo mode')
  }

  /**
   * 🎯 MAIN ANALYSIS METHOD - SMART INTEGRATION WITH PROGRESSIVE STANDARDS
   */
  async analyzeUserResponse(question, userAnswer, context = {}) {
    const startTime = Date.now()
    const level = context.level || 1
    
    try {
      console.log('🔥 AI INTEGRATOR: Starting comprehensive analysis...')
      console.log('📝 Question:', question)
      console.log('💬 Answer:', userAnswer)
      console.log('🎯 Level:', level)
      
      // 1. 🔍 PRIMARY ANALYSIS using Ultimate Progressive AI
      let result = await this.systems.primary.analyzeAnswer(question, userAnswer, context)
      
      // 2. ⚖️ SMART ENFORCEMENT (Updated with gentler thresholds)
      result = await this.applySmartEnforcement(result, question, userAnswer, context)
      
      // 3. 📊 ENHANCE SCORES (Prevent discouraging 0% scores)
      result = this.enhanceScoring(result, level)
      
      // 4. 🌍 ENSURE SOMALI FEEDBACK (Comprehensive translation)
      result = this.ensureSomaliFeedback(result, level)
      
      // 5. 📈 ADD PROGRESSION ANALYTICS
      result = this.addProgressionAnalytics(result, level)
      
      console.log('✅ AI INTEGRATOR: Analysis complete!')
      console.log('📊 Final Score:', result.overallScore)
      console.log('✅ Passed:', result.passed)
      console.log('🎯 Processing time:', Date.now() - startTime + 'ms')
      
      return result
      
    } catch (error) {
      console.error('💥 AI Integrator error:', error)
      return this.createFailsafeFallback(question, userAnswer, context, startTime)
    }
  }

  /**
   * ⚖️ SMART ENFORCEMENT - Enhanced with gentler thresholds
   */
  async applySmartEnforcement(result, question, userAnswer, context) {
    if (!this.enforcementSettings.enableProgressiveThresholds) {
      return result // Skip enforcement if disabled
    }
    
    const level = context.level || 1
    
    // 🚫 SMART OFF-TOPIC DETECTION (Updated threshold: 30% instead of 40%)
    if (result.relevanceScore < this.enforcementSettings.minRelevanceThreshold) {
      console.log('⚠️ SMART ENFORCEMENT: Low relevance detected, applying auto-fail')
      
      return {
        ...result,
        overallScore: 0,
        passed: false,
        feedback: this.generateOffTopicSomaliFeedback(result.relevanceScore, level),
        feedback_somali: this.generateOffTopicSomaliFeedback(result.relevanceScore, level),
        detailed_feedback: {
          ...result.detailed_feedback,
          enforcement_applied: 'smart_off_topic_detection',
          relevance_threshold: this.enforcementSettings.minRelevanceThreshold,
          actual_relevance: result.relevanceScore,
          enforcement_reason: 'Answer deemed completely off-topic'
        }
      }
    }
    
    // ✅ PROGRESSIVE THRESHOLD ENFORCEMENT (kept as is - working well)
    const progressiveThresholds = {
      1: 50, // Level 1: 50%
      2: 60, // Level 2: 60%
      3: 70, // Level 3: 70%
      4: 80  // Level 4: 80%
    }
    
    const requiredThreshold = progressiveThresholds[level] || 50
    
    // Update required threshold in result
    result.requiredThreshold = requiredThreshold
    
    // Update pass/fail logic
    result.passed = result.overallScore >= requiredThreshold && 
                   result.relevanceScore >= this.enforcementSettings.minRelevanceThreshold
    
    return result
  }

  /**
   * 📊 ENHANCE SCORING - Prevent discouraging 0% scores
   */
  enhanceScoring(result, level) {
    if (!this.enforcementSettings.enableSmartScoring) {
      return result
    }
    
    // 🎯 SMART MINIMUM SCORES: Show meaningful percentages instead of 0%
    const smartMinimums = {
      grammar: 20,
      fluency: 20, 
      pronunciation: 20
    }
    
    // Apply smart minimums (unless completely off-topic)
    if (result.relevanceScore >= this.enforcementSettings.minRelevanceThreshold) {
      result.grammarScore = Math.max(smartMinimums.grammar, result.grammarScore)
      result.fluencyScore = Math.max(smartMinimums.fluency, result.fluencyScore)
      result.pronunciationScore = Math.max(smartMinimums.pronunciation, result.pronunciationScore)
    }
    
    return result
  }

  /**
   * 🌍 ENSURE COMPREHENSIVE SOMALI FEEDBACK
   */
  ensureSomaliFeedback(result, level) {
    if (!this.enforcementSettings.enableSomaliFeedback) {
      return result
    }
    
    // 🎯 COMPREHENSIVE SCORE BREAKDOWN IN SOMALI
    const somaliScoreLabels = {
      overall: 'Guud ahaan',
      grammar: 'Naxwe',
      fluency: 'Qoraal Qurux badan', 
      pronunciation: 'Dhawaq',
      relevance: 'La xidhiidh'
    }
    
    const scoreBreakdown = `
📊 DHIBCAHA:
• ${somaliScoreLabels.overall}: ${result.overallScore}%
• ${somaliScoreLabels.grammar}: ${result.grammarScore}%
• ${somaliScoreLabels.fluency}: ${result.fluencyScore}%
• ${somaliScoreLabels.pronunciation}: ${result.pronunciationScore}%
• ${somaliScoreLabels.relevance}: ${result.relevanceScore}%`
    
    if (result.passed) {
      result.feedback_somali = `🎉 WAAD BAASTAY!

Heerka ${level} - ${result.overallScore}%
✅ Aad baad u fiicantahay!

${scoreBreakdown}

💪 ${level < 4 ? `Diyaar u ah Heerka ${level + 1}!` : 'Waad dhammaystay dhammaan heerarka!'}
🌟 Kalsooniyadaada sii kordhi!`

    } else {
      const issues = []
      if (result.overallScore < result.requiredThreshold) {
        issues.push(`Dhibcahu way yaraayeen: ${result.overallScore}% < ${result.requiredThreshold}%`)
      }
      if (result.relevanceScore < this.enforcementSettings.minRelevanceThreshold) {
        issues.push('Jawaabku ma la xidhiidho su\'aalka')
      }
      
      result.feedback_somali = `❌ WAAD DHACDAY

Heerka ${level} - ${result.overallScore}%
📊 Loo baahan yahay: ${result.requiredThreshold}%

${scoreBreakdown}

⚠️ DHIBAATOOYIN:
${issues.map(issue => `• ${issue}`).join('\n')}

💪 Dib u isku day - waad samayn kartaa!
🎯 Bilowga ayaa ugu adag - sii wad!`
    }
    
    // Ensure both feedback and feedback_somali are set
    if (!result.feedback) {
      result.feedback = result.feedback_somali
    }
    
    return result
  }

  /**
   * 📈 ADD PROGRESSION ANALYTICS
   */
  addProgressionAnalytics(result, level) {
    const analytics = {
      current_level: level,
      current_level_name: this.getLevelName(level),
      next_level: level < 4 ? level + 1 : null,
      next_level_name: level < 4 ? this.getLevelName(level + 1) : null,
      progress_percentage: this.calculateProgressPercentage(result.overallScore, result.requiredThreshold),
      areas_for_improvement: this.identifyImprovementAreas(result),
      time_to_next_level: this.estimateTimeToNextLevel(result, level)
    }
    
    result.progression_analytics = analytics
    return result
  }

  /**
   * 🚫 GENERATE OFF-TOPIC SOMALI FEEDBACK
   */
  generateOffTopicSomaliFeedback(relevanceScore, level) {
    return `❌ JAWAABKU MA KHUSEEYO SU'AALKA!

Heerka ${level} - La xidhiidh: ${relevanceScore}%
⚠️ Loo baahan yahay: ${this.enforcementSettings.minRelevanceThreshold}%+ 

🎯 Su'aalka si toos ah ugu jawaab.
💭 Kaga fekir waxa laga doonayo.
🔄 Isku day mar kale jawaab ku habboon.

💪 Waad samayn kartaa - si fiican u dhegayso su'aalka!`
  }

  /**
   * 🔧 CREATE FALLBACK SYSTEM
   */
  createFallbackSystem() {
    return {
      analyzeAnswer: async (question, userAnswer, context) => {
        const level = context.level || 1
        const words = userAnswer.trim().split(/\s+/).length
        
        // Simple fallback scoring
        const baseScore = Math.min(70, words * 3 + 20)
        const relevanceScore = this.simpleRelevanceCheck(question, userAnswer)
        
        return {
          overallScore: Math.round(baseScore),
          grammarScore: Math.round(baseScore * 0.9),
          fluencyScore: Math.round(baseScore * 0.8),
          pronunciationScore: Math.round(baseScore * 0.85),
          relevanceScore: relevanceScore,
          passed: baseScore >= 50 && relevanceScore >= 30,
          requiredThreshold: 50,
          feedback: 'Browser fallback analysis completed.',
          feedback_somali: 'Baaris fallback ah la sameeyay.',
          analysis_method: 'browser_fallback_system'
        }
      }
    }
  }

  /**
   * 🔍 SIMPLE RELEVANCE CHECK (Fallback)
   */
  simpleRelevanceCheck(question, userAnswer) {
    const questionWords = question.toLowerCase().split(/\s+/)
    const answerWords = userAnswer.toLowerCase().split(/\s+/)
    
    let matches = 0
    questionWords.forEach(qWord => {
      if (answerWords.includes(qWord)) matches++
    })
    
    const relevance = questionWords.length > 0 ? (matches / questionWords.length) * 100 : 50
    return Math.round(relevance)
  }

  /**
   * 📊 HELPER METHODS FOR ANALYTICS
   */
  getLevelName(level) {
    const names = {
      1: 'BEGINNER',
      2: 'ELEMENTARY', 
      3: 'INTERMEDIATE',
      4: 'ADVANCED'
    }
    return names[level] || 'UNKNOWN'
  }

  calculateProgressPercentage(score, threshold) {
    return Math.round((score / threshold) * 100)
  }

  identifyImprovementAreas(result) {
    const areas = []
    if (result.grammarScore < 70) areas.push('grammar')
    if (result.fluencyScore < 70) areas.push('fluency')
    if (result.pronunciationScore < 70) areas.push('pronunciation')
    if (result.relevanceScore < 70) areas.push('relevance')
    return areas
  }

  estimateTimeToNextLevel(result, level) {
    if (level >= 4) return null
    
    const gap = Math.max(0, this.getThresholdForLevel(level + 1) - result.overallScore)
    const estimatedAttempts = Math.ceil(gap / 10) // Rough estimate
    
    return {
      score_gap: gap,
      estimated_attempts: estimatedAttempts,
      encouragement: gap <= 10 ? 'Very close!' : gap <= 20 ? 'Almost there!' : 'Keep practicing!'
    }
  }

  getThresholdForLevel(level) {
    const thresholds = { 1: 50, 2: 60, 3: 70, 4: 80 }
    return thresholds[level] || 50
  }

  /**
   * 🚨 FAILSAFE FALLBACK
   */
  createFailsafeFallback(question, userAnswer, context, startTime) {
    const level = context.level || 1
    
    return {
      overallScore: 0,
      grammarScore: 0,
      fluencyScore: 0,
      pronunciationScore: 0,
      relevanceScore: 0,
      passed: false,
      requiredThreshold: this.getThresholdForLevel(level),
      feedback: `⚠️ System error occurred. Please try again.`,
      feedback_somali: `⚠️ Khalad nidaam ah ayaa dhacay. Fadlan isku day mar kale.`,
      detailed_feedback: {
        error: 'System failure',
        processing_time: Date.now() - startTime,
        fallback_used: 'emergency_failsafe'
      },
      analysis_method: 'emergency_failsafe',
      level_analyzed: level
    }
  }

  /**
   * 🔧 CONFIGURATION METHODS
   */
  updateEnforcementSettings(newSettings) {
    this.enforcementSettings = { ...this.enforcementSettings, ...newSettings }
    console.log('🔧 Enforcement settings updated:', this.enforcementSettings)
  }

  getSystemStatus() {
    return {
      systems_available: Object.keys(this.systems),
      ai_enabled: this.config.useAI,
      enforcement_enabled: this.enforcementSettings.enableProgressiveThresholds,
      somali_feedback_enabled: this.enforcementSettings.enableSomaliFeedback,
      current_thresholds: {
        min_relevance: this.enforcementSettings.minRelevanceThreshold,
        level_thresholds: { 1: 50, 2: 60, 3: 70, 4: 80 }
      }
    }
  }
}

export default AIServiceIntegrator 