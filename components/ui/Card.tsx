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
        'bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6',
        onClick && 'cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 transition-colors duration-150',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('pb-4 mb-4 border-b border-slate-100 dark:border-slate-800', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('pt-4 mt-4 border-t border-slate-100 dark:border-slate-800', className)}>
      {children}
    </div>
  );
}
