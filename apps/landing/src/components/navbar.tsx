'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Ürün', href: '#urun' },
    { name: 'Nasıl Çalışır', href: '#nasil-calisir' },
    { name: 'Çözümler', href: '#cozumler' },
    { name: 'Fiyatlandırma', href: '#fiyatlandirma' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-canvas/80 backdrop-blur-xl border-b border-hairline'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="relative z-10 flex items-center">
          <Image
            src="/logos/mesajify-logo.png"
            alt="Mesajify Logo"
            width={130}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-ink-muted hover:text-ink transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://app.mesajify.com/giris"
            className="text-sm font-medium text-ink hover:text-ink-muted transition-colors px-4 py-2"
          >
            Giriş Yap
          </a>
          <a
            href="#"
            className="text-sm font-medium bg-brand text-white px-5 py-2.5 rounded-[10px] hover:bg-brand-hover transition-colors shadow-sm"
          >
            Hemen Başla &rarr;
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden relative z-10 p-2 -mr-2 text-ink"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          <div className="w-6 h-5 flex flex-col justify-between">
            <span
              className={`w-full h-[2px] bg-current transform transition-all duration-300 ${
                mobileMenuOpen ? 'rotate-45 translate-y-[9px]' : ''
              }`}
            />
            <span
              className={`w-full h-[2px] bg-current transition-all duration-300 ${
                mobileMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`w-full h-[2px] bg-current transform transition-all duration-300 ${
                mobileMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''
              }`}
            />
          </div>
        </button>

        {/* Mobile Menu */}
        <div
          className={`fixed inset-0 bg-canvas z-0 transition-transform duration-500 ease-[cubic-bezier(0.05,0.7,0.1,1)] ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } md:hidden flex flex-col pt-24 px-6 pb-6`}
        >
          <nav className="flex flex-col gap-6 text-2xl font-semibold mb-auto">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-ink"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </nav>
          
          <div className="flex flex-col gap-4">
            <a
              href="https://app.mesajify.com/giris"
              className="text-center py-4 text-lg font-medium border border-hairline rounded-[10px]"
            >
              Giriş Yap
            </a>
            <a
              href="#"
              className="text-center py-4 text-lg font-medium bg-brand text-white rounded-[10px]"
            >
              Hemen Başla &rarr;
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
