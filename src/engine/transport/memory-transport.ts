import type { 
  IClientTransport, 
  IHostPeerTransport, 
  ClientToHostPacket, 
  HostToClientPacket, 
  MessageHandler 
} from './transport.interface';

/**
 * InMemoryTransportPair
 * Tạo một cặp kênh truyền tin song công (Duplex) trực tiếp trong RAM.
 * Dùng cho Offline Mode và Local Host Client mà không cần thông qua mạng Internet.
 */
export function createMemoryDuplexTransport(
  hostPeerId: string = 'HOST',
  clientPeerId: string = 'LOCAL_CLIENT'
): { hostTransport: IHostPeerTransport; clientTransport: IClientTransport } {
  let isConnected = true;

  const hostMessageHandlers = new Set<MessageHandler<ClientToHostPacket>>();
  const clientMessageHandlers = new Set<MessageHandler<HostToClientPacket>>();

  const hostTransport: IHostPeerTransport = {
    get isConnected() {
      return isConnected;
    },
    send(message: HostToClientPacket): void {
      if (!isConnected) return;
      // Gửi trực tiếp sang client side
      for (const handler of clientMessageHandlers) {
        try {
          handler(message, hostPeerId);
        } catch (err) {
          console.error('[MemoryTransport:Host->Client] Handler error:', err);
        }
      }
    },
    onMessage(handler: MessageHandler<ClientToHostPacket>): () => void {
      hostMessageHandlers.add(handler);
      return () => hostMessageHandlers.delete(handler);
    },
    disconnect(): void {
      isConnected = false;
      hostMessageHandlers.clear();
      clientMessageHandlers.clear();
    }
  };

  const clientTransport: IClientTransport = {
    get isConnected() {
      return isConnected;
    },
    send(message: ClientToHostPacket): void {
      if (!isConnected) return;
      // Gửi trực tiếp sang host side
      for (const handler of hostMessageHandlers) {
        try {
          handler(message, clientPeerId);
        } catch (err) {
          console.error('[MemoryTransport:Client->Host] Handler error:', err);
        }
      }
    },
    onMessage(handler: MessageHandler<HostToClientPacket>): () => void {
      clientMessageHandlers.add(handler);
      return () => clientMessageHandlers.delete(handler);
    },
    disconnect(): void {
      isConnected = false;
      hostMessageHandlers.clear();
      clientMessageHandlers.clear();
    }
  };

  return { hostTransport, clientTransport };
}
