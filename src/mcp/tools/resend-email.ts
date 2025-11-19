/**
 * Ferramenta MCP: Enviar Email via Resend
 * Chama a API Resend diretamente (sem Zapier)
 */

import logger from '../../utils/logger';

export interface ResendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface ResendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Envia email via API Resend
 */
export async function sendEmail(params: ResendEmailParams): Promise<ResendEmailResult> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!RESEND_API_KEY) {
    logger.error('RESEND_API_KEY not found in environment variables');
    return {
      success: false,
      error: 'RESEND_API_KEY not configured'
    };
  }

  try {
    logger.info(`  📧 Sending email to ${params.to}...`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: params.from || DEFAULT_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`  ❌ Resend API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Resend API error: ${response.status}`
      };
    }

    const data: any = await response.json();
    logger.info(`  ✅ Email sent successfully! ID: ${data.id}`);

    return {
      success: true,
      id: data.id
    };

  } catch (error: any) {
    logger.error(`  ❌ Error sending email:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validação de parâmetros
 */
export function validateEmailParams(params: any): params is ResendEmailParams {
  return !!(
    params &&
    typeof params.to === 'string' &&
    typeof params.subject === 'string' &&
    typeof params.html === 'string'
  );
}

export default {
  sendEmail,
  validateEmailParams
};
