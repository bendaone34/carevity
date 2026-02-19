'use client';

import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

export default function StatsCard({ title, value, icon: Icon, trend, color }: StatsCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-sky-50 dark:bg-sky-900/30',
      icon: 'text-sky-600 dark:text-sky-400',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      icon: 'text-green-600 dark:text-green-400',
    },
    yellow: {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/30',
      icon: 'text-purple-600 dark:text-purple-400',
    },
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{value}</p>
          {trend && (
            <p
              className={`text-sm mt-2 flex items-center gap-1 ${
                trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% from last month</span>
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color].bg}`}>
          <Icon className={`w-6 h-6 ${colorClasses[color].icon}`} />
        </div>
      </div>
    </div>
  );
}