import {
  Users,
  Handshake,
  Clapperboard,
  ClipboardCheck,
  CircleDot,
  Wallet,
  FolderClosed,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
};

export const NAV_ITEMS: NavItem[] = [
  { name: "Лиды", href: "/leads", icon: Users, roles: ["admin"] },
  { name: "Комиссия", href: "/commission", icon: Handshake, roles: ["admin", "commission"] },
  { name: "Реклама TikTok", href: "/ads", icon: Clapperboard, roles: ["admin", "commission"] },
  { name: "Контроль качества", href: "/quality", icon: ClipboardCheck, roles: ["admin"] },
  { name: "Мои цели", href: "/goals", icon: CircleDot, roles: ["smm"] },
  { name: "Бюджет", href: "/budget", icon: Wallet, roles: ["admin"] },
  { name: "Файлы", href: "/files", icon: FolderClosed, roles: ["admin"] },
  { name: "Настройки", href: "/settings", icon: Settings2, roles: ["admin"] },
];
