/**
 * Serviço de Configuração do Agente
 * Gerencia configurações do agente Claude (system prompt, modelo, etc)
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';

const CONFIG_PATH = path.resolve('config/agent-config.json');

export interface AgentConfig {
  systemPrompt: string;
  model: string;
  maxTokens: number;
  lastUpdated: string;
}

class AgentConfigService {
  private config: AgentConfig | null = null;

  /**
   * Carregar configuração do arquivo
   */
  async load(): Promise<AgentConfig> {
    try {
      const data = await fs.readFile(CONFIG_PATH, 'utf-8');
      this.config = JSON.parse(data);
      logger.info('✅ Agent configuration loaded');
      return this.config!;
    } catch (error: any) {
      logger.error(`❌ Error loading agent config: ${error.message}`);
      throw new Error('Failed to load agent configuration');
    }
  }

  /**
   * Salvar configuração no arquivo
   */
  async save(config: Partial<AgentConfig>): Promise<AgentConfig> {
    try {
      // Merge com config existente
      const currentConfig = await this.get();
      const updatedConfig: AgentConfig = {
        ...currentConfig,
        ...config,
        lastUpdated: new Date().toISOString()
      };

      // Validar campos obrigatórios
      if (!updatedConfig.systemPrompt || !updatedConfig.model || !updatedConfig.maxTokens) {
        throw new Error('Missing required configuration fields');
      }

      // Salvar no arquivo
      await fs.writeFile(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2), 'utf-8');

      // Atualizar cache
      this.config = updatedConfig;

      logger.info('✅ Agent configuration saved');
      return updatedConfig;
    } catch (error: any) {
      logger.error(`❌ Error saving agent config: ${error.message}`);
      throw new Error('Failed to save agent configuration');
    }
  }

  /**
   * Obter configuração atual
   */
  async get(): Promise<AgentConfig> {
    if (!this.config) {
      return await this.load();
    }
    return this.config;
  }

  /**
   * Verificar se configuração está carregada
   */
  isLoaded(): boolean {
    return this.config !== null;
  }
}

// Exportar instância singleton
export default new AgentConfigService();
