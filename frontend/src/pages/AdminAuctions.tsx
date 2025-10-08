import React, { useEffect, useState } from 'react';
import { Gavel, Plus, Search, Filter, Play, Pause, Edit, Trash2, Eye, Clock, Users2, Trophy, Calendar, User, Crown, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyCrore } from '@/lib/formatCurrency';

interface Auction {
  id: number;
  name: string;
  status: 'waiting' | 'live' | 'paused' | 'ended' | 'cancelled';
  max_rounds: number;
  max_participants: number;
  min_participants: number;
  current_participants: number;
  total_bids: number;
  highest_bid: number;
  created_at: string;
  created_by: string;
}

interface Participant {
  id: number;
  user_id: number;
  username: string;
  teamName: string;
  walletBalance: number;
  is_active: boolean;
  joinedAt: string;
  team_composition: {
    total_players: number;
    batsmen_count: number;
    bowlers_count: number;
    wicket_keepers_count: number;
    all_rounders_count: number;
  };
  players: Array<{
    id: number;
    name: string;
    role: string;
    purchase_price: number;
  }>;
  total_spent: number;
}

export default function AdminAuctions() {
  const { toast } = useToast();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAuction, setNewAuction] = useState({
    name: '',
    max_participants: 8,
    min_participants: 2,
    max_rounds: 15,
    start_time: ''
  });

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auctions');
      setAuctions(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch auctions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (auctionId: number) => {
    try {
      setLoadingParticipants(true);
      const response = await api.get(`/auctions/${auctionId}/participants`);
      setParticipants(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch participants',
        variant: 'destructive',
      });
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleSelectAuction = (auction: Auction) => {
    setSelectedAuction(auction);
    if (auction.current_participants > 0) {
      fetchParticipants(auction.id);
    } else {
      setParticipants([]);
    }
  };

  const filteredAuctions = auctions.filter(auction => {
    const matchesSearch = auction.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || auction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'live': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paused': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'ended': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleCreateAuction = async () => {
    try {
      const response = await api.post('/auctions', {
        name: newAuction.name,
        max_participants: newAuction.max_participants,
        min_participants: newAuction.min_participants,
        max_rounds: newAuction.max_rounds,
        status: 'waiting',
        start_time: newAuction.start_time ? new Date(newAuction.start_time).toISOString() : undefined
      });
      
      // Refresh auctions list
      await fetchAuctions();
      
      setShowCreateDialog(false);
      setNewAuction({
        name: '',
        max_participants: 8,
        min_participants: 2,
        max_rounds: 15,
        start_time: ''
      });
      
      toast({
        title: 'Success',
        description: 'Auction created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create auction',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (auctionId: number, newStatus: string) => {
    try {
      let endpoint = '';
      
      // Get current auction status to determine correct endpoint
      const currentAuction = auctions.find(a => a.id === auctionId);
      
      switch (newStatus) {
        case 'live':
          // Use /resume if currently paused, /start if currently waiting
          if (currentAuction?.status === 'paused') {
            endpoint = `/auctions/${auctionId}/resume`;
          } else {
            endpoint = `/auctions/${auctionId}/start`;
          }
          break;
        case 'paused':
          endpoint = `/auctions/${auctionId}/pause`;
          break;
        case 'ended':
          endpoint = `/auctions/${auctionId}/end`;
          break;
        default:
          endpoint = `/auctions/${auctionId}/status?status=${newStatus}`;
      }
      
      const response = await api.post(endpoint);
      
      if (response.data.success) {
        // Update local state
        setAuctions(prev => prev.map(auction => 
          auction.id === auctionId ? { ...auction, status: newStatus as any } : auction
        ));
        
        toast({
          title: 'Success',
          description: response.data.message || `Auction status updated to ${newStatus}`,
        });
        
        // Refresh auctions to get updated data
        fetchAuctions();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update auction status',
        variant: 'destructive',
      });
    }
  };

  const handleStartAuction = async (auctionId: number) => {
    await handleStatusChange(auctionId, 'live');
  };

  const handlePauseAuction = async (auctionId: number) => {
    await handleStatusChange(auctionId, 'paused');
  };

  const handleResumeAuction = async (auctionId: number) => {
    await handleStatusChange(auctionId, 'live');
  };

  const handleEndAuction = async (auctionId: number) => {
    await handleStatusChange(auctionId, 'ended');
  };

  const handleDeleteAuction = async (auctionId: number) => {
    try {
      await api.delete(`/auctions/${auctionId}`);
      
      // Remove from local state
      setAuctions(prev => prev.filter(auction => auction.id !== auctionId));
      
      toast({
        title: 'Success',
        description: 'Auction deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete auction',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
  <div className="min-h-screen bg-white dark:bg-slate-900 p-4 md:p-6">
        <div className="space-y-6">
          <div className="h-16 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl" />
          <div className="h-96 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900 dark:to-pink-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-xl">
              <Gavel className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-800 dark:from-orange-400 dark:via-red-400 dark:to-pink-300 bg-clip-text text-transparent">
              Manage Auctions
            </h1>
          </div>
          <p className="text-lg text-gray-700 dark:text-slate-300">
            Create, manage, and monitor all cricket player auctions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Auctions</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                    {auctions.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-800/30 transition-colors">
                  <Gavel className="h-6 w-6 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Live Auctions</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {auctions.filter(a => a.status === 'live').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse group-hover:scale-125 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Participants</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {auctions.reduce((sum, a) => sum + a.current_participants, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/30 transition-colors">
                  <Users2 className="h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Bids</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {auctions.reduce((sum, a) => sum + a.total_bids, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/30 transition-colors">
                  <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions and Filters */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search auctions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-700/50"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48 bg-white dark:bg-slate-700/50">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Auction
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Auctions List */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 dark:text-slate-100">
              Auctions ({filteredAuctions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {filteredAuctions.map((auction) => (
                <div key={auction.id} className="p-6 bg-gray-50/50 dark:bg-slate-700/30 rounded-lg border border-gray-200/50 dark:border-slate-600/50 hover:bg-white/70 dark:hover:bg-slate-600/40 hover:border-orange-300/50 dark:hover:border-orange-600/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-xl group-hover:scale-110 transition-all">
                          <Gavel className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
                              {auction.name}
                            </h3>
                            <Badge className={`${getStatusColor(auction.status)} text-xs group-hover:scale-105 transition-transform`}>
                              {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                              <span className="text-gray-600 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                                Not applicable
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users2 className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                              <span className="text-gray-600 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                                {auction.current_participants}/{auction.max_participants}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                              <span className="text-gray-600 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                                Bid: Dynamic
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                              <span className="text-gray-600 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                                {auction.total_bids} bids
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {auction.status === 'waiting' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusChange(auction.id, 'live')}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      
                      {auction.status === 'live' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(auction.id, 'paused')}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(auction.id, 'ended')}
                            variant="destructive"
                          >
                            End
                          </Button>
                        </>
                      )}
                      
                      {auction.status === 'paused' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleResumeAuction(auction.id)}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(auction.id, 'ended')}
                            variant="destructive"
                          >
                            End
                          </Button>
                        </>
                      )}
                      {auction.status === 'ended' && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          disabled
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Completed
                        </Button>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleSelectAuction(auction)} className="hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-600 transition-all">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>

                      {auction.status === 'waiting' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteAuction(auction.id)}
                          className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 text-red-600 dark:text-red-400 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Auction Details</DialogTitle>
                          </DialogHeader>
                          {selectedAuction && (
                            <div className="space-y-6">
                              <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                                  <Gavel className="h-8 w-8 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold mb-2">{selectedAuction.name}</h3>
                                  <Badge className={`${getStatusColor(selectedAuction.status)}`}>
                                    {selectedAuction.status.charAt(0).toUpperCase() + selectedAuction.status.slice(1)}
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 border-t border-gray-200 dark:border-slate-700">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-slate-400">Start Time</p>
                                  <p className="font-medium">Created at start</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-slate-400">End Time</p>
                                  <p className="font-medium">When auction completes</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-slate-400">Min Bid</p>
                                  <p className="font-medium">Dynamic bidding</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-slate-400">Participants</p>
                                  <p className="font-medium">{selectedAuction.current_participants}/{selectedAuction.max_participants}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-slate-400">Total Bids</p>
                                  <p className="font-medium">{selectedAuction.total_bids}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-slate-400">Highest Bid</p>
                                  <p className="font-medium text-green-600 dark:text-green-400">
                                    {selectedAuction.highest_bid > 0 ? `${formatCurrencyCrore(selectedAuction.highest_bid)}` : 'No bids yet'}
                                  </p>
                                </div>
                              </div>

                              {/* Participants Section */}
                              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                                <div className="flex items-center gap-2 mb-4">
                                  <Users className="h-5 w-5 text-blue-500" />
                                  <h4 className="text-lg font-semibold">Participants ({selectedAuction.current_participants})</h4>
                                </div>
                                
                                {loadingParticipants ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                    <span className="ml-2 text-sm text-gray-600 dark:text-slate-400">Loading participants...</span>
                                  </div>
                                ) : participants.length > 0 ? (
                                  <div className="space-y-4">
                                    {participants.map((participant) => (
                                      <div key={participant.id} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                          {/* User Info */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-white" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <h5 className="font-semibold text-gray-900 dark:text-slate-100 truncate">{participant.username}</h5>
                                                  <Badge variant={participant.is_active ? "default" : "destructive"} className="text-xs">
                                                    {participant.is_active ? 'Active' : 'Inactive'}
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-slate-400 truncate">{participant.teamName}</p>
                                              </div>
                                            </div>
                                            
                                            {/* Team Stats */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                              <div className="text-center p-2 bg-white dark:bg-slate-700 rounded border">
                                                <p className="font-semibold text-blue-600 dark:text-blue-400">{participant.team_composition.total_players}</p>
                                                <p className="text-xs text-gray-500 dark:text-slate-400">Total Players</p>
                                              </div>
                                              <div className="text-center p-2 bg-white dark:bg-slate-700 rounded border">
                                                <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrencyCrore(participant.total_spent)}</p>
                                                <p className="text-xs text-gray-500 dark:text-slate-400">Total Spent</p>
                                              </div>
                                              <div className="text-center p-2 bg-white dark:bg-slate-700 rounded border">
                                                <p className="font-semibold text-purple-600 dark:text-purple-400">{formatCurrencyCrore(participant.walletBalance)}</p>
                                                <p className="text-xs text-gray-500 dark:text-slate-400">Wallet Balance</p>
                                              </div>
                                              <div className="text-center p-2 bg-white dark:bg-slate-700 rounded border">
                                                <p className="font-semibold text-orange-600 dark:text-orange-400">{participant.players.length}</p>
                                                <p className="text-xs text-gray-500 dark:text-slate-400">Players Owned</p>
                                              </div>
                                            </div>

                                            {/* Team Composition */}
                                            <div className="mt-3 p-3 bg-white dark:bg-slate-700 rounded border">
                                              <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">Team Composition</p>
                                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-gray-600 dark:text-slate-400">Batsmen:</span>
                                                  <span className="font-medium">{participant.team_composition.batsmen_count}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-gray-600 dark:text-slate-400">Bowlers:</span>
                                                  <span className="font-medium">{participant.team_composition.bowlers_count}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-gray-600 dark:text-slate-400">Keepers:</span>
                                                  <span className="font-medium">{participant.team_composition.wicket_keepers_count}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-gray-600 dark:text-slate-400">All-Rounders:</span>
                                                  <span className="font-medium">{participant.team_composition.all_rounders_count}</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Players List */}
                                            {participant.players.length > 0 && (
                                              <div className="mt-3">
                                                <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">Players ({participant.players.length})</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                  {participant.players.map((player) => (
                                                    <div key={player.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-700 rounded border text-xs">
                                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <span className="font-medium text-gray-900 dark:text-slate-100 truncate">{player.name}</span>
                                                        <Badge variant="outline" className="text-xs px-1 py-0 shrink-0">{player.role}</Badge>
                                                      </div>
                                                      <span className="font-medium text-green-600 dark:text-green-400 ml-2 shrink-0">
                                                        {formatCurrencyCrore(player.purchase_price)}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-600 dark:text-slate-400">No participants have joined this auction yet</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}

              {filteredAuctions.length === 0 && (
                <div className="text-center py-12">
                  <Gavel className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No auctions found matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Auction Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Auction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Auction Name</label>
                <Input
                  value={newAuction.name}
                  onChange={(e) => setNewAuction(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter auction name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Min Participants</label>
                  <Input
                    type="number"
                    value={newAuction.min_participants}
                    onChange={(e) => setNewAuction(prev => ({ ...prev, min_participants: parseInt(e.target.value) || 2 }))}
                    placeholder="2"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Participants</label>
                  <Input
                    type="number"
                    value={newAuction.max_participants}
                    onChange={(e) => setNewAuction(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 8 }))}
                    placeholder="8"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Max Rounds</label>
                <Input
                  type="number"
                  value={newAuction.max_rounds}
                  onChange={(e) => setNewAuction(prev => ({ ...prev, max_rounds: parseInt(e.target.value) || 15 }))}
                  placeholder="15"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Start Time (Admin start)</label>
                <Input
                  type="datetime-local"
                  value={newAuction.start_time}
                  onChange={(e) => setNewAuction(prev => ({ ...prev, start_time: e.target.value }))}
                  placeholder="Select start time"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: set a start time to show "Admin will start shortly" to users.</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAuction}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                disabled={!newAuction.name || !newAuction.min_participants}
              >
                Create Auction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
