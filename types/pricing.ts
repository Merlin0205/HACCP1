export interface PriceItem {
  id: string;
  userId: string;
  name: string;
  description?: string;
  unit: string; // např. 'ks', 'hod', 'audit'
  unitPrice: number;
  vatRate: number; // DPH v procentech (např. 21)
  active: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

