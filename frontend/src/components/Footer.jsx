import React from 'react'
import { Link } from 'react-router-dom'
import { Building2, Mail, Phone, MapPin, Twitter, Linkedin, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="text-emerald-500" size={28} />
              <span className="text-white font-bold text-xl">Estathub</span>
            </div>
            <p className="text-sm text-gray-400">
              Democratizing real estate investment through blockchain-powered tokenization.
            </p>
            <div className="flex gap-3">
              <a href="#" className="text-gray-400 hover:text-emerald-500 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-500 transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-500 transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-emerald-500 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/opportunities" className="hover:text-emerald-500 transition-colors">Opportunities</Link>
              </li>
              <li>
                <Link to="/wallet" className="hover:text-emerald-500 transition-colors">My Wallet</Link>
              </li>
              <li>
                <Link to="/blockchain" className="hover:text-emerald-500 transition-colors">Blockchain Explorer</Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-emerald-500 transition-colors">About Us</a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500 transition-colors">How It Works</a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500 transition-colors">FAQ</a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500 transition-colors">Terms of Service</a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-500 transition-colors">Privacy Policy</a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-1 flex-shrink-0" />
                <span>Riyadh, Saudi Arabia</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="flex-shrink-0" />
                <a href="mailto:info@estathub.sa" className="hover:text-emerald-500 transition-colors">
                  info@estathub.sa
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="flex-shrink-0" />
                <a href="tel:+966123456789" className="hover:text-emerald-500 transition-colors">
                  +966 12 345 6789
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center text-gray-400">
          <p>© {new Date().getFullYear()} Estathub. All rights reserved. Built with Hyperledger Fabric.</p>
        </div>
      </div>
    </footer>
  )
}
