import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/Chat';
import ImageGenPage from './pages/ImageGen';
import CodePage from './pages/Code/index';
import SolverPage from './pages/Solver.jsx';
import WritingAssistantPage from './pages/WritingAssistant.jsx';
import BrainstormPage from './pages/Brainstorm';
import LoginPage from './pages/Auth/Login';
import SignupPage from './pages/Auth/Signup';

const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/images" element={<ImageGenPage />} />
          <Route path="/code" element={<CodePage />} />
          <Route path="/solve" element={<SolverPage />} />
          <Route path="/writing" element={<WritingAssistantPage />} />
          <Route path="/brainstorm" element={<BrainstormPage />} />
          {/* Add more routes here */}
        </Route>
        
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
