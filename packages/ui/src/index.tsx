import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
export function Button(props:ButtonHTMLAttributes<HTMLButtonElement>){ return <button {...props} className={["button",props.className].filter(Boolean).join(" ")} />; }
export function Card({children,...props}:HTMLAttributes<HTMLDivElement>&{children:ReactNode}){ return <section {...props} className={["card",props.className].filter(Boolean).join(" ")}>{children}</section>; }
export function EmptyState({title,description}:{title:string;description:string}){ return <div className="empty-state"><strong>{title}</strong><p>{description}</p></div>; }
