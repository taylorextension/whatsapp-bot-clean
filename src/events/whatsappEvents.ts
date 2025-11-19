import { EventEmitter } from 'events';
import type { WhatsAppEvent, WhatsAppEventType } from './types';

/**
 * Event bus for WhatsApp events
 * Provides type-safe event emission and listening
 */
class WhatsAppEventBus extends EventEmitter {
  /**
   * Emit a typed WhatsApp event
   */
  emit<T extends WhatsAppEvent>(event: T['type'], data: T): boolean {
    return super.emit(event, data);
  }

  /**
   * Listen to a typed WhatsApp event
   */
  on<T extends WhatsAppEvent>(
    event: T['type'],
    listener: (data: T) => void
  ): this {
    return super.on(event, listener);
  }

  /**
   * Listen to a typed WhatsApp event once
   */
  once<T extends WhatsAppEvent>(
    event: T['type'],
    listener: (data: T) => void
  ): this {
    return super.once(event, listener);
  }

  /**
   * Remove a listener for a typed WhatsApp event
   */
  removeListener<T extends WhatsAppEvent>(
    event: T['type'],
    listener: (data: T) => void
  ): this {
    return super.removeListener(event, listener);
  }
}

/**
 * Singleton instance of the WhatsApp event bus
 * Import this to emit or listen to WhatsApp events across the application
 */
export const whatsappEventBus = new WhatsAppEventBus();

export default whatsappEventBus;
