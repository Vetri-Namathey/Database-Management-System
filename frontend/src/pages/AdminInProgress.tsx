import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel, Users, BarChart3, ArrowRight, Settings, Trophy } from 'lucide-react';

export default function AdminInProgress() {
  const navigate = useNavigate();

  const adminFeatures = [
    {
      title: 'User Management',
      description: 'Manage all registered users, teams, and account settings',
      icon: Users,
      href: '/admin/users',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
    },
    {
      title: 'Auction Management',
      description: 'Create, manage, and monitor all cricket player auctions',
      icon: Gavel,
      href: '/admin/auctions',
      color: 'from-orange-500 to-red-500',
      bgColor: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20'
    },
    {
      title: 'Analytics Dashboard',
      description: 'Comprehensive insights and performance metrics',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
    }
  ];

  return (
  <div className="min-h-screen bg-white dark:bg-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-xl">
              <Settings className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-300 bg-clip-text text-transparent">
              Admin Features
            </h1>
          </div>
          <p className="text-lg text-gray-700 dark:text-slate-300 max-w-2xl mx-auto">
            Comprehensive admin tools to manage your cricket auction platform effectively
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminFeatures.map((feature, index) => (
            <Card key={index} className={`bg-gradient-to-br ${feature.bgColor} backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
              <CardHeader>
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-800 dark:text-slate-100">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
                
                <Button 
                  onClick={() => navigate(feature.href)}
                  className={`w-full bg-gradient-to-r ${feature.color} hover:shadow-lg transition-all duration-300 text-white font-medium`}
                >
                  Access Feature
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">2,845</h3>
              <p className="text-gray-600 dark:text-slate-400 text-sm">Registered Users</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gavel className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">45</h3>
              <p className="text-gray-600 dark:text-slate-400 text-sm">Total Auctions</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">₹1,250</h3>
              <p className="text-gray-600 dark:text-slate-400 text-sm">Total Revenue (Cr)</p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0 shadow-xl">
          <CardContent className="p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Ready to Manage Your Platform?</h2>
            <p className="text-blue-100 mb-6">
              Access all admin features from the navigation menu or use the buttons above to jump directly to any section.
            </p>
            <Button 
              onClick={() => navigate('/admin')}
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8"
            >
              Go to Admin Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
