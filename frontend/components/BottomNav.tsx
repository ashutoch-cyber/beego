'use client';

import { Home, Camera, PlusCircle, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/scan', label: 'Scan', icon: Camera },
  { href: '/log', label: 'Log', icon: PlusCircle },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#dce8e1] bg-white/95 shadow-[0_-8px_30px_rgba(15,65,38,0.08)] backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-full w-16 flex-col items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'text-[#2D6A4F] -translate-y-1'
                  : 'text-[#8aa093] hover:text-[#315743]'
              }`}
            >
              <div className={`rounded-2xl p-2 transition-all ${isActive ? 'bg-[#e5f5ec] shadow-sm' : ''}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`mt-0.5 text-[10px] font-extrabold ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
