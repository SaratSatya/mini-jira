type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost";
};

export function Button({ variant = "default", className = "", ...props }: Props) {
  const v =
    variant === "primary" ? "btn btn-primary" :
    variant === "ghost" ? "btn btn-ghost" :
    "btn";

  return <button className={`${v} ${className}`} {...props} />;
}
