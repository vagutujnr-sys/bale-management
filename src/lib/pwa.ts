export const pwaApps = {
  farmer: { name: "Farmer App", shortName: "Farmer" },
  driver: { name: "Driver/Transporter App", shortName: "Driver" },
  contracting: { name: "Contracting App", shortName: "Contracting" },
  gate: { name: "Gate Operations", shortName: "Gate" },
  transport: { name: "Transport App", shortName: "Transport" },
  quality: { name: "Quality Control", shortName: "Quality" },
  finance: { name: "Finance App", shortName: "Finance" },
  warehouse: { name: "Warehouse App", shortName: "Warehouse" },
  admin: { name: "Main Administration", shortName: "Admin" },
  workstation: { name: "Operations Workstation", shortName: "Workstation" },
} as const;

export type PwaApp = keyof typeof pwaApps;

export function pwaMeta(app: PwaApp) {
  const config = pwaApps[app];
  return [
    { name: "application-name", content: config.name },
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    { name: "apple-mobile-web-app-title", content: config.shortName },
  ];
}

export function pwaLinks(app: PwaApp) {
  return [
    { rel: "manifest", href: `/pwa/${app}.webmanifest` },
    { rel: "icon", href: `/pwa/${app}-192.png`, type: "image/png", sizes: "192x192" },
    { rel: "apple-touch-icon", href: `/pwa/${app}-180.png`, sizes: "180x180" },
  ];
}
