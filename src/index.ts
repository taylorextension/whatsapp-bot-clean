/**
 * Entry Point - Bot WhatsApp com Claude Haiku 4.5
 */

import dotenv from 'dotenv';
dotenv.config();

import whatsappService from './services/whatsapp';
import llmService from './services/llm';
import WhatsAppBotServer from './server/index';
import logger from './utils/logger';

async function main() {
  try {
    logger.info('');
    logger.info('========================================');
    logger.info('   WhatsApp Bot - Claude Haiku 4.5    ');
    logger.info('   Brasil TV | MCP Local              ');
    logger.info('========================================');
    logger.info('');

    // Inicializar LLM (Claude)
    logger.info('🔄 Initializing Claude Agent...');
    await llmService.initialize();

    // Inicializar servidor web ANTES do WhatsApp para garantir listeners prontos
    const port = parseInt(process.env.SERVER_PORT || '3000', 10);
    const server = new WhatsAppBotServer(port);
    await server.start();

    // Inicializar WhatsApp DEPOIS do servidor
    await whatsappService.initialize();

    logger.info('');
    logger.info('========================================');
    logger.info('🎉 All services initialized successfully!');
    logger.info(`🌐 Dashboard: http://localhost:${port}`);
    logger.info('========================================');
    logger.info('');

  } catch (error: any) {
    logger.error('❌ Fatal error during initialization:', error);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Iniciar aplicação
main();
