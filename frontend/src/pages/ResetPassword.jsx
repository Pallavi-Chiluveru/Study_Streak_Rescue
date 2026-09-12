import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/authContext.js';
import { useToast } from '../context/ToastContext';
import BrandLogo from '../components/ui/BrandLogo';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function ResetPassword() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState({ password: false, confirmation: false });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(() => /^[a-f0-9]{64}$/.test(token) ? 'ready' : 'invalid');
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    // Retain only in component memory; remove the secret from the address bar/history entry.
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => navigate('/login', { replace: true }), 4000);
    return () => clearTimeout(timer);
  }, [status, navigate]);
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setError('Use at least 8 characters and no more than 72 UTF-8 bytes.'); return;
    }
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setError(''); setBusy(true);
    try {
      await API.post('/auth/reset-password', { token, newPassword: password, confirmPassword: confirmation });
      setPassword(''); setConfirmation(''); logout(); setStatus('success');
      addToast('Password changed successfully.', 'success');
    } catch (failure) {
      const code = failure.response?.data?.code;
      if (code === 'EXPIRED_TOKEN') setStatus('expired');
      else if (code === 'INVALID_TOKEN') setStatus('invalid');
      else setError(failure.response?.data?.message || 'Unable to update password. Please try again.');
    } finally { setBusy(false); }
  };
  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-orange-400';
  return <div className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div className="absolute right-5 top-5"><ThemeToggle /></div>
    <main className="mx-auto flex w-full max-w-md flex-col items-center">
      <BrandLogo className="mb-6" />
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {status === 'ready' ? <>
          <h1 className="text-2xl font-bold">Create a New Password</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Choose a strong password for your account.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {[
              { id: 'password', label: 'New Password', value: password, update: setPassword },
              { id: 'confirmation', label: 'Confirm Password', value: confirmation, update: setConfirmation }
            ].map(field => <div key={field.id}>
              <label htmlFor={field.id} className="mb-1.5 block text-sm font-semibold">{field.label}</label>
              <div className="relative">
                <input id={field.id} type={visible[field.id] ? 'text' : 'password'} autoComplete="new-password" required minLength={8}
                  value={field.value} onChange={event => field.update(event.target.value)} disabled={busy} aria-describedby="password-guidance password-error"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-12 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-950" />
                <button type="button" aria-label={`${visible[field.id] ? 'Hide' : 'Show'} ${field.label.toLowerCase()}`} aria-pressed={visible[field.id]}
                  onClick={() => setVisible(current => ({ ...current, [field.id]: !current[field.id] }))}
                  className="absolute right-1 top-0.5 rounded-lg p-2.5 focus-visible:ring-2 focus-visible:ring-orange-500">
                  {visible[field.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>)}
            <div id="password-guidance" className="text-xs leading-6 text-slate-600 dark:text-slate-400">
              <p>{password.length >= 8 ? '\u2713' : '\u25cb'} At least 8 characters (maximum 72 UTF-8 bytes)</p>
              <p>{/[a-z]/.test(password) && /[A-Z]/.test(password) ? '\u2713' : '\u25cb'} Uppercase and lowercase recommended</p>
              <p>{/\d/.test(password) ? '\u2713' : '\u25cb'} A number recommended</p>
            </div>
            <p id="password-error" role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button type="submit" disabled={busy} className={buttonClass}><LockKeyhole className="h-4 w-4" />{busy ? 'Updating...' : 'Update Password'}</button>
          </form>
        </> : status === 'success' ? <div role="status">
          <h1 className="text-2xl font-bold">Password Reset Successfully</h1>
          <p className="my-4 text-sm">Your password has been updated securely. Please sign in again.</p>
          <Link to="/login" replace className={buttonClass}>Go to Login</Link>
        </div> : <div role="alert">
          <h1 className="text-2xl font-bold">{status === 'expired' ? 'Reset Link Expired' : 'Invalid Reset Link'}</h1>
          <p className="my-4 text-sm">{status === 'expired' ? 'This password-reset link is no longer valid.' : 'This password-reset link is invalid or has already been used.'}</p>
          <Link to="/forgot-password" className={buttonClass}>Request New Link</Link>
        </div>}
      </div>
    </main>
  </div>;
}
