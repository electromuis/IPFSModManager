import { noise } from '@chainsafe/libp2p-noise'

export default async function getLibP2pOptions(options) {
  const {identify} = await import('@libp2p/identify')
  const {all} = await import('@libp2p/websockets/filters')
  // const {noise} = await import('@chainsafe/libp2p-noise')
  const {yamux} = await import('@chainsafe/libp2p-yamux')
  const {gossipsub} = await import('@chainsafe/libp2p-gossipsub')
  const {tcp} = await import('@libp2p/tcp')
  const {bootstrap} = await import('@libp2p/bootstrap')

  const Libp2pOptions = {
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0/ws',
        `/ip4/0.0.0.0/tcp/0`,
      ]
    },
    transports: [
      tcp()
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    services: {
      identify: identify(),
      pubsub: gossipsub({
        allowPublishToZeroPeers: true,
        // directPeers: [
        //     {
        //         id: peerIdFromString('12D3KooWRPyQS5DwQZErnP32kZ2XJbpmQemHyZjdzNEAvp1H5FkK'),
        //         addrs: [multiaddr('/ip4/127.0.0.1/tcp/8997')]
        //     }
        // ]
      })
    },
    peerDiscovery: [
      // mdns()
      bootstrap({
        timeout: 4000,
        list: options.bootstrapList
      })
    ]
  }

  return Libp2pOptions
}
