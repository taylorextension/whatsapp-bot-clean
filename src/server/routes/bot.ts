/**
 * Bot Control API Routes
 * Endpoints para controlar o bot globalmente
 */

import { Router, Request, Response } from 'express';
import conversationManager from '../../services/conversationManager';
import { whatsappEventBus } from '../../events/whatsappEvents';
import logger from '../../utils/logger';

const router = Router();

/**
 * POST /api/bot/toggle
 * Ativa/desativa bot globalmente
 */
router.post('/toggle', (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    conversationManager.toggleBotGlobal(enabled);

    // Emitir evento WebSocket
    whatsappEventBus.emit('bot-toggled' as any, {
      type: 'bot-toggled' as any,
      enabled,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      globallyEnabled: enabled
    });
  } catch (error: any) {
    logger.error('Error toggling global bot:', error.message);
    res.status(500).json({ error: 'Failed to toggle global bot' });
  }
});

/**
 * GET /api/bot/status
 * Retorna status do bot (global e por conversa)
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const globallyEnabled = conversationManager.isGlobalBotEnabled();
    const stats = conversationManager.getStats();

    res.json({
      globallyEnabled,
      stats
    });
  } catch (error: any) {
    logger.error('Error fetching bot status:', error.message);
    res.status(500).json({ error: 'Failed to fetch bot status' });
  }
});

/**
 * POST /api/bot/disconnect
 * Desconecta o WhatsApp (logout)
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const whatsappService = require('../../services/whatsapp').default;

    // Logout do WhatsApp
    await whatsappService.logout();

    res.json({
      success: true,
      message: 'Desconectado com sucesso'
    });
  } catch (error: any) {
    logger.error('Error disconnecting WhatsApp:', error.message);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

/**
 * POST /api/bot/logout
 * Alias para disconnect
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Logs detalhados para investigar origem da chamada
    logger.info('========================================');
    logger.info('🔌 POST /api/bot/logout recebido');
    logger.info(`📍 IP: ${req.ip || req.socket.remoteAddress}`);
    logger.info(`🌐 Origin: ${req.get('origin') || 'N/A'}`);
    logger.info(`🔗 Referer: ${req.get('referer') || 'N/A'}`);
    logger.info(`📱 User-Agent: ${req.get('user-agent') || 'N/A'}`);
    logger.info('========================================');

    const whatsappService = require('../../services/whatsapp').default;

    // Forçar reset da sessão atual (mesmo se não estiver autenticado)
    await whatsappService.logout();

    res.json({
      success: true,
      message: 'Sessão reiniciada. Escaneie o novo QR code.'
    });
  } catch (error: any) {
    logger.error('Error disconnecting WhatsApp:', error.message);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

/**
 * POST /api/bot/pause-global
 * Pausar/despausar bot globalmente
 */
router.post('/pause-global', (req: Request, res: Response) => {
  try {
    const { paused } = req.body;

    if (typeof paused !== 'boolean') {
      return res.status(400).json({ error: 'paused must be a boolean' });
    }

    const whatsappService = require('../../services/whatsapp').default;
    whatsappService.setGlobalPause(paused);

    res.json({
      success: true,
      globalPause: paused
    });
  } catch (error: any) {
    logger.error('Error setting global pause:', error.message);
    res.status(500).json({ error: 'Failed to set global pause' });
  }
});

/**
 * POST /api/bot/resume-chat
 * Retomar chat específico
 */
router.post('/resume-chat', (req: Request, res: Response) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const whatsappService = require('../../services/whatsapp').default;
    const wasRemoved = whatsappService.resumeChat(chatId);

    res.json({
      success: true,
      resumed: wasRemoved
    });
  } catch (error: any) {
    logger.error('Error resuming chat:', error.message);
    res.status(500).json({ error: 'Failed to resume chat' });
  }
});

/**
 * GET /api/bot/pause-status
 * Obter status de pausas
 */
router.get('/pause-status', (req: Request, res: Response) => {
  try {
    const whatsappService = require('../../services/whatsapp').default;
    const status = whatsappService.getPauseStatus();

    res.json(status);
  } catch (error: any) {
    logger.error('Error fetching pause status:', error.message);
    res.status(500).json({ error: 'Failed to fetch pause status' });
  }
});

/**
 * GET /api/bot/paused-chats
 * Obter informações de chats pausados
 */
router.get('/paused-chats', (req: Request, res: Response) => {
  try {
    const whatsappService = require('../../services/whatsapp').default;
    const chats = whatsappService.getPausedChatsInfo();

    res.json({
      chats
    });
  } catch (error: any) {
    logger.error('Error fetching paused chats:', error.message);
    res.status(500).json({ error: 'Failed to fetch paused chats' });
  }
});

export default router;
