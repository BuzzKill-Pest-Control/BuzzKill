import { Link, NavLink } from "react-router-dom";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="logo-link">
          <img src="/images/logo.png" alt="BuzzKill Pest Control" className="logo" />
        </Link>
        <button
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          <span className={`hamburger ${menuOpen ? "open" : ""}`} />
        </button>
        <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
          <NavLink to="/" onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/about" onClick={() => setMenuOpen(false)}>About</NavLink>
          <NavLink to="/condo-services" onClick={() => setMenuOpen(false)}>Condo Services</NavLink>
          <NavLink to="/in-unit-services" onClick={() => setMenuOpen(false)}>In-Unit Services</NavLink>
          <a
            href="https://buzzkill.fieldportals.com/landing/index"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-cta"
            onClick={() => setMenuOpen(false)}
          >
            Customer Login
          </a>
        </nav>
      </div>
    </header>
  );
}
