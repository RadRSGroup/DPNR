// EXACT implementation to be used once Amplify is installed
// Copied from PRD
import { Amplify } from 'aws-amplify';
// @ts-ignore
import { signUp, signIn, signOut } from 'aws-amplify/auth';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
      userPoolClientId: process.env.NEXT_PUBLIC_CLIENT_ID,
    }
  }
});

export async function register(email: string, password: string, firstName: string, lastName: string) {
  const { userId } = await signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        given_name: firstName,
        family_name: lastName
      }
    }
  });
  await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ cognitoId: userId, email, firstName, lastName })
  });
  return userId;
}

export async function login(email: string, password: string) {
  const { isSignedIn } = await signIn({ username: email, password });
  return isSignedIn;
}

export async function logout() {
  await signOut();
}

