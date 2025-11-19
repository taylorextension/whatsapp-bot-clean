/**
 * Ferramenta MCP: Text-to-Speech via ElevenLabs
 * Chama a API ElevenLabs diretamente (sem Zapier)
 */

import logger from '../../utils/logger';

export interface ElevenLabsTTSParams {
  text: string;
  voice_id?: string;
  model_id?: string;
  output_format?: string;
}

export interface ElevenLabsTTSResult {
  success: boolean;
  audio_base64?: string;
  error?: string;
}

// Configurações padrão
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'zHg66WqoRrUdExrjJ7d5'; // Voz personalizada (Flávio)
const DEFAULT_MODEL_ID = 'eleven_v3'; // Modelo premium
const DEFAULT_OUTPUT_FORMAT = 'mp3_22050_32'; // Otimizado para WhatsApp

/**
 * Gera áudio via API ElevenLabs
 */
export async function textToSpeech(params: ElevenLabsTTSParams): Promise<ElevenLabsTTSResult> {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

  if (!ELEVENLABS_API_KEY) {
    logger.error('ELEVENLABS_API_KEY not found in environment variables');
    return {
      success: false,
      error: 'ELEVENLABS_API_KEY not configured'
    };
  }

  const voice_id = params.voice_id || DEFAULT_VOICE_ID;
  const model_id = params.model_id || DEFAULT_MODEL_ID;
  const output_format = params.output_format || DEFAULT_OUTPUT_FORMAT;

  try {
    logger.info(`  🔊 Generating audio with ElevenLabs...`);
    logger.debug(`  Text: "${params.text.substring(0, 50)}..."`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: params.text,
          model_id: model_id,
          output_format: output_format,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`  ❌ ElevenLabs API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `ElevenLabs API error: ${response.status}`
      };
    }

    // Converter buffer de áudio para base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audio_base64 = buffer.toString('base64');

    logger.info(`  ✅ Audio generated successfully! Size: ${buffer.length} bytes`);

    return {
      success: true,
      audio_base64
    };

  } catch (error: any) {
    logger.error(`  ❌ Error generating audio:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validação de parâmetros
 */
export function validateTTSParams(params: any): params is ElevenLabsTTSParams {
  return !!(
    params &&
    typeof params.text === 'string' &&
    params.text.length > 0
  );
}

export default {
  textToSpeech,
  validateTTSParams
};
