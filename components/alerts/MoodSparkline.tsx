'use client';

import { useMemo } from 'react';
import { DailyCareRecord } from '@/lib/types';

interface MoodSparklineProps {
  records: DailyCareRecord[];
}

const WIDTH  = 400;
const HEIGHT = 80;
const PAD_X  = 8;
const PAD_Y  = 8;

export default function MoodSparkline({ records }: MoodSparklineProps) {
  const last14 = useMemo(() => {
    const sorted = [...records]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
    return sorted;
  }, [records]);

  if (last14.length < 2) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
        Not enough data — at least 2 records needed
      </p>
    );
  }

  const innerW = WIDTH  - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2;

  // Map score 1-5 → y coordinate (inverted: score 5 = top)
  function toY(score: number) {
    return PAD_Y + innerH - ((score - 1) / 4) * innerH;
  }
  function toX(idx: number) {
    return PAD_X + (idx / (last14.length - 1)) * innerW;
  }

  const points = last14.map((r, i) => ({ x: toX(i), y: toY(r.moodScore), score: r.moodScore, date: r.date }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Filled area under the line
  const areaD = pathD +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(PAD_Y + innerH).toFixed(1)}` +
    ` L ${points[0].x.toFixed(1)} ${(PAD_Y + innerH).toFixed(1)} Z`;

  // Y axis labels
  const yLabels = [5, 4, 3, 2, 1];

  // Date labels (first and last)
  const firstLabel = new Date(last14[0].date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const lastLabel  = new Date(last14[last14.length - 1].date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height: 80 }}
        aria-label="Mood trend over last 14 days"
      >
        {/* Y axis gridlines */}
        {yLabels.map((score) => {
          const y = toY(score);
          return (
            <line
              key={score}
              x1={PAD_X} y1={y} x2={WIDTH - PAD_X} y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#moodGradient)" opacity={0.3} />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={p.score <= 2 ? '#ef4444' : '#38bdf8'}
            stroke="white"
            strokeWidth={1.5}
          />
        ))}

        <defs>
          <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Date range */}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400 dark:text-gray-500">{firstLabel}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 text-center flex-1">Mood (1–5)</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{lastLabel}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Low mood (1–2)
        </span>
      </div>
    </div>
  );
}
