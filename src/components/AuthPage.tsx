import { useState } from 'react';
import { ArrowLeft, Mail, Lock, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthPage({ onBack }: { onBack: () => void }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (mode === 'forgot') {
      const { error: err } = await resetPassword(email);
      setSubmitting(false);
      if (err) { setError(err); return; }
      setSuccess('Password reset instructions have been sent to your email.');
      return;
    }

    if (mode === 'signup') {
      const { error: err } = await signUp(email, password);
      setSubmitting(false);
      if (err) { setError(err); return; }
      setSuccess('Account created. You are now signed in.');
      return;
    }

    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) setError(err);
  };

  const titles: Record<Mode, string> = {
    login: 'Welcome back',
    signup: 'Create your account',
    forgot: 'Reset your password',
  };

  const subtitles: Record<Mode, string> = {
    login: 'Sign in to manage your invoices and follow-ups.',
    signup: 'Start your 7-day free trial. No credit card required.',
    forgot: 'Enter your email and we will send you reset instructions.',
  };

  const buttonLabels: Record<Mode, string> = {
    login: 'Sign in',
    signup: 'Create account',
    forgot: 'Send reset instructions',
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-md items-center px-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm">
              <Sparkles className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titles[mode]}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{subtitles[mode]}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@agency.com"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </label>

              {mode !== 'forgot' && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Please wait…' : buttonLabels[mode]}
              </button>
            </form>

            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-center text-sm">
              {mode === 'login' && (
                <>
                  <p className="text-slate-500">
                    No account?{' '}
                    <button onClick={() => { setMode('signup'); setError(null); setSuccess(null); }} className="font-medium text-blue-700 hover:text-blue-800">
                      Sign up free
                    </button>
                  </p>
                  <p>
                    <button onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }} className="text-slate-500 hover:text-slate-700">
                      Forgot password?
                    </button>
                  </p>
                </>
              )}
              {mode === 'signup' && (
                <p className="text-slate-500">
                  Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(null); setSuccess(null); }} className="font-medium text-blue-700 hover:text-blue-800">
                    Sign in
                  </button>
                </p>
              )}
              {mode === 'forgot' && (
                <p className="text-slate-500">
                  <button onClick={() => { setMode('login'); setError(null); setSuccess(null); }} className="font-medium text-blue-700 hover:text-blue-800">
                    Back to sign in
                  </button>
                </p>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            CollectPilot AI — Stop chasing invoices. Get paid faster.
          </p>
        </div>
      </div>
    </div>
  );
}
