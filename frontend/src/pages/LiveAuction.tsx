import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, Clock, Users, Trophy, Timer, Crown, AlertCircle, CheckCircle, X, Hammer, Star, LogOut, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Stamp from '@/components/Stamp';
import { api } from '@/lib/api';
import { formatBidAmount, formatCurrencyCrore } from '@/lib/formatCurrency';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth';

interface Player {
  id: number;
  name: string;
  role: string;
  nationality: string;
  base_price: number;
}

interface HighestBidder {
  user_id: number;
  username: string;
  team_name: string;
}

interface BidHistoryItem {
  id: number;
  user_id: number;
  username: string;
  team_name: string;
  bid_amount: number;
  created_at: string;
  display_time?: string;
}

interface CurrentPlayerData {
  auction_id: number;
  auction_status: 'live' | 'paused' | 'ended';  // Add auction status
  player: Player;
  current_price: number;
  next_bid_amount: number;
  highest_bidder: HighestBidder | null;
  bid_history: BidHistoryItem[];
  active_participants_count: number;
  quit_participants: number[];
  admin_can_view: boolean;
  round: number;
  // optional server-provided countdown (seconds remaining) and duration
  countdown?: number;
  duration?: number;
}

export default function LiveAuction() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  // We will update the auth store directly when a transaction is recorded on finalize
  const updateAuthUser = (updatedUser: any) => {
    try {
      // Persist to localStorage and update zustand store
      localStorage.setItem('cricbid_user', JSON.stringify(updatedUser));
      // Use Zustand setState to update user globally
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      useAuthStore.setState({ user: updatedUser });
    } catch (e) {
      console.error('Failed to update auth user in store', e);
    }
  };
  const [currentPlayerData, setCurrentPlayerData] = useState<CurrentPlayerData | null>(null);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [hasQuit, setHasQuit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auctionEnded, setAuctionEnded] = useState(false);
  // use global Stamp overlay for sold/unsold notifications
  const [stamp, setStamp] = useState<{ type: 'sold' | 'unsold'; payload?: any } | null>(null);
  const [playerEntering, setPlayerEntering] = useState(false);
  const [isQuitting, setIsQuitting] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  

  const fetchCurrentPlayer = useCallback(async () => {
    try {
      // Do not poll for updates while a global stamp overlay is visible — we want the
      // stamp to reflect the finalized player, not the newly loaded player.
      if (stamp) return;
      if (!currentPlayerData || !user) return;

      const response = await api.get(`/auctions/${currentPlayerData.auction_id}/current-player?user_id=${user.id}`);
      // If server included a recent finalization payload (from background finalize or buy)
      // surface the stamp immediately and avoid swapping player underneath it.
      const recentFinalization = response.data.recent_finalization;
      if (recentFinalization) {
        // If it's a sold finalization with winner info
        if (recentFinalization.winner) {
          setStamp({ type: 'sold', payload: recentFinalization.winner });
        } else {
          setStamp({ type: 'unsold', payload: { player_name: recentFinalization.player_name } });
        }

        // Clear stamp after the same timeout used elsewhere and fetch authoritative state
        setTimeout(async () => {
          setStamp(null);
          setHasQuit(false);
          // Fetch authoritative current player after stamp hides
          await fetchCurrentPlayer();

          // animate entrance
          setPlayerEntering(true);
          setTimeout(() => setPlayerEntering(false), 700);
        }, 3500);

        // return early so we don't clobber currentPlayerData while stamp is visible
        return;
      }
      
      // Check if user is not a participant and not an admin
      if (!response.data.user_is_participant && !response.data.user_is_admin) {
        setAuctionEnded(true);
        toast({
          title: "Access Denied",
          description: "You need to join the auction before it starts to participate.",
          variant: "destructive",
        });
        return;
      }
      
      // No per-page sold banner here; finalization is handled by server responses and Stamp overlay
      
      // Merge bid history and set a one-time display_time derived from the bid's created_at.
      // If we already have a previous display_time for a bid id, preserve it so times stay static.
      const mapped = response.data;
      if (mapped?.bid_history && Array.isArray(mapped.bid_history)) {
        mapped.bid_history = mapped.bid_history.map((b: any) => {
          const prev = currentPlayerData?.bid_history?.find((pb: any) => pb.id === b.id);
          const display_time = prev?.display_time ?? (b.created_at ? new Date(b.created_at).toLocaleTimeString() : new Date().toLocaleTimeString());
          return { ...b, display_time };
        });
      }
      setCurrentPlayerData(mapped);
      
      // Check if user has quit for this player
      if (user && response.data.quit_participants.includes(user.id)) {
        setHasQuit(true);
      } else {
        setHasQuit(false);
      }
    } catch (error: any) {
      console.error('Failed to fetch current player:', error);
      if (error.response?.status === 400 && 
          (error.response?.data?.detail === "Auction is not live" || 
           error.response?.data?.detail === "Auction is not active")) {
        setAuctionEnded(true);
      }
    }
  }, [currentPlayerData, user, toast]);

  const initializeAuction = async () => {
    try {
      // Get active auction (live or paused)
      const auctionsResponse = await api.get('/auctions');
      const activeAuction = auctionsResponse.data.find((a: any) => a.status === 'live' || a.status === 'paused');
      
      if (!activeAuction) {
        setAuctionEnded(true);
        setLoading(false);
        return;
      }

      // Get current player data
      const playerResponse = await api.get(`/auctions/${activeAuction.id}/current-player?user_id=${user?.id || 0}`);
      
      // Check if user is not a participant and not an admin
      if (!playerResponse.data.user_is_participant && !playerResponse.data.user_is_admin) {
        setAuctionEnded(true);
        toast({
          title: "Access Denied",
          description: "You need to join the auction before it starts to participate. Please wait for the next auction.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Attach display_time derived from server-created_at. Use created_at to ensure
      // the time reflects when the bid was created (converted to local time) and does
      // not change on subsequent polls.
      const mapped = playerResponse.data;
      if (mapped?.bid_history && Array.isArray(mapped.bid_history)) {
        mapped.bid_history = mapped.bid_history.map((b: any) => ({
          ...b,
          display_time: b.created_at ? new Date(b.created_at).toLocaleTimeString() : new Date().toLocaleTimeString()
        }));
      }
      setCurrentPlayerData(mapped);
      
      // Check if user has quit for this player
      if (user && playerResponse.data.quit_participants.includes(user.id)) {
        setHasQuit(true);
      } else {
        setHasQuit(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize auction:', error);
      setAuctionEnded(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAuction();
  }, []);

  // Removed countdown timer - players are finalized when all active bidders quit

  useEffect(() => {
    if (!currentPlayerData || auctionEnded) return;

    // Poll for updates every 2 seconds. If a stamp is visible we bail out inside
    // `fetchCurrentPlayer` to avoid swapping the player under the stamp.
    const interval = setInterval(fetchCurrentPlayer, 2000);
    return () => clearInterval(interval);
  }, [fetchCurrentPlayer, auctionEnded, stamp]);

  const handlePlaceBid = async () => {
    if (!currentPlayerData || !user) return;

    setIsPlacingBid(true);
    try {
      const response = await api.post(`/auctions/${currentPlayerData.auction_id}/place-bid`, {
        user_id: user.id,
        bid_amount: currentPlayerData.next_bid_amount
      });

      toast({
        title: 'Bid Placed!',
        description: `Successfully bid ${formatBidAmount(currentPlayerData.next_bid_amount)}`,
      });

      // Refresh current player data
      await fetchCurrentPlayer();
    } catch (error: any) {
      console.error('Failed to place bid:', error);
      
      let errorMessage = 'Failed to place bid';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      toast({
        title: 'Bid Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleQuitBidding = async () => {
    if (!currentPlayerData || !user) return;

    setIsQuitting(true);
    try {
      const quitRes = await api.post(`/auctions/${currentPlayerData.auction_id}/quit-bidding`, {
        user_id: user.id
      });

      setHasQuit(true);
      toast({
        title: 'Quit Bidding',
        description: 'You have permanently quit bidding for this player',
        variant: "destructive",
      });

      // Process response
      console.log('Quit bidding response:', quitRes.data);

      // If server indicates finalization happened and returned finalize_result, update UI immediately
      if (quitRes.data?.should_finalize === true && quitRes.data?.finalize_result) {
        const finalizeResult = quitRes.data.finalize_result;
        console.log('Player finalized automatically:', finalizeResult);

        // Show a stamp (sold or unsold) for everyone
        if (finalizeResult.winner) {
          setStamp({ type: 'sold', payload: finalizeResult.winner });
        } else {
          setStamp({ type: 'unsold', payload: { player_name: currentPlayerData.player.name } });
        }

        // Keep the stamp visible for a short duration, then clear and handle next steps.
        // During the stamp we intentionally stop polling (see fetchCurrentPlayer) so
        // the next player won't be loaded under the overlay. After the stamp hides,
        // we fetch the authoritative current player from the server and animate it in.
        setTimeout(async () => {
          // If winner existed and current user is the winner, update wallet
          if (finalizeResult.winner && finalizeResult.winner.user_id === user.id) {
            try {
              const tx = finalizeResult.winner.transaction;
              const newWalletBalance = tx?.new_wallet_balance ?? user.wallet_balance;
              updateAuthUser({ ...user, wallet_balance: newWalletBalance });
            } catch (e) {
              console.error('Failed to update user wallet after finalize:', e);
            }
          }

          // Clear stamp first to allow polling to resume if needed
          setStamp(null);

          // Reset quit status for the new player and fetch authoritative state from server
          setHasQuit(false);
          await fetchCurrentPlayer();

          // Animate entrance of the (possibly new) current player
          setPlayerEntering(true);
          setTimeout(() => setPlayerEntering(false), 700);

          if (finalizeResult.auction_status === 'ended' || finalizeResult.is_auction_ended) {
            setAuctionEnded(true);
            toast({
              title: "Auction Ended",
              description: "The auction has ended. View your team to see your players.",
            });
          } else {
            // Optionally notify about the next player
            if (finalizeResult.next_player) {
              const np = finalizeResult.next_player;
              toast({ title: "Next Player", description: `Bidding starts for ${np.name || np.player_name}` });
            }
          }
        }, 3500);
      } else {
        // Otherwise refresh after short delay
        setTimeout(() => {
          fetchCurrentPlayer();
        }, 1000);
      }

    } catch (error: any) {
      console.error('Failed to quit bidding:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to quit bidding",
        variant: "destructive",
      });
    } finally {
      setIsQuitting(false);
    }
  };

  const handleBuyPlayer = async () => {
    if (!currentPlayerData || !user) return;

    setIsBuying(true);
    try {
      // Call the buy-player endpoint. The backend expects user_id as a query param.
      const res = await api.post(`/auctions/${currentPlayerData.auction_id}/buy-player?user_id=${user.id}`);

      const data = res.data;

      // Show stamp
      if (data?.winner) {
        setStamp({ type: 'sold', payload: data.winner });
      } else {
        setStamp({ type: 'unsold', payload: { player_name: currentPlayerData.player.name } });
      }

      // Keep stamp visible then clear and refresh authoritative state
      setTimeout(async () => {
        // Update wallet if this user won
        if (data?.winner && data.winner.user_id === user.id) {
          try {
            const tx = data.winner.transaction;
            const newWalletBalance = tx?.new_wallet_balance ?? user.wallet_balance;
            updateAuthUser({ ...user, wallet_balance: newWalletBalance });
          } catch (e) {
            console.error('Failed to update wallet after buy-player:', e);
          }
        }

        // Clear stamp and fetch fresh current player
        setStamp(null);
        setHasQuit(false);
        await fetchCurrentPlayer();

        // Animate entrance
        setPlayerEntering(true);
        setTimeout(() => setPlayerEntering(false), 700);

        if (data?.auction_status === 'ended' || data?.is_auction_ended) {
          setAuctionEnded(true);
          toast({ title: 'Auction Ended', description: 'The auction has ended. View your team to see your players.' });
        } else if (data?.next_player) {
          const np = data.next_player;
          toast({ title: 'Next Player', description: `Bidding starts for ${np.name || np.player_name}` });
        }
      }, 3500);
    } catch (error: any) {
      console.error('Failed to buy player:', error);
      toast({ title: 'Purchase Failed', description: error.response?.data?.detail || 'Failed to buy player', variant: 'destructive' });
    } finally {
      setIsBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900 dark:to-pink-900 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-2xl animate-spin mx-auto mb-4">
            <Gavel className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-slate-300">Loading Auction...</h2>
        </div>
      </div>
    );
  }

  if (auctionEnded || !currentPlayerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900 dark:to-pink-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-r from-gray-500 to-slate-600 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-6">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-600 via-slate-600 to-gray-800 bg-clip-text text-transparent mb-4">
              AUCTION ENDED
            </h1>
            <p className="text-xl text-gray-700 dark:text-slate-300 mb-6">
              The auction has concluded. Check the results and your team!
            </p>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3"
              onClick={() => navigate('/leaderboard-preview')}
            >
              View Final Results
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCurrentUserHighestBidder = currentPlayerData.highest_bidder?.user_id === user?.id;
  const canBid = !hasQuit && !isCurrentUserHighestBidder && user && currentPlayerData.auction_status === 'live';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900 dark:to-pink-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${
              currentPlayerData.auction_status === 'paused' 
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500' 
                : 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse'
            }`}>
              <Gavel className="h-10 w-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className={`text-4xl font-bold ${
                currentPlayerData.auction_status === 'paused' 
                  ? 'text-orange-600 dark:text-orange-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {currentPlayerData.auction_status === 'paused' ? 'AUCTION PAUSED' : 'LIVE AUCTION'}
              </h1>
              <p className="text-lg text-gray-600 dark:text-slate-400">Round {currentPlayerData.round}</p>
            </div>
          </div>
          <Badge className={`px-6 py-2 text-lg ${
            currentPlayerData.auction_status === 'paused' 
              ? 'bg-orange-500 text-white' 
              : 'bg-red-500 text-white animate-pulse'
          }`}>
            {currentPlayerData.auction_status === 'paused' ? '⏸️ PAUSED' : '🔴 LIVE'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Card */}
          <div className="lg:col-span-2">
            <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <span className="text-4xl font-bold text-white">
                    {currentPlayerData.player.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <CardTitle className="text-3xl font-bold text-gray-800 dark:text-slate-100">
                  {currentPlayerData.player.name}
                </CardTitle>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {currentPlayerData.player.role}
                  </Badge>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {currentPlayerData.player.nationality}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                        {/* Global stamp overlay rendered when `stamp` is set */}
                                {stamp && (
                                  // Render stamp entirely from the finalize payload so it doesn't change
                                  // if `currentPlayerData` refreshes while the overlay is shown.
                                  <Stamp
                                    fullScreen
                                    variant={
                                      stamp.type === 'sold'
                                        ? (stamp.payload?.user_id === user?.id ? 'sold-to-you' : 'sold')
                                        : 'unsold'
                                    }
                                    title={stamp.type === 'unsold' ? 'UNSOLD' : 'SOLD!'}
                                    playerName={`${stamp.payload?.player_name ?? stamp.payload?.name ?? currentPlayerData.player.name} • ${stamp.payload?.player_role ?? stamp.payload?.role ?? currentPlayerData.player.role}`}
                                    price={
                                      stamp.type === 'sold'
                                        ? // If transaction amount is negative (debit), show absolute value in cr format
                                          stamp.payload?.transaction?.amount
                                          ? formatCurrencyCrore(Math.abs(stamp.payload.transaction.amount))
                                          : stamp.payload?.winning_bid
                                            ? formatCurrencyCrore(stamp.payload.winning_bid)
                                            : formatCurrencyCrore(currentPlayerData.current_price)
                                        : undefined
                                    }
                                    teamText={
                                      stamp.type === 'sold'
                                        ? `to ${stamp.payload?.team_name ?? stamp.payload?.username ?? ''}`
                                        : undefined
                                    }
                                  />
                                )}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Base Price</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                      {formatCurrencyCrore(currentPlayerData.player.base_price)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Current Price</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrencyCrore(currentPlayerData.current_price)}
                    </p>
                  </div>
                </div>

                {/* Highest Bidder */}
                {currentPlayerData.highest_bidder && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4 mb-6 border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center gap-3">
                      <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      <div className="flex-grow">
                        <p className="text-sm text-gray-600 dark:text-slate-400">Highest Bidder</p>
                        <div className="font-bold text-gray-800 dark:text-slate-100">
                          {currentPlayerData.highest_bidder.username} 
                          <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">
                            ({currentPlayerData.highest_bidder.team_name})
                          </span>
                        </div>
                      </div>
                      {isCurrentUserHighestBidder && (
                        <Badge className="bg-green-500 text-white">YOU</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Paused State Message */}
                {currentPlayerData.auction_status === 'paused' && (
                  <div className="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-4 text-center">
                    <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-orange-800 dark:text-orange-400 font-semibold">
                      Auction is paused by admin
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                      Bidding will resume when admin starts the auction again
                    </p>
                  </div>
                )}

                {/* Bidding Actions */}
                <div className="space-y-4">
                  {canBid && !stamp && (
                    <Button
                      onClick={handlePlaceBid}
                      disabled={isPlacingBid}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 text-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isPlacingBid ? (
                        'Placing Bid...'
                      ) : (
                        <>Bid {formatBidAmount(currentPlayerData.next_bid_amount)}</>
                      )}
                    </Button>
                  )}

                  {canBid && !hasQuit && !stamp && (
                    <>
                      <Button
                        onClick={handleQuitBidding}
                        disabled={isQuitting}
                        variant="outline"
                        className="w-full border-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold py-3 mb-2"
                      >
                        <X className="mr-2 h-4 w-4" />
                        {isQuitting ? 'Quitting...' : 'Quit Bidding'}
                      </Button>

                      {/* Show Buy Player when this user is the last active participant */}
                      {currentPlayerData.active_participants_count === 1 && (
                        <Button
                          onClick={handleBuyPlayer}
                          disabled={isBuying}
                          className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold py-3"
                        >
                          {isBuying ? 'Processing...' : 'Buy Player'}
                        </Button>
                      )}
                    </>
                  )}

                  {hasQuit && (
                    <div className="bg-gray-100 dark:bg-slate-700 rounded-xl p-4 text-center">
                      <AlertCircle className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-slate-400">You have quit bidding for this player</p>
                    </div>
                  )}

                  {isCurrentUserHighestBidder && (
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-4 text-center">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-green-800 dark:text-green-400 font-semibold">
                        You are the highest bidder!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* SOLD/UNSOLD stamp handled as global overlay — removed right-side banner */}

            {/* Bidding Status */}
            <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-xl">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Bidding Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                    <div className="text-lg text-gray-600 dark:text-slate-300">
                      {currentPlayerData.auction_status === 'paused' ? (
                        <div className="text-orange-600 dark:text-orange-400">
                          Auction is paused - Waiting for admin
                        </div>
                      ) : hasQuit ? (
                        <div className="text-red-600 dark:text-red-400">
                          You have quit bidding for this player
                        </div>
                      ) : currentPlayerData?.admin_can_view && user?.role === 'admin' ? (
                        <div className="text-blue-600 dark:text-blue-400">
                          Admin View - You cannot bid
                        </div>
                      ) : (
                        <div className="text-green-600 dark:text-green-400">
                          You can still bid on this player
                        </div>
                      )}
                    </div>

                    {/* (Countdown ring removed — replaced by Estimated Start / server-driven timers) */}
                </div>
              </CardContent>
            </Card>

            {/* Bid History */}
            <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Bid History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {currentPlayerData.bid_history.length === 0 ? (
                    <p className="text-gray-500 dark:text-slate-400 text-center py-4">
                      No bids yet. Be the first to bid!
                    </p>
                  ) : (
                    currentPlayerData.bid_history.map((bid, index) => (
                      <div 
                        key={bid.id} 
                        className={`p-3 rounded-lg border-l-4 ${
                          index === 0 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                            : 'bg-gray-50 dark:bg-slate-800/50 border-gray-300 dark:border-slate-600'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-slate-100 flex items-center">
                              <span>{bid.username}</span>
                              {bid.user_id === user?.id && (
                                <Badge className="ml-2 bg-blue-500 text-white text-xs">YOU</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{bid.team_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600 dark:text-green-400">
                              {formatCurrencyCrore(bid.bid_amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
