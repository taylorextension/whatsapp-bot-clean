/**
 * Serviço de Análise de Mídia com Google Gemini
 * Migrado de services/gemini.js
 */

import logger from '../utils/logger';

// Tentar importar o módulo Gemini
let GoogleGenAI: any = null;
let geminiClient: any = null;

try {
  const googleGenAiModule = require('@google/genai');
  GoogleGenAI = googleGenAiModule.GoogleGenAI || googleGenAiModule.GoogleGenerativeAI || googleGenAiModule.default;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (GoogleGenAI && GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
} catch (error: any) {
  logger.warn('⚠️ WARNING: Unable to load Google Gemini client. Media transcription will be skipped.');
}

// Prompt para análise de mídia
const GEMINI_PROMPT = `Você é os olhos e ouvidos de um assistente de IA. Analise o arquivo fornecido e gere uma descrição textual detalhada de seu conteúdo em português do Brasil.
- Se for uma imagem, descreva o que você vê em detalhes (objetos, pessoas, cenário, cores, texto, etc.).
- Se for áudio, forneça uma transcrição limpa de qualquer fala. Descreva sons que não são fala entre parênteses, como (música) ou (aplausos).
- Se for um vídeo, descreva as cenas e ações visuais e transcreva quaisquer palavras faladas. Forneça um comentário contínuo do que está acontecendo.
A descrição deve ser abrangente e clara, permitindo que outra IA entenda o contexto completo do arquivo sem acessá-lo diretamente.`;

// MIME types suportados pelo Gemini
const SUPPORTED_GEMINI_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/mpeg',
  'video/mov',
  'video/avi',
  'video/x-flv',
  'video/mpg',
  'video/webm',
  'video/wmv',
  'video/3gpp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/amr',
  'audio/aiff'
]);

/**
 * Extrai texto do resultado do Gemini
 */
async function extractGeminiText(result: any): Promise<string | null> {
  if (!result) {
    return null;
  }

  const tryResolve = async (value: any): Promise<any> => {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'function') {
      const output = value();
      return typeof output?.then === 'function' ? await output : output;
    }
    if (typeof value.then === 'function') {
      return await value;
    }
    return null;
  };

  const directText = await tryResolve(result.text);
  if (directText) {
    return directText;
  }

  const responseObject = await tryResolve(result.response);
  if (responseObject) {
    const responseText = await tryResolve(responseObject.text);
    if (responseText) {
      return responseText;
    }
    if (Array.isArray(responseObject.candidates)) {
      for (const candidate of responseObject.candidates) {
        const parts = candidate?.content?.parts;
        if (!Array.isArray(parts)) {
          continue;
        }
        const accumulated = parts
          .filter((part: any) => typeof part?.text === 'string')
          .map((part: any) => part.text.trim())
          .filter(Boolean)
          .join('\n')
          .trim();
        if (accumulated) {
          return accumulated;
        }
      }
    }
  }

  if (Array.isArray(result.candidates)) {
    for (const candidate of result.candidates) {
      const parts = candidate?.content?.parts;
      if (!Array.isArray(parts)) {
        continue;
      }
      const accumulated = parts
        .filter((part: any) => typeof part?.text === 'string')
        .map((part: any) => part.text.trim())
        .filter(Boolean)
        .join('\n')
        .trim();
      if (accumulated) {
        return accumulated;
      }
    }
  }

  return null;
}

/**
 * Normaliza MIME type (remove parâmetros extras)
 */
export function normalizeMimeType(mimeType: string | undefined): string | null {
  if (!mimeType || typeof mimeType !== 'string') {
    return null;
  }
  return mimeType.split(';')[0].trim().toLowerCase() || null;
}

/**
 * Retorna label em português para tipo de mídia
 */
export function getMediaTypeLabel(messageType: string, mimeType?: string): string {
  switch (messageType) {
    case 'image':
      return 'imagem';
    case 'video':
      return 'vídeo';
    case 'audio':
      return 'arquivo de áudio';
    case 'ptt':
      return 'mensagem de voz';
    default:
      if (mimeType?.startsWith('image/')) {
        return 'imagem';
      }
      if (mimeType?.startsWith('video/')) {
        return 'vídeo';
      }
      if (mimeType?.startsWith('audio/')) {
        return 'arquivo de áudio';
      }
      return 'mídia';
  }
}

/**
 * Analisa mídia com Google Gemini
 */
export async function analyzeMediaWithGemini(mimeType: string | undefined, base64Data: string): Promise<string | null> {
  // Validar se Gemini está configurado
  if (!geminiClient) {
    logger.warn('  ⚠️ Gemini client not initialized. Check GEMINI_API_KEY and @google/genai package.');
    return null;
  }

  // Verificar se MIME type é suportado
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (!normalizedMimeType || !SUPPORTED_GEMINI_MIME_TYPES.has(normalizedMimeType)) {
    logger.warn(`  ⚠️ MIME type "${mimeType}" not supported by Gemini.`);
    return null;
  }

  try {
    logger.info('  🔍 Analyzing media with Gemini...');

    // Tentar método 1: geminiClient.models.generateContent
    if (geminiClient.models && typeof geminiClient.models.generateContent === 'function') {
      const result = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { text: GEMINI_PROMPT },
            {
              inlineData: {
                mimeType: normalizedMimeType,
                data: base64Data
              }
            }
          ]
        }
      });
      const text = (await extractGeminiText(result))?.trim() || null;
      if (text) {
        logger.info('  ✅ Gemini analysis completed successfully.');
        return text;
      }
    }

    // Tentar método 2: geminiClient.getGenerativeModel
    if (typeof geminiClient.getGenerativeModel === 'function') {
      const model = geminiClient.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent([
        { text: GEMINI_PROMPT },
        {
          inlineData: {
            mimeType: normalizedMimeType,
            data: base64Data
          }
        }
      ]);
      const text = (await extractGeminiText(result))?.trim() || null;
      if (text) {
        logger.info('  ✅ Gemini analysis completed successfully.');
        return text;
      }
    }

    logger.warn('  ⚠️ Gemini client is missing expected generateContent method.');
    return null;

  } catch (error: any) {
    logger.error('  ❌ Error calling Gemini API:', error.message);
    return null;
  }
}

// Avisos de configuração (executados no carregamento do módulo)
if (!GoogleGenAI) {
  logger.warn('⚠️ WARNING: Unable to locate Google Gemini client constructor. Ensure @google/genai is installed and up to date.');
}

if (!process.env.GEMINI_API_KEY) {
  logger.warn('⚠️ WARNING: GEMINI_API_KEY is not set. Media transcription and description via Gemini will be skipped.');
}

export default {
  analyzeMediaWithGemini,
  normalizeMimeType,
  getMediaTypeLabel,
  SUPPORTED_GEMINI_MIME_TYPES
};
