import { ReactNode } from "react";

export default function Section({
  eyebrow,
  title,
  intro,
  children,
  align = "left",
  bordered = false,
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  children?: ReactNode;
  align?: "left" | "center";
  bordered?: boolean;
}) {
  return (
    <section
      className={`grid-section ${
        bordered ? "border-t border-ink-100" : ""
      }`}
    >
      <div className="container-page">
        {(eyebrow || title || intro) && (
          <div
            className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
          >
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && (
              <h2 className="h-section mt-3">{title}</h2>
            )}
            {intro && <p className="lede mt-4">{intro}</p>}
          </div>
        )}
        {children && <div className="mt-12">{children}</div>}
      </div>
    </section>
  );
}
