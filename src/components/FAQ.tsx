import { useState } from "react";

export type FAQItem = {
  q: string;
  a: string;
};

export default function FAQ({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number>(0);
  return (
    <div className="faq">
      {items.map((it, i) => (
        <div className={`faq-item ${open === i ? "open" : ""}`} key={i}>
          <button
            type="button"
            className="faq-q"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <span>{it.q}</span>
            <span className="sign" aria-hidden="true">
              +
            </span>
          </button>
          <div className="faq-a">
            <p>{it.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
