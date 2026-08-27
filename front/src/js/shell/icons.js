const S = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"'

const wrap = (paths, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${S} aria-hidden="true">${paths}</svg>`

export const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/>',
  compass:
    '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.6 5.4-5.4 2.6 2.6-5.4z"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/>',
  pin: '<path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  marker: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  wallet:
    '<rect x="2.5" y="6.5" width="19" height="12" rx="3"/><path d="M16 12.5h5.5M6 6.5V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1.5"/>',
  cloudSun:
    '<circle cx="7.5" cy="7.5" r="2.6"/><path d="M7.5 2.2v1.4M2.2 7.5h1.4M3.7 3.7l1 1M2.9 12l1-.1"/><path d="M9.5 19.5a4 4 0 1 1 .5-7.97A5.3 5.3 0 0 1 20 13.2 3.3 3.3 0 0 1 19.2 19.5H9.5z"/>',
  bag: '<rect x="5" y="8" width="14" height="12" rx="2.5"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  note: '<rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  chart:
    '<path d="M5 20v-8M11 20V6M17 20v-9"/><path d="M3 20h18"/>',
  gear: '<circle cx="12" cy="12" r="3.4"/><path d="M12 2.5v2.6M12 18.9v2.6M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.9 19.1l1.9-1.9M17.2 6.8l1.9-1.9"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-2.3 7-2.3 7h16.6S18 15 18 9z"/><path d="M10.4 20a1.8 1.8 0 0 0 3.2 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 1 1 5.2.9c-.5 1.1-1.6 1.5-2.6 2.3v1.1"/><circle cx="12" cy="17" r="0.4" fill="currentColor"/>',
  logout:
    '<path d="M15 3h6v6M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.8"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  sparkle:
    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  dotsVertical:
    '<circle cx="12" cy="5.2" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="18.8" r="1.5" fill="currentColor" stroke="none"/>',
  trash:
    '<path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.4 2.4 4.6-5.3"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  utensils:
    '<path d="M7 3v6a2 2 0 0 0 2 2v10"/><path d="M5 3v5M9 3v5M17 3c-2 1.5-2.5 4-2.5 6.5S15 13 17 13v8"/>',
  museum: '<path d="M4 21h16M5 21v-8M9 21v-8M15 21v-8M19 21v-8M3 10l9-6 9 6H3z"/>',
  bed: '<path d="M3 19v-8m0 5h18v3m0-3v-2a3 3 0 0 0-3-3h-8v5"/><circle cx="6.5" cy="9.5" r="1.6"/>',
  cup: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/>',
  cart: '<circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.6 12h10.8L21 8H6.2"/>',
  leaf: '<path d="M5 20c8 1 15-5 15-16C9 4 3 11 5 20z"/><path d="M5 20C8 14 12 10 17 7"/>',
  plane: '<path d="M21 3.5L3 10.8l6.7 2.4L12 20l2.3-6.8L21 3.5z"/>',
  bus: '<rect x="4" y="3.5" width="16" height="13.5" rx="3"/><path d="M4 11h16M8 20.5V17M16 20.5V17"/><circle cx="8.4" cy="14" r=".6" fill="currentColor" stroke="none"/><circle cx="15.6" cy="14" r=".6" fill="currentColor" stroke="none"/>',
  target: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3.5 13.5L12 18l8.5-4.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud: '<path d="M6.5 19a5 5 0 1 1 .6-9.97A6.5 6.5 0 0 1 20 10.6 4.2 4.2 0 0 1 19 19H6.5z"/>',
  rain: '<path d="M6.5 15a5 5 0 1 1 .6-9.97A6.5 6.5 0 0 1 20 6.6 4.2 4.2 0 0 1 19 15H6.5z"/><path d="M8 18v2.5M12 17.5V21M16 18v2.5"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  wind: '<path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7a2.5 2.5 0 1 1-2.5 2.5"/>',
  droplet: '<path d="M12 3.5c3.5 4 6 7.2 6 10.3A6 6 0 0 1 6 13.8c0-3.1 2.5-6.3 6-10.3z"/>',
  sunrise: '<path d="M12 4V2M6.3 6.3 4.9 4.9M17.7 6.3l1.4-1.4M4 15h16M8 15a4 4 0 0 1 8 0"/><path d="M2 19h20M12 8v4M9.5 9.5 12 12l2.5-2.5"/>',
  sunset: '<path d="M12 4V2M6.3 6.3 4.9 4.9M17.7 6.3l1.4-1.4M4 15h16M8 15a4 4 0 0 1 8 0"/><path d="M2 19h20M12 12v4M9.5 14.5 12 12l2.5 2.5"/>',
  pushpin: '<path d="M9 3h6"/><path d="M12 3v6"/><path d="M8 13l4-4 4 4v2H8z"/><path d="M12 15v6"/>',
}

export function icon(name, size = 18) {
  return wrap(ICONS[name] || ICONS.marker, size)
}
