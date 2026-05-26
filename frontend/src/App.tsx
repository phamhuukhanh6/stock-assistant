import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, User, Bot, Sparkles, Sidebar as SidebarIcon, X, LogOut, TrendingUp, BarChart3, ShieldCheck, FolderPlus, Folder, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Project {
  id: number;
  name: string;
}

interface Conversation {
  id: number;
  project_id: number | null;
  title: string;
  agent_id: string;
}

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth & Project State
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');
  const [authForm, setAuthForm] = useState({ full_name: '', username: '', email: '', password: '', confirm: '' });
  const [authError, setAuthError] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (token) {
      fetchAgents();
      if (token !== 'guest') {
        fetchProjects();
        fetchConversations();
      }
      if (!user) setUser({ full_name: token === 'guest' ? 'Khách hàng' : 'Nhà đầu tư', isGuest: token === 'guest' });
    }
  }, [token]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgents(res.data);
    } catch (err) {
      console.error('Failed to fetch agents', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects`, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(res.data);
    } catch (e) {}
  };

  const fetchConversations = async (projectId?: number) => {
    try {
      const url = projectId ? `${API_BASE}/conversations?project_id=${projectId}` : `${API_BASE}/conversations`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setConversations(res.data);
    } catch (e) {}
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/projects`, { name: newProjectName }, { headers: { Authorization: `Bearer ${token}` } });
      setProjects([res.data, ...projects]);
      setNewProjectName('');
      setIsCreatingProject(false);
    } catch (e) {}
  };

  const handleNewChat = (projectId: number | null = null) => {
    setActiveConversationId(null);
    setActiveProjectId(projectId);
    setMessages([]);
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Xóa dự án này và tất cả chat bên trong?')) return;
    try {
      await axios.delete(`${API_BASE}/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(projects.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
      setConversations(conversations.filter(c => c.project_id !== id));
    } catch (e) {}
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Xóa đoạn chat này?')) return;
    try {
      await axios.delete(`${API_BASE}/conversations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setConversations(conversations.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (e) {}
  };

  const loadConversation = async (conv: Conversation) => {
    setActiveConversationId(conv.id);
    const agent = agents.find(a => a.id === conv.agent_id);
    if (agent) setSelectedAgent(agent);
    
    try {
      const res = await axios.get(`${API_BASE}/messages/${conv.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data);
    } catch (e) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setAuthView('landing');
    setMessages([]);
    setProjects([]);
    setConversations([]);
    setActiveConversationId(null);
    setActiveProjectId(null);
  };

  const handleGuestMode = () => {
    setMessages([]);
    setProjects([]);
    setConversations([]);
    setActiveConversationId(null);
    setActiveProjectId(null);
    setToken('guest');
    setUser({ full_name: 'Khách hàng', isGuest: true });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (authView === 'register' && authForm.password !== authForm.confirm) {
      setAuthError('Mật khẩu xác nhận không khớp');
      return;
    }
    try {
      const url = authView === 'login' ? '/auth/login' : '/auth/register';
      const payload = authView === 'login' ? { username: authForm.username, password: authForm.password } : authForm;
      const res = await axios.post(`${API_BASE}${url}`, payload);
      if (authView === 'login') {
        setMessages([]);
        setProjects([]);
        setConversations([]);
        setActiveConversationId(null);
        setActiveProjectId(null);
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      } else {
        alert('Đăng ký thành công! Vui lòng đăng nhập.');
        setAuthView('login');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.error || 'Đã có lỗi xảy ra');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let currentConvId = activeConversationId;

    if (!currentConvId && token && token !== 'guest') {
      try {
        const title = input.length > 40 ? input.slice(0, 40) + '...' : input;
        const res = await axios.post(`${API_BASE}/conversations`, { 
          title, 
          project_id: activeProjectId,
          agent_id: selectedAgent?.id 
        }, { headers: { Authorization: `Bearer ${token}` } });
        currentConvId = res.data.id;
        setActiveConversationId(currentConvId);
        setConversations(prev => [res.data, ...prev]);
      } catch (e) {
        console.error('Failed to auto-create conversation', e);
      }
    }

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: selectedAgent?.systemPrompt || 'Bạn là Trợ lý phân tích chứng khoán thân thiện, luôn sẵn lòng giúp đỡ nhà đầu tư F0.',
          conversationId: currentConvId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6);
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                assistantContent += data.text;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const last = newMsgs[newMsgs.length - 1];
                  if (last && last.role === 'assistant') {
                    newMsgs[newMsgs.length - 1] = { ...last, content: assistantContent };
                  }
                  return newMsgs;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    if (authView === 'landing') {
      return (
        <div className="min-h-screen bg-white text-[#1e1b4b] flex flex-col font-sans overflow-x-hidden relative">
          <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
            <img src="https://images.unsplash.com/photo-1611974717482-98252c00d64d?auto=format&fit=crop&q=80&w=2000" alt="Stock Chart Background" className="w-full h-full object-cover" />
          </div>
          <nav className="h-20 px-8 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1e1b4b] to-[#4338ca] rounded-xl flex items-center justify-center shadow-xl shadow-indigo-200"><TrendingUp size={24} className="text-white" /></div>
              <span className="text-xl font-bold tracking-tight text-[#1e1b4b]">STOCK<span className="text-amber-500">ASSISTANT</span></span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setAuthView('login')} className="px-5 py-2.5 font-semibold text-sm hover:text-indigo-600 transition-colors text-gray-500 uppercase tracking-widest">Đăng nhập</button>
              <button onClick={() => setAuthView('register')} className="px-6 py-2.5 bg-[#d97706] text-white rounded-xl font-bold text-sm shadow-lg hover:bg-amber-600 transition-all uppercase tracking-widest">Tạo tài khoản</button>
            </div>
          </nav>
          <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-20 flex flex-col items-center text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-8"><ShieldCheck size={14} /> Professional Grade Financial Intelligence</div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-[1.1] tracking-tight text-[#1e1b4b]">Đầu tư thông minh <br /><span className="text-[#10b981]">Dẫn đầu thị trường</span></h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mb-12 leading-relaxed">Stock Assistant kết hợp sức mạnh của AI tiên tiến nhất và dữ liệu thị trường thời gian thực để giúp bạn đưa ra các quyết định đầu tư đúng đắn.</p>
            <div className="flex flex-col sm:flex-row gap-4 mb-20">
              <button onClick={handleGuestMode} className="px-10 py-5 bg-[#1e1b4b] text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-300 hover:scale-105 transition-all flex items-center gap-3">Bắt đầu ngay <Plus size={20} /></button>
            </div>
          </main>
          <footer className="py-10 border-t border-gray-100 text-center text-gray-400 text-sm uppercase tracking-[0.2em]">© 2026 STOCK ASSISTANT</footer>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 relative font-sans text-[#1e1b4b]">
        <div className="fixed inset-0 z-0 overflow-hidden opacity-5">
           <img src="https://images.unsplash.com/photo-1611974717482-98252c00d64d?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover scale-110" />
        </div>
        <button onClick={() => setAuthView('landing')} className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-xs hover:text-[#1e1b4b] transition-all z-10"><X size={20} /> Quay lại</button>
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[32px] shadow-2xl w-full max-w-md border border-white z-10">
          <div className="flex flex-col items-center mb-8"><div className="w-14 h-14 bg-gradient-to-br from-[#1e1b4b] to-[#4338ca] rounded-2xl flex items-center justify-center mb-4 shadow-xl"><Bot size={32} className="text-white" /></div><h1 className="text-2xl font-bold text-[#1e1b4b]">STOCK<span className="text-amber-500">ASSISTANT</span></h1></div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authView === 'register' && (<div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Full Name</label><input type="text" required className="w-full p-3 bg-gray-100/50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100" value={authForm.full_name} onChange={e => setAuthForm({...authForm, full_name: e.target.value})} /></div>)}
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Account</label><input type="text" required className="w-full p-3 bg-gray-100/50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} /></div>
            {authView === 'register' && (<div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email</label><input type="email" required className="w-full p-3 bg-gray-100/50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} /></div>)}
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Password</label><input type="password" required className="w-full p-3 bg-gray-100/50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} /></div>
            {authView === 'register' && (<div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Confirm</label><input type="password" required className="w-full p-3 bg-gray-100/50 rounded-xl border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100" value={authForm.confirm} onChange={e => setAuthForm({...authForm, confirm: e.target.value})} /></div>)}
            {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
            <button type="submit" className="w-full bg-[#1e1b4b] text-white p-4 rounded-xl font-bold shadow-lg hover:bg-indigo-900 transition-all uppercase tracking-widest">{authView === 'login' ? 'Login' : 'Join'}</button>
          </form>
          <div className="mt-8 text-center"><button onClick={() => { setAuthView(authView === 'login' ? 'register' : 'login'); setAuthError(''); }} className="text-indigo-600 font-bold text-xs uppercase hover:underline">{authView === 'login' ? 'Tạo tài khoản mới' : 'Đã là thành viên'}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-[#1e1b4b] font-sans overflow-hidden">
      <div className={`bg-[#1e1b4b] text-white flex flex-col transition-all duration-500 border-r border-white/5 ${isSidebarOpen ? 'w-[300px]' : 'w-0'}`} style={{ opacity: isSidebarOpen ? 1 : 0 }}>
        <div className="p-6 flex flex-col h-full min-w-[300px]">
          <div className="flex items-center gap-2 mb-8 px-2"><TrendingUp size={20} className="text-amber-500" /><span className="font-black tracking-tighter text-lg uppercase">STOCK<span className="text-amber-500">ASSISTANT</span></span></div>
          <button onClick={() => handleNewChat(null)} className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/20 transition-all mb-8 border border-white/5 shadow-xl"><Plus size={18} className="text-emerald-500" /> <span className="font-bold text-xs uppercase tracking-widest">Đoạn chat mới</span></button>
          <div className="flex-1 overflow-y-auto space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 px-2">Đoạn chat</h3>
              <div className="space-y-1">
                {conversations.filter(c => !c.project_id).length === 0 && (<p className="text-[10px] text-gray-600 px-2 italic">Chưa có lịch sử chat</p>)}
                {conversations.filter(c => !c.project_id).map(c => (
                  <div key={c.id} className="group relative">
                    <button onClick={() => loadConversation(c)} className={`flex items-center gap-2 w-full p-2 rounded-lg text-xs font-bold transition-all ${activeConversationId === c.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
                      <MessageSquare size={14} /> <span className="truncate pr-6">{c.title}</span>
                    </button>
                    {!user?.isGuest && (
                      <button onClick={(e) => handleDeleteConversation(e, c.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4 px-2"><h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Dự án</h3><button onClick={() => setIsCreatingProject(true)} className="p-1 hover:bg-white/10 rounded"><FolderPlus size={14} className="text-amber-500" /></button></div>
              {isCreatingProject && (<div className="mb-4 px-2"><input type="text" autoFocus placeholder="Tên dự án..." className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-xs outline-none focus:border-amber-500" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateProject()} onBlur={() => setIsCreatingProject(false)} /></div>)}
              <div className="space-y-2">
                {projects.length === 0 && (<p className="text-[10px] text-gray-600 px-2 italic">Chưa có dự án nào</p>)}
                {projects.map(p => (
                  <div key={p.id} className="group relative">
                    <button onClick={() => { setActiveProjectId(p.id === activeProjectId ? null : p.id); fetchConversations(p.id); }} className={`flex items-center justify-between w-full p-2 rounded-lg text-xs font-bold transition-all ${activeProjectId === p.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                      <div className="flex items-center gap-2 truncate pr-6">
                        <Folder size={14} className={activeProjectId === p.id ? 'text-amber-500' : ''} /> 
                        <span className="truncate">{p.name}</span>
                      </div>
                    </button>
                    {!user?.isGuest && (
                      <button onClick={(e) => handleDeleteProject(e, p.id)} className="absolute right-2 top-2 p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    )}
                    {activeProjectId === p.id && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-2 py-1">
                        {conversations.filter(c => c.project_id === p.id).map(c => (
                          <div key={c.id} className="group/item relative">
                            <button onClick={() => loadConversation(c)} className={`flex items-center gap-2 w-full p-2 rounded-lg text-[10px] font-medium transition-all ${activeConversationId === c.id ? 'text-amber-500 bg-amber-500/5' : 'text-gray-500 hover:text-white'}`}>
                              <MessageSquare size={12} /> <span className="truncate pr-6">{c.title}</span>
                            </button>
                            {!user?.isGuest && (
                              <button onClick={(e) => handleDeleteConversation(e, c.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => handleNewChat(p.id)} className="flex items-center gap-2 w-full p-2 rounded-lg text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/10 transition-colors mt-2">
                          <Plus size={12} /> Chat con mới
                        </button>
                      </div>
                    )}
                  </div>
                ))}

              </div>
            </div>
            <div>
               <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 px-2">Cấu hình AI</h3>
               <button onClick={() => setIsAgentModalOpen(true)} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-white/10 transition-colors text-xs text-amber-500 font-bold mb-4"><Sparkles size={16} /> <span>Thay đổi Agent</span></button>
               {selectedAgent && (<div className="p-4 bg-white/5 border border-white/10 rounded-2xl"><div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /><span className="font-black text-[10px] uppercase truncate">{selectedAgent.name}</span></div></div>)}
            </div>
          </div>
          <div className="mt-auto pt-6 border-t border-white/5">
            <button onClick={handleLogout} className="flex items-center justify-between w-full p-3 text-xs text-gray-400 hover:bg-white/5 rounded-xl transition-all"><div className="flex items-center gap-3"><User size={16} className="text-amber-500" /><span className="font-bold uppercase">{user?.full_name || 'Partner'}</span></div><LogOut size={16} /></button>
            {user?.isGuest && (<div className="mt-4 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9px] text-amber-500 font-bold text-center uppercase">Sandbox Mode: No History</div>)}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative min-w-0 bg-[#f8fafc]">
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none grayscale"><img src="https://images.unsplash.com/photo-1611974717482-98252c00d64d?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover" /></div>
        <header className="h-16 border-b border-gray-100 flex items-center px-6 justify-between bg-white/70 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-gray-100 rounded-xl text-[#1e1b4b] transition-all"><SidebarIcon size={20} /></button><span className="font-black text-xl tracking-tighter text-[#1e1b4b] uppercase">STOCK<span className="text-amber-500">ASSISTANT</span></span></div>
          <div className="flex items-center gap-2 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-tighter"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Market Data</div>
        </header>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-10 flex flex-col items-center relative z-10 scroll-smooth">
          <div className="w-full max-w-4xl space-y-10">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center mb-10 shadow-inner"><BarChart3 size={48} className="text-indigo-600 opacity-20" /></div>
                <h2 className="text-4xl font-black text-[#1e1b4b] mb-4 tracking-tighter uppercase text-[#1e1b4b]">Terminal Ready</h2>
                <p className="text-gray-400 text-lg font-bold max-w-lg">Bắt đầu phân tích chiến lược 5M ngay lập tức.</p>
                {!activeConversationId && token !== 'guest' && <button onClick={() => handleNewChat(activeProjectId)} className="mt-8 px-8 py-3 bg-[#1e1b4b] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl">Khởi tạo Chat Session</button>}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (<div className="w-10 h-10 rounded-xl bg-[#1e1b4b] flex items-center justify-center shrink-0 mt-1 shadow-xl"><Bot size={20} className="text-white" /></div>)}
                  <div className={`max-w-[80%] rounded-[24px] px-7 py-4 shadow-sm relative ${msg.role === 'user' ? 'bg-[#1e1b4b] text-white font-bold' : 'bg-white border border-gray-100 text-[#1e293b] text-lg leading-relaxed'}`}>
                    <div className="prose max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {msg.role === 'user' && (<div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center shrink-0 mt-1 shadow-lg"><User size={20} className="text-gray-500" /></div>)}
                </div>
              ))
            )}
            {isLoading && (<div className="flex gap-5"><div className="w-10 h-10 rounded-xl bg-[#1e1b4b] flex items-center justify-center shrink-0"><Loader2 size={20} className="text-white animate-spin" /></div></div>)}
          </div>
        </div>
        <div className="p-8 flex justify-center bg-white border-t border-gray-100 z-20">
          <div className="w-full max-w-4xl relative">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Nhập mã chứng khoán hoặc câu hỏi tài chính..." rows={1} className="w-full rounded-[24px] border-2 border-gray-100 bg-gray-50/50 px-8 py-4 pr-16 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-bold text-lg" style={{ minHeight: '64px', maxHeight: '200px' }} />
            <button onClick={handleSend} disabled={!input.trim() || isLoading} className={`absolute right-4 bottom-4 p-3 rounded-xl transition-all ${input.trim() && !isLoading ? 'bg-[#1e1b4b] text-white shadow-xl hover:scale-105' : 'bg-gray-100 text-gray-300'}`}><Send size={20} /></button>
          </div>
        </div>
      </div>

      {isAgentModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#1e1b4b]/80 backdrop-blur-xl">
          <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[85vh] overflow-hidden relative shadow-2xl flex flex-col border border-white/20">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between"><div><h2 className="text-2xl font-black text-[#1e1b4b] uppercase tracking-tighter">AI Specialists</h2></div><button onClick={() => setIsAgentModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={28} /></button></div>
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50">
              {agents.map(agent => (
                <div key={agent.id} onClick={() => { setSelectedAgent(agent); setIsAgentModalOpen(false); }} className={`p-6 rounded-[24px] border-2 transition-all cursor-pointer bg-white ${selectedAgent?.id === agent.id ? 'border-indigo-600 shadow-xl' : 'border-transparent hover:border-gray-200 hover:shadow-lg'}`}><h3 className="font-black text-lg text-[#1e1b4b] mb-2">{agent.name}</h3><p className="text-xs text-gray-400 font-medium leading-relaxed">{agent.description}</p></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
