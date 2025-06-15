// Test the new AI scoring system
import { aiService } from './src/services/aiService.js'

// Test cases with expected results
const testCases = [
  {
    question: "What is your name?",
    answer: "I don't know I don't know but I I don't know where from",
    expectedScore: "Low (should be under 30%)",
    description: "Nonsensical repetitive answer"
  },
  {
    question: "What is your name?", 
    answer: "My name is John Smith and I am 25 years old.",
    expectedScore: "High (should be 70%+)",
    description: "Good relevant answer"
  },
  {
    question: "Tell me about yourself.",
    answer: "Hi hello I am very very very good I am also I wanna ask you how about you how's the family",
    expectedScore: "Medium (should be 40-60%)",
    description: "Somewhat relevant but rambling"
  },
  {
    question: "Where are you from?",
    answer: "I am from Somalia. I was born in Mogadishu but now I live in Minneapolis.",
    expectedScore: "High (should be 80%+)",
    description: "Perfect relevant answer"
  },
  {
    question: "What do you do for work?",
    answer: "um uh I don't know maybe something",
    expectedScore: "Very Low (should be under 20%)",
    description: "Non-answer with fillers"
  }
]

// Run tests
console.log("🧪 Testing New AI Scoring System\n")

testCases.forEach(async (testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`)
  console.log(`Question: "${testCase.question}"`)
  console.log(`Answer: "${testCase.answer}"`)
  console.log(`Expected: ${testCase.expectedScore}`)
  
  try {
    const result = await aiService.analyzeAnswer(
      testCase.question,
      testCase.answer,
      {
        category: 'general',
        level: 1,
        expectedLength: 30,
        recordingTime: 20
      }
    )
    
    console.log(`✅ Actual Score: ${result.overallScore}%`)
    console.log(`   Grammar: ${result.grammarScore}%`)
    console.log(`   Relevance: ${result.relevanceScore}%`)
    console.log(`   Fluency: ${result.fluencyScore}%`)
    console.log(`   Pronunciation: ${result.pronunciationScore}%`)
    console.log(`   Passed: ${result.passed ? 'YES' : 'NO'}`)
    console.log(`   Feedback: ${result.feedback_somali}`)
    console.log("---\n")
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    console.log("---\n")
  }
})

console.log("🎯 Key Improvements Made:")
console.log("1. ❌ Removed inflated base scores (was 70%, now 0%)")
console.log("2. ✅ Added strict relevance checking")
console.log("3. ✅ Added quality penalties for poor answers")
console.log("4. ✅ Increased passing threshold from 60% to 70%")
console.log("5. ✅ Added specific feedback based on individual scores")
console.log("6. ✅ Better detection of nonsensical answers") 