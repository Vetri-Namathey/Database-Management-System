import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, TrendingUp, TrendingDown, Plus, ArrowUpCircle, ArrowDownCircle, History, Filter, Calendar, DollarSign, Banknote, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { formatCurrencyCrore } from '@/lib/formatCurrency';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  category: string;
}

interface WalletStats {
  currentBalance: number;
  totalSpent: number;
  totalAdded: number;
  monthlySpent: number;
  startingBudget?: number;
  totalBalance?: number;
  mainWalletBalance?: number;
}

export default function WalletPage() {
  const { toast } = useToast();
  // Use auth store to get current user/wallet if available
  const authUser = (localStorage.getItem('cricbid_user') ? JSON.parse(localStorage.getItem('cricbid_user') as string) : null);
  // Default starting budget values will be normalized inside fetchWalletData
  const [walletStats, setWalletStats] = useState<WalletStats>({
    currentBalance: authUser?.wallet_balance ?? 100.0,
    totalSpent: 0.0,
    totalAdded: 0.0,
    monthlySpent: 0.0,
    startingBudget: 100.0
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  useEffect(() => {
    // When auth user in localStorage changes (e.g., after finalize), recompute wallet view
    const listener = () => {
      // Re-fetch wallet data which will re-evaluate the startingBudget based on DB wallet
      fetchWalletData();
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      // Re-read the current auth user from localStorage so updates are picked up
      const stored = localStorage.getItem('cricbid_user');
      const currentAuth = stored ? JSON.parse(stored as string) : null;

      // Fetch transactions for current user if available
      if (currentAuth && currentAuth.id) {
        try {
          const txRes = await api.get(`/users/${currentAuth.id}/transactions`);
          const txs = txRes.data.map((t: any) => ({
            id: t.id,
            type: t.amount < 0 ? 'debit' : 'credit',
            amount: Math.abs(t.amount),
            description: t.type === 'debit' ? 'Auction Purchase' : 'Top-up',
            date: t.created_at || new Date().toISOString(),
            status: 'completed',
            category: t.player_id ? 'auction' : 'topup'
          } as Transaction));
          setTransactions(txs);

          // Fetch fresh user profile from server to get authoritative total balance
          let totalBalanceVal = currentAuth.wallet_balance;
          try {
            const userRes = await api.get(`/user/${currentAuth.username}`);
            if (userRes?.data?.wallet_balance !== undefined) {
              totalBalanceVal = userRes.data.wallet_balance;
            }
          } catch (err) {
            // fall back to local value
          }

          // Fetch main wallet balance
          let mainWalletBalance = 6500; // Default
          try {
            const mainWalletRes = await api.get(`/users/${currentAuth.id}/main-wallet-balance`);
            if (mainWalletRes?.data?.main_wallet_balance !== undefined) {
              mainWalletBalance = mainWalletRes.data.main_wallet_balance;
            }
          } catch (err) {
            console.warn('Failed to fetch main wallet balance:', err);
          }

          // Determine starting budget for per-auction active budget. Keep this fixed at 100 Cr after reset.
          const DEFAULT_WALLET = 6500; // matches backend reset default
          const startingBudget = 100.0;

          // Sum debits and credits from transactions
          const totalDebits = txs.filter((x: Transaction) => x.type === 'debit').reduce((s: number, x: Transaction) => s + x.amount, 0);
          const totalCredits = txs.filter((x: Transaction) => x.type === 'credit').reduce((s: number, x: Transaction) => s + x.amount, 0);
          const currentBalance = startingBudget + totalCredits - totalDebits;

          setWalletStats({
            currentBalance,
            totalSpent: totalDebits,
            totalAdded: totalCredits,
            monthlySpent: 0.0,
            startingBudget,
            totalBalance: totalBalanceVal,
            mainWalletBalance
          });
        } catch (e) {
          console.warn('Failed to load transactions:', e);
          setTransactions([]);
        }
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filterType === 'all') return true;
    return transaction.type === filterType;
  });

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (amount > 0) {
      try {
        const stored = localStorage.getItem('cricbid_user');
        const currentAuth = stored ? JSON.parse(stored) : null;
        
        if (!currentAuth || !currentAuth.id) {
          toast({
            title: 'Error',
            description: 'Please login to add money to wallet',
            variant: 'destructive',
          });
          return;
        }

        // Call backend endpoint to add money
        const response = await api.post(`/users/${currentAuth.id}/add-money`, {
          amount: amount
        });

        if (response.data.success) {
          setTopUpAmount('');
          setShowTopUpDialog(false);
          
          // Refresh wallet data to get updated transactions and balances
          await fetchWalletData();
          
          toast({
            title: 'Success',
            description: response.data.message || `${formatCurrencyCrore(amount)} added to your wallet successfully!`,
          });
        } else {
          throw new Error(response.data.message || 'Failed to add money');
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to add money to wallet';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  const getTransactionIcon = (type: string, category: string) => {
    if (type === 'credit') return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
    if (category === 'auction') return <Receipt className="h-5 w-5 text-red-500" />;
    return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 dark:from-slate-900 dark:via-yellow-900 dark:to-amber-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-2xl">
              <Wallet className="h-10 w-10 md:h-12 md:w-12 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-800 dark:from-yellow-400 dark:via-amber-400 dark:to-yellow-300 bg-clip-text text-transparent">
                My Wallet
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 dark:text-slate-300 font-semibold">
                Manage Your Funds
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Auction Balance</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                      {formatCurrencyCrore(walletStats.currentBalance)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      Main Wallet: {formatCurrencyCrore(walletStats.mainWalletBalance ?? 6500)}
                    </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors">
                  <Banknote className="h-6 w-6 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Total Added</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    {formatCurrencyCrore(walletStats.totalAdded)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/30 transition-colors">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Total Spent</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
                    {formatCurrencyCrore(walletStats.totalSpent)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-800/30 transition-colors">
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">This Month</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {formatCurrencyCrore(walletStats.monthlySpent)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/30 transition-colors">
                  <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-slate-100">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Money
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Money to Wallet</DialogTitle>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Available Main Wallet: {formatCurrencyCrore(walletStats.mainWalletBalance ?? 6500)}
                      </p>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Amount (in Crores)</label>
                        <Input
                          type="number"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[25, 50, 100].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            onClick={() => setTopUpAmount(amount.toString())}
                            className="text-sm"
                          >
                            {formatCurrencyCrore(amount)}
                          </Button>
                        ))}
                      </div>
                      <Button onClick={handleTopUp} className="w-full">
                        Add Money
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>


              </CardContent>
            </Card>

            {/* Budget Progress */}
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-slate-100">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Budget Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">Used Budget</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">
                      {walletStats.startingBudget ? ((walletStats.totalSpent / walletStats.startingBudget) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <Progress value={walletStats.startingBudget ? (Math.min((walletStats.totalSpent / walletStats.startingBudget) * 100, 100)) : 0} className="h-3" />
                  <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
                    <span>{formatCurrencyCrore(walletStats.totalSpent)} spent</span>
                    <span>{formatCurrencyCrore(Math.max(0, (walletStats.startingBudget ?? 100) - walletStats.totalSpent))} remaining</span>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Budget Tip</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You have {formatCurrencyCrore(walletStats.currentBalance)} available for bidding. 
                    Consider your strategy before making bids.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl text-gray-800 dark:text-slate-100">
                  <span className="flex items-center gap-2">
                    <History className="h-5 w-5 text-blue-500" />
                    Transaction History
                  </span>
                  <div className="flex items-center gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="debit">Debit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 bg-gray-50/80 dark:bg-slate-700/50 rounded-xl border border-gray-200/50 dark:border-slate-600/50 hover:bg-white/90 dark:hover:bg-slate-600/60 hover:border-blue-300/50 dark:hover:border-blue-600/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white dark:bg-slate-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                            {getTransactionIcon(transaction.type, transaction.category)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              {transaction.description}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                              {new Date(transaction.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} group-hover:scale-105 transition-transform`}>
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrencyCrore(transaction.amount)}
                          </p>
                          <Badge className={`${getStatusColor(transaction.status)} text-xs group-hover:scale-105 transition-transform`}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-slate-400">No transactions found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Security Notice */}
        <Card className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 backdrop-blur-sm border border-yellow-300/30 dark:border-yellow-600/30 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">
                  Secure Transactions
                </h3>
                <p className="text-gray-700 dark:text-slate-300">
                  All transactions are encrypted and secure. Your wallet balance is protected with 
                  industry-standard security measures. Never share your login credentials with anyone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
