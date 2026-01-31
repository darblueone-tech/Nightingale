export enum Role {
  PATIENT = 'PATIENT',
  CLINICIAN = 'CLINICIAN'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum MessageSource {
  USER = 'USER',
  AI = 'AI',
  CLINICIAN = 'CLINICIAN'
}

export interface Message {
  id: string;
  text: string;
  source: MessageSource;
  timestamp: number;
  riskLevel?: RiskLevel;
  riskReason?: string;
  // If true, this message triggered a lock/escalation
  isEscalationTrigger?: boolean; 
  // Citation linking back to a knowledge base or user statement
  citations?: string[];
}

export interface Fact {
  id: string;
  value: string;
  status: 'ACTIVE' | 'STOPPED' | 'HISTORICAL';
  provenanceMsgId: string; // The ID of the message that generated this fact
  updatedAt: number;
}

export interface PatientProfile {
  name: string; // Will be redacted in transit
  mrn: string;  // Medical Record Number
  chiefComplaint: Fact | null;
  medications: Fact[];
  allergies: Fact[];
  symptoms: Fact[];
}

export interface EscalationTicket {
  id: string;
  patientId: string;
  summary: string;
  triggerMessage: Message;
  history: Message[]; // Full chat transcript for context
  status: 'PENDING' | 'RESOLVED';
  timestamp: number;
}