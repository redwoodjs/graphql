import kill from 'kill-port'

export const shutdownPort = (port: number, method: 'tcp' | 'udp' = 'tcp') => {
  return kill(port, method)
}
