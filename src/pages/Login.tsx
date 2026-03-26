import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { ClipboardCheck, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { APP_NAME, APP_DESCRIPTION } from '../constants';
import firebaseConfig from '../../firebase-applet-config.json';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Failed to login. Please check your credentials.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = `Email/Password sign-in is not enabled in Firebase Console for Project: ${firebaseConfig.projectId}. To fix this: Go to Firebase Console > Authentication > Sign-in method > Enable Email/Password.`;
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      }
      setError(msg);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }
    try {
      await resetPassword(email);
      toast.success('Password reset email sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-200">
            <ClipboardCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">{APP_NAME}</h1>
          <p className="text-gray-500 font-medium">{APP_DESCRIPTION}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 transition-all outline-none"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-12 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Login'}
          </button>
        </form>

        <p className="mt-10 text-center text-gray-500 text-sm">
          Don't have an account? <Link to="/register" className="text-red-600 font-bold hover:underline">Register Now</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
