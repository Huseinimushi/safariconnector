// src/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        {/* Brand */}
        <div className="footer-brand">
          <Link href="/" className="footer-logo-link" aria-label="Safari Connector home">
            <img
              src="/logo.png"
              alt="Safari Connector"
              width={200}
              height={120}
              className="footer-logo"
            />
          </Link>
          <p className="footer-intro">
            Safari Connector links travelers with trusted local tour operators across Africa —
            offering authentic, safe, and affordable safari experiences.
          </p>
        </div>

        {/* Columns */}
        <div className="footer-grid">
          <div className="footer-col">
            <h4 className="footer-h">Explore</h4>
            <ul className="footer-list">
              <li><Link href="/trips" className="footer-link">Trips</Link></li>
              <li><Link href="/plan" className="footer-link">AI Trip Builder</Link></li>
              <li><Link href="/operators" className="footer-link">Operators</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-h">Company</h4>
            <ul className="footer-list">
              <li><Link href="/about" className="footer-link">About</Link></li>
              <li><Link href="/contact" className="footer-link">Contact</Link></li>
              <li><Link href="/privacy" className="footer-link">Privacy</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-h">Help</h4>
            <ul className="footer-list">
              <li><Link href="/faq" className="footer-link">FAQs</Link></li>
              <li><Link href="/support" className="footer-link">Support</Link></li>
              <li><Link href="/safety" className="footer-link">Trust &amp; Safety</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-h">Follow</h4>
            <div className="footer-social">
              <a href="#" className="footer-social-btn" aria-label="Twitter">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M22 5.8c-.7.3-1.5.6-2.2.7.8-.5 1.4-1.3 1.7-2.2-.8.5-1.7.9-2.6 1.1A3.8 3.8 0 0 0 12 7.8c0 .3 0 .6.1.9-3.2-.2-6-1.7-7.9-4.1-.3.6-.5 1.3-.5 2 0 1.3.7 2.5 1.7 3.2-.6 0-1.2-.2-1.7-.5v.1c0 1.9 1.3 3.4 3.1 3.8-.3.1-.7.1-1 .1-.3 0-.5 0-.8-.1.5 1.6 2 2.8 3.7 2.8A7.7 7.7 0 0 1 2 18.6c1.7 1.1 3.7 1.7 5.9 1.7 7.1 0 11-5.9 11-11v-.5c.8-.6 1.4-1.3 1.9-2.1z"/>
                </svg>
              </a>
              <a href="#" className="footer-social-btn" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zM17.8 6.2a1 1 0 1 1-1.6 1.2 1 1 0 0 1 1.6-1.2z"/>
                </svg>
              </a>
              <a href="#" className="footer-social-btn" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5zM3.5 9h3v12h-3V9zm6 0h2.8v1.6h.1c.4-.8 1.5-1.8 3.2-1.8 3.4 0 4 2.2 4 5v7.3h-3V14c0-1.2 0-2.8-1.7-2.8-1.7 0-2 1.3-2 2.7v7.1h-3V9z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom line */}
      <div className="footer-copy">
        © {year} Safari Connector. All rights reserved.
      </div>
    </footer>
  );
}
