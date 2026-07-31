'use client';

import Link from 'next/link';
import { Calendar, Eye, Shield, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/navigation';

const features = [
  {
    href: '/view',
    icon: Eye,
    title: 'צפייה בסידור',
    description: 'צפה בסידור השבועי המפורסם',
    color: 'bg-emerald-500',
  },
  {
    href: '/constraints',
    icon: Calendar,
    title: 'הגשת אילוצים',
    description: 'הגש את האילוצים שלך לשבוע הקרוב',
    color: 'bg-blue-500',
  },
  {
    href: '/commander',
    icon: Shield,
    title: 'ממשק מפקד',
    description: 'ניהול שיבוצים (דורש סיסמה)',
    color: 'bg-amber-500',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              מערכת שיבוצים
            </h1>
            <p className="text-xl text-muted-foreground">
              ניהול משמרות ושיבוצים בצורה פשוטה ויעילה
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="flex items-center justify-between">
                        {feature.title}
                        <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:translate-x-[-4px] transition-transform" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-muted/50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">איך זה עובד?</h2>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">1</span>
                <span>חיילים מגישים את האילוצים שלהם דרך מסך האילוצים</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">2</span>
                <span>המפקד רואה את האילוצים ומשבץ את החיילים במסך הניהול</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">3</span>
                <span>לאחר השלמת השיבוצים, המפקד מפרסם את הסידור</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">4</span>
                <span>כולם יכולים לצפות בסידור המפורסם במסך הצפייה</span>
              </li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
