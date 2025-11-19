/**
 * Conversations API Routes
 * Endpoints para gerenciar conversas do CRM
 */

import { Router, Request, Response } from 'express';
import conversationManager from '../../services/conversationManager';
import { whatsappEventBus } from '../../events/whatsappEvents';
import logger from '../../utils/logger';

const router = Router();

/**
 * GET /api/conversations
 * Retorna todas as conversas
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const conversations = conversationManager.getAllConversations();
    res.json(conversations);
  } catch (error: any) {
    logger.error('Error fetching conversations:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/conversations/:id
 * Retorna uma conversa específica com histórico completo
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = conversationManager.getConversation(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Marcar como lida
    conversationManager.markAsRead(id);

    res.json(conversation);
  } catch (error: any) {
    logger.error('Error fetching conversation:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * POST /api/conversations/:id/toggle
 * Ativa/desativa bot para uma conversa específica
 */
router.post('/:id/toggle', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const success = conversationManager.toggleBotInConversation(id, enabled);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Emitir evento WebSocket
    whatsappEventBus.emit('conversation-updated' as any, {
      type: 'conversation-updated' as any,
      conversationId: id,
      botEnabled: enabled,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      conversationId: id,
      botEnabled: enabled
    });
  } catch (error: any) {
    logger.error('Error toggling bot for conversation:', error.message);
    res.status(500).json({ error: 'Failed to toggle bot' });
  }
});

/**
 * DELETE /api/conversations/:id/history
 * Limpa o histórico de uma conversa
 */
router.delete('/:id/history', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = conversationManager.clearHistory(id);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversationId: id
    });
  } catch (error: any) {
    logger.error('Error clearing history:', error.message);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

/**
 * POST /api/conversations/:id/block
 * Bloqueia/desbloqueia um contato
 */
router.post('/:id/block', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;

    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ error: 'blocked must be a boolean' });
    }

    const success = conversationManager.blockContact(id, blocked);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversationId: id,
      blocked
    });
  } catch (error: any) {
    logger.error('Error blocking/unblocking contact:', error.message);
    res.status(500).json({ error: 'Failed to block/unblock contact' });
  }
});

export default router;
