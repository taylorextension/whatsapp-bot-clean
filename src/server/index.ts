import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import path from 'path';
import logger from '../utils/logger';
import qrRoutes from './routes/qr';
import statusRoutes from './routes/status';
import conversationsRoutes from './routes/conversations';
import botRoutes from './routes/bot';
import configRoutes from './routes/config';
import { setupWebSocket } from './websocket';

/**
 * WhatsApp Bot Web Server
 * Provides REST API and WebSocket for real-time updates
 */
export class WhatsAppBotServer {
  private app: Express;
  private server: http.Server;
  private io: SocketIOServer;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);

    // Configure CORS for WebSocket
    const corsOrigin = process.env.CORS_ORIGIN || '*';

    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // CORS
    const corsOrigin = process.env.CORS_ORIGIN || '*';
    this.app.use(cors({
      origin: corsOrigin,
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Configure routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: 'whatsapp-bot',
        timestamp: new Date().toISOString()
      });
    });

    // Service Worker - retornar 404 explícito para parar tentativas automáticas
    this.app.get('/sw.js', (req: Request, res: Response) => {
      logger.debug('Service Worker request blocked (sw.js não existe)');
      res.status(404).send('// Service Worker not used in this application');
    });

    // API routes (definidos ANTES do express.static para ter prioridade)
    this.app.use('/api/qr', qrRoutes);
    this.app.use('/api/status', statusRoutes);
    this.app.use('/api/conversations', conversationsRoutes);
    this.app.use('/api/bot', botRoutes);
    this.app.use('/api/config', configRoutes);

    // Serve static files from public directory
    // Isso vai servir public/index.html quando acessar /
    this.app.use(express.static(path.join(__dirname, '../../public')));

    /* REMOVIDO: HTML inline antigo - agora usa public/index.html
    // Root route - Simple dashboard
    this.app.get('/', (req: Request, res: Response) => {
      res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Bot - Brasil TV</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    h1 {
      color: #333;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .status {
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 20px;
    }
    .status.ready {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .status.disconnected {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .status.connecting {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }
    #qr-container {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    #qr-code {
      max-width: 300px;
      margin: 0 auto;
    }
    #qr-code img {
      width: 100%;
      height: auto;
      border-radius: 8px;
    }
    .qr-instructions {
      margin-top: 12px;
      color: #666;
      font-size: 14px;
    }
    .events {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      max-height: 300px;
      overflow-y: auto;
    }
    .events h3 {
      margin-bottom: 12px;
      color: #333;
      font-size: 16px;
    }
    .event {
      padding: 8px 12px;
      background: white;
      border-radius: 4px;
      margin-bottom: 8px;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      border-left: 3px solid #667eea;
    }
    .event .time {
      color: #999;
      font-size: 11px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .pulse {
      animation: pulse 2s ease-in-out infinite;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🤖 WhatsApp Bot - Brasil TV</h1>
      <div class="subtitle">Dashboard em Tempo Real</div>

      <div id="status" class="status disconnected">
        Status: Conectando...
      </div>

      <div class="stats" id="stats">
        <div class="stat">
          <div class="stat-value" id="stat-contacts">-</div>
          <div class="stat-label">Contatos</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="stat-messages">-</div>
          <div class="stat-label">Mensagens</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="stat-avg">-</div>
          <div class="stat-label">Média/Contato</div>
        </div>
      </div>

      <div id="qr-container" style="display: none;">
        <div id="qr-code" class="loading pulse">
          Aguardando QR code...
        </div>
        <div class="qr-instructions">
          Abra o WhatsApp no seu celular → Configurações → Aparelhos conectados → Conectar um aparelho
        </div>
      </div>
    </div>

    <div class="card">
      <div class="events">
        <h3>📋 Eventos Recentes</h3>
        <div id="events-list"></div>
      </div>
    </div>
  </div>

  <script>
    const socket = io();
    const statusEl = document.getElementById('status');
    const qrContainer = document.getElementById('qr-container');
    const qrCode = document.getElementById('qr-code');
    const eventsList = document.getElementById('events-list');

    function addEvent(message, type = 'info') {
      const event = document.createElement('div');
      event.className = 'event';
      const time = new Date().toLocaleTimeString('pt-BR');
      event.innerHTML = \`<div class="time">\${time}</div><div>\${message}</div>\`;
      eventsList.insertBefore(event, eventsList.firstChild);

      // Keep only last 20 events
      while (eventsList.children.length > 20) {
        eventsList.removeChild(eventsList.lastChild);
      }
    }

    function updateStats() {
      fetch('/api/status')
        .then(r => r.json())
        .then(data => {
          document.getElementById('stat-contacts').textContent = data.conversations.totalContacts;
          document.getElementById('stat-messages').textContent = data.conversations.totalMessages;
          document.getElementById('stat-avg').textContent = data.conversations.averageMessagesPerContact.toFixed(1);
        })
        .catch(err => console.error('Error fetching stats:', err));
    }

    socket.on('connect', () => {
      addEvent('✅ Conectado ao servidor WebSocket');
      updateStats();
    });

    socket.on('disconnect', () => {
      addEvent('❌ Desconectado do servidor');
    });

    socket.on('qr-code', (data) => {
      qrContainer.style.display = 'block';
      qrCode.innerHTML = \`<img src="\${data.qr}" alt="QR Code" />\`;
      addEvent('📱 Novo QR Code gerado - Escaneie com seu celular');
    });

    socket.on('status-update', (data) => {
      if (data.ready) {
        statusEl.className = 'status ready';
        statusEl.textContent = 'Status: Online ✅';
        qrContainer.style.display = 'none';
      } else {
        statusEl.className = 'status disconnected';
        statusEl.textContent = 'Status: Aguardando autenticação';
      }
      updateStats();
    });

    socket.on('event', (data) => {
      let message = '';
      switch(data.type) {
        case 'ready':
          message = '✅ Bot autenticado e pronto!';
          break;
        case 'connection-state':
          message = \`🔄 Estado da conexão: \${data.state}\`;
          break;
        case 'message-received':
          message = \`💬 Mensagem de \${data.name}\`;
          break;
        case 'error':
          message = \`❌ Erro: \${data.error}\`;
          break;
        case 'disconnected':
          message = \`⚠️ Desconectado: \${data.reason}\`;
          break;
        default:
          message = JSON.stringify(data);
      }
      addEvent(message);
    });

    socket.on('message', (data) => {
      updateStats();
    });

    // Update stats every 30 seconds
    setInterval(updateStats, 30000);
  </script>
</body>
</html>
      `);
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
        timestamp: new Date().toISOString()
      });
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Express error:', err.message);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    });
    */
  }

  /**
   * Configure WebSocket
   */
  private setupWebSocket(): void {
    setupWebSocket(this.io);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        logger.info(`🌐 Web server running on http://localhost:${this.port}`);
        logger.info(`📡 WebSocket server ready for connections`);
        logger.info(`📋 API endpoints:`);
        logger.info(`   GET /api/qr - Get QR code`);
        logger.info(`   GET /api/status - Get bot status`);
        logger.info(`   GET /health - Health check`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  public stop(): void {
    this.server.close(() => {
      logger.info('🛑 Web server stopped');
    });
  }

  /**
   * Get Socket.IO instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

export default WhatsAppBotServer;
