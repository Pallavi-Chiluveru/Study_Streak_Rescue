import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../context/authContext.js';
import { useToast } from '../../context/ToastContext';
import { maskEmail } from '../../utils/emailMask';

export default function SecuritySettings() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const send = async () => {
    if (sending || remaining) return;
    setSending(true);
    try {
      await API.post('/auth/request-password-change');
      setSent(true);
      setNow(Date.now());
      setRetryAt(Date.now() + 60000);
      addToast('Password-change link sent.', 'success');
    } catch (error) {
      if (error.response?.status === 429) {
        const seconds = Number(error.response.headers?.['retry-after']) || 60;
        setNow(Date.now());
        setRetryAt(Date.now() + seconds * 1000);
      }
      addToast(error.response?.data?.message || 'Unable to send email. Please try again.', 'error');
    } finally { setSending(false); }
  };
  return <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p className="font-semibold text-slate-800 dark:text-slate-200">Change Password</p>
      <p className="text-sm text-slate-600 dark:text-slate-400">We'll send a secure password-change link to your registered email.</p>
      {sent && <div role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
        <p className="font-semibold">Password-change link sent</p>
        <p>Check your registered email: {maskEmail(user?.email)}</p>
        <p>The link expires in 15 minutes.</p>
      </div>}
    </div>
    <button type="button" onClick={send} disabled={sending || remaining > 0}
      className="inline-flex items-center gap-2 rounded-xl border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/10">
      <KeyRound className="h-4 w-4" aria-hidden="true" />
      {sending ? 'Sending...' : remaining ? `Resend link in ${remaining}s` : sent ? 'Resend Link' : 'Send Change Link'}
    </button>
  </div>;
}
