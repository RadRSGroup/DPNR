// EXACT implementation per PRD
import { Amplify } from 'aws-amplify';
import { signUp, signIn, signOut } from 'aws-amplify/auth';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID as string,
      userPoolClientId: process.env.NEXT_PUBLIC_CLIENT_ID as string,
    }
  }
});

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone?: string
) {
  // Derive a non-email username since pool uses email alias
  const base = email.includes('@') ? email.split('@')[0] : email;
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  const username = `${base}-${uniqueSuffix}`;

  const { userId } = await signUp({
    username,
    password,
    options: {
      userAttributes: {
        email,
        given_name: firstName,
        family_name: lastName,
        name: `${firstName} ${lastName}`,
        ...(phone ? { phone_number: phone } : {})
      }
    }
  });

  await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cognitoId: userId, email, firstName, lastName, phone })
  });

  return userId;
}

export async function login(email: string, password: string) {
  const { isSignedIn, nextStep } = await signIn({ username: email, password });
  return { isSignedIn, nextStep };
}

export async function logout() {
  await signOut();
}
