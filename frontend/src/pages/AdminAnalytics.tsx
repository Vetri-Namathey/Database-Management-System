import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Gavel, DollarSign, Trophy, Calendar, ArrowUp, ArrowDown, Activity, PieChart, LineChart, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrencyCrore } from '@/lib/formatCurrency';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  revenue: {
    total: number;
    monthly: number;
    growth: number;
  };
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    retention: number;
  };
  auctions: {
    total: number;
    completed: number;
    live: number;
    avgParticipants: number;
  };
  bids: {
    total: number;
    avgAmount: number;
    topBidder: string;
    successRate: number;
  };
}

interface ChartData {
  name: string;
  value: number;
  growth?: number;
}

export default function AdminAnalytics() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueChart, setRevenueChart] = useState<ChartData[]>([]);
  const [userChart, setUserChart] = useState<ChartData[]>([]);
  const [auctionChart, setAuctionChart] = useState<ChartData[]>([]);
  const [topBidders, setTopBidders] = useState<Array<{username: string; spent: number}>>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch real analytics data from backend
      const analyticsResponse = await api.get('/admin/analytics');
      setAnalytics(analyticsResponse.data);
      
  // Populate charts if backend returned charts
  setRevenueChart(analyticsResponse.data.charts?.revenue || []);
  setUserChart(analyticsResponse.data.charts?.users || []);
  setAuctionChart(analyticsResponse.data.charts?.auctions || []);
  setTopBidders(analyticsResponse.data.bids?.topBidders || []);
    } catch (error) {
      // If analytics endpoint doesn't exist, show empty data
      const emptyAnalytics: AnalyticsData = {
        revenue: {
          total: 0,
          monthly: 0,
          growth: 0
        },
        users: {
          total: 0,
          active: 0,
          newThisMonth: 0,
          retention: 0
        },
        auctions: {
          total: 0,
          completed: 0,
          live: 0,
          avgParticipants: 0
        },
        bids: {
          total: 0,
          avgAmount: 0,
          topBidder: 'N/A',
          successRate: 0
        }
      };
      setAnalytics(emptyAnalytics);
      setRevenueChart([]);
      setUserChart([]);
      setAuctionChart([]);
      
      toast({
        title: 'Info',
        description: 'Analytics data will be available once auctions are created',
        variant: 'default',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
  <div className="min-h-screen bg-white dark:bg-slate-900 p-4 md:p-6">
        <div className="space-y-6">
          <div className="h-16 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl" />
            <div className="h-96 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-slate-900 dark:via-green-900 dark:to-emerald-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-xl">
                <BarChart3 className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-800 dark:from-green-400 dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
            </div>
            <p className="text-lg text-gray-700 dark:text-slate-300">
              Comprehensive insights and performance metrics
            </p>
          </div>        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrencyCrore(analytics.revenue.total)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {analytics.revenue.growth}%
                    </span>
                    <span className="text-sm text-gray-600 dark:text-slate-400">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Users</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {analytics.users.total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {analytics.users.active.toLocaleString()} active
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/30 transition-colors">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Auctions</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {analytics.auctions.total}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Activity className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                      {analytics.auctions.live} live now
                    </span>
                  </div>
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
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Bids</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {analytics.bids.total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      {analytics.bids.successRate}% success rate
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/30 transition-colors">
                  <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Bidders */}
        <div className="mt-6">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800 dark:text-slate-100">Top Bidders</CardTitle>
            </CardHeader>
            <CardContent>
              {topBidders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {topBidders.map((tb, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/70 dark:bg-slate-800 rounded border">
                      <div>
                        <p className="font-medium">{tb.username}</p>
                        <p className="text-xs text-muted-foreground">Total Spent</p>
                      </div>
                      <div className="font-semibold text-green-600">{formatCurrencyCrore(tb.spent)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bidder data</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trends */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-slate-100">
                <LineChart className="h-5 w-5 text-green-500" />
                Revenue Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {revenueChart.length > 0 ? (
                revenueChart.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                          {formatCurrencyCrore(item.value)}
                        </span>
                        {item.growth && (
                          <Badge className={`${
                            item.growth > 0 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          } text-xs`}>
                            {item.growth > 0 ? '+' : ''}{item.growth}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={(item.value / Math.max(...revenueChart.map(r => r.value))) * 100} 
                      className="h-2" 
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No revenue data available yet</p>
                  <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                    Start some auctions to see revenue trends
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-slate-100">
                <PieChart className="h-5 w-5 text-blue-500" />
                User Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userChart.length > 0 ? (
                userChart.map((item, index) => {
                  const colors = ['bg-blue-500', 'bg-gray-500', 'bg-green-500'];
                  const bgColors = ['bg-blue-100 dark:bg-blue-900/20', 'bg-gray-100 dark:bg-gray-900/20', 'bg-green-100 dark:bg-green-900/20'];
                  const textColors = ['text-blue-700 dark:text-blue-300', 'text-gray-700 dark:text-gray-300', 'text-green-700 dark:text-green-300'];
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                          {item.value.toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={(item.value / analytics.users.total) * 100} 
                        className="h-2" 
                      />
                      <div className={`text-center py-2 rounded ${bgColors[index % bgColors.length]}`}>
                        <span className={`text-xs font-medium ${textColors[index % textColors.length]}`}>
                          {((item.value / analytics.users.total) * 100).toFixed(1)}% of total users
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No user distribution data available</p>
                  <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                    User activity data will appear here once users start participating
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-slate-100">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-400">User Retention Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">{analytics.users.retention}%</span>
                </div>
                <Progress value={analytics.users.retention} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-400">Bid Success Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">{analytics.bids.successRate}%</span>
                </div>
                <Progress value={analytics.bids.successRate} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-slate-400">Avg Auction Participation</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {analytics.auctions.avgParticipants}/50
                  </span>
                </div>
                <Progress value={(analytics.auctions.avgParticipants / 50) * 100} className="h-2" />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Average Bid Amount</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrencyCrore(analytics.bids.avgAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auction Categories */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-slate-100">
                <Trophy className="h-5 w-5 text-purple-500" />
                Auction Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {auctionChart.length > 0 ? (
                auctionChart.map((item, index) => {
                  const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                          {item.value}
                        </span>
                      </div>
                      <Progress 
                        value={(item.value / analytics.auctions.total) * 100} 
                        className="h-2" 
                      />
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No auction categories data available</p>
                  <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                    Create auctions to see category breakdown
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 dark:text-slate-100">
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-green-700 dark:text-green-300 mb-1">Revenue Growth</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">+{analytics.revenue.growth}%</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {analytics.revenue.growth === 0 ? 'No data yet' : 'This month'}
                </p>
              </div>

              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">New Users</h3>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.users.newThisMonth}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {analytics.users.newThisMonth === 0 ? 'None yet' : 'This month'}
                </p>
              </div>

              <div className="text-center p-4 bg-teal-50 dark:bg-teal-900/10 rounded-lg">
                <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-teal-700 dark:text-teal-300 mb-1">Top Bidder</h3>
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{analytics.bids.topBidder}</p>
                <p className="text-sm text-teal-600 dark:text-teal-400">
                  {analytics.bids.topBidder === 'N/A' ? 'No bids yet' : 'Most active'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
