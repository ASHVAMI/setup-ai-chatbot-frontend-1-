export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  description: string;
  supplier_id: string;
  created_at: string;
  supplier?: {
    name: string;
    email: string;
  };
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  categories: string[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ComparisonResult {
  products: Product[];
  differences: {
    [key: string]: {
      [productId: string]: any;
    };
  };
}