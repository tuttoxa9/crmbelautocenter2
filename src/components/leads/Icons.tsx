import React from 'react';
import { Globe, Phone, Zap, User } from "lucide-react";

export const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
  </svg>
);

export const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m22 2-7 20-4-9-9-4Z"/>
    <path d="M22 2 11 13"/>
  </svg>
);

export const getSourceIcon = (source: string) => {
  switch (source) {
    case "instagram": return <InstagramIcon className="w-4 h-4 text-pink-600" />;
    case "tiktok": return <TikTokIcon className="w-4 h-4 text-black" />;
    case "telegram": return <TelegramIcon className="w-4 h-4 text-blue-500" />;
    case "site": return <Globe className="w-4 h-4 text-zinc-500" />;
    case "call": return <Phone className="w-4 h-4 text-green-600" />;
    case "zapier": return <Zap className="w-4 h-4 text-orange-500" />;
    case "walk_in": return <User className="w-4 h-4 text-purple-500" />;
    default: return <Globe className="w-4 h-4 text-zinc-400" />;
  }
};
