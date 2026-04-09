import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Image as ImageIcon, 
  Code, 
  PenTool, 
  Lightbulb, 
  Puzzle, 
  LogOut,
  Bell,
  Search,
  Menu,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '../utils/theme';
import { useTheme } from '../hooks/useTheme';
import { getUser, clearAuth } from '../utils/auth';
const SIDEBAR_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Chat AI', path: '/chat', icon: MessageSquare },
  { name: 'Image Gen', path: '/images', icon: ImageIcon },
  { name: 'Code Assistant', path: '/code', icon: Code },
  { name: 'Writing', path: '/writing', icon: PenTool },
  { name: 'Brainstorm', path: '/brainstorm', icon: Lightbulb },
  { name: 'Solver', path: '/solve', icon: Puzzle },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="depth-section flex h-screen overflow-hidden bg-transparent">
      <div className="floating-orb left-[8%] top-[10%] h-52 w-52 bg-[rgba(120,120,255,0.35)]" />
      <div className="floating-orb right-[10%] top-[55%] h-64 w-64 bg-[rgba(255,120,255,0.25)]" />
      <div className="depth-highlight" />
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col glass-sidebar",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-white font-bold text-lg leading-none">Y</span>
            </div>
            <span className="text-xl font-bold heading-metal">Yukti AI</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <div className="mb-4 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Menu
          </div>
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={cn(
                  "glass-sidebar-item group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden",
                  isActive 
                    ? "text-white bg-white/10 border border-white/15" 
                    : "text-gray-300 hover:text-white"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary rounded-r-md" />
                )}
                <Icon className={cn(
                  "mr-3 h-5 w-5 transition-transform duration-200", 
                  isActive ? "text-primary" : "group-hover:scale-110 group-hover:text-gray-300"
                )} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto space-y-4">
          <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 blur-2xl rounded-full" />
            <h4 className="font-semibold text-white mb-1">PRO Plan</h4>
            <div className="w-full bg-black/40 h-1.5 rounded-full mb-2 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-secondary w-[65%] h-full rounded-full" />
            </div>
            <p className="text-xs text-gray-400">65% of monthly tokens used</p>
          </div>
          
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gray-700/50 flex-shrink-0 border border-white/15 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Yukti" alt="User" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="metal-button w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-100 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="depth-content flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[rgba(10,12,20,0.4)] backdrop-blur-2xl sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            title="Open sidebar"
            className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors metal-button rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 flex justify-end lg:justify-between items-center">
            <div className="hidden lg:flex items-center max-w-md w-full ml-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search prompts, files, history..." 
                  className="glass-input w-full rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4 ml-4">
              <button
                onClick={toggleTheme}
                className="metal-button rounded-full p-2 text-gray-200 hover:text-white relative transition-colors"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                className="metal-button rounded-full p-2 text-gray-200 hover:text-white relative transition-colors"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
