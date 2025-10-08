import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Gavel, TrendingUp, Activity, Plus, Play, RotateCcw } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogAction } from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AdminDashboardData {
  stats: {
    total_users: number;
    active_users: number;
    total_auctions: number;
    active_auctions: number;
    total_bids: number;
    total_revenue: number;
  };
  recent_auctions: Array<{
    id: number;
    name: string;
    status: string;
    participants_count: number;
    created_at: string;
  }>;
  recent_users: Array<{
    id: number;
    username: string;
    full_name: string;
    team_name: string;
    created_at: string;
    is_active: boolean;
  }>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  // Create auction removed from dashboard UI — use Admin Auctions page instead
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetAuctionId, setResetAuctionId] = useState<number | 'global' | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setData(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Creation moved to /admin/auctions page — keep dashboard focused on actions

  const handleStartAuction = async (auctionId: number) => {
    try {
      await api.post('/admin/auction/start', { auction_id: auctionId });
      toast({
        title: 'Success',
        description: 'Auction started successfully',
      });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start auction',
        variant: 'destructive',
      });
    }
  };

  const handleResetAuction = async (auctionId: number) => {
    try {
      // Call our new admin reset endpoint (session-authenticated admin only)
      await api.post('/admin/reset-auction', { auction_id: auctionId });
      toast({
        title: 'Success',
        description: 'Auction reset successfully',
      });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reset auction',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-muted animate-pulse rounded-xl" />
          <div className="h-96 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="Total Users"
          value={data.stats.total_users}
          icon={Users}
          variant="info"
        />
        
        <StatCard
          title="Active Users"
          value={data.stats.active_users}
          icon={Activity}
          variant="success"
        />
        
        <StatCard
          title="Total Auctions"
          value={data.stats.total_auctions}
          icon={Gavel}
          variant="default"
        />
        
        <StatCard
          title="Active Auctions"
          value={data.stats.active_auctions}
          icon={Play}
          variant="warning"
        />
        
        <StatCard
          title="Total Bids"
          value={data.stats.total_bids}
          icon={TrendingUp}
          variant="info"
        />
        
        <StatCard
          title="Revenue"
          value={`₹${data.stats.total_revenue} Cr`}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Actions */}
      <Card className="bg-white dark:bg-slate-900 border-0 shadow-cricket">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Create Auction removed — use Manage Auctions page */}
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 hover:bg-green-500 dark:hover:bg-green-500 hover:border-green-500 dark:hover:border-green-500 hover:text-white dark:hover:text-white transition-all"
              onClick={() => navigate('/admin/auctions')}
            >
              <Gavel className="h-6 w-6" />
              Manage Auctions
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 hover:bg-green-500 dark:hover:bg-green-500 hover:border-green-500 dark:hover:border-green-500 hover:text-white dark:hover:text-white transition-all"
              onClick={() => navigate('/admin/users')}
            >
              <Users className="h-6 w-6" />
              Manage Users
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 hover:bg-green-500 dark:hover:bg-green-500 hover:border-green-500 dark:hover:border-green-500 hover:text-white dark:hover:text-white transition-all"
              onClick={() => navigate('/admin/analytics')}
            >
              <TrendingUp className="h-6 w-6" />
              View Analytics
            </Button>

            {/* Quick Action: Reset Auction (global or pick an auction) */}
            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-20 flex-col gap-2 bg-red-600 text-white hover:bg-red-700">
                  <RotateCcw className="h-6 w-6" />
                  Reset Auction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Auction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Choose auction to reset (or pick Global)</Label>
                    <select
                      className="w-full border rounded p-2 bg-white text-gray-900 border-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
                      value={resetAuctionId === null ? '' : resetAuctionId}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'global') setResetAuctionId('global');
                        else setResetAuctionId(v === '' ? null : Number(v));
                      }}
                    >
                      <option className="text-gray-700 dark:text-slate-200" value="">-- Select an auction --</option>
                      <option className="text-gray-700 dark:text-slate-200" value="global">Global reset (all auctions)</option>
                      {data.recent_auctions.map(a => (
                        <option key={a.id} className="text-gray-700 dark:text-slate-200" value={String(a.id)}>{a.name} (#{a.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                    <Button className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400" onClick={async () => {
                      // Confirm selection
                      try {
                        const payload: any = {};
                        if (resetAuctionId === 'global') payload.auction_id = null;
                        else if (resetAuctionId) payload.auction_id = resetAuctionId;
                        else {
                          toast({ title: 'Error', description: 'Please select an auction or Global', variant: 'destructive' });
                          return;
                        }
                        await api.post('/admin/reset-auction', payload);
                        toast({ title: 'Success', description: 'Reset completed' });
                        setResetDialogOpen(false);
                        fetchDashboardData();
                      } catch (err: any) {
                        toast({ title: 'Error', description: err?.response?.data?.detail || 'Reset failed', variant: 'destructive' });
                      }
                    }}>Confirm Reset</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Auctions */}
        <Card className="bg-white dark:bg-slate-900 border-0 shadow-cricket">
          <CardHeader>
            <CardTitle>Recent Auctions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recent_auctions.map((auction) => (
                <div 
                  key={auction.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{auction.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={
                          auction.status === 'live' ? 'default' : 
                          auction.status === 'waiting' ? 'secondary' : 'outline'
                        }
                      >
                        {auction.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {auction.participants_count} participants
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {auction.status === 'waiting' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartAuction(auction.id)}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {(auction.status === 'live' || auction.status === 'completed') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset Auction?</AlertDialogTitle>
                            <p className="text-sm text-muted-foreground mt-2">This will remove all team assignments, transactions and bids for this auction. This action is destructive and cannot be undone.</p>
                          </AlertDialogHeader>
                          <div className="mt-4 flex justify-end">
                            <Button variant="outline" className="mr-2" onClick={() => {}}>
                              Cancel
                            </Button>
                            <AlertDialogAction asChild>
                              <Button onClick={() => handleResetAuction(auction.id)} className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400">Reset</Button>
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
              
              {data.recent_auctions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No auctions created yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="bg-white dark:bg-slate-900 border-0 shadow-cricket">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recent_users.filter(user => user.username && user.username.toLowerCase() !== 'admin' && user.team_name !== null && user.team_name !== undefined).map((user) => (
                <div 
                  key={user.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{user.username} • {user.team_name}
                    </p>
                  </div>
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
              
              {data.recent_users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No users registered yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}