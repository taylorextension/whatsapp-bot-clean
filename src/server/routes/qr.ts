import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import logger from '../../utils/logger';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * Store the last generated QR code and when it was created.
 * This is updated by the WhatsApp event listener.
 */
let lastQRRaw: string | null = null;
let lastQRDataURL: string | null = null;
let lastQRTimestamp: number | null = null;

/**
 * Update the stored QR code
 * Called by the event handler when a new QR code is generated
 * Converts to DataURL immediately for performance
 */
export async function setLastQR(qrRaw: string): Promise<void> {
  lastQRRaw = qrRaw;
  lastQRTimestamp = Date.now();

  // Convert to DataURL immediately and cache it
  try {
    lastQRDataURL = await QRCode.toDataURL(qrRaw, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2
    });
    logger.info('QR code converted to DataURL and cached at /api/qr');
  } catch (error: any) {
    logger.error('Error converting QR to DataURL:', error.message);
    lastQRDataURL = null;
  }
}

/**
 * Clear the stored QR code
 * Called when the bot is authenticated
 */
export function clearQR(): void {
  lastQRRaw = null;
  lastQRDataURL = null;
  lastQRTimestamp = null;
  logger.info('QR code cleared (authenticated)');
}

/**
 * Returns the last QR code (if any) with the timestamp it was generated.
 * Returns the cached DataURL for performance.
 */
export function getLastQR(): { qr: string; timestamp: number } | null {
  if (!lastQRDataURL) {
    return null;
  }

  return {
    qr: lastQRDataURL,
    timestamp: lastQRTimestamp || Date.now()
  };
}

/**
 * GET /api/qr
 * Returns the current QR code as PNG data URL or SVG
 * Query params:
 *   - format: 'png' (default) or 'svg'
 *
 * PROTECTED ROUTE - Requires admin authentication
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!lastQRRaw) {
      return res.status(202).json({
        status: 'pending',
        message: 'Waiting for QR code to be generated. Try again in a few seconds.',
        timestamp: new Date().toISOString()
      });
    }

    const format = (req.query.format as string) || 'png';

    if (format === 'svg') {
      const svg = await QRCode.toString(lastQRRaw, {
        type: 'svg',
        errorCorrectionLevel: 'M'
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } else {
      // Use cached DataURL for performance
      res.json({
        qr: lastQRDataURL,
        format: 'data-url',
        timestamp: new Date((lastQRTimestamp || Date.now())).toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Error generating QR code:', error.message);
    res.status(500).json({
      error: 'Failed to generate QR code',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
