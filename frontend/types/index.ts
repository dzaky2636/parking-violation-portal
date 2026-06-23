export interface User {
  user_id: string
  role: 'officer' | 'member'
  full_name: string
  created_at: string
}

export interface Violation {
  id: string
  plate: string
  violation_type: 'expired_meter' | 'no_parking_zone' | 'blocking_hydrant' | 'disabled_spot'
  location: string
  violation_timestamp: string
  photo_url: string
  status: 'pending' | 'invoiced' | 'paid'
  submitted_by: string
  created_at: string
  updated_at: string
}

export interface FineCalculation {
  id: string
  violation_id: string
  rule_version_id: string
  base_amount: number
  time_multiplier: number
  repeat_multiplier: number
  total_fine: number
  calculated_at: string
}

export interface Invoice {
  id: string
  violation_id: string
  user_id: string | null
  amount: number
  status: 'unpaid' | 'paid' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface ViolationWithDetails extends Violation {
  fine_calculation?: FineCalculation
  invoice?: Invoice
  payment_status?: string
  transaction_id?: string
}

export interface FineRule {
  id: string
  version: number
  status: 'active' | 'superseded'
  created_by: string | null
  effective_from: string
  created_at: string
}

export interface FineRuleDetail {
  id: string
  rule_id: string
  violation_type: string
  base_amount: number
  time_multiplier_start: string
  time_multiplier_end: string
  time_multiplier_value: number
  repeat_count_min: number
  repeat_multiplier: number
}

export interface FineRuleWithDetails extends FineRule {
  details: FineRuleDetail[]
}

export interface PaymentTransaction {
  id: string
  invoice_id: string
  transaction_id: string
  status: 'paid' | 'failed'
  scenario: 'success' | 'failed'
  created_at: string
}

export interface PaymentResponse {
  status: 'paid' | 'failed'
  transaction_id: string
}

export interface CreateRuleRequest {
  base_amounts: { violation_type: string; amount: number }[]
  time_multipliers: { start: string; end: string; value: number }[]
  repeat_multipliers: { min_count: number; multiplier: number }[]
}
