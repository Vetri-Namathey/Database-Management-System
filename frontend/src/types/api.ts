// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  team_name: string;
  role?: 'user' | 'admin';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    team_name: string;
    wallet_balance: number;
    role: 'user' | 'admin';
    created_at: string;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    team_name: string;
    wallet_balance: number;
    role: 'user' | 'admin';
    created_at: string;
  };
}

export interface Player {
  id: number;
  player_name: string;
  role: string;
  batting_style?: string;
  bowling_style?: string;
  nationality: string;
  base_price: number;
  total_matches?: number;
  total_runs?: number;
  total_wickets?: number;
  is_available: boolean;
  profile_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Auction {
  id: number;
  name: string;
  status: string;
  current_player_id?: number;
  current_round: number;
  max_rounds: number;
  countdown: number;
  min_participants: number;
  max_participants: number;
  started_at?: string;
  ended_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: number;
  auction_id: number;
  player_id: number;
  user_id: number;
  bid_amount: number;
  is_winning: boolean;
  round_number: number;
  created_at: string;
}
