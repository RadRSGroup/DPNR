"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, fetchAuthSession, getCurrentUser, resendSignUpCode, resetPassword } from "aws-amplify/auth";
// Ensure Amplify is configured for this client route
import "../../../lib/auth";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  async function establishServerSession() {
    const { userId } = await getCurrentUser();
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) throw new Error("Missing ID token");
    const resp = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, email, cognitoId: userId }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data?.error ?? "Login session setup failed");
    }
    router.push("/dashboard");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      if (!isSignedIn) {
        setError(`Additional step required: ${nextStep?.signInStep ?? "unknown"}`);
        setLoading(false);
        return;
      }
      await establishServerSession();
    } catch (err: any) {
      const code = err?.name || err?.code;
      if (code === 'UserNotConfirmedException') {
        setError('Email not verified. Check inbox for verification email.');
      } else if (code === 'NotAuthorizedException') {
        setError('Incorrect username or password.');
      } else if (code === 'UserAlreadyAuthenticatedException' || /already\s+a\s+signed\s+in\s+user/i.test(err?.message || '')) {
        // If Amplify says a user is already signed in, reuse that session to establish server session
        try {
          await establishServerSession();
          return;
        } catch (e: any) {
          setError(e?.message ?? 'Could not reuse existing session');
        }
      } else {
        setError(err?.message ?? 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null); setActionMsg(null);
    try {
      await resendSignUpCode({ username: email });
      setActionMsg('Verification code sent. Check your email.');
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend code');
    }
  }

  async function onReset() {
    setError(null); setActionMsg(null);
    try {
      await resetPassword({ username: email });
      setActionMsg('Password reset initiated. Check your email for code.');
    } catch (e: any) {
      setError(e?.message ?? 'Could not initiate password reset');
    }
  }

  async function onForceSignOut() {
    try {
      await signOut();
      setActionMsg('Signed out locally. Please sign in again.');
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Could not sign out');
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label className="mb-1 block">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label className="mb-1 block">Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {actionMsg && <p className="text-green-700 text-sm">{actionMsg}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
      <div className="mt-3 flex gap-3 text-sm">
        <button onClick={onResend} className="text-violet-700 underline">Resend verification</button>
        <button onClick={onReset} className="text-violet-700 underline">Forgot password?</button>
        <button onClick={onForceSignOut} className="text-violet-700 underline">Sign out locally</button>
      </div>
      <p className="mt-4 text-sm">
        Don&apos;t have an account? <a href="/auth/register" className="text-violet-700 underline">Register</a>
      </p>
    </main>
  );
}
