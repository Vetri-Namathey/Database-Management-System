import React, { useEffect, useState } from 'react';
import { Clock, Users, Trophy, Gavel, Timer, Star, Zap, Crown, Bell, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import UserCard from '@/components/UserCard';
import EstimatedStartTimer from '@/components/EstimatedStartTimer';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

interface WaitingParticipant {
  id: number;
  username: string;
  teamName: string;
  walletBalance: number;
  joinedAt: string;
}



interface Auction {
  id: number;
  name: string;
  status: string;
  start_time: string;
  end_time: string | null;
  current_participants: number;
  max_participants: number;
}

export default function AuctionWaiting() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [participants, setParticipants] = useState<WaitingParticipant[]>([]);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [availableAuctions, setAvailableAuctions] = useState<Auction[]>([]);
  const [showAuctionList, setShowAuctionList] = useState(true); // Default to showing auction list
  const [userHasSelectedAuction, setUserHasSelectedAuction] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(false);
  const [auctionStatus, setAuctionStatus] = useState<'waiting' | 'live' | 'ended'>('waiting');
  const [hasJoined, setHasJoined] = useState(false);
  const [joiningAuction, setJoiningAuction] = useState(false);

  useEffect(() => {
    fetchAuctionData();
    const interval = setInterval(fetchAuctionData, 3000); // Poll every 3 seconds for faster updates
    return () => clearInterval(interval);
  }, []);

  // Watch for auction status changes and auto-redirect to live auction
  useEffect(() => {
    if (auction && auction.status === 'live') {
      toast({
        title: 'Auction Started!',
        description: 'Redirecting to live auction...',
      });
      setTimeout(() => {
        navigate('/live-auction');
      }, 1500);
    }
  }, [auction?.status, navigate, toast]);

  // Additional polling after user joins to detect auction status changes
  useEffect(() => {
    if (hasJoined) {
      const fastPoll = setInterval(() => {
        fetchAuctionData();
      }, 2000); // Poll every 2 seconds when user has joined
      return () => clearInterval(fastPoll);
    }
  }, [hasJoined]);

  useEffect(() => {
    if (auction && auction.status === 'scheduled') {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const startTime = new Date(auction.start_time).getTime();
        const difference = startTime - now;

        if (difference > 0) {
          const hours = Math.floor(difference / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          
          setTimeLeft({ hours, minutes, seconds });
        } else {
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
          setAuctionStatus('live');
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [auction]);

  const fetchAuctionData = async () => {
    try {
      // Fetch all auctions
      const auctionResponse = await api.get('/auctions');
      const allAuctions = auctionResponse.data || [];
      
      // Filter available auctions (waiting, live, or scheduled)
      const availableAuctions = allAuctions.filter((a: Auction) => 
        a.status === 'waiting' || a.status === 'live' || a.status === 'scheduled'
      );
      
      setAvailableAuctions(availableAuctions);
      
      // If user has selected an auction (auction is not null), don't show auction list
      if (auction) {
        // Update the auction data if it exists in available auctions
        const currentAuctionUpdate = availableAuctions.find(a => a.id === auction.id);
        if (currentAuctionUpdate) {
          setAuction(currentAuctionUpdate);
        } else {
          // Selected auction no longer exists, reset to show auction list
          setAuction(null);
          setShowAuctionList(true);
        }
        return; // Don't proceed to show auction list
      }
      
      // Only show auction selection if no auction is selected
      // AND we're not already in the waiting room state
      if (!auction && availableAuctions.length > 0 && showAuctionList) {
        return; // Keep showing auction list
      }
      
      // If no auctions available, show appropriate message
      if (availableAuctions.length === 0) {
        setShowAuctionList(false);
      }
      
      // Process the current auction if one is selected
      const activeAuction = auction;
      
      if (activeAuction) {
        // Normalize start_time to an ISO UTC string so client-side countdowns are consistent
        if (activeAuction.start_time) {
          try {
            const parsed = new Date(activeAuction.start_time);
            if (!isNaN(parsed.getTime())) {
              activeAuction.start_time = parsed.toISOString();
            } else {
              // Try appending Z (treat as UTC) or replacing space with T
              let alt = activeAuction.start_time;
              if (!alt.endsWith('Z')) alt = alt + 'Z';
              const parsed2 = new Date(alt);
              if (!isNaN(parsed2.getTime())) {
                activeAuction.start_time = parsed2.toISOString();
              } else {
                const alt2 = activeAuction.start_time.replace(' ', 'T');
                const parsed3 = new Date(alt2);
                if (!isNaN(parsed3.getTime())) {
                  activeAuction.start_time = parsed3.toISOString();
                }
              }
            }
          } catch (e) {
            // leave as-is if parsing fails
          }
        }

        setAuction(activeAuction);
        
        // Check if auction is live and redirect
        if (activeAuction.status === 'live') {
          toast({
            title: 'Auction Started!',
            description: 'Redirecting to live auction...',
          });
          setTimeout(() => {
            navigate('/live-auction');
          }, 1000);
          return;
        }
        
        setAuctionStatus(activeAuction.status === 'live' ? 'live' : 'waiting');
        
        // Fetch real participant profiles from the API
        try {
          console.log('Fetching participants for auction:', activeAuction.id);
          const partsRes = await api.get(`/auctions/${activeAuction.id}/participants`);
          
          const participantsData = partsRes.data || [];
          console.log('Participants data:', participantsData);
          
          if (participantsData.length > 0) {
            const remote = participantsData.map((p: any) => {
              return {
                id: p.user_id,
                username: p.username, // Use the real username from API
                teamName: p.teamName, // Use the real team name from API  
                walletBalance: p.walletBalance,
                joinedAt: p.joinedAt
              };
            });
            
            console.log('Successfully mapped real participants:', remote);
            setParticipants(remote);
          } else {
            console.log('No participants data returned from API');
            setParticipants([]);
          }
          
          // Check if current user has already joined
          if (user && participantsData.length > 0) {
            const userHasJoined = participantsData.some((p: any) => p.user_id === user.id);
            setHasJoined(userHasJoined);
            console.log(`User ${user.id} has joined:`, userHasJoined);
          }
        } catch (e) {
          console.error('Failed to fetch participants:', e);
          setParticipants([]);
          setHasJoined(false);
        }
      } else {
        setAuction(null);
        setParticipants([]);
      }
    } catch (error) {
      console.error('Failed to fetch auction data:', error);
      // For testing purposes, set a mock auction if API fails
      setAuction({
        id: 1,
        name: 'Test Cricket Auction 2025',
        status: 'waiting',
        start_time: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
        end_time: null,
        current_participants: 3,
        max_participants: 8
      });
      setAuctionStatus('waiting');
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchAuctionData().finally(() => {
      setLoading(false);
      toast({
        title: 'Updated',
        description: 'Auction status refreshed',
      });
    });
  };

  const handleSelectAuction = (selectedAuction: Auction) => {
    // Normalize start_time for the selected auction
    if (selectedAuction.start_time) {
      try {
        const parsed = new Date(selectedAuction.start_time);
        if (!isNaN(parsed.getTime())) {
          selectedAuction.start_time = parsed.toISOString();
        }
      } catch (e) {
        console.warn('Invalid start_time format:', selectedAuction.start_time);
      }
    }
    
    setAuction(selectedAuction);
    setShowAuctionList(false);
    setUserHasSelectedAuction(true); // Mark that user has made a selection
    setAuctionStatus(selectedAuction.status === 'live' ? 'live' : 'waiting');
    
    // Reset join status when switching auctions
    setHasJoined(false);
  };

  // Dedicated function to refresh participant data
  const refreshParticipants = async () => {
    if (!auction) return;
    
    try {
      console.log('Refreshing participants for auction:', auction.id);
      const partsRes = await api.get(`/auctions/${auction.id}/participants`);
      const participantsData = partsRes.data || [];
      
      if (participantsData.length > 0) {
        const remote = participantsData.map((p: any) => ({
          id: p.user_id,
          username: p.username,
          teamName: p.teamName,
          walletBalance: p.walletBalance,
          joinedAt: p.joinedAt
        }));
        
        console.log('Refreshed participants:', remote);
        setParticipants(remote);
      }
    } catch (e) {
      console.warn('Failed to refresh participants:', e);
    }
  };

  const handleJoinAuction = async () => {
    if (!auction || !user) return;
    
    setJoiningAuction(true);
    try {
      console.log('Joining auction:', auction.id, 'with user:', user.id);
      
      // Call the join auction API
      const response = await api.post(`/auctions/${auction.id}/join`, {
        user_id: user.id
      });
      
      console.log('Join auction response:', response.data);

      if (response.data) {
        setHasJoined(true);
        toast({
          title: 'Success',
          description: 'Successfully joined the auction!',
        });
        
        // Multiple refresh attempts to ensure participant list updates
        await fetchAuctionData();
        await refreshParticipants();
        
        setTimeout(async () => {
          await fetchAuctionData();
          await refreshParticipants();
        }, 1000);
        
        setTimeout(async () => {
          await fetchAuctionData();
          await refreshParticipants();
        }, 3000);
      }
    } catch (error: any) {
      console.error('Failed to join auction:', error);
      
      let errorMessage = 'Failed to join auction';
      
      // Handle FastAPI validation errors
      if (Array.isArray(error.response?.data?.detail)) {
        errorMessage = error.response.data.detail.map((d: any) => d.msg).join(', ');
      } else if (typeof error.response?.data?.detail === 'string') {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setJoiningAuction(false);
    }
  };

  // Show auction selection if there are auctions available and user needs to choose
  if (showAuctionList && availableAuctions.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900 dark:to-pink-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center py-12">
            <Trophy className="h-24 w-24 text-orange-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-800 dark:text-slate-200 mb-4">
              {availableAuctions.length === 1 ? 'Join Auction' : 'Choose Your Auction'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-slate-400 mb-8">
              {availableAuctions.length === 1 
                ? 'Click on the auction below to join the waiting room!'
                : 'Multiple auctions are available. Select the one you\'d like to join!'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableAuctions.map((auctionOption) => (
              <Card 
                key={auctionOption.id} 
                className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => {
                  if (auctionOption.status === 'live') {
                    navigate('/live-auction');
                  } else {
                    handleSelectAuction(auctionOption);
                  }
                }}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-xl text-gray-800 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {auctionOption.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">Status:</span>
                    <Badge className={`${
                      auctionOption.status === 'live' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                    }`}>
                      {auctionOption.status === 'live' ? 'Live Now' : 'Waiting'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">Participants:</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">
                      {auctionOption.current_participants}/{auctionOption.max_participants}
                    </span>
                  </div>

                  {/* Participation progress bar */}
                  <div className="space-y-1">
                    <Progress 
                      value={(auctionOption.current_participants / auctionOption.max_participants) * 100} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                      <span>
                        {auctionOption.max_participants - auctionOption.current_participants} spots left
                      </span>
                      <span>
                        {auctionOption.current_participants > 0 ? 'Join others' : 'Be the first!'}
                      </span>
                    </div>
                  </div>

                  {auctionOption.start_time && (
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                      <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Scheduled Start</div>
                      <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        {new Date(auctionOption.start_time).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                  )}


                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button 
              onClick={handleRefresh} 
              variant="outline"
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Auctions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900 dark:to-pink-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center py-20">
            <Gavel className="h-24 w-24 text-gray-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-600 dark:text-slate-400 mb-4">
              No Active Auction
            </h1>
            <p className="text-lg text-gray-500 dark:text-slate-500 mb-6">
              Wait for the admin to start an auction
            </p>
            <Button onClick={handleRefresh} className="mt-6 bg-orange-500 hover:bg-orange-600 text-white">
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (auctionStatus === 'live') {
    // Redirect to live auction page
    navigate('/live-auction');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900 dark:to-pink-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-6">
          {/* Back to selection button - show if auctions are available */}
          {availableAuctions.length > 0 && (
            <div className="flex justify-start mb-4">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowAuctionList(true);
                  setUserHasSelectedAuction(false); // Allow reselection
                }}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                ← View All Auctions
              </Button>
            </div>
          )}
          
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <Gavel className="h-10 w-10 md:h-12 md:w-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <Bell className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-orange-800 dark:from-orange-400 dark:via-red-400 dark:to-orange-300 bg-clip-text text-transparent">
                {auction.name}
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 dark:text-slate-300 font-semibold flex items-center gap-2">
                Waiting to Start
                <span className="flex gap-1 ml-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
                </span>
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-lg text-gray-700 dark:text-slate-300 flex items-center gap-2">
                {isConnected ? (
                  'Connected to Auction Room'
                ) : (
                  <>
                    Reconnecting
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-red-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1 h-1 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1 h-1 bg-red-400 rounded-full animate-bounce"></span>
                    </span>
                  </>
                )}
              </span>
            </div>
            
            {/* Auction indicator */}
            {availableAuctions.length > 0 && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {availableAuctions.length === 1 
                  ? 'Single auction' 
                  : `1 of ${availableAuctions.length} auctions`
                }
              </Badge>
            )}
          </div>
        </div>

        {/* Main Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Countdown Card */}
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 group">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl text-gray-800 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                <Timer className="h-6 w-6 group-hover:animate-spin" />
                Estimated Start Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <EstimatedStartTimer targetIso={auction?.start_time} />
              </div>
            </CardContent>
          </Card>

          {/* Participants Card */}
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 group">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl text-gray-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <Users className="h-6 w-6 group-hover:scale-110 transition-transform" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  {auction?.current_participants || 0}
                </div>
                <p className="text-gray-600 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                  Teams Ready
                </p>
                <div className="mt-4">
                  <Progress value={Math.min(((auction?.current_participants || 0) / (auction?.max_participants || 8)) * 100, 100)} className="h-3" />
                  <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                    {auction?.current_participants || 0}/{auction?.max_participants || 8} teams joined
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 group">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl text-gray-800 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                <Zap className="h-6 w-6 group-hover:scale-110 transition-transform" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleRefresh} 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Status
              </Button>
              
              <Button 
                onClick={refreshParticipants} 
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Users className="mr-2 h-4 w-4" />
                Refresh Participants
              </Button>
              
              {!hasJoined ? (
                <Button 
                  onClick={handleJoinAuction}
                  disabled={joiningAuction}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                >
                  {joiningAuction ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Join Auction
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  disabled
                  className="w-full bg-green-500 text-white font-semibold py-3 rounded-lg shadow-lg opacity-75 cursor-not-allowed"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Already Joined ✓
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full border-2 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-semibold py-3 rounded-lg transition-all duration-300 group-hover:scale-105"
              >
                <Trophy className="mr-2 h-4 w-4" />
                View My Team
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Participants List */}
        <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-xl text-gray-800 dark:text-slate-100">
              <span className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Teams in Waiting Room
              </span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {auction?.current_participants || 0} Online
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Show all participant slots */}
              {Array.from({ length: auction?.max_participants || 8 }, (_, i) => {
                // Get the actual participant data for this slot
                const participant = participants[i];
                const hasRealParticipant = participant !== undefined && participant !== null && participant.username;
                
                // Fallback: if no real participant data but we know someone joined
                const hasPlaceholderParticipant = !hasRealParticipant && i < (auction?.current_participants || 0);
                
                console.log(`Slot ${i}: hasReal=${hasRealParticipant}, hasPlaceholder=${hasPlaceholderParticipant}, participant=`, participant);
                
                return (
                  <div key={`slot-${i}`} className="p-4 rounded-xl border-gray-200 dark:border-slate-700/40">
                    {hasRealParticipant ? (
                      // Show real participant data from API
                      <UserCard user={{
                        id: participant.id,
                        username: participant.username,
                        full_name: participant.username, // Use username as display name
                        teamName: participant.teamName,
                        walletBalance: participant.walletBalance,
                        joinedAt: participant.joinedAt,
                        role: null
                      }} />
                    ) : hasPlaceholderParticipant ? (
                      // Fallback display when API doesn't return participant details
                      <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg shadow-sm border border-green-200 dark:border-green-800">
                        <Avatar>
                          <AvatarFallback className="bg-green-500 text-white">P{i + 1}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-green-800 dark:text-green-200">Participant {i + 1}</div>
                          <div className="text-sm text-green-600 dark:text-green-400">Team {String.fromCharCode(65 + i)}</div>
                        </div>
                        <div className="text-right text-sm text-green-600 dark:text-green-400">
                          <div className="font-medium">✓</div>
                          <div className="text-xs">joined</div>
                        </div>
                      </div>
                    ) : (
                      // Empty slot
                      <div className="p-6 bg-gray-100/50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-gray-300/50 dark:border-slate-600/50 flex items-center justify-center">
                        <div className="text-center text-gray-400 dark:text-slate-500">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm flex items-center justify-center gap-1">
                            Waiting for team
                            <span className="flex gap-0.5 ml-1">
                              <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce"></span>
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Information Banner */}
        <Card className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 dark:from-orange-900/20 dark:via-red-900/20 dark:to-orange-900/20 backdrop-blur-sm border border-orange-300/30 dark:border-orange-600/30 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">
                  Get Ready for the Auction!
                </h3>
                <p className="text-gray-700 dark:text-slate-300">
                  The admin will start the auction shortly. Make sure you have sufficient balance in your wallet 
                  and your team strategy is ready. Players will be introduced one by one for bidding.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
