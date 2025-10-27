'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef } from 'react';

export default function Page() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="min-h-screen bg-linear-to-r from-gray-900 via-black to-gray-900 flex flex-col">
      <div className="backdrop-blur-xl bg-white/5 border-b border-white/10 p-6">
        <h1 className="text-2xl font-semibold text-white/90">AI Assistant</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/40 text-lg">Start a conversation...</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-6 py-4 ${
                  message.role === 'user'
                    ? 'bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white/90 shadow-xl'
                }`}
              >
                <div className="text-xs font-medium mb-2 opacity-70">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div className="text-sm leading-relaxed">
                  {message.parts.map((part, index) => {
                    if (part.type === 'text') {
                      return <span key={index}>{part.text}</span>;
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 backdrop-blur-xl bg-white/5 border-t border-white/10">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-6 py-4 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 
                         text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                         focus:border-transparent transition-all shadow-xl"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-8 py-4 rounded-2xl bg-linear-to-r from-blue-600 to-blue-500 text-white 
                       font-medium hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg 
                       shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed 
                       hover:shadow-blue-500/40 hover:scale-105"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}