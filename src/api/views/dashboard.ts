import type { DeviceRecord } from '../../devices/discovery.js';
import type { ProxyRecord } from '../../devices/proxy.js';
import type { ExecutionRecord } from '../../scheduler/queue.js';
import type { ScheduleRecord } from '../../scheduler/schedules.js';
import type { PluginDefinition } from '../../plugins/types.js';

// Precision Lucide/Heroicon SVG Icons (Strictly No Random Emojis)
const ICONS = {
  logo: `<svg class="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  device: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
  controlCenter: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
  schedule: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  proxy: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  queue: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
  plus: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`,
  refresh: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
  sun: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  play: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  pause: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>`,
  trash: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  terminal: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>`,
  battery: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>`,
  settings: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  list: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
  activity: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`
};

export function renderDashboardHtml(data: {
  devices: DeviceRecord[];
  proxies: ProxyRecord[];
  executions: (ExecutionRecord & { assigned_label?: string; model?: string })[];
  schedules: (ScheduleRecord & { assigned_label?: string; model?: string })[];
  plugins: PluginDefinition[];
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Device Control Center • Phone Farm Enterprise</title>
  
  <!-- Premium Fonts: Inter Variable and JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
  <script src="/public/jmuxer.min.js"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            brand: {
              50: '#ecfeff',
              500: '#06b6d4',
              600: '#0891b2',
              700: '#0e7490',
              accent: '#3b82f6',
            }
          }
        }
      }
    }
  </script>
  <style>
    :root {
      color-scheme: dark;
    }
    body {
      background-color: #030509;
      color: #f1f5f9;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }

    /* Precision SaaS B2B Card Styling */
    .b2b-card {
      background: #080d19;
      border: 1px solid #162035;
      border-radius: 0.75rem;
    }

    /* Phone Chassis - Compact & Responsive for 1366x768 screens */
    .phone-chassis {
      position: relative;
      background: #090e1b;
      border: 1px solid #18233c;
      border-radius: 0.875rem;
      box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s ease;
      max-width: 380px;
      width: 100%;
      margin: 0 auto;
    }
    .phone-chassis:hover {
      border-color: #0284c7;
    }

    /* Screen display area: constrained so entire phone card fits on 768p laptops */
    .screen-container {
      position: relative;
      background: #000;
      aspect-ratio: 9 / 19.5;
      width: 100%;
      max-height: 480px;
      overflow: hidden;
      cursor: crosshair;
    }

    @media (max-height: 800px) {
      .screen-container {
        max-height: 380px;
      }
    }

    /* Custom Form Select Elements */
    .custom-select {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      background-size: 0.8rem;
      padding-right: 1.75rem;
    }

    /* Click Ripple Effect */
    @keyframes ripple {
      0% { transform: scale(0.2); opacity: 0.9; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .ripple-dot {
      animation: ripple 0.35s ease-out forwards;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #060911; }
    ::-webkit-scrollbar-thumb { background: #1a253c; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #253556; }
  </style>
</head>
<body class="min-h-screen flex bg-[#030509]">

  <!-- ========================================== -->
  <!-- 1. LEFT SAAS SIDEBAR (COLLAPSIBLE, NO BLOAT) -->
  <!-- ========================================== -->
  <aside id="main-sidebar" class="relative w-52 shrink-0 bg-[#060911] border-r border-[#131b2e] flex flex-col justify-between transition-all duration-300 z-30 select-none">
    
    <!-- Floating Collapse/Expand Button directly ON the border divider line -->
    <button 
      onclick="toggleSidebar()" 
      id="sidebar-toggle-btn" 
      class="absolute -right-3 top-4 z-40 w-6 h-6 rounded-full bg-[#0c1426] border border-[#233554] hover:border-cyan-400 hover:bg-[#132240] text-slate-300 hover:text-white shadow-md flex items-center justify-center transition cursor-pointer" 
      title="Recolher / Expandir Menu"
    >
      <svg id="collapse-icon" class="w-3.5 h-3.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
      </svg>
    </button>

    <div>
      <!-- Top Brand Header with Icon Badge -->
      <div class="h-14 flex items-center px-3 border-b border-[#131b2e]">
        <div class="flex items-center gap-2.5 overflow-hidden w-full" id="sidebar-logo">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-sm shrink-0">
            ${ICONS.logo}
          </div>
          <div class="sidebar-text truncate">
            <span class="font-bold text-xs tracking-wide text-white uppercase">PhoneFarm</span>
            <span class="ml-1 text-[9px] font-mono px-1 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded">PRO</span>
          </div>
        </div>
      </div>

      <!-- Functional Navigation Menu (Direct Links) -->
      <nav class="p-2 space-y-1 text-xs font-medium">
        
        <!-- Control Center (Primary Active) -->
        <a href="#devices-section" class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition" title="Dispositivos">
          <span class="shrink-0 flex items-center justify-center w-5">${ICONS.controlCenter}</span>
          <span class="sidebar-text truncate font-semibold">Dispositivos</span>
        </a>

        <!-- Schedule / Agendador -->
        <a href="#schedules-section" class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0c1324] transition" title="Agendador">
          <span class="shrink-0 flex items-center justify-center w-5 text-amber-400">${ICONS.schedule}</span>
          <span class="sidebar-text truncate">Agendador</span>
        </a>

        <!-- Proxy Management -->
        <a href="#proxies-section" class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0c1324] transition" title="Gerenciador Proxies">
          <span class="shrink-0 flex items-center justify-center w-5 text-purple-400">${ICONS.proxy}</span>
          <span class="sidebar-text truncate">Gerenciador Proxies</span>
        </a>

        <!-- Queue & Execution History -->
        <a href="#executions-section" class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0c1324] transition" title="Fila & Logs">
          <span class="shrink-0 flex items-center justify-center w-5 text-emerald-400">${ICONS.queue}</span>
          <span class="sidebar-text truncate">Fila & Logs</span>
        </a>

      </nav>
    </div>

    <!-- Sidebar Bottom Footer Info -->
    <div class="p-3 border-t border-[#131b2e] bg-[#05070d]">
      <div class="flex items-center justify-between text-[11px] text-slate-400 sidebar-text">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="font-mono text-slate-300">Port 3300</span>
        </div>
        <span class="font-mono text-[10px] text-slate-500">v1.3.1</span>
      </div>
    </div>
  </aside>

  <!-- ========================================== -->
  <!-- 2. MAIN APPLICATION CONTENT VIEWPORT -->
  <!-- ========================================== -->
  <div class="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
    
    <!-- TOP SAAS TOOLBAR (Compact, High Functionality, Zero Fake Buttons) -->
    <header class="sticky top-0 h-14 bg-[#060911]/95 backdrop-blur-md border-b border-[#131b2e] px-4 flex items-center justify-between gap-3 shrink-0 z-20">
      
      <!-- Left side: Title & Active Devices Indicator -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <h2 class="text-xs md:text-sm font-bold text-white tracking-tight uppercase">Control Center</h2>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            60 FPS H.264
          </span>
        </div>

        <div class="h-4 w-[1px] bg-[#1a2540] hidden sm:block"></div>

        <!-- Real Actions: Re-scan USB & Wakeup -->
        <div class="flex items-center gap-1.5">
          <form method="POST" action="/api/devices/scan" class="inline m-0 p-0">
            <button type="submit" class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-200 bg-[#0c1324] hover:bg-[#111a33] border border-[#1a2540] rounded-md transition font-medium" title="Re-escanear conexões USB">
              <span class="text-cyan-400">${ICONS.refresh}</span>
              <span class="text-[11px] hidden sm:inline">Re-escanear USB</span>
            </button>
          </form>

          <button onclick="wakeAllDevices()" class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-200 bg-[#0c1324] hover:bg-[#111a33] border border-[#1a2540] rounded-md transition font-medium" title="Despertar tela de todos os aparelhos">
            <span class="text-amber-400">${ICONS.sun}</span>
            <span class="text-[11px] hidden sm:inline">Despertar Telas</span>
          </button>
        </div>
      </div>

      <!-- Right side: Layout Switcher & Status -->
      <div class="flex items-center gap-2.5 shrink-0">
        
        <div class="flex items-center bg-[#0c1324] border border-[#1a2540] rounded-md p-0.5 text-xs">
          <button onclick="setLayout('grid-2')" id="btn-grid-2" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition font-medium" title="2 Colunas">2 Cols</button>
          <button onclick="setLayout('grid-3')" id="btn-grid-3" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition font-medium" title="3 Colunas">3 Cols</button>
          <button onclick="setLayout('grid-4')" id="btn-grid-4" class="px-2.5 py-1 rounded bg-blue-600/30 text-blue-400 font-semibold transition" title="4 Colunas">4 Cols</button>
          <button onclick="setLayout('list')" id="btn-list" class="px-2 py-1 rounded text-slate-400 hover:text-white transition" title="Modo Lista Horizontal">
            ${ICONS.list}
          </button>
        </div>

        <span id="streaming-indicator" class="text-[11px] text-emerald-400 font-medium hidden md:flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live
        </span>

      </div>
    </header>

    <!-- MAIN SCROLLABLE CONTENT -->
    <main class="flex-1 min-w-0 p-4 md:p-6 space-y-6">

      <!-- Compact Stat Badges (Refreshed via HTMX) -->
      <div id="stats-section" hx-get="/api/dashboard/stats" hx-trigger="every 3s" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${renderStatsHtml(data.devices, data.proxies)}
      </div>

      <!-- ========================================= -->
      <!-- 3. DEVICES SECTION (REAL-TIME 60 FPS CARDS) -->
      <!-- ========================================= -->
      <section id="devices-section" class="space-y-3">
        
        <div class="flex justify-between items-center">
          <h3 class="text-xs font-bold text-slate-300 tracking-wider uppercase font-mono">
            Aparelhos Conectados (${data.devices.length})
          </h3>
          <span class="text-[11px] text-slate-500 font-mono">Clique ou arraste o mouse na tela para interagir</span>
        </div>

        ${
          data.devices.length === 0
            ? `
            <div class="b2b-card p-10 text-center text-slate-400">
              <div class="w-8 h-8 mx-auto mb-2 text-slate-500">${ICONS.device}</div>
              <p class="text-xs font-semibold text-slate-300">Nenhum aparelho conectado</p>
              <p class="text-[11px] mt-1 text-slate-500">Conecte o cabo USB com depuração ativada e clique em Re-escanear USB.</p>
            </div>
          `
            : `
            <!-- GRID VIEW (Device Wall Cards) -->
            <div id="devices-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-all">
              ${data.devices
                .map((device, idx) => {
                  const isOnline = device.status === 'online' || device.status === 'busy';
                  const isBusy = device.status === 'busy';
                  const slotNum = String(idx + 1).padStart(2, '0');

                  return `
                  <div class="phone-chassis" id="device-${device.serial}">
                    
                    <!-- Phone Top Hardware Status Header -->
                    <div class="p-2 bg-[#070b16] border-b border-[#141d33] flex justify-between items-center text-xs select-none">
                      <div class="flex items-center gap-1.5 truncate">
                        <span class="w-2 h-2 rounded-full shrink-0 ${isBusy ? 'bg-amber-400 animate-pulse' : isOnline ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
                        <span class="font-semibold text-white tracking-tight text-[11px] truncate">${device.assigned_label || device.model || 'Galaxy'}</span>
                      </div>
                      
                      <div class="flex items-center gap-1 font-mono text-[9px] shrink-0">
                        <span id="lock-badge-${device.serial}" class="px-1.5 py-0.5 rounded font-mono text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 flex items-center gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Livre
                        </span>
                        <span id="battery-${device.serial}" class="px-1.5 py-0.5 rounded bg-[#0b1020] text-emerald-400 border border-emerald-900/60">
                          ${device.battery_level ? device.battery_level + '%' : '100%'}
                        </span>
                        <span class="px-1.5 py-0.5 rounded bg-[#0b1020] text-slate-300 border border-slate-800">
                          v${device.android_version || '15'}
                        </span>
                      </div>
                    </div>

                    <!-- SCREEN DISPLAY VIEWPORT (Hardware-Accelerated 60 FPS MSE) -->
                    <div 
                      class="screen-container select-none relative bg-black" 
                      id="screen-container-${device.serial}"
                      onmousedown="handleMouseDown(event, '${device.serial}')"
                      onmouseup="handleMouseUp(event, '${device.serial}')"
                    >
                      <!-- Instant snapshot poster loaded immediately -->
                      <img 
                        id="poster-${device.serial}" 
                        src="/api/devices/${device.serial}/screen" 
                        alt="Tela ${device.serial}" 
                        class="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
                      />
                      <!-- Live Video Stream -->
                      <video 
                        id="player-${device.serial}" 
                        class="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" 
                        autoplay 
                        muted 
                        playsinline
                      ></video>
                      <!-- Touch Indicator Ripple -->
                      <div id="touch-dot-${device.serial}" class="hidden absolute w-7 h-7 rounded-full bg-cyan-400/60 border border-white pointer-events-none ripple-dot -translate-x-1/2 -translate-y-1/2 z-20"></div>
                    </div>

                    <!-- Hardware Virtual Navigation Keys -->
                    <div class="p-1.5 bg-[#060a14] border-t border-[#141d33] flex items-center justify-around text-slate-400 select-none">
                      <button onclick="sendKey('${device.serial}', 'back')" title="Voltar" class="p-1.5 rounded hover:bg-slate-800 hover:text-white transition">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <button onclick="sendKey('${device.serial}', 'home')" title="Início" class="p-1.5 rounded hover:bg-slate-800 hover:text-white transition">
                        <div class="w-3 h-3 rounded-full border-2 border-current"></div>
                      </button>
                      <button onclick="sendKey('${device.serial}', 'recents')" title="Recentes" class="p-1.5 rounded hover:bg-slate-800 hover:text-white transition">
                        <div class="w-3 h-3 rounded-sm border-2 border-current"></div>
                      </button>
                      <button onclick="sendKey('${device.serial}', 'wake')" title="Despertar tela" class="p-1.5 rounded hover:bg-slate-800 hover:text-amber-400 transition">
                        ${ICONS.sun}
                      </button>
                    </div>

                    <!-- Phone Bottom Controls: Proxy & Automation -->
                    <div class="p-2.5 bg-[#080d1a] border-t border-[#141d33] space-y-2">
                      
                      <!-- Proxy Assignment -->
                      <form method="POST" action="/api/devices/set-proxy" class="flex items-center gap-1.5">
                        <input type="hidden" name="serial" value="${device.serial}">
                        <select name="proxyId" class="custom-select flex-1 min-w-0 text-[11px] font-mono bg-[#090e1d] border border-[#1a2540] rounded px-2 py-1 text-slate-200 truncate">
                          <option value="">Sem Proxy (Rede Padrão)</option>
                          ${data.proxies
                            .map(
                              (p) => `
                            <option value="${p.id}" ${p.id === device.proxy_id ? 'selected' : ''}>
                              ${p.name} (${p.host}:${p.port})
                            </option>
                          `
                            )
                            .join('')}
                        </select>
                        <button type="submit" class="shrink-0 text-[10px] font-semibold bg-[#121a30] hover:bg-[#1a2544] text-slate-200 px-2 py-1 rounded transition border border-[#1e2c4c]">
                          Salvar
                        </button>
                      </form>

                      <!-- Single-Click Task Execution -->
                      <form method="POST" action="/api/tasks/run-generic" class="flex items-center gap-1.5">
                        <input type="hidden" name="serial" value="${device.serial}">
                        <select name="pluginTask" class="custom-select flex-1 min-w-0 text-[11px] bg-[#050811] border border-[#141d33] rounded px-2 py-1 text-slate-200 truncate">
                          ${data.plugins
                            .flatMap((p) =>
                              p.tasks.map(
                                (t) => `
                            <option value="${p.id}:${t.id}">
                              [${p.name}] ${t.name}
                            </option>
                          `
                              )
                            )
                            .join('')}
                        </select>
                        <button type="submit" ${isBusy ? 'disabled' : ''} class="shrink-0 text-xs font-semibold py-1 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded transition disabled:opacity-50 flex items-center gap-1">
                          ${ICONS.play}
                          <span>Rodar</span>
                        </button>
                      </form>

                    </div>

                  </div>
                `;
                })
                .join('')}
            </div>

            <!-- LIST VIEW (Horizontal table fallback) -->
            <div id="devices-list" class="hidden b2b-card overflow-hidden">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-[#060a14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#141d33] font-mono">
                  <tr>
                    <th class="py-2.5 px-4">Status</th>
                    <th class="py-2.5 px-4">Dispositivo</th>
                    <th class="py-2.5 px-4">Serial</th>
                    <th class="py-2.5 px-4">Android</th>
                    <th class="py-2.5 px-4">Bateria</th>
                    <th class="py-2.5 px-4">Proxy</th>
                    <th class="py-2.5 px-4">Execução Rápida</th>
                    <th class="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#141d33]">
                  ${data.devices
                    .map((d) => {
                      const isOnline = d.status === 'online' || d.status === 'busy';
                      const isBusy = d.status === 'busy';
                      const statusColor = isBusy ? 'text-amber-400' : isOnline ? 'text-emerald-400' : 'text-slate-500';

                      return `
                    <tr class="hover:bg-[#090f20] transition">
                      <td class="py-2.5 px-4">
                        <span class="inline-flex items-center gap-1.5 font-semibold text-[11px] ${statusColor}">
                          <span class="w-2 h-2 rounded-full ${isBusy ? 'bg-amber-400 animate-pulse' : isOnline ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
                          ${d.status.toUpperCase()}
                        </span>
                      </td>
                      <td class="py-2.5 px-4 font-bold text-white">
                        ${d.assigned_label || d.model || 'Aparelho'}
                      </td>
                      <td class="py-2.5 px-4 font-mono text-slate-400">
                        ${d.serial}
                      </td>
                      <td class="py-2.5 px-4 font-mono">
                        v${d.android_version || '15'}
                      </td>
                      <td class="py-2.5 px-4 font-mono text-emerald-400">
                        ${d.battery_level ? d.battery_level + '%' : '100%'}
                      </td>
                      <td class="py-2.5 px-4 font-mono text-purple-400">
                        ${d.proxy_name || '<span class="text-slate-500">Direto</span>'}
                      </td>
                      <td class="py-2.5 px-4">
                        <form method="POST" action="/api/tasks/run-generic" class="flex gap-1.5">
                          <input type="hidden" name="serial" value="${d.serial}">
                          <select name="pluginTask" class="custom-select text-[11px] bg-[#050811] border border-[#141d33] rounded px-2 py-1 text-slate-200">
                            ${data.plugins
                              .flatMap((p) =>
                                p.tasks.map(
                                  (t) => `
                              <option value="${p.id}:${t.id}">[${p.name}] ${t.name}</option>
                            `
                                )
                              )
                              .join('')}
                          </select>
                          <button type="submit" ${isBusy ? 'disabled' : ''} class="px-2 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition disabled:opacity-50">
                            ${ICONS.play}
                          </button>
                        </form>
                      </td>
                      <td class="py-2.5 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button onclick="sendKey('${d.serial}', 'wake')" class="p-1 rounded bg-[#0b1020] hover:bg-[#131d36] text-amber-400 transition" title="Despertar">
                            ${ICONS.sun}
                          </button>
                          <button onclick="setLayout('grid-2')" class="p-1 rounded bg-[#0b1020] hover:bg-[#131d36] text-cyan-400 transition" title="Ver Grid">
                            ${ICONS.device}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
        }
      </section>

      <!-- ========================================= -->
      <!-- 4. TASK SCHEDULER SECTION (AGENDADOR) -->
      <!-- ========================================= -->
      <section id="schedules-section" class="b2b-card p-4 space-y-4">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-[#141d33] pb-2.5">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span class="text-amber-400">${ICONS.schedule}</span>
              Agendador de Tarefas Recorrentes
            </h3>
            <p class="text-[11px] text-slate-400">Programe execuções por intervalo ou horário diário com singleton lock.</p>
          </div>
          <span class="text-[10px] font-mono text-cyan-400 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Scheduler Engine Active
          </span>
        </div>

        <!-- Schedule Creator Form -->
        <form method="POST" action="/api/schedules/create" class="p-3 bg-[#050811] border border-[#141d33] rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-end text-xs">
          <div class="space-y-1">
            <label class="block text-[10px] font-bold text-slate-400 uppercase font-mono">Aparelho</label>
            <select name="deviceSerial" required class="custom-select w-full text-xs font-mono bg-[#090e1d] border border-[#1a2540] rounded px-2.5 py-1.5 text-slate-200">
              ${data.devices
                .map((d) => `<option value="${d.serial}">${d.assigned_label || d.model || 'Aparelho'} (${d.serial})</option>`)
                .join('')}
            </select>
          </div>

          <div class="space-y-1">
            <label class="block text-[10px] font-bold text-slate-400 uppercase font-mono">Tarefa / Plugin</label>
            <select name="pluginTask" required class="custom-select w-full text-xs bg-[#090e1d] border border-[#1a2540] rounded px-2.5 py-1.5 text-slate-200">
              ${data.plugins
                .flatMap((p) =>
                  p.tasks.map(
                    (t) => `
                <option value="${p.id}:${t.id}">[${p.name}] ${t.name}</option>
              `
                  )
                )
                .join('')}
            </select>
          </div>

          <div class="space-y-1">
            <label class="block text-[10px] font-bold text-slate-400 uppercase font-mono">Frequência</label>
            <select name="timingType" id="schedule-timing-type" onchange="handleTimingTypeChange(this.value)" class="custom-select w-full text-xs bg-[#090e1d] border border-[#1a2540] rounded px-2.5 py-1.5 text-slate-200">
              <option value="interval">A cada intervalo (min)</option>
              <option value="daily">Diário (Horário fixo)</option>
              <option value="once">Uma única vez</option>
            </select>
            <input type="text" name="timingConfig" id="schedule-timing-config" value="30" placeholder="Ex: 30" class="w-full text-xs font-mono bg-[#03060d] border border-[#1a2540] rounded px-2.5 py-1 text-slate-200 mt-1">
          </div>

          <div>
            <button type="submit" class="w-full text-xs font-semibold py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center justify-center gap-1.5">
              ${ICONS.plus}
              <span>Criar Agendamento</span>
            </button>
          </div>
        </form>

        <!-- Schedules Table (HTMX live refreshed) -->
        <div id="schedules-container" hx-get="/api/dashboard/schedules" hx-trigger="every 4s" class="overflow-x-auto">
          ${renderSchedulesTable(data.schedules)}
        </div>
      </section>

      <!-- ========================================= -->
      <!-- 5. PROXY MANAGEMENT SECTION -->
      <!-- ========================================= -->
      <section id="proxies-section" class="b2b-card p-4 space-y-4">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-[#141d33] pb-2.5">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span class="text-purple-400">${ICONS.proxy}</span>
              Gerenciador de Proxies & Isolamento de IP
            </h3>
            <p class="text-[11px] text-slate-400">Roteamento HTTP/SOCKS5 com autenticação e relay transparente via ADB reverse.</p>
          </div>
        </div>

        <!-- Add Proxy Form -->
        <form method="POST" action="/api/proxies/create" class="p-3 bg-[#050811] border border-[#141d33] rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 items-end text-xs">
          <div class="space-y-1">
            <label class="block text-[9px] font-bold text-slate-400 uppercase font-mono">Apelido</label>
            <input type="text" name="name" required placeholder="Proxy BR 01" class="w-full bg-[#090e1d] border border-[#1a2540] rounded px-2 py-1 text-slate-200">
          </div>
          <div class="space-y-1">
            <label class="block text-[9px] font-bold text-slate-400 uppercase font-mono">Tipo</label>
            <select name="protocol" class="custom-select w-full bg-[#090e1d] border border-[#1a2540] rounded px-2 py-1 text-slate-200">
              <option value="http">HTTP / HTTPS</option>
              <option value="socks5">SOCKS5</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="block text-[9px] font-bold text-slate-400 uppercase font-mono">Host / IP</label>
            <input type="text" name="host" required placeholder="proxy.com" class="w-full font-mono bg-[#090e1d] border border-[#1a2540] rounded px-2 py-1 text-slate-200">
          </div>
          <div class="space-y-1">
            <label class="block text-[9px] font-bold text-slate-400 uppercase font-mono">Porta</label>
            <input type="number" name="port" required placeholder="8080" class="w-full font-mono bg-[#090e1d] border border-[#1a2540] rounded px-2 py-1 text-slate-200">
          </div>
          <div class="space-y-1">
            <label class="block text-[9px] font-bold text-slate-400 uppercase font-mono">Usuário / Senha</label>
            <div class="flex gap-1">
              <input type="text" name="username" placeholder="user" class="w-1/2 bg-[#090e1d] border border-[#1a2540] rounded px-1.5 py-1 text-slate-200 font-mono text-[10px]">
              <input type="password" name="password" placeholder="pass" class="w-1/2 bg-[#090e1d] border border-[#1a2540] rounded px-1.5 py-1 text-slate-200 font-mono text-[10px]">
            </div>
          </div>
          <div>
            <button type="submit" class="w-full font-semibold py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded transition flex items-center justify-center gap-1">
              ${ICONS.plus}
              <span>Adicionar</span>
            </button>
          </div>
        </form>

        <!-- Proxies List Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-[#060a14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#141d33] font-mono">
              <tr>
                <th class="py-2.5 px-4">Nome</th>
                <th class="py-2.5 px-4">Protocolo</th>
                <th class="py-2.5 px-4">Host:Port</th>
                <th class="py-2.5 px-4">Autenticação</th>
                <th class="py-2.5 px-4">Status</th>
                <th class="py-2.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#141d33]">
              ${
                data.proxies.length === 0
                  ? `<tr><td colspan="6" class="text-center py-5 text-slate-500 font-mono text-xs">Nenhum proxy cadastrado ainda.</td></tr>`
                  : data.proxies
                      .map((p) => {
                        const hasAuth = !!p.username;
                        return `
                    <tr class="hover:bg-[#090f20] transition">
                      <td class="py-2.5 px-4 font-semibold text-white">${p.name}</td>
                      <td class="py-2.5 px-4 uppercase font-mono text-purple-400">${p.protocol}</td>
                      <td class="py-2.5 px-4 font-mono text-slate-300">${p.host}:${p.port}</td>
                      <td class="py-2.5 px-4 font-mono">${hasAuth ? '<span class="text-emerald-400">auth:yes</span>' : '<span class="text-slate-500">none</span>'}</td>
                      <td class="py-2.5 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono ${p.status === 'active' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80' : 'bg-slate-800 text-slate-400'}">
                          ${p.status.toUpperCase()}
                        </span>
                      </td>
                      <td class="py-2.5 px-4 text-right">
                        <form method="POST" action="/api/proxies/delete" onsubmit="return confirm('Remover este proxy?');" class="inline">
                          <input type="hidden" name="id" value="${p.id}">
                          <button type="submit" class="text-rose-400 hover:text-rose-300 transition p-1 rounded hover:bg-slate-800" title="Excluir">
                            ${ICONS.trash}
                          </button>
                        </form>
                      </td>
                    </tr>
                  `;
                      })
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- ========================================= -->
      <!-- 6. EXECUTIONS HISTORY SECTION -->
      <!-- ========================================= -->
      <section id="executions-section" class="b2b-card p-4 space-y-4">
        <div class="flex justify-between items-center border-b border-[#141d33] pb-2.5">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span class="text-emerald-400">${ICONS.activity}</span>
              Fila & Histórico de Execuções
            </h3>
            <p class="text-[11px] text-slate-400">Acompanhamento dos jobs com logs em tempo real via terminal drawer.</p>
          </div>
          <span class="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Queue Polling
          </span>
        </div>

        <div id="executions-container" hx-get="/api/dashboard/executions" hx-trigger="every 2s" class="overflow-x-auto">
          ${renderExecutionsTable(data.executions)}
        </div>
      </section>

    </main>
  </div>

  <!-- ========================================== -->
  <!-- 7. LIVE TERMINAL LOGS DRAWER -->
  <!-- ========================================== -->
  <div id="logs-drawer-backdrop" onclick="closeLogsDrawer()" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 opacity-0 pointer-events-none"></div>
  
  <aside id="logs-drawer" class="fixed top-0 right-0 h-screen w-full max-w-2xl bg-[#03060d] border-l border-[#141d33] shadow-2xl z-50 flex flex-col transition-transform duration-300 translate-x-full">
    
    <div class="p-3.5 border-b border-[#141d33] bg-[#070b16] flex justify-between items-center">
      <div class="flex items-center gap-2.5">
        <span class="text-emerald-400">${ICONS.terminal}</span>
        <div>
          <h4 class="text-xs font-bold text-white flex items-center gap-2">
            Terminal Live Logs
            <span id="drawer-status-badge" class="text-[9px] px-1.5 py-0.2 rounded font-mono bg-blue-950 text-blue-400 border border-blue-800">RUNNING</span>
          </h4>
          <p id="drawer-subtitle" class="text-[10px] font-mono text-slate-400">ID: — • Dispositivo: —</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="toggleAutoScroll()" id="btn-autoscroll" class="px-2 py-0.5 text-[10px] font-mono rounded bg-[#0b1020] text-cyan-300 border border-cyan-800/80 hover:bg-slate-800 transition">
          Auto-scroll: ON
        </button>
        <button onclick="closeLogsDrawer()" class="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs">
          ✕
        </button>
      </div>
    </div>

    <!-- Terminal Body -->
    <div id="terminal-body" class="flex-1 p-4 overflow-y-auto font-mono text-xs text-emerald-400 bg-[#020408] space-y-1 select-text">
      <div class="text-slate-500">Conectando ao stream de logs da execução...</div>
    </div>

    <!-- Terminal Footer -->
    <div class="p-2.5 bg-[#070b16] border-t border-[#141d33] text-[10px] text-slate-500 flex justify-between items-center px-4 font-mono">
      <span id="drawer-timing">—</span>
      <span>Pressione ESC para fechar</span>
    </div>

  </aside>

  <!-- ========================================== -->
  <!-- 8. CLIENT JAVASCRIPT (Tab Recovery, Gestures, Stream) -->
  <!-- ========================================== -->
  <script>
    const activeSerials = ${JSON.stringify(data.devices.map((d) => d.serial))};
    let isListMode = false;
    const jmuxers = {};
    const streamSockets = {};

    // 60 FPS Hardware H.264 Stream via WebSocket + JMuxer (16 Mbps Bitrate)
    function startStream(serial) {
      if (isListMode) return;
      const videoEl = document.getElementById('player-' + serial);
      if (!videoEl) return;

      if (streamSockets[serial]) {
        streamSockets[serial].manualClose = true;
        try { streamSockets[serial].close(); } catch(e) {}
        delete streamSockets[serial];
      }
      if (jmuxers[serial]) {
        try { jmuxers[serial].destroy(); } catch(e) {}
        delete jmuxers[serial];
      }

      try {
        jmuxers[serial] = new JMuxer({
          node: 'player-' + serial,
          mode: 'video',
          flushingTime: 0,
          clearBuffer: true,
          fps: 60,
          debug: false,
          onError: function(data) {
            console.warn('JMuxer error ' + serial + ':', data);
          },
          onReady: function () {
            const v = document.getElementById('player-' + serial);
            if (v) {
              v.muted = true;
              v.play().catch(() => {});
            }
          }
        });
      } catch (err) {
        console.error('JMuxer init error ' + serial + ':', err);
        return;
      }

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = protocol + '//' + location.host + '/stream/' + encodeURIComponent(serial);
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      ws.manualClose = false;
      streamSockets[serial] = ws;

      ws.onmessage = function (event) {
        if (jmuxers[serial]) {
          try {
            jmuxers[serial].feed({
              video: new Uint8Array(event.data)
            });
            const v = document.getElementById('player-' + serial);
            if (v && v.paused) {
              v.play().catch(() => {});
            }
          } catch (e) {
            console.warn('Frame feed warning:', e);
          }
        }
      };

      ws.onclose = function () {
        if (!isListMode && !ws.manualClose && streamSockets[serial] === ws) {
          delete streamSockets[serial];
          setTimeout(() => {
            if (!isListMode && !streamSockets[serial] && !document.hidden) {
              startStream(serial);
            }
          }, 1500);
        }
      };

      ws.onerror = function (err) {
        console.warn('WebSocket error ' + serial + ':', err);
      };
    }

    function stopStreams() {
      Object.keys(streamSockets).forEach((serial) => {
        if (streamSockets[serial]) {
          streamSockets[serial].manualClose = true;
          try { streamSockets[serial].close(); } catch(e) {}
          delete streamSockets[serial];
        }
      });
      Object.keys(jmuxers).forEach((serial) => {
        try { jmuxers[serial].destroy(); } catch(e) {}
        delete jmuxers[serial];
      });
    }

    // TAB VISIBILITY RECOVERY: Fixes transmission pausing or breaking when looking at another site
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab moved to background: close active stream cleanly so buffers do not explode
        stopStreams();
      } else {
        // Tab restored to foreground: immediately reopen fresh stream with 0ms latency and no buffer backlog!
        if (!isListMode) {
          activeSerials.forEach((serial) => startStream(serial));
        }
      }
    });

    // Auto-wake / stall watchdog
    setInterval(() => {
      if (document.hidden || isListMode) return;
      activeSerials.forEach((serial) => {
        const v = document.getElementById('player-' + serial);
        if (v && v.paused && v.readyState >= 2) {
          v.play().catch(() => {});
        }
      });
    }, 3000);

    // Battery Poller Background Loop
    setInterval(async () => {
      try {
        const res = await fetch('/api/dashboard/battery-status');
        if (res.ok) {
          const list = await res.json();
          list.forEach(item => {
            const el = document.getElementById('battery-' + item.serial);
            if (el && item.battery !== null) {
              el.innerText = item.battery + '%';
            }
          });
        }
      } catch {}
    }, 4000);

    // Lock Status Poller (Refreshes lock states every 2.5s)
    setInterval(async () => {
      try {
        const res = await fetch('/api/devices/locks');
        if (res.ok) {
          const locks = await res.json();
          activeSerials.forEach(serial => {
            const lock = locks[serial];
            const badge = document.getElementById('lock-badge-' + serial);
            if (!badge) return;
            if (!lock || lock.state === 'idle') {
              badge.className = 'px-1.5 py-0.5 rounded font-mono text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 flex items-center gap-1';
              badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Livre';
            } else if (lock.state === 'agent_active') {
              badge.className = 'px-1.5 py-0.5 rounded font-mono text-[9px] bg-purple-950/80 text-purple-300 border border-purple-800 flex items-center gap-1';
              badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span> 🤖 Agente <button onclick="resetLock(\\'' + serial + '\\')" class="ml-1 text-[8px] bg-red-900/80 hover:bg-red-700 text-white px-1 py-0.2 rounded font-bold" title="Interromper agente">Parar</button>';
            } else if (lock.state === 'script_running') {
              badge.className = 'px-1.5 py-0.5 rounded font-mono text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1';
              badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> ⚡ Script';
            } else if (lock.state === 'manual_override') {
              badge.className = 'px-1.5 py-0.5 rounded font-mono text-[9px] bg-blue-950/80 text-blue-300 border border-blue-800 flex items-center gap-1';
              badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> 👤 Manual';
            }
          });
        }
      } catch {}
    }, 2500);

    async function resetLock(serial) {
      if (confirm('Deseja interromper o lock atual e liberar o aparelho ' + serial + '?')) {
        await fetch('/api/devices/locks/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serial })
        });
      }
    }

    // Interactive Touch & Gesture Handlers
    const touchState = {};

    function handleMouseDown(event, serial) {
      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      touchState[serial] = {
        startX: (event.clientX - rect.left) / rect.width,
        startY: (event.clientY - rect.top) / rect.height,
        clickPixelX: event.clientX - rect.left,
        clickPixelY: event.clientY - rect.top,
        time: Date.now()
      };
    }

    async function handleMouseUp(event, serial) {
      const state = touchState[serial];
      if (!state) return;
      delete touchState[serial];

      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const endX = (event.clientX - rect.left) / rect.width;
      const endY = (event.clientY - rect.top) / rect.height;
      const duration = Math.min(1000, Math.max(100, Date.now() - state.time));

      const dx = endX - state.startX;
      const dy = endY - state.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const dot = document.getElementById('touch-dot-' + serial);
      if (dot) {
        dot.style.left = state.clickPixelX + 'px';
        dot.style.top = state.clickPixelY + 'px';
        dot.classList.remove('hidden');
        setTimeout(() => dot.classList.add('hidden'), 350);
      }

      if (dist < 0.04) {
        try {
          await fetch('/api/devices/tap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serial, normX: state.startX, normY: state.startY })
          });
        } catch (err) {
          console.error('Tap error:', err);
        }
      } else {
        try {
          await fetch('/api/devices/swipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serial,
              startX: state.startX,
              startY: state.startY,
              endX,
              endY,
              duration
            })
          });
        } catch (err) {
          console.error('Swipe error:', err);
        }
      }
    }

    async function sendKey(serial, key) {
      try {
        await fetch('/api/devices/key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serial, key })
        });
      } catch (err) {
        console.error('Key error:', err);
      }
    }

    async function wakeAllDevices() {
      for (const serial of activeSerials) {
        sendKey(serial, 'wake');
      }
    }

    // Layout Switcher (Grid 2, 3, 4 cols vs List)
    function setLayout(mode) {
      const grid = document.getElementById('devices-grid');
      const list = document.getElementById('devices-list');
      const streamIndicator = document.getElementById('streaming-indicator');
      if (!grid || !list) return;

      ['grid-2', 'grid-3', 'grid-4', 'list'].forEach(m => {
        const btn = document.getElementById('btn-' + m);
        if (btn) btn.className = 'px-2 py-1 rounded text-slate-400 hover:text-white transition';
      });

      const activeBtn = document.getElementById('btn-' + mode);
      if (activeBtn) {
        activeBtn.className = 'px-2.5 py-1 rounded bg-blue-600/30 text-blue-400 font-semibold transition';
      }

      if (mode === 'list') {
        isListMode = true;
        grid.classList.add('hidden');
        list.classList.remove('hidden');
        if (streamIndicator) streamIndicator.classList.add('hidden');
        stopStreams();
      } else {
        isListMode = false;
        list.classList.add('hidden');
        grid.classList.remove('hidden');
        if (streamIndicator) streamIndicator.classList.remove('hidden');

        if (mode === 'grid-2') grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
        else if (mode === 'grid-3') grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
        else if (mode === 'grid-4') grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

        activeSerials.forEach((serial) => startStream(serial));
      }

      localStorage.setItem('farm_layout', mode);
    }

    const savedLayout = localStorage.getItem('farm_layout') || 'grid-4';
    setLayout(savedLayout);

    // Sidebar Collapsible Controller
    function toggleSidebar() {
      const sidebar = document.getElementById('main-sidebar');
      const icon = document.getElementById('collapse-icon');
      const isCollapsed = sidebar.classList.contains('w-16');

      if (isCollapsed) {
        sidebar.classList.remove('w-16');
        sidebar.classList.add('w-52');
        icon.classList.remove('rotate-180');
        document.querySelectorAll('.sidebar-text').forEach(el => el.classList.remove('hidden'));
        localStorage.setItem('farm_sidebar_collapsed', 'false');
      } else {
        sidebar.classList.remove('w-52');
        sidebar.classList.add('w-16');
        icon.classList.add('rotate-180');
        document.querySelectorAll('.sidebar-text').forEach(el => el.classList.add('hidden'));
        localStorage.setItem('farm_sidebar_collapsed', 'true');
      }
    }

    // Default sidebar to collapsed on smaller notebook screens (<= 1366px)
    const isSmallScreen = window.innerWidth <= 1366;
    const userPref = localStorage.getItem('farm_sidebar_collapsed');
    if (userPref === 'true' || (userPref === null && isSmallScreen)) {
      const sidebar = document.getElementById('main-sidebar');
      const icon = document.getElementById('collapse-icon');
      if (sidebar && icon) {
        sidebar.classList.remove('w-52');
        sidebar.classList.add('w-16');
        icon.classList.add('rotate-180');
        document.querySelectorAll('.sidebar-text').forEach(el => el.classList.add('hidden'));
      }
    }

    // Schedule form timing input handler
    function handleTimingTypeChange(val) {
      const input = document.getElementById('schedule-timing-config');
      if (!input) return;
      if (val === 'daily') {
        input.type = 'time';
        input.value = '14:00';
      } else if (val === 'interval') {
        input.type = 'text';
        input.placeholder = 'Ex: 30';
        input.value = '30';
      } else {
        input.type = 'text';
        input.placeholder = 'Imediato';
        input.value = '1';
      }
    }

    // Live Logs Drawer
    let activeLogExecutionId = null;
    let logPollTimer = null;
    let isAutoScroll = true;

    async function openLogsDrawer(executionId) {
      activeLogExecutionId = executionId;
      const drawer = document.getElementById('logs-drawer');
      const backdrop = document.getElementById('logs-drawer-backdrop');
      const body = document.getElementById('terminal-body');

      drawer.classList.remove('translate-x-full');
      backdrop.classList.remove('opacity-0', 'pointer-events-none');
      body.innerHTML = '<div class="text-slate-500 font-mono">Carregando logs da execução ' + executionId + '...</div>';

      fetchLiveLogs();
      if (logPollTimer) clearInterval(logPollTimer);
      logPollTimer = setInterval(fetchLiveLogs, 1500);
    }

    function closeLogsDrawer() {
      const drawer = document.getElementById('logs-drawer');
      const backdrop = document.getElementById('logs-drawer-backdrop');
      drawer.classList.add('translate-x-full');
      backdrop.classList.add('opacity-0', 'pointer-events-none');
      if (logPollTimer) clearInterval(logPollTimer);
      logPollTimer = null;
      activeLogExecutionId = null;
    }

    async function fetchLiveLogs() {
      if (!activeLogExecutionId) return;
      try {
        const res = await fetch('/api/executions/' + activeLogExecutionId + '/live-logs');
        if (!res.ok) return;
        const data = await res.json();

        const badge = document.getElementById('drawer-status-badge');
        const subtitle = document.getElementById('drawer-subtitle');
        const body = document.getElementById('terminal-body');
        const timing = document.getElementById('drawer-timing');

        const statusMap = {
          queued: 'bg-blue-950 text-blue-400 border-blue-800',
          running: 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse',
          succeeded: 'bg-emerald-950 text-emerald-400 border-emerald-800',
          failed: 'bg-rose-950 text-rose-400 border-rose-800',
          stopped: 'bg-slate-900 text-slate-400 border-slate-700',
        };

        if (badge) {
          badge.className = 'text-[9px] px-1.5 py-0.2 rounded font-mono border ' + (statusMap[data.status] || statusMap.stopped);
          badge.innerText = data.status.toUpperCase();
        }

        if (subtitle) {
          subtitle.innerText = 'Tarefa: ' + data.pluginId + '/' + data.taskType + ' • Serial: ' + data.deviceSerial;
        }

        if (timing) {
          timing.innerText = 'Start: ' + (data.startedAt || '—') + (data.finishedAt ? ' • End: ' + data.finishedAt : '');
        }

        if (body) {
          if (data.logs.length === 0) {
            body.innerHTML = '<div class="text-slate-500 font-mono">Nenhum log gravado ainda...</div>';
          } else {
            body.innerHTML = data.logs.map((l, idx) => {
              return '<div class="flex gap-2.5 hover:bg-white/5 py-0.5 px-1 rounded">' +
                '<span class="text-slate-600 select-none text-[10px]">' + String(idx + 1).padStart(3, '0') + '</span>' +
                '<span class="text-slate-500 select-none text-[10px]">[' + l.time.slice(11, 19) + ']</span>' +
                '<span class="text-slate-200 flex-1 break-all">' + escapeHtml(l.line) + '</span>' +
              '</div>';
            }).join('');

            if (data.errorMessage) {
              body.innerHTML += '<div class="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 mt-2 font-mono text-xs">Error: ' + escapeHtml(data.errorMessage) + '</div>';
            }

            if (isAutoScroll) {
              body.scrollTop = body.scrollHeight;
            }
          }
        }

        if (data.finished) {
          if (logPollTimer) clearInterval(logPollTimer);
          logPollTimer = null;
        }
      } catch (err) {
        console.error('Logs fetch error:', err);
      }
    }

    function toggleAutoScroll() {
      isAutoScroll = !isAutoScroll;
      const btn = document.getElementById('btn-autoscroll');
      if (btn) {
        btn.innerText = 'Auto-scroll: ' + (isAutoScroll ? 'ON' : 'OFF');
        btn.className = 'px-2 py-0.5 text-[10px] font-mono rounded border transition ' + (isAutoScroll ? 'bg-[#0b1020] text-cyan-300 border-cyan-800/80' : 'bg-slate-900 text-slate-400 border-slate-700');
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.innerText = text;
      return div.innerHTML;
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLogsDrawer();
    });
  </script>
</body>
</html>`;
}

export function renderStatsHtml(devices: DeviceRecord[], proxies: ProxyRecord[]): string {
  const onlineCount = devices.filter((d) => d.status === 'online' || d.status === 'busy').length;
  const busyCount = devices.filter((d) => d.status === 'busy').length;

  return `
    <div class="b2b-card p-3">
      <p class="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Total Devices</p>
      <p class="text-xl font-extrabold text-white font-mono mt-0.5">${devices.length}</p>
    </div>
    <div class="b2b-card p-3">
      <p class="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Online / Ready</p>
      <p class="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">${onlineCount}</p>
    </div>
    <div class="b2b-card p-3">
      <p class="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Active Jobs</p>
      <p class="text-xl font-extrabold text-amber-400 font-mono mt-0.5">${busyCount}</p>
    </div>
    <div class="b2b-card p-3">
      <p class="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-semibold">Proxies</p>
      <p class="text-xl font-extrabold text-purple-400 font-mono mt-0.5">${proxies.length}</p>
    </div>
  `;
}

export function renderSchedulesTable(schedules: (ScheduleRecord & { assigned_label?: string; model?: string })[]): string {
  return `
    <table class="w-full text-left text-xs text-slate-300">
      <thead class="bg-[#060a14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#141d33] font-mono">
        <tr>
          <th class="py-2.5 px-4">Status</th>
          <th class="py-2.5 px-4">Dispositivo</th>
          <th class="py-2.5 px-4">Plugin / Tarefa</th>
          <th class="py-2.5 px-4">Frequência</th>
          <th class="py-2.5 px-4">Próxima Execução</th>
          <th class="py-2.5 px-4 text-right">Ações</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#141d33]">
        ${
          schedules.length === 0
            ? `<tr><td colspan="6" class="text-center py-5 text-slate-500 font-mono text-xs">Nenhum agendamento programado ainda.</td></tr>`
            : schedules
                .map((s) => {
                  const isActive = s.status === 'active';
                  const freqText =
                    s.timing_type === 'interval'
                      ? `A cada ${s.timing_config} min`
                      : s.timing_type === 'daily'
                      ? `Diário às ${s.timing_config}`
                      : 'Uma vez';

                  return `
              <tr class="hover:bg-[#090f20] transition">
                <td class="py-2 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${isActive ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}">
                    ${s.status.toUpperCase()}
                  </span>
                </td>
                <td class="py-2 px-4">
                  <div class="font-medium text-white">${s.assigned_label || s.model || 'Aparelho'}</div>
                  <div class="text-[10px] font-mono text-slate-500">${s.device_serial}</div>
                </td>
                <td class="py-2 px-4 font-mono text-slate-200">
                  ${s.plugin_id} <span class="text-slate-500">/</span> ${s.task_type}
                </td>
                <td class="py-2 px-4 font-mono text-cyan-400">
                  ${freqText}
                </td>
                <td class="py-2 px-4 font-mono text-slate-300">
                  ${s.next_run_at ? new Date(s.next_run_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                </td>
                <td class="py-2 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <form method="POST" action="/api/schedules/toggle" class="inline">
                      <input type="hidden" name="id" value="${s.id}">
                      <button type="submit" class="px-2 py-0.5 text-[10px] font-medium rounded ${isActive ? 'bg-amber-950/60 text-amber-400 border border-amber-800 hover:bg-amber-900/60' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800 hover:bg-emerald-900/60'} transition">
                        ${isActive ? 'Pausar' : 'Ativar'}
                      </button>
                    </form>
                    <form method="POST" action="/api/schedules/delete" onsubmit="return confirm('Remover este agendamento?');" class="inline">
                      <input type="hidden" name="id" value="${s.id}">
                      <button type="submit" class="p-1 rounded hover:bg-slate-800 text-rose-400 hover:text-rose-300 transition text-xs" title="Excluir">
                        ${ICONS.trash}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            `;
                })
                .join('')
        }
      </tbody>
    </table>
  `;
}

export function renderExecutionsTable(executions: (ExecutionRecord & { assigned_label?: string; model?: string })[]): string {
  return `
    <table class="w-full text-left text-xs text-slate-300">
      <thead class="bg-[#060a14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#141d33] font-mono">
        <tr>
          <th class="py-2.5 px-4">Status</th>
          <th class="py-2.5 px-4">Dispositivo</th>
          <th class="py-2.5 px-4">Plugin / Tarefa</th>
          <th class="py-2.5 px-4">Início</th>
          <th class="py-2.5 px-4">Fim / Duração</th>
          <th class="py-2.5 px-4 text-right">Ação</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#141d33]">
        ${
          executions.length === 0
            ? `<tr><td colspan="6" class="text-center py-5 text-slate-500 font-mono text-xs">Nenhuma execução registrada ainda.</td></tr>`
            : executions
                .map((e) => {
                  const statusMap: Record<string, string> = {
                    queued: 'bg-blue-950/80 text-blue-400 border border-blue-800',
                    running: 'bg-amber-950/80 text-amber-400 border border-amber-800 animate-pulse',
                    succeeded: 'bg-emerald-950/80 text-emerald-400 border border-emerald-800',
                    failed: 'bg-rose-950/80 text-rose-400 border border-rose-800',
                    stopped: 'bg-slate-900 text-slate-400 border border-slate-800',
                  };
                  const statusBadge = statusMap[e.status] || statusMap.stopped;

                  return `
              <tr class="hover:bg-[#090f20] transition">
                <td class="py-2 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${statusBadge}">
                    ${e.status.toUpperCase()}
                  </span>
                </td>
                <td class="py-2 px-4">
                  <div class="font-medium text-white">${e.assigned_label || e.model || 'Aparelho'}</div>
                  <div class="text-[10px] font-mono text-slate-500">${e.device_serial}</div>
                </td>
                <td class="py-2 px-4 font-mono text-slate-200">
                  ${e.plugin_id} <span class="text-slate-500">/</span> ${e.task_type}
                </td>
                <td class="py-2 px-4 font-mono text-slate-400">${e.started_at || e.created_at}</td>
                <td class="py-2 px-4 font-mono text-slate-400">${e.finished_at || (e.status === 'running' ? '<span class="text-amber-400 animate-pulse">Running...</span>' : '—')}</td>
                <td class="py-2 px-4 text-right">
                  <button onclick="openLogsDrawer('${e.id}')" class="px-2 py-0.5 rounded bg-[#0c1324] hover:bg-[#121c35] border border-[#1b2640] text-xs font-mono text-cyan-300 font-medium transition inline-flex items-center gap-1">
                    ${ICONS.terminal}
                    <span>Logs</span>
                  </button>
                </td>
              </tr>
            `;
                })
                .join('')
        }
      </tbody>
    </table>
  `;
}
