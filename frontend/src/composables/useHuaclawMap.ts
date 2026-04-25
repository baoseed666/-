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
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(route))));
  window.open(`${HUACLAW_ORIGIN}/?koumen=${encoded}`, '_blank');
}
