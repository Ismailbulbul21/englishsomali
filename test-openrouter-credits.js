#!/usr/bin/env node

const API_KEY = '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'
const BASE_URL = 'https://openrouter.ai/api/v1'

console.log('💰 Testing OpenRouter Account Status...')

async function testCreditsAndAuth() {
  console.log('\n1. Testing credits endpoint...')
  try {
    const response = await fetch(`${BASE_URL}/auth/key`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    })
    console.log('Status:', response.status)
    const data = await response.json()
    console.log('Auth response:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Credits test failed:', error.message)
  }

  console.log('\n2. Testing with a free model...')
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://localhost:5175'
      },
      body: JSON.stringify({
        model: 'google/gemma-2-9b-it:free',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    })
    
    console.log('Status:', response.status)
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Free model test failed:', error.message)
  }

  console.log('\n3. Testing with another free model...')
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'huggingface/zephyr-7b-beta:free',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      })
    })
    
    console.log('Status:', response.status)
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Second free model test failed:', error.message)
  }

  console.log('\n4. Testing API key validation...')
  try {
    // Test with malformed key
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer invalid-key`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemma-2-9b-it:free',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    })
    
    console.log('Invalid key status:', response.status)
    const data = await response.json()
    console.log('Invalid key response:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Invalid key test failed:', error.message)
  }
}

testCreditsAndAuth().then(() => {
  console.log('\n🏁 Account status test complete!')
}).catch(console.error) 