/**
 * Serviço LLM - Gerenciador do Cliente Claude
 */

import { FlaviaAgent, createFlaviaAgent } from '../agents/flavia';
import logger from '../utils/logger';

class LLMService {
  private client: FlaviaAgent | null = null;

  /**
   * Inicializar cliente Claude
   */
  async initialize(): Promise<void> {
    if (this.client) {
      logger.warn('LLM client already initialized');
      return;
    }

    try {
      logger.info('🔄 Initializing Claude Haiku 4.5 Agent...');
      this.client = await createFlaviaAgent();
      logger.info('✅ Claude Agent initialized successfully');
    } catch (error: any) {
      logger.error('❌ Failed to initialize Claude Agent:', error.message);
      throw error;
    }
  }

  /**
   * Fazer query ao Claude
   */
  async query(messages: Array<{ role: string; content: string }>): Promise<any> {
    if (!this.client) {
      throw new Error('LLM client not initialized. Call initialize() first.');
    }

    try {
      const response = await this.client.query(messages);
      return response;
    } catch (error: any) {
      logger.error('❌ Error querying Claude:', error.message);
      throw error;
    }
  }

  /**
   * Verificar se está inicializado
   */
  isInitialized(): boolean {
    return this.client !== null;
  }
}

// Exportar instância singleton
export default new LLMService();
