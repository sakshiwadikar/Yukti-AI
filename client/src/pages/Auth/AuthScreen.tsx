import type { FormEvent, ReactNode } from 'react';
import { ArrowRight, Github, Lock, Mail, Sparkles, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/theme';

interface AuthScreenProps {
  mode: 'login' | 'signup';
  title: string;
  subtitle: string;
  submitLabel: string;
  switchText: string;
  switchLabel: string;
  switchTo: string;
  children?: ReactNode;
  isLoading: boolean;
  errorMessage: string | null;
  email: string;
  password: string;
  name?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNameChange?: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const socialButtonClassName =
  'metal-button w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-colors gap-2';

export default function AuthScreen({
  mode,
  title,
  subtitle,
  submitLabel,
  switchText,
  switchLabel,
  switchTo,
  children,
  isLoading,
  errorMessage,
  email,
  password,
  name,
  onEmailChange,
  onPasswordChange,
  onNameChange,
  onSubmit
}: AuthScreenProps) {
  return (
    <div className="depth-section min-h-screen flex flex-col justify-center relative overflow-hidden px-4 py-10">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="floating-orb -top-[25%] -left-[10%] w-[50%] h-[50%] bg-[rgba(120,120,255,0.35)]" />
        <div className="floating-orb top-[60%] -right-[10%] w-[40%] h-[60%] bg-[rgba(255,120,255,0.25)]" />
      </div>
      <div className="depth-highlight" />

      <div className="depth-content relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl metal-button flex items-center justify-center shadow-2xl overflow-hidden relative">
              <Sparkles className="absolute w-full h-full opacity-20 text-white" />
              <span className="text-white font-bold text-2xl relative z-10">Y</span>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold heading-metal tracking-tight">{title}</h2>
          <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
          <p className="mt-2 text-sm text-gray-400">
            {switchText}{' '}
            <Link to={switchTo} className="font-medium text-primary hover:text-primary/80 transition-colors">
              {switchLabel}
            </Link>
          </p>
        </div>

        <div className="glass-hero py-8 px-4 sm:rounded-3xl sm:px-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <form className="space-y-5 relative z-10" onSubmit={onSubmit}>
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-300">Full name</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => onNameChange?.(event.target.value)}
                    className="glass-input block w-full pl-10 rounded-xl py-3 sm:text-sm transition-all focus:outline-none"
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300">Email address</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  className="glass-input block w-full pl-10 rounded-xl py-3 sm:text-sm transition-all focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  className="glass-input block w-full pl-10 rounded-xl py-3 sm:text-sm transition-all focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {children}

            {errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'metal-button w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white focus:outline-none transition-all group/btn',
                isLoading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isLoading ? 'Please wait...' : submitLabel}
              <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" className={socialButtonClassName}>
                <Github className="h-5 w-5" />
                GitHub
              </button>
              <button type="button" className={socialButtonClassName}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
