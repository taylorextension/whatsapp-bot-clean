/**
 * Event types for WhatsApp bot events
 */
export type WhatsAppEventType =
  | 'qr-code'
  | 'authenticated'
  | 'ready'
  | 'status-update'
  | 'connection-state'
  | 'message-received'
  | 'disconnected'
  | 'error'
  | 'message-sent-manually'
  | 'pause-status-update';

/**
 * QR Code generated event
 */
export interface QRCodeEvent {
  type: 'qr-code';
  qr: string;
  timestamp: number;
}

/**
 * Authentication successful event
 */
export interface AuthenticationEvent {
  type: 'authenticated';
  timestamp: number;
}

/**
 * Bot ready event
 */
export interface ReadyEvent {
  type: 'ready';
  timestamp: number;
}

/**
 * Status update event
 */
export interface StatusUpdateEvent {
  type: 'status-update';
  ready: boolean;
  timestamp: number;
}

/**
 * Connection state changed event
 */
export interface ConnectionStateEvent {
  type: 'connection-state';
  state: 'open' | 'close' | 'connecting';
  reason?: string;
  timestamp: number;
}

/**
 * New message received event
 */
export interface MessageReceivedEvent {
  type: 'message-received';
  from: string;
  name: string;
  message: string;
  timestamp: number;
}

/**
 * Disconnected event
 */
export interface DisconnectedEvent {
  type: 'disconnected';
  reason: string;
  autoRecovery?: boolean;
  timestamp: number;
}

/**
 * Error event
 */
export interface ErrorEvent {
  type: 'error';
  error: string;
  timestamp: number;
}

/**
 * Manual message sent event (pausa automática)
 */
export interface MessageSentManuallyEvent {
  type: 'message-sent-manually';
  chatId: string;
  name: string;
  timestamp: number;
}

/**
 * Pause status update event
 */
export interface PauseStatusUpdateEvent {
  type: 'pause-status-update';
  globalPause: boolean;
  pausedChats: string[];
  timestamp: number;
}

/**
 * Union type of all WhatsApp events
 */
export type WhatsAppEvent =
  | QRCodeEvent
  | AuthenticationEvent
  | ReadyEvent
  | StatusUpdateEvent
  | ConnectionStateEvent
  | MessageReceivedEvent
  | DisconnectedEvent
  | ErrorEvent
  | MessageSentManuallyEvent
  | PauseStatusUpdateEvent;
