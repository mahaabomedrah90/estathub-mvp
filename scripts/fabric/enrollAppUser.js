#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { Wallets, X509Identity } = require('fabric-network')

async function main() {
  const FABRIC_SAMPLES = process.env.FABRIC_SAMPLES || path.join(process.env.HOME || '~', 'fabric-samples')
  const repoRoot = path.resolve(__dirname, '../..')
  const backendDir = path.join(repoRoot, 'backend')
  const outWalletPath = path.join(backendDir, 'fabric', 'wallet')
  const outConnProfilePath = path.join(backendDir, 'fabric', 'connection-org1.json')

  // Paths in test-network for Org1 Admin (required for chaincode queries)
  const org1Dir = path.join(FABRIC_SAMPLES, 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com')
  const userDir = path.join(org1Dir, 'users', 'Admin@org1.example.com', 'msp')
  const certPath = path.join(userDir, 'signcerts')
  const keyPath = path.join(userDir, 'keystore')
  const mspId = 'Org1MSP'

  // Ensure output dirs
  fs.mkdirSync(path.dirname(outConnProfilePath), { recursive: true })
  fs.mkdirSync(outWalletPath, { recursive: true })

  // Copy connection profile
  const srcConnProfile = path.join(org1Dir, 'connection-org1.json')
  if (!fs.existsSync(srcConnProfile)) {
    throw new Error(`connection profile not found at ${srcConnProfile}. Ensure test-network is up.`)
  }
  fs.copyFileSync(srcConnProfile, outConnProfilePath)
  console.log(`Copied connection profile to ${outConnProfilePath}`)

  // Read cert and key
  const certFiles = fs.readdirSync(certPath).filter(f => f.endsWith('.pem'))
  const keyFiles = fs.readdirSync(keyPath).filter(f => f.endsWith('_sk') || f.endsWith('.pem'))
  if (!certFiles.length || !keyFiles.length) {
    throw new Error(`Could not find cert/key in ${certPath} and ${keyPath}`)
  }
  const certificate = fs.readFileSync(path.join(certPath, certFiles[0]), 'utf8')
  const privateKey = fs.readFileSync(path.join(keyPath, keyFiles[0]), 'utf8')

  // Import identity into wallet as appUser
  const wallet = await Wallets.newFileSystemWallet(outWalletPath)
  const identity = { credentials: { certificate, privateKey }, mspId, type: 'X.509' }
  await wallet.put('appUser', identity)
  console.log(`Imported identity 'appUser' into wallet ${outWalletPath}`)

  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
