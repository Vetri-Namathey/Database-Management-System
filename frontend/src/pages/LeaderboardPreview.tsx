import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Award, Medal, Star, Loader2, Users, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrencyCrore } from '@/lib/formatCurrency';

interface Player {
  id: number;
  name: string;
  role: string;
  purchase_price: number;
}

interface TeamData {
  rank: number;
  user_id: number;
  username: string;
  team_name: string;
  players_count: number;
  total_spent: number;
  remaining_balance: number;
  efficiency: number;
  ai_analysis: string;
  created_at: string | null;
}

interface LeaderboardResponse {
  auction_id: number;
  auction_name: string;
  total_teams: number;
  data_source: string;
  leaderboard: TeamData[];
  message?: string;
}



const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="h-6 w-6 text-yellow-500" />;
    case 2: return <Trophy className="h-6 w-6 text-gray-400" />;
    case 3: return <Award className="h-6 w-6 text-amber-600" />;
    default: return <Medal className="h-5 w-5 text-purple-500" />;
  }
};

const getRankBadgeColor = (rank: number) => {
  switch (rank) {
    case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    case 3: return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
    case 4:
    case 5: return 'bg-gradient-to-r from-purple-400 to-purple-600 text-white';
    default: return 'bg-gradient-to-r from-purple-300 to-purple-500 text-white';
  }
};

export default function LeaderboardPreview() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leaderboard/latest');
      setLeaderboardData(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch leaderboard:', err);
      setError(err.response?.data?.detail || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-100 dark:from-slate-900 dark:via-purple-900 dark:to-indigo-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-xl">
              <Trophy className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 dark:from-purple-400 dark:via-pink-400 dark:to-purple-300 bg-clip-text text-transparent">
              Leaderboard
            </h1>
          </div>
          <p className="text-lg md:text-xl text-gray-700 dark:text-slate-300 max-w-2xl mx-auto">
            Final rankings based on team OVR (Overall Rating) calculated from player performance. Best strategists win!
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mb-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm font-medium ml-2">Loading leaderboard...</span>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-lg">
                Fetching team rankings and calculating OVR scores...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-4">
                <Trophy className="h-6 w-6" />
                <span className="text-sm font-medium ml-2">Failed to load leaderboard</span>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-lg mb-6">
                {error}
              </p>
              <Button 
                onClick={fetchLeaderboard}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Star className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Auction Status Card */}
        {leaderboardData && !loading && (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mb-4">
                <Trophy className="h-6 w-6" />
                <span className="text-sm font-medium ml-2">
                  {leaderboardData.auction_name} - COMPLETED
                </span>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-lg mb-4">
                Final OVR-based rankings automatically saved when auction ended. Teams ranked by Overall Rating from player performance.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{leaderboardData.total_teams} Teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>OVR Based</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Real Leaderboard */}
        {leaderboardData && leaderboardData.leaderboard.length > 0 && (
          <div className="space-y-6">

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {leaderboardData.leaderboard.slice(0, 3).map((team, index) => (
                <Card key={team.rank} className={`relative overflow-hidden border-0 shadow-xl transform hover:scale-105 transition-all duration-300 ${
                  index === 0 ? 'md:order-2 md:-mt-4' : index === 1 ? 'md:order-1' : 'md:order-3'
                }`}>
                  <div className={`absolute top-0 left-0 right-0 h-2 ${
                    team.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    team.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                    'bg-gradient-to-r from-amber-400 to-amber-600'
                  }`} />
                  
                  <CardContent className="p-6 text-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                    <div className="flex items-center justify-center mb-4">
                      {getRankIcon(team.rank)}
                    </div>
                    
                    <Badge className={`${getRankBadgeColor(team.rank)} mb-3 px-3 py-1`}>
                      {team.rank === 1 ? 'Champion' : team.rank === 2 ? 'Runner-up' : 'Third Place'}
                    </Badge>
                    
                    <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-1">
                      {team.username}
                    </h3>
                    <p className="text-purple-600 dark:text-purple-400 font-medium mb-3">
                      {team.team_name}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-slate-400">Efficiency:</span>
                        <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                          {team.efficiency.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-slate-400">Players:</span>
                        <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                          {team.players_count}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-slate-400">Spent:</span>
                        <span className="font-bold text-sm text-green-600 dark:text-green-400">
                          {formatCurrencyCrore(team.total_spent)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Complete Rankings */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl md:text-3xl text-center bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Top 10 Team Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboardData.leaderboard.slice(0, 10).map((team) => (
                    <div 
                      key={team.rank} 
                      className={`group relative overflow-hidden flex items-center justify-between p-3 md:p-4 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] ${
                        team.rank <= 3 
                          ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-700 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-800/40 dark:hover:to-pink-800/40 hover:border-purple-300 dark:hover:border-purple-500' 
                          : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 border border-transparent hover:border-purple-200 dark:hover:border-purple-600'
                      }`}
                    >
                      {/* Subtle glow effect on hover */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                      
                      <div className="relative flex items-center gap-3 md:gap-4">
                        <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg text-sm md:text-base transition-all duration-300 group-hover:shadow-2xl group-hover:scale-110 group-hover:rotate-3">
                          {team.rank}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base md:text-lg text-gray-800 dark:text-slate-100 truncate transition-colors duration-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                              {team.username}
                            </span>
                            <Badge className={`${getRankBadgeColor(team.rank)} text-xs flex-shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg`}>
                              {team.rank === 1 ? 'Champion' : team.rank === 2 ? 'Runner-up' : team.rank === 3 ? 'Third Place' : 'Top Team'}
                            </Badge>
                          </div>
                          <p className="text-purple-600 dark:text-purple-400 font-medium text-sm md:text-base truncate transition-colors duration-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                            {team.team_name}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-slate-300">
                            {team.players_count} players • Spent: {formatCurrencyCrore(team.total_spent)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative text-right flex-shrink-0">
                        <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 transition-all duration-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 group-hover:scale-110">
                          {team.efficiency.toFixed(2)}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-slate-400 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-slate-300">Efficiency</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 mt-1 transition-all duration-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 group-hover:font-semibold">
                          ₹{team.remaining_balance.toFixed(1)}cr left
                        </div>
                        
                        {/* Animated indicator for top 3 */}
                        {team.rank <= 3 && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Team Statistics Summary */}
                <div className="mt-8 p-6 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-xl">
                  <h3 className="text-lg font-bold text-center text-purple-800 dark:text-purple-200 mb-4">
                    Tournament Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-purple-600">Teams</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">{leaderboardData.total_teams}</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">Avg Efficiency</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">
                        {(leaderboardData.leaderboard.reduce((sum, team) => sum + team.efficiency, 0) / leaderboardData.leaderboard.length).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">Total Spent</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">
                        {formatCurrencyCrore(leaderboardData.leaderboard.reduce((sum, team) => sum + team.total_spent, 0))}
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-orange-600">Top Efficiency</div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">
                        {leaderboardData.leaderboard[0]?.efficiency.toFixed(2) || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Data Message */}
        {!loading && !leaderboardData?.leaderboard.length && (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mb-4">
                <Trophy className="h-6 w-6" />
                <span className="text-sm font-medium ml-2">No team data available</span>
              </div>
              <p className="text-gray-600 dark:text-slate-400 text-lg">
                No teams found for this auction. Teams will appear here after players are purchased in auctions.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
