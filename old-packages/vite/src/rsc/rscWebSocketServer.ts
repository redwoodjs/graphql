import WebSocket, { WebSocketServer } from 'ws'

export function createWebSocketServer() {
  const wsServer = new WebSocketServer({ port: 18998 })

  wsServer.on('connection', (ws) => {
    console.log('A new client connected.')

    // Event listener for incoming messages. The `data` is a Buffer
    ws.on('message', (data) => {
      const message = data.toString()
      console.log('Received message:', message)

      // Broadcast the message to all connected clients
      wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    })

    // Event listener for client disconnection
    ws.on('close', () => {
      console.log('A client disconnected.')
    })
  })
}
