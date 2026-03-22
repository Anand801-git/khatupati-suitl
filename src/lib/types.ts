export type ProductionState = 'Purchased' | 'At Embroidery' | 'At Value Addition' | 'Finished Stock';

export interface FabricComponent {
  qualityName: string;
  supplierName: string;
  ratePerMeter: number;
  metersPerPiece: number;
  dyingCharges?: number;
}

export interface DispatchedComponent {
  type: 'Kurta' | 'Salwar' | 'Dupatta' | 'Lace';
  quantity: number;
}

export interface ProductionJob {
  id: string;
  lotId?: string;
  vendorName: string;
  vendorId?: string;
  rate: number;
  sentDate: string;
  receivedDate?: string;
  receivedQty?: number;
  challanPhoto?: string;
  receivedPhoto?: string;
  challanNumber?: string;
  processType: 'Embroidery' | 'Value Addition';
  components: DispatchedComponent[];
  isFinalStep?: boolean;
}

export type MasterCategory = 'Fabric' | 'Vendor';
export type MasterSubCategory = 'Kurta' | 'Salwar' | 'Dupatta' | 'Lace' | 'Embroidery' | 'Value Addition';

export interface MasterEntry {
  id: string;
  name: string;
  category: MasterCategory;
  subCategory: MasterSubCategory;
  supplierName?: string;
  rate?: number;
  meters?: number;
  dying?: number;
}

export interface Purchase {
  id: string;
  qualityName: string;
  piecesCount: number;
  state: ProductionState;
  purchaseDate: string;
  designPhoto?: string;
  kurta: FabricComponent;
  salwar: FabricComponent;
  dupatta: FabricComponent;
  lace: FabricComponent;
  createdAt: string;
  tags?: string[];
  range?: string;
}
