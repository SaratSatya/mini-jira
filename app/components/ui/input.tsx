type Props = React.InputHTMLAttributes<HTMLInputElement> & { className?: string };

export function Input({ className = "", ...props }: Props) {
  return <input className={`app-input ${className}`.trim()} {...props} />;
}
