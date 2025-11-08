import React from 'react'
import { Link } from 'react-router-dom'
import { Building2, TrendingUp, Shield, Wallet, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
          <CheckCircle2 size={16} />
          <span>Blockchain-Powered Real Estate Investment</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
          Invest in Real Estate,<br />
          <span className="text-emerald-600">One Token at a Time</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Estathub democratizes real estate investment through blockchain tokenization. 
          Start building your property portfolio with as little as one token.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            to="/opportunities" 
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 font-medium transition-colors"
          >
            Explore Opportunities
            <ArrowRight size={20} />
          </Link>
          <Link 
            to="/blockchain" 
            className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 font-medium transition-colors"
          >
            View Blockchain
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="text-emerald-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Fractional Ownership</h3>
          <p className="text-gray-600 text-sm">
            Own a piece of premium real estate without the hefty price tag. Start with just one token.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="text-blue-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Returns</h3>
          <p className="text-gray-600 text-sm">
            Earn consistent monthly yields from rental income distributed directly to your wallet.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Shield className="text-purple-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Blockchain Security</h3>
          <p className="text-gray-600 text-sm">
            All transactions are secured on Hyperledger Fabric, ensuring transparency and immutability.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
            <Wallet className="text-amber-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Payments</h3>
          <p className="text-gray-600 text-sm">
            Invest using local payment methods in SAR. Simple, fast, and secure transactions.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 md:p-12 text-white">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">100%</div>
            <div className="text-emerald-100">Blockchain Secured</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">24/7</div>
            <div className="text-emerald-100">Market Access</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">SAR</div>
            <div className="text-emerald-100">Local Currency</div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-3xl font-bold text-gray-900">Ready to Start Investing?</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Join Estathub today and start building your real estate portfolio with blockchain-powered fractional ownership.
        </p>
        <Link 
          to="/opportunities" 
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 font-medium transition-colors"
        >
          Browse Properties
          <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  )
}
