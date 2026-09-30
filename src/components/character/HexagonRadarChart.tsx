import React from 'react';
import { ModifierSource, ModifierBadgeGroup } from './ModifierBadge';

export interface HexStat {
  label: string;
  key?: string;
  value: number;
  base: number;
  bonus: number;
  hasBonus: boolean;
  icon?: any;
  angle?: number;
  sources?: ModifierSource[];
}

export type StatsHexagonTheme = 'base' | 'hero' | 'student' | 'villain' | 'civilian' | 'vigilante';

export interface StatsHexagonThemeConfig {
  id: StatsHexagonTheme;
  name: string;
  gradientId: string;
  gradientStops: Array<{ offset: string; stopColor: string; stopOpacity: number }>;
  polygonStroke: string;
  polygonStrokeWidth: number;
  polygonFilterGlow?: string;
  cornerTopLeft: string;
  cornerTopRight: string;
  cornerFontClass: string;
  outerRing1Stroke: string;
  outerRing2Stroke: string;
  centerCrosshairStroke: string;
  centerDotFill: string;
  gridInnerFillEven: string;
  gridInnerFillOdd: string;
  gridOuterStroke: string;
  gridInnerStroke: string;
  spokeStroke: string;
  vertexDotFill: string;
  vertexDotStroke: string;
  vertexRingStroke: string;
  vertexLabelBg: string;
  vertexLabelBorder: string;
  vertexLabelTextClass: string;
  vertexValueTextClass: string;
  vertexGradeTextClass: string;
  cardBg: string;
  cardBorder: string;
  cardBorderHover: string;
  cardIconClass: string;
  cardGradeBadge: string;
}

export const STATS_HEXAGON_THEMES: Record<StatsHexagonTheme, StatsHexagonThemeConfig> = {
  base: {
    id: 'base',
    name: 'Ficha Base',
    gradientId: 'baseRadarGradient',
    gradientStops: [
      { offset: '0%', stopColor: '#71717a', stopOpacity: 0.5 },
      { offset: '50%', stopColor: '#3f3f46', stopOpacity: 0.35 },
      { offset: '100%', stopColor: '#27272a', stopOpacity: 0.25 },
    ],
    polygonStroke: '#a1a1aa',
    polygonStrokeWidth: 2,
    cornerTopLeft: '┌ EXPEDIENTE // ATRIBUTOS',
    cornerTopRight: 'REGISTRO.OFICIAL ┐',
    cornerFontClass: 'font-mono text-zinc-500/70',
    outerRing1Stroke: 'rgba(161, 161, 170, 0.2)',
    outerRing2Stroke: 'rgba(113, 113, 122, 0.15)',
    centerCrosshairStroke: 'rgba(161, 161, 170, 0.5)',
    centerDotFill: '#a1a1aa',
    gridInnerFillEven: 'rgba(255, 255, 255, 0.02)',
    gridInnerFillOdd: 'rgba(0, 0, 0, 0.35)',
    gridOuterStroke: '#71717a',
    gridInnerStroke: 'rgba(255, 255, 255, 0.1)',
    spokeStroke: 'rgba(161, 161, 170, 0.25)',
    vertexDotFill: '#e4e4e7',
    vertexDotStroke: '#09090b',
    vertexRingStroke: '#71717a',
    vertexLabelBg: 'bg-zinc-900/95',
    vertexLabelBorder: 'border-zinc-700/80',
    vertexLabelTextClass: 'text-zinc-200',
    vertexValueTextClass: 'text-white',
    vertexGradeTextClass: 'text-zinc-400',
    cardBg: 'bg-zinc-950/80',
    cardBorder: 'border-zinc-800/80',
    cardBorderHover: 'hover:border-zinc-500/60',
    cardIconClass: 'text-zinc-400',
    cardGradeBadge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
  hero: {
    id: 'hero',
    name: 'Heroica',
    gradientId: 'heroRadarGradient',
    gradientStops: [
      { offset: '0%', stopColor: '#06b6d4', stopOpacity: 0.65 },
      { offset: '45%', stopColor: '#e11d48', stopOpacity: 0.45 },
      { offset: '100%', stopColor: '#f59e0b', stopOpacity: 0.3 },
    ],
    polygonStroke: '#06b6d4',
    polygonStrokeWidth: 2.5,
    polygonFilterGlow: 'url(#radarGlow)',
    cornerTopLeft: '┌ HUD.RADAR // SYS',
    cornerTopRight: 'SCAN.ACTIVE ┐',
    cornerFontClass: 'font-mono text-cyan-500/50',
    outerRing1Stroke: 'rgba(6, 182, 212, 0.25)',
    outerRing2Stroke: 'rgba(245, 158, 11, 0.15)',
    centerCrosshairStroke: 'rgba(6, 182, 212, 0.6)',
    centerDotFill: '#06b6d4',
    gridInnerFillEven: 'rgba(6, 182, 212, 0.03)',
    gridInnerFillOdd: 'rgba(0, 0, 0, 0.35)',
    gridOuterStroke: '#06b6d4',
    gridInnerStroke: 'rgba(255, 255, 255, 0.12)',
    spokeStroke: 'rgba(6, 182, 212, 0.3)',
    vertexDotFill: '#06b6d4',
    vertexDotStroke: '#0a0a0a',
    vertexRingStroke: '#fbbf24',
    vertexLabelBg: 'bg-zinc-950/90',
    vertexLabelBorder: 'border-cyan-700/80',
    vertexLabelTextClass: 'text-cyan-300',
    vertexValueTextClass: 'text-amber-400',
    vertexGradeTextClass: 'text-zinc-400',
    cardBg: 'bg-zinc-950/80',
    cardBorder: 'border-zinc-800/80',
    cardBorderHover: 'hover:border-cyan-500/50',
    cardIconClass: 'text-cyan-400',
    cardGradeBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  student: {
    id: 'student',
    name: 'Estudiantes',
    gradientId: 'studentRadarGradient',
    gradientStops: [
      { offset: '0%', stopColor: '#3b82f6', stopOpacity: 0.6 },
      { offset: '50%', stopColor: '#6366f1', stopOpacity: 0.4 },
      { offset: '100%', stopColor: '#818cf8', stopOpacity: 0.25 },
    ],
    polygonStroke: '#2563eb',
    polygonStrokeWidth: 2,
    cornerTopLeft: 'UA.EVAL // ACADEMIC',
    cornerTopRight: 'PARAM.SCORES ┐',
    cornerFontClass: 'font-mono text-blue-500/70',
    outerRing1Stroke: 'rgba(37, 99, 235, 0.2)',
    outerRing2Stroke: 'rgba(99, 102, 241, 0.15)',
    centerCrosshairStroke: 'rgba(37, 99, 235, 0.5)',
    centerDotFill: '#2563eb',
    gridInnerFillEven: 'rgba(59, 130, 246, 0.03)',
    gridInnerFillOdd: 'rgba(241, 245, 249, 0.4)',
    gridOuterStroke: '#3b82f6',
    gridInnerStroke: 'rgba(59, 130, 246, 0.15)',
    spokeStroke: 'rgba(37, 99, 235, 0.25)',
    vertexDotFill: '#3b82f6',
    vertexDotStroke: '#ffffff',
    vertexRingStroke: '#93c5fd',
    vertexLabelBg: 'bg-slate-900/90',
    vertexLabelBorder: 'border-blue-400/50',
    vertexLabelTextClass: 'text-blue-200',
    vertexValueTextClass: 'text-sky-300',
    vertexGradeTextClass: 'text-blue-200',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardBorderHover: 'hover:border-blue-400',
    cardIconClass: 'text-blue-600',
    cardGradeBadge: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  villain: {
    id: 'villain',
    name: 'Villanos',
    gradientId: 'villainRadarGradient',
    gradientStops: [
      { offset: '0%', stopColor: '#dc2626', stopOpacity: 0.65 },
      { offset: '50%', stopColor: '#9333ea', stopOpacity: 0.45 },
      { offset: '100%', stopColor: '#450a0a', stopOpacity: 0.3 },
    ],
    polygonStroke: '#ef4444',
    polygonStrokeWidth: 2.5,
    polygonFilterGlow: 'url(#radarGlow)',
    cornerTopLeft: '┌ PELIGROSIDAD // HAZARD',
    cornerTopRight: 'DANGER.METRICS ┐',
    cornerFontClass: 'font-mono text-red-500/60',
    outerRing1Stroke: 'rgba(239, 68, 68, 0.25)',
    outerRing2Stroke: 'rgba(147, 51, 234, 0.2)',
    centerCrosshairStroke: 'rgba(239, 68, 68, 0.6)',
    centerDotFill: '#ef4444',
    gridInnerFillEven: 'rgba(239, 68, 68, 0.03)',
    gridInnerFillOdd: 'rgba(0, 0, 0, 0.4)',
    gridOuterStroke: '#ef4444',
    gridInnerStroke: 'rgba(239, 68, 68, 0.15)',
    spokeStroke: 'rgba(239, 68, 68, 0.3)',
    vertexDotFill: '#ef4444',
    vertexDotStroke: '#000000',
    vertexRingStroke: '#7f1d1d',
    vertexLabelBg: 'bg-black/95',
    vertexLabelBorder: 'border-red-900/80',
    vertexLabelTextClass: 'text-rose-300',
    vertexValueTextClass: 'text-red-400',
    vertexGradeTextClass: 'text-rose-400',
    cardBg: 'bg-black/90',
    cardBorder: 'border-red-950',
    cardBorderHover: 'hover:border-red-600/60',
    cardIconClass: 'text-rose-500',
    cardGradeBadge: 'bg-red-950/80 text-rose-300 border-red-800',
  },
  civilian: {
    id: 'civilian',
    name: 'Civiles',
    gradientId: 'civilianRadarGradient',
    gradientStops: [
      { offset: '0%', stopColor: '#d97706', stopOpacity: 0.5 },
      { offset: '50%', stopColor: '#78350f', stopOpacity: 0.35 },
      { offset: '100%', stopColor: '#451a03', stopOpacity: 0.2 },
    ],
    polygonStroke: '#b45309',
    polygonStrokeWidth: 2,
    cornerTopLeft: 'REGISTRO.CIVIL // BAREMO',
    cornerTopRight: 'FICHA.TECNICA ┐',
    cornerFontClass: 'font-mono text-amber-700/60',
    outerRing1Stroke: 'rgba(217, 119, 6, 0.2)',
    outerRing2Stroke: 'rgba(120, 53, 15, 0.15)',
    centerCrosshairStroke: 'rgba(217, 119, 6, 0.5)',
    centerDotFill: '#d97706',
    gridInnerFillEven: 'rgba(217, 119, 6, 0.03)',
    gridInnerFillOdd: 'rgba(254, 243, 199, 0.3)',
    gridOuterStroke: '#d97706',
    gridInnerStroke: 'rgba(217, 119, 6, 0.15)',
    spokeStroke: 'rgba(217, 119, 6, 0.25)',
    vertexDotFill: '#d97706',
    vertexDotStroke: '#ffffff',
    vertexRingStroke: '#78350f',
    vertexLabelBg: 'bg-stone-900/90',
    vertexLabelBorder: 'border-amber-700/60',
    vertexLabelTextClass: 'text-amber-200',
    vertexValueTextClass: 'text-amber-400',
    vertexGradeTextClass: 'text-amber-300',
    cardBg: 'bg-stone-50',
    cardBorder: 'border-stone-300',
    cardBorderHover: 'hover:border-amber-600',
    cardIconClass: 'text-amber-800',
    cardGradeBadge: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  vigilante: {
    id: 'vigilante',
    name: 'Vigilantes',
    gradientId: 'vigilanteRadarGradient',
    gradientStops: [
      { offset: '0%', stopColor: '#10b981', stopOpacity: 0.55 },
      { offset: '50%', stopColor: '#065f46', stopOpacity: 0.4 },
      { offset: '100%', stopColor: '#022c22', stopOpacity: 0.25 },
    ],
    polygonStroke: '#10b981',
    polygonStrokeWidth: 2.2,
    cornerTopLeft: '┌ RECON.RADAR // VIGILANCIA',
    cornerTopRight: 'TACTICAL.ACTIVE ┐',
    cornerFontClass: 'font-mono text-emerald-500/60',
    outerRing1Stroke: 'rgba(16, 185, 129, 0.25)',
    outerRing2Stroke: 'rgba(5, 150, 105, 0.15)',
    centerCrosshairStroke: 'rgba(16, 185, 129, 0.6)',
    centerDotFill: '#10b981',
    gridInnerFillEven: 'rgba(16, 185, 129, 0.03)',
    gridInnerFillOdd: 'rgba(0, 0, 0, 0.35)',
    gridOuterStroke: '#10b981',
    gridInnerStroke: 'rgba(16, 185, 129, 0.15)',
    spokeStroke: 'rgba(16, 185, 129, 0.3)',
    vertexDotFill: '#10b981',
    vertexDotStroke: '#022c22',
    vertexRingStroke: '#065f46',
    vertexLabelBg: 'bg-zinc-950/90',
    vertexLabelBorder: 'border-emerald-800/80',
    vertexLabelTextClass: 'text-emerald-300',
    vertexValueTextClass: 'text-emerald-400',
    vertexGradeTextClass: 'text-emerald-200',
    cardBg: 'bg-zinc-950/80',
    cardBorder: 'border-emerald-950',
    cardBorderHover: 'hover:border-emerald-600/60',
    cardIconClass: 'text-emerald-400',
    cardGradeBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
  },
};

/**
 * Strict resolution:
 * Recognized groups -> their theme.
 * Unrecognized, null, undefined or empty -> strictly BASE. NEVER HERO!
 */
export function resolveStatsHexagonTheme(themeInput?: string | null): StatsHexagonTheme {
  if (!themeInput) return 'base';
  const lower = themeInput.toLowerCase().trim();
  if (lower === 'hero' || lower === 'heroes' || lower === 'héroes' || lower === 'pro-hero' || lower === 'pro hero') {
    return 'hero';
  }
  if (lower === 'student' || lower === 'estudiantes' || lower === 'estudiante' || lower === 'alumno' || lower === 'alumnos') {
    return 'student';
  }
  if (lower === 'villain' || lower === 'villanos' || lower === 'villano') {
    return 'villain';
  }
  if (lower === 'civilian' || lower === 'civiles' || lower === 'civil' || lower === 'ciudadano') {
    return 'civilian';
  }
  if (lower === 'vigilante' || lower === 'vigilantes') {
    return 'vigilante';
  }
  // CANONICAL FALLBACK: BASE. NEVER HERO!
  return 'base';
}

export interface HexagonRadarChartProps {
  stats: HexStat[];
  theme?: StatsHexagonTheme | string;
  accentColor?: string; // Backwards compatibility
}

export function HexagonRadarChart({ stats, theme, accentColor }: HexagonRadarChartProps) {
  const resolvedThemeId = resolveStatsHexagonTheme(theme);
  const themeConfig = STATS_HEXAGON_THEMES[resolvedThemeId];

  const size = 360;
  const center = size / 2;
  const radius = 115;
  const levels = 5;

  // Max value scale (at least 5, or highest stat)
  const maxVal = Math.max(5, ...stats.map(s => s.value || 0));

  // Compute vertices for a regular hexagon at radius r
  const getHexPolygon = (r: number) => {
    return stats.map((_, i) => {
      const angleDeg = -90 + i * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = center + r * Math.cos(angleRad);
      const y = center + r * Math.sin(angleRad);
      return `${x},${y}`;
    }).join(' ');
  };

  // Compute data polygon vertices
  const dataPoints = stats.map((stat, i) => {
    const angleDeg = -90 + i * 60;
    const angleRad = (angleDeg * Math.PI) / 180;
    const clampedVal = Math.max(0.5, stat.value || 0);
    const r = (clampedVal / maxVal) * radius;
    const x = center + r * Math.cos(angleRad);
    const y = center + r * Math.sin(angleRad);
    return { x, y, stat, angleDeg };
  });

  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Grade converter helper
  const getGrade = (val: number) => {
    if (val >= 6) return 'S';
    if (val === 5) return 'A';
    if (val === 4) return 'B';
    if (val === 3) return 'C';
    if (val === 2) return 'D';
    return 'E';
  };

  return (
    <div
      data-testid="stats-hexagon"
      data-theme={themeConfig.id}
      className="relative flex flex-col items-center justify-center p-2 select-none"
    >
      {/* Corner marks themed according to faction */}
      <div className={`absolute top-1 left-1 text-[9px] select-none ${themeConfig.cornerFontClass}`}>
        {themeConfig.cornerTopLeft}
      </div>
      <div className={`absolute top-1 right-1 text-[9px] select-none ${themeConfig.cornerFontClass}`}>
        {themeConfig.cornerTopRight}
      </div>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[340px] h-auto overflow-visible drop-shadow-[0_0_15px_rgba(0,0,0,0.2)]"
      >
        <defs>
          <radialGradient id={themeConfig.gradientId} cx="50%" cy="50%" r="50%">
            {themeConfig.gradientStops.map((stop, sIdx) => (
              <stop
                key={sIdx}
                offset={stop.offset}
                stopColor={stop.stopColor}
                stopOpacity={stop.stopOpacity}
              />
            ))}
          </radialGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Circular Telemetry Rings */}
        <circle
          cx={center}
          cy={center}
          r={radius + 18}
          fill="none"
          stroke={themeConfig.outerRing1Stroke}
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <circle
          cx={center}
          cy={center}
          r={radius + 28}
          fill="none"
          stroke={themeConfig.outerRing2Stroke}
          strokeWidth="0.8"
          strokeDasharray="2 12"
        />

        {/* Center Crosshairs */}
        <circle cx={center} cy={center} r={3} fill={themeConfig.centerDotFill} />
        <line
          x1={center - 10}
          y1={center}
          x2={center + 10}
          y2={center}
          stroke={themeConfig.centerCrosshairStroke}
          strokeWidth="1"
        />
        <line
          x1={center}
          y1={center - 10}
          x2={center}
          y2={center + 10}
          stroke={themeConfig.centerCrosshairStroke}
          strokeWidth="1"
        />

        {/* Outer and Inner Hexagonal Grid Lines */}
        {Array.from({ length: levels }).map((_, i) => {
          const levelRadius = ((i + 1) / levels) * radius;
          const isOuter = i === levels - 1;
          return (
            <polygon
              key={`level-${i}`}
              points={getHexPolygon(levelRadius)}
              fill={i % 2 === 0 ? themeConfig.gridInnerFillEven : themeConfig.gridInnerFillOdd}
              stroke={isOuter ? themeConfig.gridOuterStroke : themeConfig.gridInnerStroke}
              strokeWidth={isOuter ? 1.5 : 1}
              strokeDasharray={isOuter ? 'none' : '2 3'}
            />
          );
        })}

        {/* Spoke Axis Lines from Center */}
        {stats.map((_, i) => {
          const angleDeg = -90 + i * 60;
          const angleRad = (angleDeg * Math.PI) / 180;
          const x2 = center + radius * Math.cos(angleRad);
          const y2 = center + radius * Math.sin(angleRad);
          return (
            <line
              key={`spoke-${i}`}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke={themeConfig.spokeStroke}
              strokeWidth={1.2}
            />
          );
        })}

        {/* Filled Data Polygon */}
        <polygon
          points={dataPolygon}
          fill={`url(#${themeConfig.gradientId})`}
          stroke={themeConfig.polygonStroke}
          strokeWidth={themeConfig.polygonStrokeWidth}
          strokeLinejoin="round"
          filter={themeConfig.polygonFilterGlow}
        />

        {/* Vertex Data Points */}
        {dataPoints.map((pt, i) => (
          <g key={`point-${i}`}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={5}
              fill={themeConfig.vertexDotFill}
              stroke={themeConfig.vertexDotStroke}
              strokeWidth={2}
            />
            <circle
              cx={pt.x}
              cy={pt.y}
              r={8}
              fill="none"
              stroke={themeConfig.vertexRingStroke}
              strokeWidth={1.5}
              opacity={0.9}
            />
          </g>
        ))}

        {/* Vertex Stat Labels positioned around the hexagon */}
        {stats.map((stat, i) => {
          const angleDeg = -90 + i * 60;
          const angleRad = (angleDeg * Math.PI) / 180;
          const labelRadius = radius + 36;
          const lx = center + labelRadius * Math.cos(angleRad);
          const ly = center + labelRadius * Math.sin(angleRad);

          const grade = getGrade(stat.value);

          return (
            <g key={`label-${i}`} transform={`translate(${lx}, ${ly})`}>
              <foreignObject x={-42} y={-22} width={84} height={44}>
                <div className="flex flex-col items-center justify-center text-center">
                  <div
                    className={`flex items-center gap-1 ${themeConfig.vertexLabelBg} border ${themeConfig.vertexLabelBorder} rounded px-1.5 py-0.5 shadow-md`}
                  >
                    <span className={`text-[10px] font-black font-oxanium uppercase tracking-widest ${themeConfig.vertexLabelTextClass}`}>
                      {stat.label.substring(0, 3)}
                    </span>
                    <span className={`text-xs font-black font-oxanium ${themeConfig.vertexValueTextClass}`}>
                      {stat.value}
                    </span>
                    <span className={`text-[9px] font-mono font-bold ${themeConfig.vertexGradeTextClass}`}>
                      ({grade})
                    </span>
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Hexagonal Stats Row Cards Underneath in 3x2 Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full mt-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const grade = getGrade(stat.value);
          return (
            <div
              key={stat.label}
              className={`p-2.5 rounded-lg ${themeConfig.cardBg} border ${themeConfig.cardBorder} flex flex-col items-center justify-between text-center relative overflow-hidden group ${themeConfig.cardBorderHover} transition-colors`}
            >
              <div className="flex items-center justify-between w-full text-[9px] font-mono text-zinc-400 mb-1">
                <span>{stat.label.substring(0, 3)}.0{stats.indexOf(stat) + 1}</span>
                <span className={`px-1 rounded font-bold border ${themeConfig.cardGradeBadge}`}>
                  {grade}
                </span>
              </div>

              <div className="my-0.5 flex items-center justify-center gap-1.5">
                {Icon && <Icon className={`size-4 ${themeConfig.cardIconClass} shrink-0`} />}
                <span className="text-xl font-black font-oxanium tracking-tight">
                  {stat.value}
                </span>
              </div>

              <span className="text-[10px] font-oxanium font-bold uppercase tracking-wider text-zinc-400 truncate w-full">
                {stat.label}
              </span>

              {stat.hasBonus && (
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-1 rounded">
                    +{stat.bonus}
                  </span>
                  <ModifierBadgeGroup sources={stat.sources} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Canonical Architecture Alias
export const StatsHexagon = HexagonRadarChart;
