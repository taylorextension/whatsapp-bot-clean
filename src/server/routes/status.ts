import { Router, Request, Response } from 'express';
import whatsappService from '../../services/whatsapp';
import conversationService from '../../services/conversation';
import conversationManager from '../../services/conversationManager';
import logger from '../../utils/logger';

const router = Router();

/**
 * GET /api/status
 * Returns the current bot status and statistics
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const stats = conversationService.getConversationStats();
    const crmStats = conversationManager.getStats();
    const isReady = whatsappService.isReady();
    const socket = whatsappService.getSocket();
    const globalBotEnabled = conversationManager.isGlobalBotEnabled();

    res.json({
      bot: {
        ready: isReady,
        connected: socket !== null,
        status: isReady ? 'online' : 'offline',
        globallyEnabled: globalBotEnabled
      },
      conversations: {
        totalContacts: stats.totalContacts,
        totalMessages: stats.totalMessages,
        averageMessagesPerContact: parseFloat(stats.averageMessagesPerContact)
      },
      crm: {
        totalConversations: crmStats.totalConversations,
        activeConversations: crmStats.activeConversations,
        messagesReceivedToday: crmStats.messagesReceivedToday,
        messagesSentToday: crmStats.messagesSentToday
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error getting bot status:', error.message);
    res.status(500).json({
      error: 'Failed to get bot status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
