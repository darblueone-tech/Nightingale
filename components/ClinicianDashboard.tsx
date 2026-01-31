import React, { useState } from 'react';
import { EscalationTicket, RiskLevel, MessageSource } from '../types';
import { CheckCircle, Clock, AlertTriangle, MessageSquare, ChevronRight, FileText } from 'lucide-react';

interface Props {
  tickets: EscalationTicket[];
  onReply: (ticketId: string, message: string) => void;
}

export const ClinicianDashboard: React.FC<Props> = ({ tickets, onReply }) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const handleSendReply = () => {
    if (selectedTicketId && replyText) {
      onReply(selectedTicketId, replyText);
      setReplyText('');
      setSelectedTicketId(null);
    }
  };

  return (
    <div className="flex h-full bg-slate-100">
      {/* List Column */}
      <div className="w-1/3 border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <Clock className="text-blue-600" size={20} />
            Triage Queue
            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full ml-auto">
              {tickets.filter(t => t.status === 'PENDING').length} Active
            </span>
          </h2>
        </div>
        <div>
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>All caught up!</p>
            </div>
          ) : (
            tickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedTicketId === ticket.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-slate-800">Patient #{ticket.patientId.slice(0,6)}</span>
                  <span className="text-xs text-slate-400">{new Date(ticket.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-xs text-slate-500 mb-2 line-clamp-2">
                  Trigger: "{ticket.triggerMessage.text}"
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    ticket.triggerMessage.riskLevel === RiskLevel.HIGH ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {ticket.triggerMessage.riskLevel} Risk
                  </span>
                  {ticket.status === 'RESOLVED' && <span className="text-emerald-600 text-xs flex items-center"><CheckCircle size={10} className="mr-1"/> Replied</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Column */}
      <div className="flex-1 bg-slate-50 p-6 flex flex-col h-full overflow-hidden">
        {selectedTicket ? (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 shrink-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h1 className="text-xl font-bold text-slate-800">Escalation #{selectedTicket.id.slice(0,4)}</h1>
                   <p className="text-sm text-slate-500">Source: Automated Risk Gating (Nightingale AI)</p>
                </div>
                <div className="text-right">
                   <div className="text-2xl font-bold text-red-600 flex items-center justify-end gap-2">
                     <AlertTriangle />
                     High Priority
                   </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded border border-slate-100 mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Triggering Context</h3>
                <p className="text-slate-800 italic">"{selectedTicket.triggerMessage.text}"</p>
                <p className="text-xs text-red-500 mt-2 font-medium">AI Reason: {selectedTicket.triggerMessage.riskReason}</p>
              </div>
            </div>

            {/* Transcript Section */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 flex-1 flex flex-col min-h-0">
               <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                 <FileText size={16} className="text-slate-400" />
                 <h3 className="text-sm font-bold text-slate-700">Full Patient Transcript</h3>
               </div>
               <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
                 {selectedTicket.history && selectedTicket.history.length > 0 ? (
                   selectedTicket.history.map(msg => (
                     <div key={msg.id} className={`flex flex-col ${msg.source === MessageSource.USER ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2 rounded-lg max-w-[80%] text-sm shadow-sm ${
                           msg.source === MessageSource.USER 
                             ? 'bg-blue-100 text-blue-900 rounded-br-none' 
                             : msg.source === MessageSource.CLINICIAN
                             ? 'bg-amber-100 text-amber-900 border border-amber-200'
                             : 'bg-white border border-slate-200 text-slate-600 rounded-bl-none'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">{msg.source} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     </div>
                   ))
                 ) : (
                   <p className="text-center text-slate-400 text-sm py-4">No history available.</p>
                 )}
               </div>
            </div>

            <div className="mt-auto bg-white rounded-lg shadow-sm p-4 border border-slate-200 shrink-0">
               <label className="block text-sm font-medium text-slate-700 mb-2">Clinician Reply</label>
               <textarea
                 className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                 rows={3}
                 placeholder="Type your instruction to the patient here..."
                 value={replyText}
                 onChange={(e) => setReplyText(e.target.value)}
               />
               <div className="mt-3 flex justify-end">
                 <button 
                   onClick={handleSendReply}
                   disabled={!replyText}
                   className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                 >
                   Send Response <ChevronRight size={16} />
                 </button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <MessageSquare className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};