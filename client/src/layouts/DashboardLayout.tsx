import { useEffect, useRef, useState } from 'react';
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
  Moon,
  CreditCard,
  Zap,
  Activity,
  Clock,
  TrendingUp,
  CheckCircle
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
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const { theme, toggleTheme } = useTheme();

  // Close notification panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };

    if (notificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationOpen]);

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
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="metal-button rounded-full p-2 text-gray-200 hover:text-white relative transition-colors"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                </button>

                {/* Notification & Account Panel */}
                {notificationOpen && (
                  <div className="notification-panel absolute right-0 top-full mt-3 w-80 sm:w-96 glass-card rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50">
                    {/* Panel Header */}
                    <div className="px-5 py-4 border-b border-white/10 bg-black/30">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Account Overview</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{user?.email || 'user@example.com'}</p>
                    </div>

                    <div className="px-5 py-4 space-y-4">
                      {/* Current Plan */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          <span className="text-sm text-gray-300">Current Plan</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-primary/20 text-primary">PRO</span>
                      </div>

                      {/* Subscription Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-gray-300">Subscription</span>
                        </div>
                        <span className="text-xs text-emerald-400 font-semibold">Active</span>
                      </div>

                      {/* Remaining Credits */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-gray-300">Remaining Credits</span>
                        </div>
                        <span className="text-sm text-white font-semibold">247</span>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-white/10" />

                      {/* Tokens Used */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-gray-300">Tokens Used</span>
                          </div>
                          <span className="text-xs text-gray-400">45,200 / 100,000</span>
                        </div>
                        <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all" style={{ width: '45%' }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-gray-400">45.2% used</span>
                          <span className="text-[10px] text-gray-400">54,800 remaining</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-white/10" />

                      {/* Daily & Monthly Usage */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Daily</span>
                          </div>
                          <p className="text-lg font-bold text-white">1,240</p>
                          <p className="text-[10px] text-gray-400">tokens today</p>
                        </div>
                        <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Monthly</span>
                          </div>
                          <p className="text-lg font-bold text-white">45,200</p>
                          <p className="text-[10px] text-gray-400">tokens this month</p>
                        </div>
                      </div>

                      {/* Last Activity */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-300">Last Activity</span>
                        </div>
                        <span className="text-xs text-gray-400">Just now</span>
                      </div>
                    </div>

                    {/* Panel Footer */}
                    <div className="px-5 py-3 border-t border-white/10 bg-black/30">
                      <button
                        onClick={() => { setNotificationOpen(false); navigate('/dashboard'); }}
                        className="metal-button w-full py-2 rounded-xl text-xs font-semibold text-white transition-colors"
                      >
                        Manage Subscription
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
