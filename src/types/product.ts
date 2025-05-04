export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  color?: string[]; // Array of strings
  size?: string[]; // Array of strings
  accent?: string;
  // Add other fields like stock_status/quantity if needed
}
