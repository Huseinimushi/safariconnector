// src/components/Footer.tsx
import Link from "next/link";

import styles from "./Footer.module.css";

const stats = [
  { value: "120+", label: "Parks & reserves" },
  { value: "600+", label: "Curated trips" },
  { value: "150+", label: "Local operators" },
  { value: "24/7", label: "Support coverage" },
];

const destinations = [
  "Serengeti",
  "Ngorongoro",
  "Tarangire",
  "Amboseli",
  "Kilimanjaro",
  "Zanzibar",
];

const tripTypes = [
  "Luxury Safaris",
  "Family Safaris",
  "Budget Safaris",
  "Honeymoons",
  "Private Safaris",
  "Photographic",
];

const generalLinks = [
  { label: "About Us", href: "/about" },
  { label: "Partner Options", href: "/operators" },
  { label: "Terms of Use", href: "/privacy" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Settings", href: "/privacy" },
  { label: "Contact Us", href: "/contact" },
];

const socialLinks = [
  { label: "Facebook", icon: "facebook", href: "https://facebook.com" },
  { label: "X", icon: "x", href: "https://twitter.com" },
  { label: "Instagram", icon: "instagram", href: "https://instagram.com" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.about}>
            <Link href="/" className={styles.logoLink} aria-label="Safari Connector home">
              <img src="/logo.png" alt="Safari Connector" className={styles.logo} />
            </Link>
            <div>
              <h3 className={styles.heading}>About Safari Connector</h3>
              <p className={styles.lead}>
                Safari Connector links travelers with trusted local tour operators across Africa,
                so you can compare routes, request quotes, and book with confidence.
              </p>
            </div>
          </div>

          <div className={styles.linksGrid}>
            <div className={styles.col}>
              <h4 className={styles.colHeading}>Our Statistics</h4>
              <ul className={styles.statList}>
                {stats.map((item) => (
                  <li key={item.label} className={styles.statItem}>
                    <span className={styles.statValue}>{item.value}</span>
                    <span className={styles.statLabel}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.col}>
              <h4 className={styles.colHeading}>Safaris by Park</h4>
              <ul className={styles.linkList}>
                {destinations.map((d) => (
                  <li key={d}>
                    <Link href="/trips" className={styles.link}>
                      {d}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.col}>
              <h4 className={styles.colHeading}>Safaris by Type</h4>
              <ul className={styles.linkList}>
                {tripTypes.map((t) => (
                  <li key={t}>
                    <Link href="/trips" className={styles.link}>
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.col}>
              <h4 className={styles.colHeading}>General</h4>
              <ul className={styles.linkList}>
                {generalLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className={styles.socialRow}>
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className={styles.socialBtn}
                  >
                    {social.icon === "facebook" && (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M13 10h2.5l.5-3H13V5.5c0-.9.3-1.5 1.6-1.5H16V1.1C15.4 1 14.1 1 12.6 1 9.8 1 8 2.7 8 5.2V7H5.5v3H8v9h5v-9z" />
                      </svg>
                    )}
                    {social.icon === "x" && (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M17.3 3h3l-7.3 8.3L21 21h-6.6l-4.1-5.2L5.6 21H2.7l7.8-8.9L3.2 3h6.7l3.7 4.8z" />
                      </svg>
                    )}
                    {social.icon === "instagram" && (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zM17.8 6.2a1 1 0 1 1-1.6 1.2 1 1 0 0 1 1.6-1.2z" />
                      </svg>
                    )}
                  </a>
                ))}
              </div>

              <button type="button" className={styles.currencyBtn}>
                USD $
                <span className={styles.currencyArrow}>&gt;</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.featuredRow}>
          <div className={styles.featuredLine} />
          <div className={styles.featuredCopy}>As featured in</div>
          <div className={styles.featuredLogos}>
            <span>The Times</span>
            <span>Travel Africa</span>
            <span>CNN Travel</span>
          </div>
          <div className={styles.featuredLine} />
        </div>

        <div className={styles.ctaBar}>
          <span>Ready to plan your safari?</span>
          <Link href="/plan" className={styles.ctaButton}>
            Start with AI
          </Link>
        </div>

        <div className={styles.copyRow}>
          <div className={styles.copyLogo} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <path d="M12 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2zm0 2C7.6 4 4 7.6 4 12s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm.2 3.3c1.6 0 2.9 1.3 2.9 2.9S13.8 11 12.2 11s-2.9-1.3-2.9-2.9 1.3-2.8 2.9-2.8zm-.1 6.3c3 0 5.6 1.1 5.6 2.5 0 .3-.1.5-.3.7-1.3.9-3.2 1.5-5.3 1.5-2.1 0-4-.6-5.3-1.5-.2-.2-.3-.4-.3-.7 0-1.4 2.5-2.5 5.6-2.5z" />
            </svg>
          </div>
          <div className={styles.copyText}>Copyright (c) {year} Safari Connector. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
