export interface User {
  id: string
  email: string
  password: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
}

export interface Transaction {
  id: string
  user_id: string
  date: string
  place: string
  total_amount: number
  receipt_url: string
  created_at: string
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_name: string
  amount: number
  price_per_unit: number
  total_price: number
  category_id: string | null
  is_manual_entry: boolean
}

// API 응답 타입
export interface TransactionWithItems extends Transaction {
  items: TransactionItem[]
}
