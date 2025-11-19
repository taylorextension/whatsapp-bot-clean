import { Server as SocketIOServer, Socket } from 'socket.io';
import { whatsappEventBus } from '../events/whatsappEvents';
import whatsappService from '../services/whatsapp';
import logger from '../utils/logger';
import { setLastQR, clearQR, getLastQR } from './routes/qr';
import QRCode from 'qrcode';

type QRTarget = SocketIOServer | Socket;

const QR_CODE_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  width: 300,
  margin: 2
};

/**
 * Setup WebSocket handlers for real-time communication
 * Broadcasts WhatsApp events to connected clients
 */
export function setupWebSocket(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 WebSocket client connected: ${socket.id}`);

    // Send current status immediately
    const isReady = whatsappService.isReady();
    socket.emit('status-update', {
      ready: isReady,
      state: isReady ? 'open' : 'connecting',
      timestamp: Date.now()
    });

    // If there's a cached QR (bot not authenticated), send it to the new client
    const cachedQR = getLastQR();
    if (cachedQR && !whatsappService.isReady()) {
      emitQRCode(socket, cachedQR.qr, cachedQR.timestamp, true);
    }

    // QR Code event handler
    const qrListener = async (data: any) => {
      logger.info('📱 Broadcasting QR code to WebSocket clients');

      // Store QR for REST API (converts to DataURL and caches)
      await setLastQR(data.qr);

      // Convert to DataURL and emit
      emitQRCode(io, data.qr, data.timestamp);
    };

    // Ready event handler
    const readyListener = (data: any) => {
      logger.info('✅ Broadcasting ready status to WebSocket clients');

      // Clear QR code when authenticated
      clearQR();

      io.emit('status-update', {
        ready: true,
        state: 'open',
        timestamp: data.timestamp
      });

      io.emit('ready', {
        timestamp: data.timestamp
      });

      io.emit('event', {
        type: 'ready',
        message: 'WhatsApp Bot is ready and connected',
        timestamp: data.timestamp
      });
    };

    // Connection state change handler
    const connectionStateListener = (data: any) => {
      const ready = data.state === 'open';

      logger.info(`🔄 Broadcasting connection state: ${data.state}`);

      io.emit('status-update', {
        ready,
        state: data.state,
        timestamp: data.timestamp
      });

      io.emit('connection-state', {
        state: data.state,
        reason: data.reason,
        timestamp: data.timestamp
      });

      io.emit('event', {
        type: 'connection-state',
        state: data.state,
        reason: data.reason,
        timestamp: data.timestamp
      });
    };

    // Message received handler
    const messageReceivedListener = (data: any) => {
      logger.info(`💬 Broadcasting message received event from ${data.name}`);

      io.emit('event', {
        type: 'message-received',
        from: data.from,
        name: data.name,
        preview: data.message.substring(0, 100),
        timestamp: data.timestamp
      });

      // Also emit dedicated message event for real-time message feed
      io.emit('message', {
        from: data.from,
        name: data.name,
        message: data.message,
        timestamp: data.timestamp
      });
    };

    // Error handler
    const errorListener = (data: any) => {
      logger.error(`❌ Broadcasting error event: ${data.error}`);

      io.emit('event', {
        type: 'error',
        error: data.error,
        timestamp: data.timestamp
      });
    };

    // Disconnected handler
    const disconnectedListener = (data: any) => {
      logger.warn(`⚠️ Broadcasting disconnected event: ${data.reason}`);

      io.emit('status-update', {
        ready: false,
        state: 'close',
        timestamp: data.timestamp
      });

      io.emit('disconnected', {
        reason: data.reason,
        timestamp: data.timestamp
      });

      io.emit('event', {
        type: 'disconnected',
        reason: data.reason,
        timestamp: data.timestamp
      });
    };

    // Manual message sent handler (pausa automática)
    const manualMessageListener = (data: any) => {
      logger.info(`✋ Broadcasting manual message event for ${data.chatId}`);

      io.emit('message-sent-manually', {
        chatId: data.chatId,
        name: data.name,
        timestamp: data.timestamp
      });
    };

    // Pause status update handler
    const pauseStatusListener = (data: any) => {
      logger.info('📊 Broadcasting pause status update');

      io.emit('pause-status-update', {
        globalPause: data.globalPause,
        pausedChats: data.pausedChats,
        timestamp: data.timestamp
      });
    };

    // Register all event listeners
    whatsappEventBus.on('qr-code', qrListener);
    whatsappEventBus.on('ready', readyListener);
    whatsappEventBus.on('connection-state', connectionStateListener);
    whatsappEventBus.on('message-received', messageReceivedListener);
    whatsappEventBus.on('error', errorListener);
    whatsappEventBus.on('disconnected', disconnectedListener);
    whatsappEventBus.on('message-sent-manually', manualMessageListener);
    whatsappEventBus.on('pause-status-update', pauseStatusListener);

    // Handle client disconnect
    socket.on('disconnect', () => {
      logger.info(`🔌 WebSocket client disconnected: ${socket.id}`);

      // Clean up event listeners
      whatsappEventBus.removeListener('qr-code', qrListener);
      whatsappEventBus.removeListener('ready', readyListener);
      whatsappEventBus.removeListener('connection-state', connectionStateListener);
      whatsappEventBus.removeListener('message-received', messageReceivedListener);
      whatsappEventBus.removeListener('error', errorListener);
      whatsappEventBus.removeListener('disconnected', disconnectedListener);
      whatsappEventBus.removeListener('message-sent-manually', manualMessageListener);
      whatsappEventBus.removeListener('pause-status-update', pauseStatusListener);
    });

    // Handle ping from client (for connection health check)
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: Date.now()
      });
    });

    // Handle request-qr from client (immediate QR fetch)
    socket.on('request-qr', () => {
      logger.info(`📱 Client ${socket.id} requesting QR code`);
      const cachedQR = getLastQR();
      if (cachedQR && !whatsappService.isReady()) {
        emitQRCode(socket, cachedQR.qr, cachedQR.timestamp, true);
      } else {
        logger.info('No cached QR available or already authenticated');
      }
    });
  });

  logger.info('🌐 WebSocket handlers configured');
}

async function emitQRCode(target: QRTarget, qrValue: string, timestamp: number, cached = false): Promise<void> {
  try {
    // If cached, qrValue is already a DataURL. Otherwise, convert it.
    let qrDataUrl: string;
    if (cached && qrValue.startsWith('data:image/png;base64,')) {
      qrDataUrl = qrValue;
    } else {
      qrDataUrl = await QRCode.toDataURL(qrValue, QR_CODE_OPTIONS);
    }

    target.emit('qr-code', {
      qr: qrDataUrl,
      timestamp,
      cached
    });
  } catch (error: any) {
    logger.error('Error generating QR code for WebSocket:', error.message);
  }
}

export default setupWebSocket;
