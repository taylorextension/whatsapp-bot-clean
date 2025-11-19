/**
 * Config API Routes
 * Endpoints para gerenciar configurações do agente
 */

import { Router, Request, Response } from 'express';
import agentConfigService from '../../services/agentConfig';
import logger from '../../utils/logger';

const router = Router();

/**
 * GET /api/config/agent
 * Retorna configuração atual do agente
 */
router.get('/agent', async (req: Request, res: Response) => {
  try {
    const config = await agentConfigService.get();
    res.json(config);
  } catch (error: any) {
    logger.error('Error fetching agent config:', error.message);
    res.status(500).json({ error: 'Failed to fetch agent configuration' });
  }
});

/**
 * POST /api/config/agent
 * Atualiza configuração do agente
 */
router.post('/agent', async (req: Request, res: Response) => {
  try {
    const { systemPrompt, model, maxTokens } = req.body;

    // Validações básicas
    if (systemPrompt && typeof systemPrompt !== 'string') {
      return res.status(400).json({ error: 'systemPrompt must be a string' });
    }

    if (model && typeof model !== 'string') {
      return res.status(400).json({ error: 'model must be a string' });
    }

    if (maxTokens && (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 8192)) {
      return res.status(400).json({ error: 'maxTokens must be a number between 1 and 8192' });
    }

    // Salvar configuração
    const updatedConfig = await agentConfigService.save(req.body);

    res.json({
      success: true,
      config: updatedConfig
    });
  } catch (error: any) {
    logger.error('Error updating agent config:', error.message);
    res.status(500).json({ error: 'Failed to update agent configuration' });
  }
});

export default router;
