/**
 * Logger simples para o bot
 */

export const logger = {
  info: (...args: any[]) => {
    console.log(...args);
  },

  warn: (...args: any[]) => {
    console.warn('⚠️', ...args);
  },

  error: (...args: any[]) => {
    console.error('❌', ...args);
  },

  debug: (...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.log('🐛 [DEBUG]', ...args);
    }
  }
};

export default logger;
