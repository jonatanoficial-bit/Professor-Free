import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export default function Button({ variant = "primary", className = "", ...rest }: Props) {
  const cls = variant === "primary" ? "btn btn-primary" : "btn btn-ghost";
  return <button className={`${cls} ${className}`} {...rest} />;
}