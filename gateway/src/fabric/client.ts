import fs from 'fs'
import * as grpc from '@grpc/grpc-js'
import { config } from '../config'

export function newGrpcConnection(): grpc.Client {
  const tlsRootCert = fs.readFileSync(config.fabricTlsCertPath)
  const tlsCredentials = grpc.credentials.createSsl(tlsRootCert)

  if (config.fabricDebug) {
    console.log(`🔐 Creating gRPC connection to ${config.fabricPeer}`)
  }

  const client = new grpc.Client(config.fabricPeer, tlsCredentials, {
    'grpc.ssl_target_name_override': 'peer0.org1.example.com',
  })

  return client
}
