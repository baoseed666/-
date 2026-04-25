export interface KoumenStop {
  seq: number;
  time?: string;
  name: string;
  activity: string;
  cost: number;
  save?: number;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface KoumenRoute {
  type: 'challenge' | 'emotion';
  title: string;
  totalSave?: number;
  totalCost?: number;
  stops: KoumenStop[];
}

const HUACLAW_ORIGIN = 'http://localhost:5174';

export function openInHuaclawMap(route: KoumenRoute): void {
  const bytes = new TextEncoder().encode(JSON.stringify(route));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const encoded = btoa(binary);
  window.open(`${HUACLAW_ORIGIN}/?koumen=${encodeURIComponent(encoded)}`, '_blank');
}
