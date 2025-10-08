import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Theme</div>
                <div className="text-sm text-muted-foreground">Toggle dark/light theme (placeholder)</div>
              </div>
              <Button variant="outline">Toggle</Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Notifications</div>
                <div className="text-sm text-muted-foreground">Enable or disable auction notifications</div>
              </div>
              <Button variant="outline">Manage</Button>
            </div>

            <div className="pt-4">
              <Button className="bg-red-600 text-white">Dangerous: Reset local preferences</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
