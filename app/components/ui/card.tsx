export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`app-card ${className}`.trim()}>{children}</div>;
}
