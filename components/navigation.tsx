'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Eye, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/constraints', label: 'אילוצים', icon: Calendar },
  { href: '/view', label: 'צפייה בסידור', icon: Eye },
  { href: '/commander', label: 'מפקד', icon: Shield },
];

export function Navigation() {
  const pathname = usePathname();
  
  return (
    <nav className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-primary">
            מערכת שיבוצים
          </Link>
          
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
