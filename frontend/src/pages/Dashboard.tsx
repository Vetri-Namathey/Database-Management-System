import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Users, Trophy, Gavel } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  wallet_balance: number;
  team_summary: {
    total_players: number;
    total_spent: number;
    remaining_budget: number;
    by_role: {
      [key: string]: number;
    };
  };
  active_auction?: {
    id: number;
    name: string;
    status: string;
    participants_count: number;
  };
  recent_activity: Array<{
    id: number;
    type: string;
    description: string;
    amount?: number;
    created_at: string;
  }>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get username from localStorage or auth store
      const storedUser = localStorage.getItem('cricbid_user');
      const username = storedUser ? JSON.parse(storedUser).username : null;
      if (!username) throw new Error('No user found');
      const response = await api.get(`/users/dashboard?username=${encodeURIComponent(username)}`);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Wallet Balance"
          value={formatCurrency(data.wallet_balance)}
          icon={Wallet}
          variant="success"
          description="Available for bidding"
        />
        
        <StatCard
          title="Team Players"
          value={data.team_summary.total_players}
          icon={Users}
          variant="info"
          description="Players acquired"
        />
        
        <StatCard
          title="Total Spent"
          value={formatCurrency(data.team_summary.total_spent)}
          icon={Trophy}
          variant="warning"
          description="In all auctions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Overview */}
        <Card className="gradient-card border-0 shadow-cricket">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Team Composition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.team_summary.by_role).map(([role, count]) => (
                <div key={role} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              
              {data.team_summary.total_players === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No players acquired yet</p>
                  <p className="text-sm">Join an auction to start building your team</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-border">
              <Button 
                className="w-full" 
                onClick={() => navigate('/team')}
                variant="outline"
              >
                View Full Team
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Auction or Quick Actions */}
        <Card className="gradient-card border-0 shadow-cricket">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              {data.active_auction ? 'Active Auction' : 'Quick Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.active_auction && data.active_auction.status === 'waiting' ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{data.active_auction.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="secondary"
                      className="relative"
                    >
                      <span className="flex items-center gap-1">
                        Waiting
                        <span className="flex gap-0.5 ml-1">
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
                        </span>
                      </span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {data.active_auction.participants_count} participants
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    className="w-full"
                    onClick={() => navigate(`/auctions/${data.active_auction!.id}/waiting-room`)}
                  >
                    Join Waiting Room
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/auctions')}
                  >
                    View All Auctions
                  </Button>
                </div>
              </div>
            ) : data.active_auction && data.active_auction.status === 'live' ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{data.active_auction.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="default"
                    >
                      Live
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {data.active_auction.participants_count} participants
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button 
                    className="w-full"
                    onClick={() => navigate(`/auctions/${data.active_auction!.id}/live`)}
                  >
                    Join Live Auction
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/auctions')}
                  >
                    View All Auctions
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/auctions')}
                >
                  <Gavel className="h-4 w-4 mr-2" />
                  Browse Auctions
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/players')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Explore Players
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/wallet')}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Manage Wallet
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/leaderboard-preview')}
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  View Leaderboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {data.recent_activity.length > 0 && (
        <Card className="gradient-card border-0 shadow-cricket">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recent_activity.slice(0, 5).map((activity) => (
                <div 
                  key={activity.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {activity.amount && (
                    <Badge variant={activity.type === 'spend' ? 'destructive' : 'default'}>
                      {activity.type === 'spend' ? '-' : '+'}{formatCurrency(activity.amount)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}