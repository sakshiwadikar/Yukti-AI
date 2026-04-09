import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { storeToken, storeUser, type AuthResponse } from '../../utils/auth';
import AuthScreen from './AuthScreen';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.post<AuthResponse>(`${apiBaseUrl}/auth/login`, { email, password });
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
