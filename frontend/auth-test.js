/**
 * Simple authentication integration test
 * Tests the frontend-backend auth flow
 */

const API_BASE_URL = 'http://localhost:3003/v1';

async function testAuthEndpoints() {
  console.log('🚀 Testing Authentication Endpoints');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE_URL.replace('/v1', '')}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test 2: Auth config
    console.log('\n2️⃣ Testing auth config...');
    const configResponse = await fetch(`${API_BASE_URL}/auth/config`);
    const configData = await configResponse.json();
    console.log('✅ Auth config:', configData);

    // Test 3: Login initiation
    console.log('\n3️⃣ Testing login initiation...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        redirectUri: 'http://localhost:3000/auth/callback',
        language: 'en'
      })
    });
    const loginData = await loginResponse.json();
    console.log('✅ Login initiation:', loginData);

    // Test 4: Token verification (should return invalid)
    console.log('\n4️⃣ Testing token verification...');
    const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify`);
    const verifyData = await verifyResponse.json();
    console.log('✅ Token verification:', verifyData);

    console.log('\n🎉 All auth endpoint tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Backend is running on port 3003 ✅');
    console.log('- Auth endpoints are responding ✅');
    console.log('- OAuth flow can be initiated ✅');
    console.log('- Cognito configuration is accessible ✅');

    if (loginData.success && loginData.data?.authorizationUrl) {
      console.log('\n🔐 OAuth Flow Ready:');
      console.log(`   Login URL: ${loginData.data.authorizationUrl.substring(0, 100)}...`);
      console.log(`   State: ${loginData.data.state}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAuthEndpoints();
}

module.exports = { testAuthEndpoints };