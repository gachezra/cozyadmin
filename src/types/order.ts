export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  color?: string; // Optional based on product
  size?: string; // Optional based on product
  pricePerUnit: number;
}

export interface Order {
  id: string; // Firestore document ID
  orderId: string; // Human-readable order identifier
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  items: OrderItem[];
  totalAmount: number;
  orderStatus: "Received" | "Pending" | "Done";
  timestamp: Date; // Use Date object
  includesMysteryGift?: boolean;
}
