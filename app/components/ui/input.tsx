type Props = React.InputHTMLAttributes<HTMLInputElement> & { className?: string };

export function Input({ className = "", ...props }: Props) {
  return <input className={`input ${className}`} {...props} />;
}
