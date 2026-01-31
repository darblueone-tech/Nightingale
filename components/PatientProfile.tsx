import React from 'react';
import { PatientProfile, Fact } from '../types';
import { Activity, AlertCircle, Pill, FileText } from 'lucide-react';

interface Props {
  profile: PatientProfile;
  className?: string;
}

const FactItem = ({ fact, icon: Icon }: { fact: Fact; icon: any }) => (
  <div className={`flex items-start gap-2 text-sm p-2 rounded-md transition-all duration-300 ${fact.status === 'STOPPED' ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-700 shadow-sm border border-slate-100'}`}>
    <Icon size={14} className="mt-0.5" />
    <div className="flex-1">
      <div className={fact.status === 'STOPPED' ? 'line-through' : 'font-medium'}>
        {fact.value}
      </div>
      <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
        <span>{fact.status}</span>
        {/* Provenance Indicator */}
        <span className="text-blue-400 cursor-help" title={`Extracted from message ID: ${fact.provenanceMsgId}`}>
          Ref #{fact.provenanceMsgId.slice(-4)}
        </span>
      </div>
    </div>
  </div>
);

export const PatientProfileView: React.FC<Props> = ({ profile, className }) => {
  return (
    <div className={`flex flex-col h-full bg-slate-50 border-l border-slate-200 p-4 overflow-y-auto ${className}`}>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-blue-600" />
          Living Memory
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Real-time facts extracted from conversation.
        </p>
      </div>

      <div className="space-y-6">
        {/* Chief Complaint */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Chief Complaint</h3>
          {profile.chiefComplaint ? (
            <FactItem fact={profile.chiefComplaint} icon={Activity} />
          ) : (
            <div className="text-xs text-slate-400 italic">No complaint identified yet</div>
          )}
        </section>

        {/* Symptoms */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Symptoms (Timeline)</h3>
          <div className="space-y-2">
            {profile.symptoms.length > 0 ? (
              profile.symptoms.map(s => <FactItem key={s.id} fact={s} icon={Activity} />)
            ) : (
              <div className="text-xs text-slate-400 italic">None detected</div>
            )}
          </div>
        </section>

        {/* Medications */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Medications</h3>
          <div className="space-y-2">
            {profile.medications.length > 0 ? (
              profile.medications.map(m => <FactItem key={m.id} fact={m} icon={Pill} />)
            ) : (
              <div className="text-xs text-slate-400 italic">None detected</div>
            )}
          </div>
        </section>

        {/* Allergies */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Allergies</h3>
          <div className="space-y-2">
            {profile.allergies.length > 0 ? (
              profile.allergies.map(a => <FactItem key={a.id} fact={a} icon={AlertCircle} />)
            ) : (
              <div className="text-xs text-slate-400 italic">No known allergies</div>
            )}
          </div>
        </section>
      </div>
      
      <div className="mt-auto pt-6 border-t border-slate-200">
        <div className="text-[10px] text-slate-400 font-mono">
          ID: {profile.mrn} <br/>
          Secure Context: TLS 1.3 <br/>
          Redaction: Active
        </div>
      </div>
    </div>
  );
};