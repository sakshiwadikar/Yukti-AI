import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  User,
  MoreVertical,
  Plus,
  MessageSquare,
  ChevronDown,
  Settings,
  Zap,
  FileText,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { cn } from '../../utils/theme';
import ChatInput from '../../components/chat/ChatInput';
import { getToken, getUser } from '../../utils/auth';
import { trackActivity } from '../../services/activity';
import { getApiBaseUrl } from '../../config/env';

const MOCK_CONVERSATIONS = [
  { id: '1', title: 'React Performance Tips', date: 'Today' },
  { id: '2', title: 'Cyberpunk Concept Art Ideas', date: 'Yesterday' },
  { id: '3', title: 'Node.js Authentication', date: 'Previous 7 Days' },
];

type MessageRole = 'assistant' | 'user';

interface MessageAttachment {
  id: string;
  kind: 'image' | 'document' | 'audio';
  name: string;
  url: string;
  mimeType: string;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: MessageAttachment[];
}

interface PersistedMessage {
  role: MessageRole;
  content: string;
}

interface ConversationThread {
  conversationId: string;
  userId: string;
  title: string;
  messages: PersistedMessage[];
  createdAt: string;
  updatedAt: string;
}

interface ChatInputPayload {
  message: string;
  attachments: Array<{
    id: string;
    file: File;
    kind: 'image' | 'document';
    name: string;
    previewUrl: string;
  }>;
  audioBlob: Blob | null;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I am Yukti AI, your conversational assistant powered by OpenAI. How can I help you today?',
  },
];

const getApiRootFromBase = (baseURL: string) => {
  if (!baseURL) {
    return 'http://localhost:5000';
  }
  return baseURL.replace(/\/api\/v1\/?$/, '');
};

const API_BASE_URL = getApiRootFromBase(getApiBaseUrl());

const toUiMessages = (messages: PersistedMessage[]): ChatMessage[] => {
  return messages.map((message, index) => ({
    id: `${index}-${Date.now()}`,
    role: message.role,
    content: message.content,
  }));
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('GPT-4 (Premium)');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationList, setConversationList] = useState<ConversationThread[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const pendingAssistantRef = useRef<{ conversationId: string; userId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const authenticatedUser = getUser();
  const loggedInUserId = authenticatedUser?.id || '';

  const visibleConversations = useMemo(() => {
    return conversationList.filter((conversation) => conversation.userId === loggedInUserId);
  }, [conversationList, loggedInUserId]);

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const upsertConversation = (conversation: ConversationThread) => {
    setConversationList((previous) => {
      const filtered = previous.filter((item) => item.conversationId !== conversation.conversationId);
      return [conversation, ...filtered].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });
  };

  const fetchConversations = async () => {
    const currentUser = getUser();
    if (!currentUser?.id) {
      setConversationList([]);
      return;
    }

    try {
      const response = await axios.get<ConversationThread[]>(
        `${API_BASE_URL}/api/conversations/user/${currentUser.id}`,
        {
          headers: authHeaders(),
        },
      );

      // Security filter: display only threads that belong to the logged-in user.
      const safeConversations = response.data.filter(
        (conversation) => conversation.userId === currentUser.id,
      );

      setConversationList(safeConversations);

      if (safeConversations.length > 0) {
        const firstConversation = safeConversations[0];
        setActiveConversationId(firstConversation.conversationId);
        setMessages(toUiMessages(firstConversation.messages));
      } else {
        setActiveConversationId(null);
        setMessages(INITIAL_MESSAGES);
      }
    } catch (error) {
      console.error('Failed to fetch conversations', error);
      setConversationList([]);
      setActiveConversationId(null);
      setMessages(INITIAL_MESSAGES);
    }
  };

  const persistAssistantMessage = async (assistantContent: string) => {
    const pending = pendingAssistantRef.current;
    if (!pending || !assistantContent.trim()) {
      pendingAssistantRef.current = null;
      return;
    }

    try {
      const response = await axios.post<ConversationThread>(
        `${API_BASE_URL}/api/conversations/update`,
        {
          conversationId: pending.conversationId,
          userId: pending.userId,
          message: {
            role: 'assistant',
            content: assistantContent,
          },
        },
        {
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
        },
      );

      upsertConversation(response.data);
    } catch (error) {
      console.error('Failed to persist assistant message', error);
    } finally {
      pendingAssistantRef.current = null;
    }
  };

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    void fetchConversations();
  }, []);

  useEffect(() => {
        // Initialize Socket connection
    const newSocket = io(API_BASE_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to chat streaming service:', newSocket.id);
    });

    newSocket.on('chat:stream', (token: string) => {
      setMessages((previous) => {
        const lastMessage = previous[previous.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          const updatedMessage = { ...lastMessage, content: lastMessage.content + token };
          return [...previous.slice(0, -1), updatedMessage];
        }
        return previous;
      });
    });

    newSocket.on('chat:end', (fullContent?: string) => {
      setIsTyping(false);
      if (fullContent) {
        void persistAssistantMessage(fullContent);
      } else {
        pendingAssistantRef.current = null;
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleSelectConversation = (conversation: ConversationThread) => {
    setActiveConversationId(conversation.conversationId);
    setMessages(toUiMessages(conversation.messages));
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages(INITIAL_MESSAGES);
    setInput('');
  };

  const handleSend = async ({ message, attachments, audioBlob }: ChatInputPayload) => {
    if (!socket?.id || isTyping) return;

    const currentUser = getUser();
    if (!currentUser?.id) {
      return;
    }

    const hasText = message.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    const hasAudio = Boolean(audioBlob);

    if (!hasText && !hasAttachments && !hasAudio) {
      return;
    }

    const messageAttachments: MessageAttachment[] = [
      ...attachments.map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.file.name,
        url: URL.createObjectURL(item.file),
        mimeType: item.file.type || 'application/octet-stream',
      })),
      ...(audioBlob
        ? [
            {
              id: `${Date.now()}-audio`,
              kind: 'audio' as const,
              name: 'voice-note.webm',
              url: URL.createObjectURL(audioBlob),
              mimeType: audioBlob.type || 'audio/webm',
            },
          ]
        : []),
    ];

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      attachments: messageAttachments,
    };
    setMessages((previous) => [...previous, userMessage]);

    const assistantPlaceholder: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };
    setMessages((previous) => [...previous, assistantPlaceholder]);

    let conversationId = activeConversationId;

    try {
      if (!conversationId) {
        const createResponse = await axios.post<ConversationThread>(
          `${API_BASE_URL}/api/conversations/create`,
          {
            userId: currentUser.id,
            message,
          },
          {
            headers: {
              ...authHeaders(),
              'Content-Type': 'application/json',
            },
          },
        );

        conversationId = createResponse.data.conversationId;
        setActiveConversationId(conversationId);
        upsertConversation(createResponse.data);
      } else {
        const updateResponse = await axios.post<ConversationThread>(
          `${API_BASE_URL}/api/conversations/update`,
          {
            conversationId,
            userId: currentUser.id,
            message: {
              role: 'user',
              content: message,
            },
          },
          {
            headers: {
              ...authHeaders(),
              'Content-Type': 'application/json',
            },
          },
        );

        upsertConversation(updateResponse.data);
      }

      pendingAssistantRef.current = {
        conversationId,
        userId: currentUser.id,
      };

      // Track this chat as the most recent activity for the dashboard
      void trackActivity('chat', message);

      setInput('');
      setIsTyping(true);

      if (hasAttachments || hasAudio) {
        const formData = new FormData();
        formData.append('message', message);
        formData.append('model', model);
        formData.append('socketId', socket.id);
        formData.append('userId', currentUser.id);
        formData.append('conversationId', conversationId);

        attachments.forEach((item) => {
          formData.append('attachments[]', item.file);
        });

        if (audioBlob) {
          formData.append('audioBlob', audioBlob, 'voice-note.webm');
        }

        await axios.post(`${API_BASE_URL}/api/chat/upload-message`, formData, {
          headers: authHeaders(),
        });
      } else {
        await axios.post(
          `${API_BASE_URL}/api/v1/chat/conversations/new/messages`,
          {
            message,
            model,
            socketId: socket.id,
            userId: currentUser.id,
            conversationId,
          },
          {
            headers: {
              ...authHeaders(),
              'Content-Type': 'application/json',
            },
          },
        );
      }
    } catch (error) {
      pendingAssistantRef.current = null;
      setIsTyping(false);
      setMessages((previous) => {
        const lastMessage = previous[previous.length - 1];
        if (!lastMessage) {
          return previous;
        }

        return [...previous.slice(0, -1), { ...lastMessage, content: '\n[Error connecting to AI Provider]' }];
      });
    }
  };

  return (
    <div className="depth-section glass-card flex h-[calc(100vh-8rem)] overflow-hidden relative">
      <div className="floating-orb top-1/4 left-1/4 w-96 h-96 bg-primary/20" />
      <div className="depth-highlight" />

      <div className="w-64 border-r border-white/10 bg-black/20 hidden md:flex flex-col relative z-10 backdrop-blur-2xl">
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="metal-button w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {visibleConversations.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-3 space-y-4 pb-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">Recent Conversations</p>
              {visibleConversations.map((conversation) => (
                <button
                  key={conversation.conversationId}
                  type="button"
                  onClick={() => handleSelectConversation(conversation)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors group text-left mb-1',
                    activeConversationId === conversation.conversationId
                      ? 'bg-primary/20 text-white border border-primary/40'
                      : 'text-gray-300 hover:bg-white/10',
                  )}
                  title={conversation.title}
                >
                  <MessageSquare className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                  <span className="truncate flex-1">{conversation.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">Suggestions</p>
              {MOCK_CONVERSATIONS.slice(0, 1).map((conversation) => (
                <button
                  key={conversation.id}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors group text-left"
                >
                  <MessageSquare className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                  <span className="truncate flex-1">{conversation.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 text-gray-400 hover:text-white cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Chat Settings</span>
          </div>
        </div>
      </div>

      <div className="depth-content flex-1 flex flex-col relative z-10 bg-gradient-to-br from-transparent to-background/20">
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[rgba(12,14,24,0.45)] backdrop-blur-2xl">
          <div className="group relative cursor-pointer flex items-center gap-2 glass-input px-3 py-1.5 rounded-lg transition-colors z-50">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white">{model}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />

            <div className="absolute top-full left-0 mt-2 w-48 glass-card rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {['GPT-4 (Premium)', 'GPT-3.5 Turbo', 'Claude 3 Opus', 'Gemini Ultra'].map((selectedModel) => (
                <div
                  key={selectedModel}
                  onClick={() => setModel(selectedModel)}
                  className={cn(
                    'px-4 py-2 text-sm cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors',
                    model === selectedModel ? 'bg-primary/10 text-primary' : 'text-gray-300',
                  )}
                >
                  {selectedModel}
                </div>
              ))}
            </div>
          </div>

          <button
            className="metal-button rounded-lg p-1.5 text-gray-300 hover:text-white"
            aria-label="Chat options"
            title="Chat options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-4 max-w-3xl mx-auto w-full',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg',
                  message.role === 'user' ? 'bg-gradient-to-br from-primary to-secondary' : 'glass-card',
                )}
              >
                {message.role === 'user' ? (
                  <User className="w-6 h-6 text-white" />
                ) : (
                  <Bot className="w-6 h-6 text-primary" />
                )}
              </div>

              <div
                className={cn(
                  'px-5 py-3.5 rounded-2xl max-w-[80%] text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap',
                  message.role === 'user' ? 'metal-button text-white rounded-tr-sm' : 'glass-card text-gray-200 rounded-tl-sm',
                )}
              >
                {message.content ? <p>{message.content}</p> : null}
                {message.attachments && message.attachments.length > 0 && (
                  <div
                    className={cn(
                      'grid gap-2 mt-2',
                      message.role === 'user' ? 'justify-items-end' : 'justify-items-start',
                    )}
                  >
                    {message.attachments.map((attachment) => {
                      if (attachment.kind === 'image') {
                        return (
                          <img
                            key={attachment.id}
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-52 h-auto rounded-xl border border-white/20 object-cover"
                          />
                        );
                      }

                      if (attachment.kind === 'audio') {
                        return (
                          <audio key={attachment.id} controls src={attachment.url} className="w-full min-w-[220px]" />
                        );
                      }

                      return (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 bg-black/30 border border-white/20 hover:border-primary/60 transition-colors max-w-64"
                        >
                          <FileText className="w-4 h-4 text-cyan-300" />
                          <span className="text-sm truncate">{attachment.name}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
                {!message.content && message.role === 'assistant' && isTyping && (
                  <span className="animate-pulse">...</span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 sm:p-6 pb-4">
          <div className="max-w-3xl mx-auto relative group">
            <ChatInput onSend={handleSend} isTyping={isTyping} disabled={!socket} prefillText={input} onTextChange={setInput} />
            <p className="text-center text-xs text-gray-500 mt-2">
              Yukti AI uses real-time API streaming. Ensure your text-generation API key is active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
