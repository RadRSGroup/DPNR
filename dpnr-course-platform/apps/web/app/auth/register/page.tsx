"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { register as amplifyRegister } from "../../../lib/auth";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!consent) {
      setError("Please provide explicit consent to proceed.");
      return;
    }
    try {
      setLoading(true);
      // Basic E.164 validation; pool requires phone_number
      const normalized = phone.trim();
      const e164 = normalized.startsWith("+") ? normalized : `+${normalized}`;
      const valid = /^\+[1-9]\d{7,14}$/.test(e164);
      if (!valid) {
        setPhoneError("Enter phone in E.164 format, e.g. +15551234567");
        return;
      }
      setPhoneError(null);
      await amplifyRegister(email, password, firstName, lastName, e164);
      setMessage("Registration successful. Please verify your email, then log in.");
      setTimeout(() => router.push("/auth/login"), 1200);
    } catch (err: any) {
      setError(err?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Register</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1 block">First name</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <Label className="mb-1 block">Last name</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
        <div>
          <Label className="mb-1 block">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label className="mb-1 block">Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <Label className="mb-1 block">Phone (required)</Label>
          <Input
            type="tel"
            placeholder="+15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {phoneError && <p className="text-red-600 text-xs mt-1">{phoneError}</p>}
        </div>
        <div className="flex items-start gap-2 text-sm">
          <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-1" />
          <Label htmlFor="consent" className="cursor-pointer">
            I consent to processing my data according to the privacy policy and GDPR terms.
          </Label>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {message && <p className="text-green-700 text-sm">{message}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-sm">Already have an account? <a href="/auth/login" className="text-violet-700 underline">Login</a></p>
    </main>
  );
}
