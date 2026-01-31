import React, { useState, useCallback } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { PatientProfileView } from './components/PatientProfile';
import { ClinicianDashboard } from './components/ClinicianDashboard';
import { sendMessageToAI } from './services/geminiService';
import { Message, PatientProfile, MessageSource, RiskLevel, Fact, Role, EscalationTicket } from './types';
import { User, Activity, ToggleLeft, ToggleRight, LayoutDashboard, MessageCircle } from 'lucide-react';

const INITIAL_PROFILE: PatientProfile = {
  name: "John Doe",
  mrn: "S1234567A",
  chiefComplaint: null,
  medications: [],
  allergies: [],
  symptoms: []
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg_0',
    text: "Hello, I'm Nightingale. I'm here to help gather some information for the clinic. Could you tell me what brings you in today?",
    source: MessageSource.AI,
    timestamp: Date.now(),
    riskLevel: RiskLevel.LOW
  }
];

export default function App() {
  const [role, setRole] = useState<Role>(Role.PATIENT);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [profile, setProfile] = useState<PatientProfile>(INITIAL_PROFILE);
  const [isLoading, setIsLoading] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [tickets, setTickets] = useState<EscalationTicket[]>([]);

  // Helper to create facts
  const createFact = (value: string, type: string, status: 'ACTIVE'|'STOPPED' = 'ACTIVE'): Fact => ({
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    value,
    status,
    provenanceMsgId: messages[messages.length - 1]?.id || 'init',
    updatedAt: Date.now()
  });

  const handleSendMessage = useCallback(async (text: string) => {
    const userMsgId = `msg_${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      text,
      source: MessageSource.USER,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Call Gemini Service
      // We pass the *current* state of the profile so it can reason about mutations (e.g., "I stopped taking that")
      const aiResult = await sendMessageToAI([...messages, userMsg], profile, text);

      const aiMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        text: aiResult.reply,
        source: MessageSource.AI,
        timestamp: Date.now(),
        riskLevel: aiResult.riskLevel,
        riskReason: aiResult.riskReason
      };

      setMessages(prev => [...prev, aiMsg]);

      // Handle Living Memory Mutations
      if (aiResult.profileUpdates) {
        setProfile(prev => {
          const newProfile = { ...prev };
          const msgId = userMsgId; // Provenance points to the user's message

          if (aiResult.profileUpdates.chiefComplaint) {
            newProfile.chiefComplaint = {
              id: `cc_${Date.now()}`,
              value: aiResult.profileUpdates.chiefComplaint,
              status: 'ACTIVE',
              provenanceMsgId: msgId,
              updatedAt: Date.now()
            };
          }

          if (aiResult.profileUpdates.medications) {
            aiResult.profileUpdates.medications.forEach(update => {
              // Check if exists to update status, else add
              const existingIdx = newProfile.medications.findIndex(m => m.value.toLowerCase() === update.name.toLowerCase());
              if (existingIdx >= 0) {
                 newProfile.medications[existingIdx] = {
                   ...newProfile.medications[existingIdx],
                   status: update.status,
                   provenanceMsgId: msgId,
                   updatedAt: Date.now()
                 };
              } else {
                 newProfile.medications.push({
                   id: `med_${Date.now()}_${Math.random()}`,
                   value: update.name,
                   status: update.status,
                   provenanceMsgId: msgId,
                   updatedAt: Date.now()
                 });
              }
            });
          }

          if (aiResult.profileUpdates.allergies) {
             aiResult.profileUpdates.allergies.forEach(update => {
               if (!newProfile.allergies.find(a => a.value.toLowerCase() === update.name.toLowerCase())) {
                 newProfile.allergies.push({
                   id: `alg_${Date.now()}_${Math.random()}`,
                   value: update.name,
                   status: 'ACTIVE',
                   provenanceMsgId: msgId,
                   updatedAt: Date.now()
                 });
               }
             });
          }
          
          if (aiResult.profileUpdates.symptoms) {
             aiResult.profileUpdates.symptoms.forEach(update => {
               if (!newProfile.symptoms.find(s => s.value.toLowerCase() === update.name.toLowerCase())) {
                 newProfile.symptoms.push({
                   id: `sym_${Date.now()}_${Math.random()}`,
                   value: update.name,
                   status: 'ACTIVE',
                   provenanceMsgId: msgId,
                   updatedAt: Date.now()
                 });
               }
             });
          }

          return newProfile;
        });
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, profile]);

  const handleEscalate = () => {
    setIsEscalated(true);
    
    // Create ticket with history
    const lastMsg = messages[messages.length - 1];
    const newTicket: EscalationTicket = {
      id: `tkt_${Date.now()}`,
      patientId: profile.mrn,
      summary: `Risk Escalation: ${lastMsg.riskReason || 'Patient requested'}`,
      triggerMessage: lastMsg,
      history: [...messages], // Pass current history snapshot
      status: 'PENDING',
      timestamp: Date.now()
    };
    
    setTickets(prev => [newTicket, ...prev]);
  };

  const handleClinicianReply = (ticketId: string, text: string) => {
    // 1. Update ticket status
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'RESOLVED' } : t));

    // 2. Inject message into chat
    const clinicianMsg: Message = {
      id: `clin_${Date.now()}`,
      text: text,
      source: MessageSource.CLINICIAN,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, clinicianMsg]);
    setIsEscalated(false); // Unlock the chat
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 overflow-hidden">
      
      {/* Dev/Demo Toolbar */}
      <div className="bg-slate-800 text-slate-200 px-4 py-2 flex items-center justify-between text-xs border-b border-slate-700">
        <div className="flex items-center gap-4">
          <span className="font-bold tracking-wider text-indigo-400">NIGHTINGALE DEV BUILD</span>
          <div className="flex items-center gap-2 bg-slate-700 rounded-full px-2 py-0.5">
             <span className={`w-2 h-2 rounded-full ${role === Role.PATIENT ? 'bg-blue-400' : 'bg-slate-500'}`}></span>
             Role: {role}
          </div>
        </div>
        <button 
          onClick={() => setRole(role === Role.PATIENT ? Role.CLINICIAN : Role.PATIENT)}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors"
        >
          {role === Role.PATIENT ? <ToggleLeft /> : <ToggleRight />}
          Switch View
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {role === Role.PATIENT ? (
          <>
            {/* Sidebar - Living Memory */}
            <div className="hidden md:block w-80 shrink-0 h-full border-r border-slate-200 bg-white">
              <PatientProfileView profile={profile} className="h-full" />
            </div>

            {/* Main Chat */}
            <div className="flex-1 h-full max-w-2xl mx-auto w-full bg-white shadow-xl">
               <ChatInterface 
                 messages={messages} 
                 onSendMessage={handleSendMessage}
                 onEscalate={handleEscalate}
                 isEscalated={isEscalated}
                 isLoading={isLoading}
                 role={role}
               />
            </div>
            
            {/* Right Spacer (for aesthetic balance on large screens) */}
            <div className="hidden lg:block flex-1 bg-slate-50"></div>
          </>
        ) : (
          /* Clinician View */
          <div className="w-full h-full">
            <ClinicianDashboard tickets={tickets} onReply={handleClinicianReply} />
          </div>
        )}
      </div>
    </div>
  );
}