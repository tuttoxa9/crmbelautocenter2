import React from 'react';

export const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
  </svg>
);

export const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-18.06 7.426a2.2 2.2 0 0 0-.012 4.092l5.065 1.77 1.488 4.708c.112.352.378.618.73.73l4.708 1.488a2.2 2.2 0 0 0 4.092-.012l7.426-18.06a2.242 2.242 0 0 0-.215-1.022c-.173-.173-.4-.28-.646-.328-.246-.048-.501-.02-.734.084v0zM10.87 14.887l-2.072-2.072 9.073-9.073-10.428 10.428-3.957-1.383L20.852 3.864l-6.19 15.034-3.792-3.793z"></path>
  </svg>
);
