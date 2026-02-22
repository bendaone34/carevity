import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 transition-colors duration-300',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-200 dark:hover:border-slate-600',
        className
      )}
    >
      {children}
    </div>
  );
}
