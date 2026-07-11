declare module 'kill-port' {
  export default function (port: number, method: 'tcp' | 'udp'): Promise<void>
}
