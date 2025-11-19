/**
 * Agente Flávia - Claude Haiku 4.5
 * Atendente Brasil TV com MCP local
 */

import Anthropic from '@anthropic-ai/sdk';
import { textToSpeech } from '../mcp/tools/elevenlabs-tts';
import { sendEmail } from '../mcp/tools/resend-email';
import logger from '../utils/logger';
import agentConfigService from '../services/agentConfig';

// System prompt da Flávia é carregado dinamicamente
// a partir de config/agent-config.json (campo "systemPrompt").

/**
 * Configuração do Claude Client
 */
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Definir ferramentas no formato Claude API
 */
const CLAUDE_TOOLS = [
  {
    name: 'text_to_speech',
    description: 'Gera áudio a partir de texto usando ElevenLabs TTS. Use para responder com voz natural e humana.',
    input_schema: {
      type: 'object' as const,
      properties: {
        text: {
          type: 'string' as const,
          description: 'O texto que será convertido em áudio. Use frases curtas e naturais otimizadas para TTS.'
        },
        voice_id: {
          type: 'string' as const,
          description: 'ID da voz (opcional, já tem padrão configurado)'
        },
        model_id: {
          type: 'string' as const,
          description: 'ID do modelo (opcional, já tem padrão configurado)'
        }
      },
      required: ['text' as const]
    }
  },
  {
    name: 'send_email',
    description: 'Envia email via Resend para comunicação com técnicos ou suporte.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'string' as const,
          description: 'Email destinatário'
        },
        subject: {
          type: 'string' as const,
          description: 'Assunto do email'
        },
        html: {
          type: 'string' as const,
          description: 'Conteúdo HTML do email'
        },
        from: {
          type: 'string' as const,
          description: 'Email remetente (opcional)'
        }
      },
      required: ['to' as const, 'subject' as const, 'html' as const]
    }
  }
] as const;

/**
 * Cliente Flávia - Interface simplificada
 */
export class FlaviaAgent {
  /**
   * Executar tool solicitada pelo Claude
   */
  private async executeTool(toolName: string, toolInput: any): Promise<any> {
    logger.info(`  🔧 Executing tool: ${toolName}`);

    try {
      if (toolName === 'text_to_speech') {
        const result = await textToSpeech(toolInput);
        return result;
      } else if (toolName === 'send_email') {
        const result = await sendEmail(toolInput);
        return result;
      } else {
        return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error: any) {
      logger.error(`  ❌ Error executing tool ${toolName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Executar query ao agente com tool calling
   */
  async query(messages: Array<{ role: string; content: string }>): Promise<any> {
    try {
      // Carregar configuração dinâmica
      const config = await agentConfigService.get();

      // Validar e filtrar mensagens
      const conversationMessages: any[] = messages
        .filter(m => m && m.role && m.content)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // Garantir que há pelo menos uma mensagem
      if (conversationMessages.length === 0) {
        throw new Error('No valid messages to send to Claude');
      }

      logger.debug(`Sending query to ${config.model}... (${conversationMessages.length} messages)`);

      // Loop de tool execution
      let currentMessages = [...conversationMessages];
      let finalResponse: any = null;
      let iterations = 0;
      const MAX_ITERATIONS = 10; // Prevenir loops infinitos

      // Rastrear execução de tools com sucesso
      let lastSuccessfulAudio: string | null = null;
      let lastSuccessfulAudioScript: string | null = null;
      let emailSentInThisQuery = false;

      while (iterations < MAX_ITERATIONS) {
        iterations++;

        // Chamar Claude com tools (usando configuração dinâmica)
        const response = await anthropic.messages.create({
          model: config.model,
          max_tokens: config.maxTokens,
          system: config.systemPrompt,
          messages: currentMessages,
          tools: CLAUDE_TOOLS as any
        });

        logger.debug(`Claude response received (iteration ${iterations})`);

        // Verificar se tem tool_use
        const toolUseBlocks = response.content.filter((c: any) => c.type === 'tool_use');

        if (toolUseBlocks.length === 0) {
          // Resposta final sem tools
          const textContent = response.content.find((c: any) => c.type === 'text') as any;
          finalResponse = {
            content: textContent ? textContent.text : '',
            usage: response.usage
          };
          break;
        }

        // Executar tools solicitadas
        logger.info(`  🔧 Claude requested ${toolUseBlocks.length} tool(s)`);

        // Adicionar resposta do assistant com tool_use
        currentMessages.push({
          role: 'assistant',
          content: response.content
        });

        // Executar cada tool e coletar resultados
        const toolResults: any[] = [];

        for (const toolUse of toolUseBlocks) {
          const toolUseAny = toolUse as any;
          const toolName = toolUseAny.name;
          const toolInput = toolUseAny.input;
          const toolUseId = toolUseAny.id;

          logger.info(`  → Tool: ${toolName}`);
          logger.debug(`    Input:`, JSON.stringify(toolInput, null, 2));

          let toolResult: any;

          // Evitar envio duplicado de email na mesma query
          if (toolName === 'send_email' && emailSentInThisQuery) {
            logger.info('  📧 send_email already executed in this query, skipping duplicate call');
            toolResult = { success: true, skipped: true, reason: 'Email already sent in this query' };
          } else {
            toolResult = await this.executeTool(toolName, toolInput);
            if (toolName === 'send_email' && toolResult?.success) {
              emailSentInThisQuery = true;
            }
          }

          logger.debug(`    Result:`, JSON.stringify(toolResult, null, 2));

          // Rastrear áudio gerado com sucesso
          let resultToSend = toolResult;
          if (toolName === 'text_to_speech' && toolResult.success && toolResult.audio_base64) {
            lastSuccessfulAudio = toolResult.audio_base64;
            lastSuccessfulAudioScript = typeof toolInput?.text === 'string' ? toolInput.text : null;
            logger.info(`  🎤 Audio captured for final response (${toolResult.audio_base64.length} bytes)`);

            // NÃO enviar base64 de volta ao Claude (evita estourar limite de tokens)
            resultToSend = { success: true, message: 'Audio generated successfully' };
          }

          toolResults.push({
            type: 'tool_result' as const,
            tool_use_id: toolUseId,
            content: JSON.stringify(resultToSend)
          });
        }

        // Adicionar tool results à conversa
        currentMessages.push({
          role: 'user',
          content: toolResults
        });
      }

      if (!finalResponse) {
        throw new Error('Max iterations reached without final response');
      }

      // Se houve áudio gerado com sucesso, forçar resposta em JSON de áudio
      if (lastSuccessfulAudio) {
        logger.info(`  🎵 Overriding response with audio JSON`);
        finalResponse.content = JSON.stringify({
          messages: [
            {
              type: 'audio',
              audio_base64: lastSuccessfulAudio,
              filename: 'voz.ogg'
            }
          ]
        });
      }

      const historyContent = this.buildHistoryContent(
        typeof finalResponse.content === 'string' ? finalResponse.content : '',
        lastSuccessfulAudioScript
      );

      return {
        ...finalResponse,
        historyContent
      };

    } catch (error: any) {
      logger.error('Error querying Claude:', error.message);
      throw error;
    }
  }

  /**
   * Gera conteúdo compacto para histórico persistido, evitando armazenar blobs base64
   */
  private buildHistoryContent(responseContent: string, audioScript: string | null): string {
    if (audioScript && audioScript.trim()) {
      return '[Áudio enviado]';
    }

    const trimmedContent = responseContent?.trim();
    if (!trimmedContent) {
      return '';
    }

    try {
      const parsed = JSON.parse(trimmedContent);
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
      // Conteúdo não é JSON, segue fluxo
    }

    return trimmedContent;
  }
}

/**
 * Criar instância do agente
 */
export async function createFlaviaAgent(): Promise<FlaviaAgent> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not found in environment variables');
  }

  return new FlaviaAgent();
}

export default createFlaviaAgent;
