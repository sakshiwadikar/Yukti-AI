import { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Code, 
  PenTool, 
  Lightbulb, 
  Puzzle,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRecentActivities, type RecentActivityRecord } from '../../services/activity';
import { getUser } from '../../utils/auth';

const quickActions = [
  { 
    title: 'Start Chat', 
    description: 'Conversational AI with multiple models', 
    icon: MessageSquare, 
    path: '/chat',
    color: 'from-blue-500 to-cyan-400'
  },
  { 
    title: 'Create Image', 
    description: 'Generate stunning visuals from text', 
    icon: ImageIcon, 
    path: '/images',
    color: 'from-purple-500 to-pink-500'
  },
  { 
    title: 'Write Code', 
    description: 'Generate, debug, or explain code', 
    icon: Code, 
    path: '/code',
    color: 'from-emerald-500 to-teal-400'
  },
  { 
    title: 'Help Me Write', 
    description: 'Draft articles, emails, or essays', 
    icon: PenTool, 
    path: '/writing',
    color: 'from-orange-500 to-yellow-400'
  },
  { 
    title: 'Brainstorm', 
    description: 'Generate ideas based on constraints', 
    icon: Lightbulb, 
    path: '/brainstorm',
    color: 'from-indigo-500 to-blue-500'
  },
  { 
    title: 'Solve Problem', 
    description: 'Step-by-step reasoning & solutions', 
    icon: Puzzle, 
    path: '/solve',
    color: 'from-rose-500 to-red-400'
  },
];

const MODULE_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; path: string }> = {
  chat: { label: 'Chat AI', icon: MessageSquare, path: '/chat' },
  image: { label: 'Image Gen', icon: ImageIcon, path: '/images' },
  brainstorm: { label: 'Brainstorm', icon: Lightbulb, path: '/brainstorm' },
  code: { label: 'Code Assistant', icon: Code, path: '/code' },
  writing: { label: 'Writing', icon: PenTool, path: '/writing' },
};

const formatRelativeTime = (timestamp: string): string => {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(timestamp).toLocaleDateString();
};

const defaultActivities = [
  { title: 'React Performance Optimization', type: 'Chat AI', time: '2 mins ago', icon: MessageSquare, path: '/chat' },
  { title: 'Cyberpunk Cityscape Concept', type: 'Image Gen', time: '1 hour ago', icon: ImageIcon, path: '/images' },
  { title: 'API Authentication Flow', type: 'Code Assistant', time: '3 hours ago', icon: Code, path: '/code' },
  { title: 'Marketing Email Draft', type: 'Writing', time: 'Yesterday', icon: PenTool, path: '/writing' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<RecentActivityRecord[]>([]);

  useEffect(() => {
    const user = getUser();
    if (!user?.id) return;

    const loadActivities = async () => {
      try {
        const data = await getRecentActivities();
        setActivities(data);
      } catch (error) {
        console.error('Failed to load recent activities:', error);
      }
    };

    void loadActivities();
  }, []);

  return (
    <div className="space-y-8 pb-10 depth-section rounded-[28px] p-4 sm:p-6">
      <div className="floating-orb -top-8 left-[10%] h-52 w-52 bg-[rgba(120,120,255,0.35)]" />
      <div className="floating-orb top-[42%] right-[2%] h-44 w-44 bg-[rgba(255,120,255,0.25)]" />
      <div className="depth-highlight" />
      
      {/* Welcome Section */}
      <section className="glass-hero depth-content relative overflow-hidden p-8 sm:p-10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-sm font-medium text-gray-200 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Welcome back to Yukti AI</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            What will we <span className="heading-metal">create today?</span>
          </h1>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl leading-relaxed">
            Harness the power of multiple AI models in one unified platform. Choose an action below or jump right back into your recent projects.
          </p>
          <button onClick={() => navigate('/chat')} className="metal-button text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 group">
            <Zap className="w-5 h-5 text-primary" />
            Quick Start
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Grid of Tools */}
      <section className="depth-content">
        <h2 className="text-xl font-bold heading-metal mb-4">AI Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div 
                key={action.title}
                onClick={() => navigate(action.path)}
                className="glass-card group relative cursor-pointer overflow-hidden p-6"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${action.color}`} />
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} bg-opacity-10 backdrop-blur-sm shadow-inner`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-white/10 transition-colors">
                    <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 relative z-10">{action.title}</h3>
                <p className="text-sm text-gray-400 relative z-10">{action.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two Column Layout for Activity and Stats */}
      <div className="depth-content grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold heading-metal">Recent Activity</h2>
          <div className="glass-card overflow-hidden">
            <ul className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, index) => {
                const item = activities[index];
                
                if (item) {
                  const config = MODULE_CONFIG[item.module] || {
                    label: item.module,
                    icon: MessageSquare,
                    path: '/dashboard',
                  };
                  const Icon = config.icon;
                  return (
                    <li
                      key={item.id}
                      onClick={() => navigate(config.path)}
                      className="p-4 hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-4"
                    >
                      <div className="p-2 rounded-lg bg-black/30 border border-white/10 backdrop-blur-sm">
                        <Icon className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.activity}</p>
                        <p className="text-xs text-gray-500 truncate">{config.label}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </li>
                  );
                }

                // Fallback to exactly the original 4 items if not enough DB data
                const fallback = defaultActivities[index];
                const FallbackIcon = fallback.icon;
                return (
                  <li
                    key={`fallback-${index}`}
                    onClick={() => navigate(fallback.path)}
                    className="p-4 hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-4"
                  >
                    <div className="p-2 rounded-lg bg-black/30 border border-white/10 backdrop-blur-sm">
                      <FallbackIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{fallback.title}</p>
                      <p className="text-xs text-gray-500 truncate">{fallback.type}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {fallback.time}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Analytics / Usage Panel */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold heading-metal">Usage & Plan</h2>
          <div className="glass-card p-6 relative overflow-hidden flex flex-col gap-6">
             <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 blur-2xl rounded-full" />
             
             <div>
               <div className="flex justify-between items-end mb-2">
                 <h3 className="text-sm font-medium text-gray-400">Current Plan</h3>
                 <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/20 text-primary">PRO</span>
               </div>
               <p className="text-2xl font-bold text-white">$29<span className="text-sm font-normal text-gray-400">/mo</span></p>
             </div>

             <div className="space-y-4">
               <div>
                 <div className="flex justify-between text-sm mb-1 text-gray-300">
                   <span>GPT-4 Tokens</span>
                   <span>45k / 100k</span>
                 </div>
                 <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                   <div className="bg-gradient-to-r from-blue-500 to-cyan-400 w-[45%] h-full rounded-full" />
                 </div>
               </div>
               
               <div>
                 <div className="flex justify-between text-sm mb-1 text-gray-300">
                   <span>Image Generations</span>
                   <span>12 / 50</span>
                 </div>
                 <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                   <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-[24%] h-full rounded-full" />
                 </div>
               </div>
             </div>

             <button className="metal-button w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors mt-2">
               Manage Subscription
             </button>
          </div>
        </section>

      </div>
    </div>
  );
}

