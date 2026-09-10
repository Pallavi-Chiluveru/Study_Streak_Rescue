import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ElectricButton from '../components/ui/ElectricButton';
import LightningBackground from '../components/ui/LightningBackground';
import ThemeToggle from '../components/ui/ThemeToggle';
import BrandLogo from '../components/ui/BrandLogo';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'warning');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      addToast('Welcome back! ⚡', 'success');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      addToast(error.response?.data?.message || 'Invalid email or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-16 text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300">
      <LightningBackground intensity="medium" />
      <div className="absolute top-5 right-5 z-20"><ThemeToggle /></div>

      <div className="relative z-10 flex w-full max-w-[520px] flex-col items-center">
        <BrandLogo className="mb-6" />
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl sm:p-9">
          <h2 className="text-2xl font-extrabold text-white mb-1">Welcome Back</h2>
          <p className="text-xs text-slate-400 mb-6">Enter your credentials to access your dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <ElectricButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
              className="mt-6"
            >
              {loading ? 'Signing In...' : 'Log In ⚡'}
            </ElectricButton>
          </form>

          <p className="text-xs text-center text-slate-400 mt-6">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-orange-400 font-semibold hover:underline">
              Register Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
