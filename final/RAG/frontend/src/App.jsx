import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Sparkles, Loader2, Database, BrainCircuit, ChevronRight } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Xin chào! Tôi là **DocuMind AI** 🧠\n\nTôi đã phân tích tài liệu của bạn. Hãy đặt bất kỳ câu hỏi nào, tôi sẽ truy xuất thông tin chính xác nhất cho bạn!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Lỗi kết nối tới máy chủ');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (let line of parts) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsLoading(false);
              return;
            } else if (data.startsWith('[ERROR]')) {
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = { ...newMessages[newMessages.length - 1] };
                lastMessage.content += '\n\n**⚠️ ' + data + '**';
                newMessages[newMessages.length - 1] = lastMessage;
                return newMessages;
              });
              setIsLoading(false);
            } else {
              setIsLoading(false); // Ẩn ngay bong bóng Loading khi có chữ đầu tiên truyền về
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = { ...newMessages[newMessages.length - 1] };
                let textChunk = data;
                if (textChunk.includes('\\n')) textChunk = textChunk.replace(/\\n/g, '\n');
                lastMessage.content += textChunk;
                newMessages[newMessages.length - 1] = lastMessage;
                return newMessages;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Lỗi khi fetch:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = { ...newMessages[newMessages.length - 1] };
        lastMessage.content = '❌ Không thể kết nối tới máy chủ Backend.';
        newMessages[newMessages.length - 1] = lastMessage;
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex absolute inset-0 bg-[#f3f4f6] font-sans overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/30 blur-[120px] pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/30 blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '1s' }}></div>

      {/* Sidebar (Optional info panel) */}
      <div className="hidden lg:flex flex-col w-80 p-6 z-10">
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] h-full rounded-3xl p-6 flex flex-col relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-bl-full pointer-events-none"></div>

          <div className="flex items-center gap-3 mb-10">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-2.5 rounded-2xl shadow-lg shadow-purple-500/30">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800">DocuMind</h1>
              <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 uppercase tracking-widest mt-0.5">RAG Engine</p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm transition hover:shadow-md hover:bg-white/60">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-700">ChromaDB</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">Dữ liệu được băm và lưu trữ vector hóa, tối ưu cho việc truy xuất văn bản.</p>
            </div>

            <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm transition hover:shadow-md hover:bg-white/60">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-700">Gemini 3.6 Flash</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">Mô hình tạo sinh ngôn ngữ tốc độ cao, phân tích và suy luận dựa trên Context.</p>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-200/50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 justify-center">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Hệ thống đang hoạt động
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 p-4 lg:p-6 lg:pl-0 z-10 flex flex-col h-full min-w-0 min-h-0">
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex-1 rounded-3xl flex flex-col relative overflow-hidden">

          {/* Header Mobile Only */}
          <header className="lg:hidden p-4 border-b border-white/40 flex items-center gap-3 bg-white/30 backdrop-blur-md">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-xl">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-800">DocuMind AI</h1>
          </header>

          {/* Chat Messages */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 space-y-6 scroll-smooth">
            <div className="max-w-4xl mx-auto space-y-8">
              {messages.map((msg, index) => {
                // Ẩn bóng chat AI nếu nó chưa có dữ liệu (đang chờ API)
                if (msg.role === 'ai' && !msg.content) return null;
                
                return (
                <div
                  key={index}
                  className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} group animate-in fade-in slide-in-from-bottom-4 duration-500`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-9 h-9 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                      : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white'
                    }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`relative max-w-[85%] md:max-w-[75%] px-5 py-4 md:px-7 md:py-5 text-[15px] leading-relaxed shadow-sm transition-all ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl rounded-br-sm shadow-blue-500/20'
                        : 'bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl rounded-bl-sm text-slate-700 hover:bg-white/90'
                      }`}
                  >
                    {msg.role === 'ai' ? (
                      <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-pre:border prose-pre:border-slate-700 prose-headings:font-bold prose-headings:text-transparent prose-headings:bg-clip-text prose-headings:bg-gradient-to-r prose-headings:from-indigo-600 prose-headings:to-purple-600">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                    )}
                  </div>
                </div>
                );
              })}

              {isLoading && (
                <div className="flex items-end gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg animate-pulse-glow">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl rounded-bl-sm px-6 py-5 shadow-sm flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </main>

          {/* Input Area */}
          <div className="p-4 md:p-6 bg-white/40 backdrop-blur-md border-t border-white/50">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi AI về nội dung tài liệu..."
                className="w-full bg-white/70 backdrop-blur-xl border border-white/80 text-slate-800 rounded-full pl-6 pr-16 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-all shadow-sm hover:shadow-md text-[15px] font-medium placeholder-slate-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 aspect-square h-[calc(100%-16px)] bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-all shadow-md active:scale-95 group-hover:shadow-lg disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-6 h-6 translate-x-px" />
              </button>
            </form>
            <div className="text-center mt-3 text-xs text-slate-500 font-medium opacity-80">
              Mô hình RAG AI có thể sinh ra thông tin ảo. Hãy kiểm chứng lại nội dung.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
