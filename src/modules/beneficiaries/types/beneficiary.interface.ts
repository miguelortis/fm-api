export interface IBirthCertificateDetails {
  state: string;
  municipality: string;
  year: string;
  book: string;
  actNumber: string;
}

export interface IBeneficiary {
  nationalId?: string | null; // Cédula de identidad (opcional para menores sin cédula)
  civilRegistrySerial?: string | null; // Serial compuesto del registro civil (para menores sin cédula)
  firstName: string;
  lastName: string;
  birthDate: string;
  isSpecial: boolean; // Flag para hijos con condiciones especiales (cobertura ilimitada)

  // Datos específicos desagregados del acta (para auditoría visual o reconstrucción)
  birthCertificateDetails?: IBirthCertificateDetails | null;

  // Expediente digital de documentos requeridos
  documents?: {
    nationalIdCopy?: string; // URL del archivo de cédula
    birthCertificateCopy?: string; // URL del archivo de partida de nacimiento
    legalProofSpecial?: string; // URL del justificativo de condición especial
  };
}
