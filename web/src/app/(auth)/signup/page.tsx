"use client";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // create profile row with default client role
    const userId = data.user?.id;
    if (userId) {
      const { error: profileErr } = await supabase.from('profiles').insert({ id: userId, email, full_name: fullName, role: 'client' });
      if (profileErr) {
        setError(profileErr.message);
      }
    }
    setLoading(false);
    router.push("/");
  }

  async function onGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign up</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={loading} className="w-full bg-black text-white py-2 rounded">{loading?"Loading...":"Create account"}</button>
      </form>
      <button onClick={onGoogle} className="mt-3 w-full border py-2 rounded">Continue with Google</button>
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </div>
  );
}




