import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle } from 'lucide-react';
import API from '../services/api';
import BrandLogo from '../components/ui/BrandLogo';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  const submit = async event => {
    event.preventDefault();
    if (busy || remaining) return;
    const normalized = email.trim().toLowerCase();
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Please enter a valid email address.'); return;
    }
    setError(''); setBusy(true);
    try {
      await API.post('/auth/forgot-password', { email: normalized });
      setSent(true); setRemaining(60);
    } catch (failure) {
      const retry = Number(failure.response?.headers?.['retry-after']);
      if (failure.response?.status === 429 && retry > 0) setRemaining(Math.ceil(retry));
      setError(failure.response?.data?.message || 'Unable to send reset email right now. Please try again later.');
    } finally { setBusy(false); }
  };
  const buttonClass = 'w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-orange-400';
  return <div className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div className="absolute right-5 top-5"><ThemeToggle /></div>
    <main className="mx-auto flex w-full max-w-md flex-col items-center">
      <BrandLogo className="mb-6" />
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {sent ? <div role="status">
          <CheckCircle className="mb-3 h-8 w-8 text-orange-500" />
          <h1 className="text-2xl font-bold">Check Your Email</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">If an account exists for this email, a password reset link has been sent.</p>
          <p className="mt-2 text-sm">The link expires in 15 minutes.</p>
        </div> : <>
          <h1 className="text-2xl font-bold">Forgot Your Password?</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Enter the email address registered with your account. We'll send you a secure password-reset link.</p>
        </>}
        <form noValidate onSubmit={submit} className="mt-6 space-y-4">
          {!sent && <div>
            <label htmlFor="reset-email" className="mb-1.5 block text-sm font-semibold">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input id="reset-email" type="email" autoComplete="email" required maxLength={254} placeholder="your@email.com"
                value={email} onChange={event => setEmail(event.target.value)} disabled={busy} aria-invalid={!!error} aria-describedby="email-error"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-950" />
            </div>
          </div>}
          <p id="email-error" role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
          {sent && <p className="text-sm">Didn't receive it? Check spam or resend below.</p>}
          <button type="submit" disabled={busy || remaining > 0} className={buttonClass}>
            {busy ? 'Sending...' : remaining ? `Resend available in ${remaining}s` : sent ? 'Resend Link' : 'Send Reset Link'}
          </button>
        </form>
        <Link to="/login" className="mt-5 block text-center text-sm font-semibold text-orange-600 hover:underline dark:text-orange-400">Back to Login</Link>
      </div>
    </main>
  </div>;
}
