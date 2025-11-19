/**
 * Serviço de Gerenciamento de Conversas
 * Migrado de services/conversation.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger';

// Configuração
const CONVERSATIONS_FILE = join(process.cwd(), 'threads.json');
const MAX_CONVERSATION_ITEMS = 50;

// Tipos
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ConversationHistories {
  [contactId: string]: ConversationMessage[];
}

interface ContactStats {
  contactId: string;
  messageCount: number;
  lastUpdate: Date | null;
}

interface ConversationStats {
  totalContacts: number;
  totalMessages: number;
  averageMessagesPerContact: string;
  contacts: ContactStats[];
}

// Armazenamento em memória
let conversationHistories: ConversationHistories = {};

/**
 * Remove blobs base64 de respostas antigas e gera resumo legível
 */
function sanitizeLegacyContent(rawContent: string): string {
  const trimmed = rawContent?.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.includes('audio_base64')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed?.messages)) {
        const parts = parsed.messages
          .map((message: any) => {
            if (message?.type === 'text' && typeof message.text === 'string') {
              return message.text.trim();
            }
            if (message?.type === 'audio') {
              if (typeof message.caption === 'string' && message.caption.trim()) {
                return `[Áudio]: ${message.caption.trim()}`;
              }
              return '[Áudio enviado]';
            }
            return null;
          })
          .filter((part: string | null): part is string => Boolean(part));

        if (parts.length > 0) {
          return parts.join('\n');
        }
      }
    } catch {
      // Conteúdo não é um JSON válido, segue fallback simples
    }

    return trimmed.replace(/("audio_base64"\s*:\s*")([^"]+)"/g, '$1[omitted]"');
  }

  return trimmed;
}

/**
 * Carrega históricos de conversas do arquivo threads.json
 */
export function loadConversationHistories(): void {
  try {
    if (existsSync(CONVERSATIONS_FILE)) {
      const data = readFileSync(CONVERSATIONS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const entries = Object.entries(parsed);
        for (const [key, value] of entries) {
          conversationHistories[key] = Array.isArray(value) ? value : [];
        }
        logger.info(`✅ Loaded ${entries.length} existing conversation(s) from threads.json`);
      } else {
        logger.info('ℹ️ Conversations file found but no valid data. Starting fresh.');
      }
    } else {
      logger.info('ℹ️ No existing conversations file found. Starting fresh.');
    }
  } catch (error: any) {
    logger.error('❌ Error loading conversation histories:', error.message);
    conversationHistories = {};
  }
}

/**
 * Salva históricos de conversas no arquivo threads.json
 */
export function saveConversationHistories(): void {
  try {
    writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversationHistories, null, 2));
  } catch (error: any) {
    logger.error('❌ Error saving conversation histories:', error.message);
  }
}

/**
 * Obtém histórico de conversa de um contato
 */
export function getConversationHistory(contactId: string): ConversationMessage[] {
  const history = conversationHistories[contactId];
  return Array.isArray(history) ? [...history] : [];
}

/**
 * Define histórico de conversa de um contato
 */
export function setConversationHistory(contactId: string, history: ConversationMessage[]): void {
  // Limitar histórico a MAX_CONVERSATION_ITEMS mais recentes
  const trimmedHistory = history.length > MAX_CONVERSATION_ITEMS
    ? history.slice(-MAX_CONVERSATION_ITEMS)
    : history;

  const sanitizedHistory = trimmedHistory.map((message) => {
    if (typeof message?.content === 'string') {
      return {
        ...message,
        content: sanitizeLegacyContent(message.content)
      };
    }
    return message;
  });

  conversationHistories[contactId] = sanitizedHistory;
  saveConversationHistories();
}

/**
 * Adiciona mensagem ao histórico
 */
export function addMessageToHistory(
  contactId: string,
  role: 'user' | 'assistant',
  content: string
): void {
  const history = getConversationHistory(contactId);
  history.push({
    role,
    content,
    timestamp: Date.now()
  });
  setConversationHistory(contactId, history);
}

/**
 * Obtém histórico formatado para o Claude (últimas N mensagens)
 */
export function getHistoryForClaude(contactId: string, maxMessages: number = 20): Array<{ role: string; content: string }> {
  const history = getConversationHistory(contactId);
  const recent = history.slice(-maxMessages);

  // Filtrar e validar mensagens
  return recent
    .filter(m => m && m.role) // Remove mensagens sem role
    .filter(m => m.role === 'user' || m.role === 'assistant') // Apenas roles válidos
    .map(m => {
      // Handle OpenAI Agent SDK format with nested content arrays
      let content = '';
      const rawContent = m.content as any; // Type assertion to handle both string and array formats

      if (typeof rawContent === 'string') {
        // Simple string format (Claude format or new messages)
        content = sanitizeLegacyContent(rawContent);
      } else if (Array.isArray(rawContent)) {
        // OpenAI Agents SDK format - extract text from content array
        const textItems = rawContent
          .filter((c: any) => c && (c.type === 'input_text' || c.type === 'output_text'))
          .map((c: any) => c.text || '')
          .filter((text: string) => text.trim() !== '');

        content = textItems.join('\n');
      }

      return { role: m.role, content: content.trim() };
    })
    .filter(m => m.content); // Remove mensagens com conteúdo vazio
}

/**
 * Limpa histórico de um contato específico
 */
export function clearConversationHistory(contactId: string): boolean {
  if (conversationHistories[contactId]) {
    delete conversationHistories[contactId];
    saveConversationHistories();
    return true;
  }
  return false;
}

/**
 * Limpa todos os históricos
 */
export function clearAllConversationHistories(): void {
  conversationHistories = {};
  saveConversationHistories();
}

/**
 * Obtém lista de todos os contatos com histórico
 */
export function getAllContactIds(): string[] {
  return Object.keys(conversationHistories);
}

/**
 * Obtém estatísticas sobre conversas
 */
export function getConversationStats(): ConversationStats {
  const contactIds = getAllContactIds();
  const stats: ConversationStats = {
    totalContacts: contactIds.length,
    totalMessages: 0,
    averageMessagesPerContact: '0',
    contacts: []
  };

  for (const contactId of contactIds) {
    const history = conversationHistories[contactId] || [];
    const messageCount = history.length;
    stats.totalMessages += messageCount;
    stats.contacts.push({
      contactId,
      messageCount,
      lastUpdate: history.length > 0 ? new Date() : null
    });
  }

  if (stats.totalContacts > 0) {
    stats.averageMessagesPerContact = (stats.totalMessages / stats.totalContacts).toFixed(2);
  }

  return stats;
}

// Carregar históricos ao inicializar o módulo
loadConversationHistories();

// Salvar históricos ao encerrar o processo
process.on('SIGINT', () => {
  logger.info('\n💾 Saving conversation histories before exit...');
  saveConversationHistories();
});

process.on('SIGTERM', () => {
  logger.info('\n💾 Saving conversation histories before exit...');
  saveConversationHistories();
});

// Exports
export default {
  loadConversationHistories,
  saveConversationHistories,
  getConversationHistory,
  setConversationHistory,
  addMessageToHistory,
  getHistoryForClaude,
  clearConversationHistory,
  clearAllConversationHistories,
  getAllContactIds,
  getConversationStats
};
