/**
 * Serviço WhatsApp - Handler de Mensagens (Baileys)
 * Migrado de whatsapp-web.js para @whiskeysockets/baileys
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WAMessage,
  WASocket,
  proto,
  downloadMediaMessage,
  getContentType,
  Browsers,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import QRCode from 'qrcode';
import { getHistoryForClaude, addMessageToHistory } from './conversation';
import conversationService from './conversation';
import { analyzeMediaWithGemini, normalizeMimeType, getMediaTypeLabel } from './gemini';
import llmService from './llm';
import logger from '../utils/logger';
import { whatsappEventBus } from '../events/whatsappEvents';

// Configuração
const BAILEYS_AUTH_PATH = process.env.BAILEYS_AUTH_PATH || 'baileys_auth_info';
const MESSAGE_ACCUMULATOR_TIMEOUT = 7000; // 7 segundos
const MEDIA_MESSAGE_TYPES = new Set(['imageMessage', 'videoMessage', 'audioMessage']);

// Anti-detecção: delays realistas (em ms)
const HUMAN_DELAYS = {
  MIN_READING: 2000,    // Tempo mínimo "lendo" mensagem
  PER_CHAR: 50,         // ms por caractere da mensagem
  BEFORE_TYPING: 1000,  // Delay antes de começar a digitar
  TYPING_SPEED: 40,     // ms por caractere ao "digitar"
  AFTER_SEND: 500       // Delay após enviar
};

// Função para delay aleatório (mais humano)
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Acumulador de mensagens
interface MessageAccumulator {
  messages: string[];
  contactLabel: string;
  jid: string;
  timer: NodeJS.Timeout;
  lastMessageTimestamp: number; // Timestamp da última mensagem no acumulador
}
const messageAccumulator = new Map<string, MessageAccumulator>();

// Sistema de pausa
interface PausedChat {
  chatId: string;
  name: string;
  pausedAt: number;
  resumeAfterMs?: number; // Timestamp para ignorar mensagens antigas após retomada
}

let globalPause = false;
const pausedChats = new Map<string, PausedChat>();
const chatResumeTimestamps = new Map<string, number>(); // Armazena timestamps de retomada

/**
 * Serviço WhatsApp (Baileys)
 */
export class WhatsAppService {
  private sock: WASocket | null = null;
  private logger = P({ level: 'silent' }); // Silenciar logs internos do Baileys
  private startupTimestamp: number = Date.now(); // Timestamp de inicialização

  // Connection state management (to prevent infinite loops)
  private isConnecting: boolean = false;
  private isRecovering: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private readonly baseReconnectDelay: number = 5000; // 5 seconds

  /**
   * Verificar se socket está conectado
   */
  private isSocketReady(): boolean {
    return this.sock !== null && this.sock.user !== undefined;
  }

  /**
   * Obter socket (para uso externo - servidor web)
   */
  public getSocket(): WASocket | null {
    return this.sock;
  }

  /**
   * Verificar se está pronto (para uso externo - servidor web)
   */
  public isReady(): boolean {
    return this.isSocketReady();
  }

  /**
   * Cleanup old socket and event listeners
   * CRITICAL: Prevents event listener accumulation that causes infinite reconnection loops
   */
  private cleanupSocket(): void {
    if (this.sock) {
      try {
        // Remove all event listeners to prevent duplicate handler registration
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.ev.removeAllListeners('creds.update');

        logger.debug('🧹 Cleaned up old socket event listeners');
      } catch (error: any) {
        logger.warn(`⚠️ Error cleaning up socket: ${error.message}`);
      }

      // Clear socket reference
      this.sock = null;
    }
  }

  /**
   * Deletar mensagem (para comandos)
   */
  private async deleteMessage(jid: string, messageKey: any): Promise<void> {
    try {
      if (!this.sock) return;
      await this.sock.sendMessage(jid, { delete: messageKey });
    } catch (error: any) {
      logger.warn(`⚠️ Erro ao deletar mensagem: ${error.message}`);
    }
  }

  /**
   * Inicializar cliente WhatsApp
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Initializing WhatsApp Bot with Baileys...');
    logger.info(`📁 Auth storage: ${BAILEYS_AUTH_PATH}`);
    logger.info(`⏱️ Message accumulator timeout: ${MESSAGE_ACCUMULATOR_TIMEOUT}ms`);
    logger.info('🔄 Starting connection...\\n');

    await this.startConnection();
  }

  /**
   * Auto-recovery: Deletar credenciais e reconectar automaticamente
   * Usado quando logout é detectado ou erro de conflito ocorre
   */
  private async autoRecovery(reason: string): Promise<void> {
    if (this.isRecovering) {
      logger.warn('⚠️ Auto-recovery já em andamento, pulando...');
      return;
    }

    this.isRecovering = true;
    logger.warn(`🔄 Auto-recovery iniciada: ${reason}`);

    try {
      // 1. Cleanup socket
      this.cleanupSocket();

      // 2. Deletar pasta de autenticação
      const fs = await import('fs/promises');
      const path = await import('path');
      const authPath = path.resolve(BAILEYS_AUTH_PATH);

      try {
        await fs.rm(authPath, { recursive: true, force: true });
        logger.info(`✅ Credenciais deletadas: ${authPath}`);
      } catch (error: any) {
        logger.warn(`⚠️ Erro ao deletar credenciais (pode não existir): ${error.message}`);
      }

      // 3. Resetar contador de reconnect
      this.reconnectAttempts = 0;

      // 4. Emitir evento de desconexão
      whatsappEventBus.emit('disconnected', {
        type: 'disconnected',
        reason,
        autoRecovery: true,
        timestamp: Date.now()
      });

      // 5. Aguardar para garantir limpeza de arquivos
      logger.info('⏳ Aguardando 2s antes de reconectar...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 6. Reiniciar conexão (irá gerar novo QR code)
      logger.info('🔄 Reiniciando conexão para gerar novo QR code...');
      await this.startConnection();

    } catch (error: any) {
      logger.error(`❌ Erro na auto-recovery: ${error.message}`);

      // Se falhar, tenta novamente após delay
      logger.info('🔄 Tentando auto-recovery novamente em 5s...');
      setTimeout(() => {
        this.isRecovering = false;
        this.autoRecovery(reason);
      }, 5000);

    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Iniciar conexão com WhatsApp
   */
  private async startConnection(): Promise<void> {
    // CRITICAL: Prevent simultaneous connection attempts (causes "conflict" errors)
    if (this.isConnecting) {
      logger.warn('⚠️ Connection attempt already in progress, skipping...');
      return;
    }

    try {
      this.isConnecting = true;

      // Cleanup old socket before creating new one (prevents listener accumulation)
      this.cleanupSocket();

      logger.info('🔄 Starting new connection...');

      // Buscar versão mais recente do Baileys/WhatsApp
      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      // Carregar estado de autenticação
      const { state, saveCreds } = await useMultiFileAuthState(BAILEYS_AUTH_PATH);

      // Criar socket
      this.sock = makeWASocket({
        version,
        auth: state,
        logger: this.logger,
        browser: Browsers.ubuntu('WhatsApp Bot Brasil TV'),
        markOnlineOnConnect: false, // Anti-detecção
        syncFullHistory: false, // Não sincronizar histórico completo
      });

      // Salvar credenciais quando atualizarem
      this.sock.ev.on('creds.update', saveCreds);

      // Configurar event handlers
      this.setupEventHandlers();

    } catch (error: any) {
      logger.error('❌ Error starting connection:', error.message);
      this.reconnectAttempts++;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Configurar event handlers
   */
  private setupEventHandlers(): void {
    if (!this.sock) return;

    // Connection updates
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('\\n========================================');
        logger.info('QR CODE RECEIVED');
        logger.info('Please scan this QR code with WhatsApp');
        logger.info('========================================\\n');

        // Emitir evento para WebSocket
        whatsappEventBus.emit('qr-code', {
          type: 'qr-code',
          qr,
          timestamp: Date.now()
        });

        // Exibir QR code no terminal
        try {
          const qrString = await QRCode.toString(qr, { type: 'terminal', small: true });
          console.log(qrString);
          logger.info('\\n========================================');
          logger.info('Scan the QR code above with WhatsApp');
          logger.info('Go to: WhatsApp > Settings > Linked Devices');
          logger.info('========================================\\n');
        } catch (error: any) {
          logger.error('Error generating QR code:', error.message);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        const reason = lastDisconnect?.error?.message || 'Unknown reason';

        logger.info('\\n========================================');
        logger.info('Connection closed:', reason);

        // Emitir evento de desconexão (ONLY ONCE)
        whatsappEventBus.emit('connection-state', {
          type: 'connection-state',
          state: 'close',
          reason,
          timestamp: Date.now()
        });

        // Detect "conflict" error specifically
        const isConflictError = reason.toLowerCase().includes('conflict');

        if (isConflictError) {
          logger.warn('⚠️ CONFLICT ERROR DETECTED - Iniciando auto-recovery');
          logger.info('========================================\\n');
          await this.autoRecovery('Conflict error detected');
          return;
        }

        // Check maximum reconnection attempts to prevent infinite loops
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error(`❌ Maximum reconnection attempts (${this.maxReconnectAttempts}) reached.`);
          logger.warn('🔄 Tentando auto-recovery...');
          logger.info('========================================\\n');
          await this.autoRecovery('Max reconnection attempts reached');
          return;
        }

        if (shouldReconnect) {
          // Exponential backoff: delay increases with each failed attempt
          this.reconnectAttempts++;
          const exponentialDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          const reconnectDelay = Math.min(exponentialDelay, 30000); // Max 30 seconds

          logger.info(`Reconnecting in ${reconnectDelay / 1000} seconds... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          logger.info('========================================\\n');

          setTimeout(() => this.startConnection(), reconnectDelay);
        } else {
          // User logged out - trigger auto-recovery
          logger.warn('🔄 User logged out - Iniciando auto-recovery');
          logger.info('========================================\\n');
          await this.autoRecovery('User logged out from WhatsApp');
        }
      }

      if (connection === 'open') {
        logger.info('\\n========================================');
        logger.info('WhatsApp Bot is READY!');
        logger.info('Waiting for messages...');
        logger.info('========================================\\n');

        // Reset reconnection counter on successful connection
        this.reconnectAttempts = 0;

        // Emitir evento de ready
        whatsappEventBus.emit('ready', {
          type: 'ready',
          timestamp: Date.now()
        });

        whatsappEventBus.emit('connection-state', {
          type: 'connection-state',
          state: 'open',
          timestamp: Date.now()
        });
      }
    });

    // Mensagens recebidas
    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      // Apenas processar mensagens novas (não sincronização de histórico)
      if (type === 'notify') {
        for (const msg of messages) {
          // Verificar se é mensagem manual (fromMe = true)
          if (msg.key.fromMe) {
            const jid = msg.key.remoteJid!;
            // Não processar grupos
            if (!jid.endsWith('@g.us')) {
              // Extrair texto da mensagem
              const messageType = msg.message ? getContentType(msg.message) : undefined;
              const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
              const tsMs = (msg.messageTimestamp as number) * 1000;

              // Comando: @stop (PAUSA GLOBAL)
              if (/^@stop\b/i.test(text)) {
                this.setGlobalPause(true);
                await this.deleteMessage(jid, msg.key);
                logger.info(`⏸️ Comando @stop detectado - Pausa global ativada`);
                continue;
              }

              // Comando: @play (RETOMAR GLOBAL)
              if (/^@play\b/i.test(text)) {
                this.setGlobalPause(false);
                await this.deleteMessage(jid, msg.key);
                logger.info(`▶️ Comando @play detectado - Pausa global desativada`);
                continue;
              }

              // Comando: @continue (RETOMAR CHAT INDIVIDUAL)
              if (/^@continue\b/i.test(text)) {
                this.resumeChat(jid, tsMs);
                await this.deleteMessage(jid, msg.key);
                logger.info(`▶️ Comando @continue detectado - Chat ${jid} retomado`);
                continue; // IMPORTANTE: não cair no auto-pause
              }

              // Comando: @clean (LIMPAR HISTÓRICO DA CONVERSA)
              if (/^@clean\b/i.test(text)) {
                const success = conversationService.clearConversationHistory(jid);
                await this.deleteMessage(jid, msg.key);
                if (success) {
                  logger.info(`🗑️ Comando @clean detectado - Histórico limpo para ${jid}`);
                } else {
                  logger.info(`⚠️ Comando @clean: nenhum histórico encontrado para ${jid}`);
                }
                continue;
              }

              // Qualquer outra mensagem manual -> auto-pause
              const contactName = jid.split('@')[0];
              this.pauseChat(jid, contactName);
              logger.info(`✋ Mensagem manual detectada para ${contactName} - Bot pausado automaticamente nesta conversa`);
            }
          }

          await this.handleMessage(msg);
        }
      }
    });
  }

  /**
   * Manipular mensagem recebida
   */
  private async handleMessage(msg: WAMessage): Promise<void> {
    try {
      // Filtro 1: Ignorar mensagens próprias
      if (msg.key.fromMe) {
        return;
      }

      // Filtro 2: Ignorar grupos
      const jid = msg.key.remoteJid!;
      if (jid.endsWith('@g.us')) {
        return;
      }

      // Filtro 3: Ignorar mensagens antigas (anteriores à inicialização do bot)
      const messageTimestamp = (msg.messageTimestamp as number) * 1000; // Converter para ms
      if (messageTimestamp < this.startupTimestamp) {
        logger.debug(`  ⏭️ Ignoring old message from ${msg.pushName || jid} (${new Date(messageTimestamp).toLocaleString()})`);
        return;
      }

      // Obter informações do contato
      const contactLabel = msg.pushName || jid.split('@')[0];
      const timestamp = new Date().toLocaleTimeString();

      // Detectar tipo de mensagem
      const messageType = msg.message ? getContentType(msg.message) : undefined;

      // Processar mensagem
      let assistantInput: string | null = null;

      if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        logger.info(`\\n[${timestamp}] 📨 Message from ${contactLabel}:`);
        logger.info(`  > ${messageText}`);
        assistantInput = messageText;
      } else if (MEDIA_MESSAGE_TYPES.has(messageType || '')) {
        logger.info(`\\n[${timestamp}] 📎 ${messageType?.toUpperCase()} from ${contactLabel}`);
        assistantInput = await this.createAssistantPayloadForMedia(msg, messageType!);
        if (!assistantInput) {
          logger.error('  ⚠️ Skipping message because media could not be processed.');
          return;
        }
      } else {
        logger.info(`\\n[${timestamp}] ⚠️ Unsupported message type "${messageType}" from ${contactLabel}. Ignoring.`);
        return;
      }

      if (!assistantInput) {
        logger.warn('  ⚠️ Assistant payload is empty. Skipping message.');
        return;
      }

      // Emitir evento de mensagem recebida
      whatsappEventBus.emit('message-received', {
        type: 'message-received',
        from: jid,
        name: contactLabel,
        message: assistantInput,
        timestamp: Date.now()
      });

      // Adicionar ao acumulador
      this.addToMessageAccumulator(jid, contactLabel, assistantInput, messageTimestamp);

    } catch (error: any) {
      logger.error('  ❌ Error handling message:', error.message);

      // Emitir evento de erro
      whatsappEventBus.emit('error', {
        type: 'error',
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Criar payload de mídia para o assistente
   */
  private async createAssistantPayloadForMedia(msg: WAMessage, messageType: string): Promise<string | null> {
    try {
      if (!this.sock) return null;

      // Download da mídia
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        {
          logger: this.logger,
          reuploadRequest: this.sock.updateMediaMessage
        }
      );

      if (!buffer) {
        logger.error('  ❌ Unable to download media data from WhatsApp message.');
        return null;
      }

      // Detectar MIME type
      const mimeType = msg.message?.imageMessage?.mimetype ||
                      msg.message?.videoMessage?.mimetype ||
                      msg.message?.audioMessage?.mimetype ||
                      '';

      const normalizedMimeType = normalizeMimeType(mimeType);

      if (!normalizedMimeType) {
        logger.warn('  ⚠️ Could not determine MIME type for the received media.');
      } else {
        logger.info(`  📎 Detected media MIME type: ${normalizedMimeType}`);
      }

      // Tenta analisar com Gemini
      const geminiDescription = await analyzeMediaWithGemini(
        normalizedMimeType || undefined,
        buffer.toString('base64')
      );

      const caption = msg.message?.imageMessage?.caption ||
                     msg.message?.videoMessage?.caption ||
                     '';

      const mediaLabel = getMediaTypeLabel(messageType, normalizedMimeType || undefined);

      // Header especial pra áudio/vídeo (indica pro Claude que DEVE usar text_to_speech)
      const isAudioOrVideo = messageType === 'audioMessage' || messageType === 'videoMessage';
      const lines = [
        isAudioOrVideo ? `[ATENÇÃO: Cliente enviou ${messageType === 'audioMessage' ? 'ÁUDIO' : 'VÍDEO'} - Você DEVE responder usando a tool text_to_speech]` : '',
        `O usuário enviou uma mídia do tipo ${mediaLabel}.`
      ].filter(Boolean);

      if (normalizedMimeType) {
        lines.push(`MIME type: ${normalizedMimeType}`);
      }

      if (caption) {
        lines.push(`Legenda fornecida pelo usuário: ${caption}`);
      }

      if (geminiDescription) {
        lines.push('Descrição detalhada da mídia (gerada automaticamente):');
        lines.push(geminiDescription);
      } else {
        lines.push('Não foi possível gerar uma descrição automática para esta mídia.');
      }

      return lines.join('\\n');
    } catch (error: any) {
      logger.error('  ❌ Error preparing media payload for assistant:', error.message);
      return null;
    }
  }

  /**
   * Adicionar mensagem ao acumulador
   */
  private addToMessageAccumulator(jid: string, contactLabel: string, assistantInput: string, messageTimestamp: number): void {
    if (messageAccumulator.has(jid)) {
      const accumulator = messageAccumulator.get(jid)!;
      clearTimeout(accumulator.timer);
    } else {
      messageAccumulator.set(jid, {
        messages: [],
        contactLabel,
        jid,
        timer: setTimeout(() => {}, 0), // placeholder
        lastMessageTimestamp: 0
      });
    }

    const accumulator = messageAccumulator.get(jid)!;
    accumulator.messages.push(assistantInput);
    accumulator.lastMessageTimestamp = messageTimestamp; // Atualizar com timestamp da última mensagem

    logger.info(`  ⏳ Message added to accumulator (${accumulator.messages.length} total). Waiting ${MESSAGE_ACCUMULATOR_TIMEOUT}ms for more messages...`);

    const timer = setTimeout(() => {
      this.processAccumulatedMessages(jid);
    }, MESSAGE_ACCUMULATOR_TIMEOUT);

    accumulator.timer = timer;
  }

  /**
   * Processar mensagens acumuladas
   */
  private async processAccumulatedMessages(jid: string): Promise<void> {
    if (!messageAccumulator.has(jid)) {
      return;
    }

    const accumulator = messageAccumulator.get(jid)!;
    const { messages, contactLabel, lastMessageTimestamp } = accumulator;

    messageAccumulator.delete(jid);

    if (messages.length === 0) {
      return;
    }

    // Verificar se bot está pausado (globalmente ou para este chat)
    if (globalPause || pausedChats.has(jid)) {
      logger.info(`⏸️ Bot pausado para ${contactLabel} - Mensagem não será processada`);
      return;
    }

    // Verificar se mensagem é anterior ao timestamp de retomada (ignore old messages)
    const resumeAfterMs = chatResumeTimestamps.get(jid);
    if (resumeAfterMs !== undefined && lastMessageTimestamp <= resumeAfterMs) {
      logger.info(`⏭️ Ignorando mensagem antiga de ${contactLabel} (recebida antes do comando #resume)`);
      return;
    }

    const combinedInput = messages.join('\\n\\n');
    logger.info(`\\n💬 Processing ${messages.length} accumulated message(s) for ${contactLabel}`);

    try {
      // Carregar histórico
      const history = getHistoryForClaude(jid, 20);

      // Query ao Claude
      const response = await llmService.query([
        ...history,
        { role: 'user', content: combinedInput }
      ]);

      // Salvar no histórico
      addMessageToHistory(jid, 'user', combinedInput);
      const assistantHistoryContent = (() => {
        if (typeof response?.historyContent === 'string') {
          const trimmed = response.historyContent.trim();
          if (trimmed) {
            return trimmed;
          }
        }
        if (typeof response?.content === 'string') {
          const trimmed = response.content.trim();
          if (trimmed) {
            return trimmed;
          }
        }
        if (response?.content && typeof response.content === 'object') {
          try {
            return JSON.stringify(response.content);
          } catch {
            return '[Resposta do assistente indisponível]';
          }
        }
        return '[Resposta do assistente indisponível]';
      })();
      addMessageToHistory(jid, 'assistant', assistantHistoryContent);

      // Processar resposta
      await this.sendResponse(jid, response);

    } catch (error: any) {
      logger.error(`  ❌ Agent execution failed: ${error.message}`);

      // Verificar se ainda está conectado antes de enviar fallback
      if (!this.isSocketReady()) {
        logger.warn('  ⚠️ Socket disconnected, cannot send fallback message');
        return;
      }

      const fallback = 'Oi! Tô com uma instabilidade agora, já já te respondo certinho.';
      try {
        await randomDelay(1000, 2000);
        await this.sock!.sendMessage(jid, { text: fallback });
        logger.info(`  ✅ < ${fallback}`);
      } catch (fallbackError: any) {
        logger.error(`  ❌ Failed to send fallback message: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Enviar resposta ao WhatsApp com comportamento humano
   */
  private async sendResponse(jid: string, response: any): Promise<void> {
    // Verificar se ainda está conectado
    if (!this.isSocketReady() || !this.sock) {
      logger.warn('  ⚠️ Socket not ready, skipping response');
      return;
    }

    // Parsear resposta
    let payload: any;
    try {
      payload = typeof response.content === 'string' ? JSON.parse(response.content) : response.content;
    } catch {
      // Texto puro
      payload = { messages: [{ type: 'text', text: response.content }] };
    }

    const messages = Array.isArray(payload?.messages) ? payload.messages : [];

    for (const message of messages) {
      // Verificar conexão antes de cada mensagem
      if (!this.isSocketReady() || !this.sock) {
        logger.warn('  ⚠️ Socket disconnected during response, stopping');
        return;
      }

      if (message.type === 'text' && message.text) {
        try {
          // Simular leitura da mensagem recebida
          const readingTime = Math.max(
            HUMAN_DELAYS.MIN_READING,
            message.text.length * HUMAN_DELAYS.PER_CHAR
          );
          await randomDelay(readingTime * 0.8, readingTime * 1.2);

          // Delay antes de começar a "digitar"
          await randomDelay(HUMAN_DELAYS.BEFORE_TYPING, HUMAN_DELAYS.BEFORE_TYPING * 1.5);

          // Mostrar "digitando..."
          await this.sock.sendPresenceUpdate('composing', jid);

          // Simular tempo de digitação
          const typingTime = message.text.length * HUMAN_DELAYS.TYPING_SPEED;
          await randomDelay(typingTime * 0.8, typingTime * 1.2);

          // Enviar mensagem
          await this.sock.sendMessage(jid, { text: message.text });
          await this.sock.sendPresenceUpdate('paused', jid);

          logger.info(`  ✅ < ${message.text}`);

          // Delay após enviar (antes da próxima mensagem)
          await randomDelay(HUMAN_DELAYS.AFTER_SEND, HUMAN_DELAYS.AFTER_SEND * 2);

        } catch (error: any) {
          logger.error(`  ❌ Failed to send text message: ${error.message}`);
          return; // Para de tentar se falhou
        }

      } else if (message.type === 'audio' && message.audio_base64) {
        try {
          // Delay antes de gravar
          await randomDelay(2000, 3000);

          await this.sock.sendPresenceUpdate('recording', jid);
          await randomDelay(3000, 4000);

          // Converter base64 para buffer
          const audioBuffer = Buffer.from(message.audio_base64, 'base64');

          await this.sock.sendMessage(jid, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true // Push-to-talk (voice message)
          });

          await this.sock.sendPresenceUpdate('paused', jid);

          logger.info(`  🔊 < Sent audio message`);

          await randomDelay(1000, 2000);

        } catch (error: any) {
          logger.error(`  ❌ Failed to send audio message: ${error.message}`);
          return;
        }
      }
    }
  }

  /**
   * Logout - desconectar WhatsApp
   */
  async logout(): Promise<void> {
    try {
      logger.info('🔌 Logging out from WhatsApp...');

      // Fazer logout do socket se existir
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch (error: any) {
          logger.warn(`⚠️ Error during socket logout: ${error.message}`);
        }
      }

      // Cleanup socket and event listeners BEFORE deleting auth folder
      this.cleanupSocket();

      // Deletar pasta de autenticação SEMPRE (mesmo sem socket)
      const fs = await import('fs/promises');
      const path = await import('path');
      const authPath = path.resolve(BAILEYS_AUTH_PATH);

      try {
        await fs.rm(authPath, { recursive: true, force: true });
        logger.info(`🗑️ Deleted auth folder: ${authPath}`);
      } catch (error: any) {
        logger.warn(`⚠️ Could not delete auth folder: ${error.message}`);
      }

      // Emitir evento de status atualizado (não pronto)
      whatsappEventBus.emit('status-update', {
        type: 'status-update',
        ready: false,
        timestamp: Date.now()
      });

      // Emitir evento de desconexão
      whatsappEventBus.emit('disconnected', {
        type: 'disconnected',
        reason: 'User requested logout',
        timestamp: Date.now()
      });

      // Reset reconnection counter (fresh start)
      this.reconnectAttempts = 0;

      logger.info('✅ Successfully logged out from WhatsApp');
      logger.info('🔄 Restarting connection to generate new QR code...');

      // Reconectar após delay para gerar novo QR (SINGLE reconnection call)
      setTimeout(() => {
        this.startConnection();
      }, 500); // Pequeno delay para garantir que tudo foi limpo

    } catch (error: any) {
      logger.error(`❌ Error during logout: ${error.message}`);
      throw error;
    }
  }

  /**
   * Pausar chat específico
   */
  private pauseChat(chatId: string, name: string): void {
    pausedChats.set(chatId, {
      chatId,
      name,
      pausedAt: Date.now()
    });

    // Emitir evento via WebSocket
    whatsappEventBus.emit('message-sent-manually', {
      type: 'message-sent-manually',
      chatId,
      name,
      timestamp: Date.now()
    });

    // Emitir atualização de status
    this.emitPauseStatusUpdate();
  }

  /**
   * Retomar chat específico
   */
  public resumeChat(chatId: string, resumeAfterMs?: number): boolean {
    const wasRemoved = pausedChats.delete(chatId);

    if (resumeAfterMs !== undefined) {
      // Salvar timestamp para ignorar mensagens antigas
      chatResumeTimestamps.set(chatId, resumeAfterMs);
      logger.info(`▶️ Chat ${chatId} retomado (ignorando mensagens anteriores a ${new Date(resumeAfterMs).toLocaleString()})`);
    } else if (wasRemoved) {
      logger.info(`▶️ Chat ${chatId} retomado`);
    }

    if (wasRemoved || resumeAfterMs !== undefined) {
      this.emitPauseStatusUpdate();
    }

    return wasRemoved;
  }

  /**
   * Pausar/despausar globalmente
   */
  public setGlobalPause(paused: boolean): void {
    globalPause = paused;
    logger.info(`${paused ? '⏸️' : '▶️'} Bot ${paused ? 'pausado' : 'retomado'} globalmente`);
    this.emitPauseStatusUpdate();
  }

  /**
   * Obter status de pausa
   */
  public getPauseStatus(): { globalPause: boolean; pausedChats: string[] } {
    return {
      globalPause,
      pausedChats: Array.from(pausedChats.keys())
    };
  }

  /**
   * Obter informações de chats pausados
   */
  public getPausedChatsInfo(): PausedChat[] {
    return Array.from(pausedChats.values());
  }

  /**
   * Emitir atualização de status de pausa
   */
  private emitPauseStatusUpdate(): void {
    whatsappEventBus.emit('pause-status-update', {
      type: 'pause-status-update',
      globalPause,
      pausedChats: Array.from(pausedChats.keys()),
      timestamp: Date.now()
    });
  }
}

// Exportar instância singleton
export default new WhatsAppService();
