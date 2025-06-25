#!/usr/bin/env node

const API_KEY = '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'
const BASE_URL = 'https://openrouter.ai/api/v1'

console.log('🔧 Debugging OpenRouter API Authorization...')

async function testAuthFormats() {
  console.log('\n1. Testing models endpoint (working)...')
  try {
    const response = await fetch(`${BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    })
    console.log('✅ Models endpoint status:', response.status)
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Found ${data.data?.length || 0} models`)
    }
  } catch (error) {
    console.error('❌ Models test failed:', error.message)
  }

  console.log('\n2. Testing chat completions with standard format...')
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 50
      })
    })
    
    console.log('Status:', response.status)
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Chat completions working!')
    } else {
      console.log('❌ Chat completions failed')
    }
  } catch (error) {
    console.error('❌ Chat test failed:', error.message)
  }

  console.log('\n3. Testing with HTTP-Referer header...')
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://englishlearning.app',
        'X-Title': 'English Learning App'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 50
      })
    })
    
    console.log('Status:', response.status)
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Chat completions with referer working!')
    } else {
      console.log('❌ Chat completions with referer failed')
    }
  } catch (error) {
    console.error('❌ Chat test with referer failed:', error.message)
  }

  console.log('\n4. Testing different model...')
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://localhost:5175',
        'X-Title': 'HadalHub English Learning'
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2-7b-instruct:free',
        messages: [{ role: 'user', content: 'Test message' }],
        max_tokens: 50
      })
    })
    
    console.log('Status:', response.status)
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Alternative model working!')
    } else {
      console.log('❌ Alternative model failed')
    }
  } catch (error) {
    console.error('❌ Alternative model test failed:', error.message)
  }
}

testAuthFormats().then(() => {
  console.log('\n🏁 Debug test complete!')
}).catch(console.error) 