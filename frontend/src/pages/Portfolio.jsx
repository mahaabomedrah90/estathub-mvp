import React, { useEffect, useState } from 'react'
import { authHeader, fetchJson, getToken } from '../lib/api'

export default function Portfolio() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wallet, setWallet] = useState(null)
  const [amount, setAmount] = useState(100)

  async function load() {
    try {
      setError('')
      setLoading(true)
      const data = await fetchJson('/api/wallet', { headers: { ...authHeader() } })
      setWallet(data)
    } catch (e) {
      setError('Failed to load wallet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getToken()) load()
  }, [])

  if (!getToken()) {
    return <div>Please login to view your wallet.</div>
  }

  if (loading) return <div>Loading wallet…</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Wallet</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-500">Wallet ID</div>
          <div className="font-mono text-sm break-all">{wallet.walletId}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-500">Cash Balance</div>
          <div className="text-xl font-semibold">{wallet.cashBalance.toLocaleString()} SAR</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-sm text-gray-500">Invested Value</div>
          <div className="text-xl font-semibold">{wallet.investedValue.toLocaleString()} SAR</div>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-3 space-y-2 sm:space-y-0">
          <div>
            <label className="block text-sm mb-1">Amount (SAR)</label>
            <input type="number" min={1} value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="border rounded px-3 py-2 w-40" />
          </div>
          <button
            onClick={async () => {
              try {
                await fetchJson('/api/wallet/deposit', {
                  method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() },
                  body: JSON.stringify({ amount: Number(amount) })
                })
                await load()
              } catch { setError('Deposit failed') }
            }}
            className="px-4 py-2 rounded bg-gray-900 text-white"
          >Deposit (Mock)</button>
          <button
            onClick={async () => {
              try {
                await fetchJson('/api/wallet/withdraw', {
                  method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() },
                  body: JSON.stringify({ amount: Number(amount) })
                })
                await load()
              } catch { setError('Withdraw failed') }
            }}
            className="px-4 py-2 rounded bg-gray-700 text-white"
          >Withdraw (Mock)</button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Holdings</h2>
          {wallet.holdings?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="p-2">Property</th>
                    <th className="p-2">Tokens</th>
                    <th className="p-2">Token Price</th>
                    <th className="p-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.holdings.map(h => (
                    <tr key={h.propertyId} className="border-t">
                      <td className="p-2">{h.title}</td>
                      <td className="p-2">{h.tokens}</td>
                      <td className="p-2">{h.tokenPrice.toLocaleString()} SAR</td>
                      <td className="p-2">{h.value.toLocaleString()} SAR</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-600">No holdings yet.</div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Recent Transactions</h2>
          {wallet.transactions?.length ? (
            <ul className="space-y-1 text-sm">
              {wallet.transactions.map(t => (
                <li key={t.id} className="border rounded p-2 bg-white flex justify-between">
                  <span className="capitalize">{t.type.toLowerCase()}</span>
                  <span>{t.amount.toLocaleString()} SAR</span>
                  <span className="text-gray-500">{new Date(t.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-600">No transactions yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
