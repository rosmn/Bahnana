// Footer Component

import './Footer.css';

export function Footer() {
  return (
    <footer className="app-footer">
      <p>
        Data from{' '}
        <a
          href="https://github.com/Alban1911/LeagueSkins"
          target="_blank"
          rel="noopener noreferrer"
        >
          Alban1911/LeagueSkins
        </a>{' '}
        • Not affiliated with Riot Games
      </p>
    </footer>
  );
}