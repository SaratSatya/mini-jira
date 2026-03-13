type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
};

export function Button({ variant = "default", className = "", ...props }: Props) {
  const v =
    variant === "primary"
      ? "app-btn app-btn-primary"
      : variant === "ghost"
      ? "app-btn app-btn-ghost"
      : variant === "danger"
      ? "app-btn app-btn-danger"
      : "app-btn";

  return <button className={`${v} ${className}`.trim()} {...props} />;
}
