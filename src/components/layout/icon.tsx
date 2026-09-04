import {
  BookHeart,
  CalendarHeart,
  Flower2,
  Gamepad2,
  Heart,
  Hourglass,
  Home,
  Images,
  Lock,
  Mail,
  Map,
  Music,
  Route,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  home: Home,
  route: Route,
  images: Images,
  flower: Flower2,
  mail: Mail,
  hourglass: Hourglass,
  star: Star,
  calendar: CalendarHeart,
  map: Map,
  music: Music,
  gamepad: Gamepad2,
  sparkles: Sparkles,
  lock: Lock,
  heart: Heart,
  settings: Settings,
  sliders: SlidersHorizontal,
  book: BookHeart,
}

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Component = MAP[name] ?? Sparkles
  return <Component className={className} aria-hidden />
}
