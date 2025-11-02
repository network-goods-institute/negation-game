"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className={`sticky top-0 w-full z-50 backdrop-blur-sm transition-all duration-200 ${
      isScrolled
        ? "bg-white/90 dark:bg-slate-900/90 shadow-sm"
        : "bg-white/75 dark:bg-slate-900/75"
    } border-b border-slate-200 dark:border-slate-800`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center space-x-2">
          <Zap className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Negation Game
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="#spaces" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Spaces
          </Link>
          <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Features
          </Link>
          <Link href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Testimonials
          </Link>
          <Link href="#get-started" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Get Started
          </Link>
          <a href="https://t.me/+a0y-MpvjAchkM2Qx" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Contact
          </a>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          <div className="w-6 h-6 relative">
            <span className={`absolute w-full h-0.5 bg-current transform transition-all duration-300 ease-in-out ${
              isMenuOpen ? "top-2.5 rotate-45" : "top-0"
            }`} />
            <span className={`absolute w-full h-0.5 bg-current top-2.5 transform transition-all duration-300 ease-in-out ${
              isMenuOpen ? "opacity-0" : "opacity-100"
            }`} />
            <span className={`absolute w-full h-0.5 bg-current transform transition-all duration-300 ease-in-out ${
              isMenuOpen ? "top-2.5 -rotate-45" : "top-5"
            }`} />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        isMenuOpen ? "max-h-64" : "max-h-0"
      }`}>
        <nav className="px-4 pb-4 space-y-3">
          <Link
            href="#spaces"
            onClick={closeMenu}
            className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Spaces
          </Link>
          <Link
            href="#features"
            onClick={closeMenu}
            className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Features
          </Link>
          <Link
            href="#testimonials"
            onClick={closeMenu}
            className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Testimonials
          </Link>
          <Link
            href="#get-started"
            onClick={closeMenu}
            className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Get Started
          </Link>
          <a
            href="https://t.me/+a0y-MpvjAchkM2Qx"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMenu}
            className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}