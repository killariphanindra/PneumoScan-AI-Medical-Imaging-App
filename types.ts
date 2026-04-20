
export enum DiagnosisStatus {
  NORMAL = 'Normal',
  DISEASED = 'Diseased',
  INCONCLUSIVE = 'Inconclusive'
}

export interface DiagnosisResult {
  status: DiagnosisStatus;
  confidence: number;
  findings: string;
  recommendation: string;
  detectedAnomalies: string[];
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export interface ScanSession {
  id: string;
  timestamp: number;
  imageUrl: string;
  result: DiagnosisResult | null;
  loading: boolean;
  error?: string;
  imageType: 'Chest X-ray' | 'Brain MRI' | 'Lung CT' | 'Skin' | 'Other';
}

export interface DashboardStats {
  totalScans: number;
  diseasedCount: number;
  normalCount: number;
  avgConfidence: number;
}
