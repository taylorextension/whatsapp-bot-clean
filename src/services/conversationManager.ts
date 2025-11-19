/**
 * Conversation Manager Service
 * Gerencia conversas para o CRM Dashboard
 */

import logger from '../utils/logger';

export interface Message {
  id: string;
  text: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
}

export interface Conversation {
  id: string; // JID (ex: 5511999999999@s.whatsapp.net)
  contact: {
    name: string;
    phone: string;
    pushname?: string;
  };
  lastMessage?: {
    text: string;
    timestamp: number;
    direction: 'incoming' | 'outgoing';
  };
  messages: Message[];
  unreadCount: number;
  botEnabled: boolean;
  blocked: boolean;
  totalMessages: number;
  createdAt: number;
  updatedAt: number;
}

class ConversationManagerService {
  private conversations: Map<string, Conversation> = new Map();
  private globalBotEnabled: boolean = true;

  /**
   * Obter todas as conversas
   */
  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Obter uma conversa por ID
   */
  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  /**
   * Criar ou atualizar conversa
   */
  upsertConversation(jid: string, contactName: string): Conversation {
    let conversation = this.conversations.get(jid);

    if (!conversation) {
      // Extrair número de telefone do JID
      const phone = jid.split('@')[0];

      conversation = {
        id: jid,
        contact: {
          name: contactName || phone,
          phone: phone,
          pushname: contactName
        },
        messages: [],
        unreadCount: 0,
        botEnabled: true,
        blocked: false,
        totalMessages: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.conversations.set(jid, conversation);
      logger.info(`📝 Nova conversa criada: ${contactName} (${jid})`);
    }

    return conversation;
  }

  /**
   * Adicionar mensagem a uma conversa
   */
  addMessage(
    jid: string,
    contactName: string,
    text: string,
    direction: 'incoming' | 'outgoing',
    messageId?: string,
    mediaType?: 'image' | 'video' | 'audio' | 'document'
  ): void {
    const conversation = this.upsertConversation(jid, contactName);

    const message: Message = {
      id: messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      timestamp: Date.now(),
      direction,
      mediaType
    };

    conversation.messages.push(message);
    conversation.totalMessages++;
    conversation.updatedAt = Date.now();

    // Atualizar última mensagem
    conversation.lastMessage = {
      text,
      timestamp: message.timestamp,
      direction
    };

    // Incrementar não lidas se for incoming
    if (direction === 'incoming') {
      conversation.unreadCount++;
    }

    logger.info(`💬 Mensagem adicionada ao CRM: ${direction} - ${jid} - ${text.substring(0, 50)}...`);
  }

  /**
   * Marcar conversa como lida
   */
  markAsRead(jid: string): void {
    const conversation = this.conversations.get(jid);
    if (conversation) {
      conversation.unreadCount = 0;
      logger.info(`✅ Conversa marcada como lida: ${jid}`);
    }
  }

  /**
   * Toggle bot em uma conversa
   */
  toggleBotInConversation(jid: string, enabled: boolean): boolean {
    const conversation = this.conversations.get(jid);
    if (conversation) {
      conversation.botEnabled = enabled;
      logger.info(`🤖 Bot ${enabled ? 'ativado' : 'desativado'} para: ${jid}`);
      return true;
    }
    return false;
  }

  /**
   * Toggle bot globalmente
   */
  toggleBotGlobal(enabled: boolean): void {
    this.globalBotEnabled = enabled;
    logger.info(`🌐 Bot global ${enabled ? 'ativado' : 'desativado'}`);
  }

  /**
   * Verificar se bot está ativo para uma conversa
   */
  isBotEnabledFor(jid: string): boolean {
    if (!this.globalBotEnabled) {
      return false;
    }

    const conversation = this.conversations.get(jid);
    return conversation ? conversation.botEnabled : true;
  }

  /**
   * Verificar se bot está ativo globalmente
   */
  isGlobalBotEnabled(): boolean {
    return this.globalBotEnabled;
  }

  /**
   * Limpar histórico de uma conversa
   */
  clearHistory(jid: string): boolean {
    const conversation = this.conversations.get(jid);
    if (conversation) {
      conversation.messages = [];
      conversation.totalMessages = 0;
      conversation.lastMessage = undefined;
      conversation.updatedAt = Date.now();
      logger.info(`🗑️ Histórico limpo: ${jid}`);
      return true;
    }
    return false;
  }

  /**
   * Bloquear/desbloquear contato
   */
  blockContact(jid: string, blocked: boolean): boolean {
    const conversation = this.conversations.get(jid);
    if (conversation) {
      conversation.blocked = blocked;
      logger.info(`${blocked ? '🚫' : '✅'} Contato ${blocked ? 'bloqueado' : 'desbloqueado'}: ${jid}`);
      return true;
    }
    return false;
  }

  /**
   * Verificar se contato está bloqueado
   */
  isBlocked(jid: string): boolean {
    const conversation = this.conversations.get(jid);
    return conversation ? conversation.blocked : false;
  }

  /**
   * Obter estatísticas gerais
   */
  getStats() {
    const conversations = this.getAllConversations();
    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.totalMessages, 0);
    const activeConversations = conversations.filter(c => c.botEnabled).length;

    // Mensagens de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    let messagesReceivedToday = 0;
    let messagesSentToday = 0;

    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.timestamp >= todayTimestamp) {
          if (msg.direction === 'incoming') {
            messagesReceivedToday++;
          } else {
            messagesSentToday++;
          }
        }
      });
    });

    return {
      totalConversations,
      activeConversations,
      totalMessages,
      messagesReceivedToday,
      messagesSentToday,
      averageMessagesPerConversation: totalConversations > 0
        ? Math.round((totalMessages / totalConversations) * 10) / 10
        : 0
    };
  }

  /**
   * Obter conversas recentes (últimas 10)
   */
  getRecentConversations(limit: number = 10): Conversation[] {
    return this.getAllConversations().slice(0, limit);
  }
}

// Exportar singleton
export default new ConversationManagerService();
