import type { ReactNode } from "react";

type HeroProps = {
  image: string;
  eyebrow?: string;
  headline: ReactNode;
  sub?: string;
  primaryCta?: { label: string; onClick?: () => void; href?: string };
  secondaryCta?: { label: string; onClick?: () => void; href?: string };
};

function CtaButton({
  cta,
  variant,
}: {
  cta: { label: string; onClick?: () => void; href?: string };
  variant: "primary" | "outline-light";
}) {
  const className = `bk-btn bk-btn-${variant}`;
  if (cta.href) {
    return (
      <a className={className} href={cta.href} onClick={cta.onClick}>
        {cta.label}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={cta.onClick}>
      {cta.label}
    </button>
  );
}

export default function Hero({
  image,
  eyebrow,
  headline,
  sub,
  primaryCta,
  secondaryCta,
}: HeroProps) {
  return (
    <section
      className="bk-hero"
      style={{ backgroundImage: `url(${image})` }}
    >
      <div className="bk-hero-overlay" aria-hidden="true" />
      <div className="bk-hero-inner">
        {eyebrow && <div className="bk-hero-eyebrow">{eyebrow}</div>}
        <h1 className="bk-hero-headline">{headline}</h1>
        {sub && <p className="bk-hero-sub">{sub}</p>}
        {(primaryCta || secondaryCta) && (
          <div className="bk-hero-ctas">
            {primaryCta && <CtaButton cta={primaryCta} variant="primary" />}
            {secondaryCta && (
              <CtaButton cta={secondaryCta} variant="outline-light" />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
