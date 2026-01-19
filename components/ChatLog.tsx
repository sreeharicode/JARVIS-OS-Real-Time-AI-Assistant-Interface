
import React, { useRef, useEffect } from 'react';
import { Message } from '../types';

interface ChatLogProps {
  messages: Message[];
}

const ChatLog: React.FC<ChatLogProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar"
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-sky-500/30 font-orbitron text-xs tracking-[0.2em]">
          <div className="mb-4 animate-pulse">AWAITING INPUT</div>
          <div className="grid grid-cols-2 gap-4 max-w-md opacity-50">
            <div className="border border-sky-500/20 p-3 rounded text-center">"Analyze current view"</div>
            <div className="border border-sky-500/20 p-3 rounded text-center">"Write a Python script"</div>
            <div className="border border-sky-500/20 p-3 rounded text-center">"What's the weather?"</div>
            <div className="border border-sky-500/20 p-3 rounded text-center">"Scan for anomalies"</div>
          </div>
        </div>
      )}
      
      {messages.map((msg) => (
        <div 
          key={msg.id}
          className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div className={`
            max-w-[85%] px-4 py-3 rounded-lg border text-sm
            ${msg.role === 'user' 
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-100' 
              : 'bg-slate-900/80 border-slate-700 text-sky-300'}
          `}>
            <div className="flex items-center gap-2 mb-1 opacity-50 font-orbitron text-[10px] uppercase">
              <span>{msg.role}</span>
              <span>•</span>
              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
        </div>
      ))}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(14, 165, 233, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(14, 165, 233, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default ChatLog;
