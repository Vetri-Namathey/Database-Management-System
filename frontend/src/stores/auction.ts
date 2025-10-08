import { create } from 'zustand';
import { api } from '@/lib/api';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';

export interface Player {
  id: number;
  name: string;
  role: string;
  nationality: string;
  base_price: number;
  is_available: boolean;
  stats?: {
    matches: number;
    runs?: number;
    wickets?: number;
    average?: number;
  };
}

export interface Bid {
  id: number;
  user_id: number;
  player_id: number;
  bid_amount: number;
  created_at: string;
  user: {
    username: string;
    team_name: string;
  };
}

export interface AuctionState {
  id: number;
  name: string;
  status: 'waiting' | 'live' | 'completed';
  current_player?: Player;
  current_round: number;
  max_rounds: number;
  participants: any[];
  highest_bid?: Bid;
  countdown: number;
  bids: Bid[];
}

interface AuctionStore {
  currentAuction: AuctionState | null;
  auctions: any[];
  loading: boolean;
  error: string | null;
  socket: any;
}

interface AuctionActions {
  fetchAuctions: () => Promise<void>;
  fetchCurrentState: (auctionId: number) => Promise<void>;
  joinWaitingRoom: (auctionId: number) => Promise<void>;
  joinLiveRoom: (auctionId: number) => Promise<void>;
  placeBid: (auctionId: number, playerId: number, bidAmount: number) => Promise<void>;
  skipPlayer: (auctionId: number, playerId: number) => Promise<void>;
  markReady: (auctionId: number) => Promise<void>;
  leaveRoom: () => void;
  clearError: () => void;
}

export const useAuctionStore = create<AuctionStore & AuctionActions>((set, get) => ({
  currentAuction: null,
  auctions: [],
  loading: false,
  error: null,
  socket: null,

  fetchAuctions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/auctions');
      // Backend might return { auctions: [...] } or an array directly
      const auctions = response.data?.auctions ?? response.data;
      set({ auctions: auctions || [], loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch auctions', loading: false });
    }
  },

  // Fetch the current state for a specific auction
  fetchCurrentState: async (auctionId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/auctions/${auctionId}/current-state`);
      const data = response.data?.auction ?? response.data;
      set({ currentAuction: data || null, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch auction state', loading: false });
    }
  },

  joinWaitingRoom: async (auctionId: number) => {
    // Ensure socket is connected
    const socket = connectSocket();
    set({ socket });

    // Remove any previous listeners for these events to avoid duplicates
    socket.off('waiting_room_update');
    socket.off('start_auction');

    socket.emit('join_waiting_room', { auction_id: auctionId });

    socket.on('waiting_room_update', (data: any) => {
      set((state) => ({
        currentAuction: state.currentAuction ? { ...state.currentAuction, participants: data.participants } : null
      }));
    });

    socket.on('start_auction', () => {
      window.location.href = `/auctions/${auctionId}/live`;
    });
  },

  joinLiveRoom: async (auctionId: number) => {
    const socket = connectSocket();
    set({ socket });

    socket.off('auction_state');
    socket.off('new_bid');
    socket.off('clock');
    socket.off('auction_error');

    socket.emit('join_auction_room', { auction_id: auctionId });

    socket.on('auction_state', (data: any) => {
      set({ currentAuction: data });
    });

    socket.on('new_bid', (bid: any) => {
      set((state) => ({
        currentAuction: state.currentAuction ? {
          ...state.currentAuction,
          bids: [bid, ...state.currentAuction.bids],
          highest_bid: bid
        } : null
      }));
    });

    socket.on('clock', (data: any) => {
      set((state) => ({
        currentAuction: state.currentAuction ? { ...state.currentAuction, countdown: data.countdown } : null
      }));
    });

    socket.on('auction_error', (error: any) => {
      set({ error: error.message || error });
    });
  },

  placeBid: async (auctionId: number, playerId: number, bidAmount: number) => {
    try {
      await api.post('/auctions/bid', {
        auction_id: auctionId,
        player_id: playerId,
        bid_amount: bidAmount
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to place bid' });
      throw error;
    }
  },

  skipPlayer: async (auctionId: number, playerId: number) => {
    try {
      await api.post('/auctions/skip', {
        auction_id: auctionId,
        player_id: playerId
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to skip player' });
    }
  },

  markReady: async (auctionId: number) => {
    try {
      await api.post(`/auctions/${auctionId}/ready`);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to mark ready' });
    }
  },

  leaveRoom: () => {
    const { socket } = get();
    if (socket) {
      // remove listeners and disconnect
      socket.off();
      disconnectSocket();
      set({ socket: null });
    }
  },

  clearError: () => set({ error: null }),
}));