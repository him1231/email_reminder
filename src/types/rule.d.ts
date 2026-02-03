export interface Rule {
  id?: string;
  name: string;
  templateId: string;
  filter?: {
    tag?: string;
  };
  state: 'manual' | 'draft';
  createdBy: string;
  createdAt?: any;
}
