export interface IAppointment {
  _id: string;
  patientId: string;
  doctorId?: string;
  area: 'emergency' | 'primary' | 'specialist';
  status: 'waiting' | 'triage' | 'in_consultation' | 'finished' | 'cancelled';
  reasonForVisit: string;
  vitals?: {
    bloodPressure: string;
    temperature: number;
    weight: number;
    heartRate: number;
  };
  institutionId: string;
  createdAt: string;
}
