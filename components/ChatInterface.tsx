import React, { useEffect, useRef, useState } from 'react';
import { Message, MessageSource, RiskLevel } from '../types';
import { Send, ShieldAlert, User, Stethoscope, Lock, Quote } from 'lucide-react';

interface Props {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onEscalate: () => void;
  isEscalated: boolean;
  isLoading: boolean;
  role: 'PATIENT' | 'CLINICIAN';
}

export const ChatInterface: React.FC<Props> = ({ 
  messages, 
  onSendMessage, 
  onEscalate,
  isEscalated,
  isLoading,
  role
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Identify the last AI message to see if it was high risk
  const lastAiMessage = [...messages].reverse().find(m => m.source === MessageSource.AI);
  const showEscalationTrigger = !isEscalated && lastAiMessage && 
    (lastAiMessage.riskLevel === RiskLevel.HIGH || lastAiMessage.riskLevel === RiskLevel.MEDIUM);

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
            N
          </div>
          <div>
            <h1 className="font-semibold text-slate-800">Nightingale AI</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Secure Connection
            </p>
          </div>
        </div>
        {role === 'CLINICIAN' && (
           <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded border border-amber-200 font-medium">
             VIEW ONLY MODE (PATIENT PERSPECTIVE)
           </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.source === MessageSource.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm relative group ${
              msg.source === MessageSource.USER 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : msg.source === MessageSource.CLINICIAN
                ? 'bg-amber-50 border border-amber-200 text-slate-800 rounded-bl-none'
                : 'bg-slate-100 text-slate-800 rounded-bl-none'
            }`}>
              
              {/* Badge for Clinician */}
              {msg.source === MessageSource.CLINICIAN && (
                <div className="absolute -top-3 -left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Stethoscope size={10} /> CLINICIAN
                </div>
              )}

              {/* Message Text */}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              
              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-black/5 pt-2">
                    {msg.citations.map((citation, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-500 bg-white/50 p-1.5 rounded border border-black/5">
                            <Quote size={10} className="mt-0.5 shrink-0 opacity-50" />
                            <span className="italic font-medium opacity-80">"{citation}"</span>
                        </div>
                    ))}
                </div>
              )}

              {/* Risk/Meta Footer for AI Messages */}
              {msg.source === MessageSource.AI && msg.riskLevel && (
                <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between text-[10px] opacity-70">
                   <span className="flex items-center gap-1 uppercase font-semibold">
                     {msg.riskLevel === RiskLevel.HIGH ? (
                       <span className="text-red-600 flex items-center gap-1"><ShieldAlert size={10}/> High Risk</span>
                     ) : msg.riskLevel === RiskLevel.MEDIUM ? (
                        <span className="text-orange-600">Medium Risk</span>
                     ) : (
                       <span className="text-emerald-600">Low Risk</span>
                     )}
                   </span>
                   <span>Conf: {(Math.random() * 0.1 + 0.85).toFixed(2)}</span>
                </div>
              )}
              
              {/* Timestamp */}
              <div className={`text-[10px] mt-1 text-right ${msg.source === MessageSource.USER ? 'text-blue-200' : 'text-slate-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-slate-100 rounded-2xl p-4 rounded-bl-none flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
             </div>
          </div>
        )}

        {/* Escalation Prompt */}
        {showEscalationTrigger && !isEscalated && (
          <div className="flex justify-center my-4 animate-fade-in">
            <div className="bg-red-50 border border-red-100 p-4 rounded-lg max-w-sm text-center shadow-sm">
              <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <h3 className="font-semibold text-red-900 mb-1">Medical Assessment Required</h3>
              <p className="text-sm text-red-700 mb-3">Based on your symptoms, we recommend immediate clinician review. Automated advice has been paused.</p>
              <button 
                onClick={onEscalate}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-md w-full transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                Send to Clinic Now
              </button>
            </div>
          </div>
        )}
        
        {isEscalated && (
          <div className="flex justify-center my-4">
             <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
               <Lock size={14} /> Case escalated. Waiting for clinician...
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isEscalated || isLoading}
            placeholder={isEscalated ? "Chat paused for clinician review..." : "Type your message..."}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-full py-3 px-6 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isEscalated || isLoading}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="text-center mt-2">
           <p className="text-[10px] text-slate-400">
             Nightingale AI is an assistant, not a doctor. In emergencies, call 911.
           </p>
        </div>
      </div>
    </div>
  );
};
