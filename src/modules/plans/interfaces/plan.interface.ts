export interface IPlan {
  _id: string;
  name: string;
  benefits: {
    serviceId: string;
    limit: number;
    isUnlimited: boolean;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  }[];
  price: number;
  billingFrequency: 'weekly' | 'biweekly' | 'monthly';
  institutionId: string;
}
