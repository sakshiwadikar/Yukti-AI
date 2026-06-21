import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { storeToken, storeUser, type AuthResponse } from '../../utils/auth';
import { getApiBaseUrl } from '../../config/env';
import AuthScreen from './AuthScreen';

const apiBaseUrl = getApiBaseUrl();

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const response = await axios.post<AuthResponse>(`${apiBaseUrl}/auth/login`, { email: trimmedEmail, password });
      const { token, user } = response.data;

      storeToken(token);
      storeUser(user);
      navigate('/dashboard');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || 'Unable to sign in right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen
      mode="login"
      title="Welcome back"
      subtitle="Sign in to continue"
      submitLabel="Sign in"
      switchText="Don't have an account?"
      switchLabel="Sign up"
      switchTo="/signup"
      isLoading={isLoading}
      errorMessage={errorMessage}
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  );
}
