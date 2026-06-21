import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { storeToken, storeUser, type AuthResponse } from '../../utils/auth';
import { getApiBaseUrl } from '../../config/env';
import AuthScreen from './AuthScreen';

const apiBaseUrl = getApiBaseUrl();

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    try {
      const response = await axios.post<AuthResponse>(`${apiBaseUrl}/auth/register`, {
        name: trimmedName,
        email: trimmedEmail,
        password
      });

      const { token, user } = response.data;
      storeToken(token);
      storeUser(user);
      navigate('/dashboard');
    } catch (error: any) {
      // If account already exists, try seamless login with same credentials.
      if (error?.response?.status === 409) {
        try {
          const loginResponse = await axios.post<AuthResponse>(`${apiBaseUrl}/auth/login`, {
            email: trimmedEmail,
            password
          });

          const { token, user } = loginResponse.data;
          storeToken(token);
          storeUser(user);
          navigate('/dashboard');
          return;
        } catch {
          setErrorMessage('Account already exists. Please log in with your password.');
          return;
        }
      }

      setErrorMessage(error?.response?.data?.error || 'Unable to create your account right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen
      mode="signup"
      title="Create your account"
      subtitle="Start building with Yukti AI"
      submitLabel="Create account"
      switchText="Already have an account?"
      switchLabel="Log in"
      switchTo="/login"
      isLoading={isLoading}
      errorMessage={errorMessage}
      email={email}
      password={password}
      name={name}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onNameChange={setName}
      onSubmit={handleSubmit}
    />
  );
}
