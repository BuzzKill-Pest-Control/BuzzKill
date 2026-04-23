import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import Icon from "./Icon";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 12);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const close = () => setOpen(false);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="inner">
        <Link to="/" className="logo-lockup" onClick={close}>
          <div className="logo-mark">
            <img src="/images/logo.png" alt="" />
          </div>
          <div className="logo-text">
            <span className="name">BuzzKill</span>
            <span className="sub">Pest Control</span>
          </div>
        </Link>

        <button
          className="hamburger"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "x" : "menu"} />
        </button>

        <nav className={`nav ${open ? "open" : ""}`}>
          <NavLink to="/" end onClick={close}>
            Home
          </NavLink>
          <NavLink to="/condo-services" onClick={close}>
            Condo Services
          </NavLink>
          <NavLink to="/in-unit-services" onClick={close}>
            In-Unit Services
          </NavLink>
          <NavLink to="/about" onClick={close}>
            About
          </NavLink>
          <a
            href="https://buzzkill.fieldportals.com/landing/index"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-cta"
            onClick={close}
          >
            Customer Login
          </a>
        </nav>
      </div>
    </header>
  );
}
