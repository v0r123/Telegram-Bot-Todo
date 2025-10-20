import 'dotenv/config'
import { Telegram } from './telegram';

process.on('uncaughtException', (error) => {
    // console.error('Uncaught Exception:', error.message, error);
});

process.on('unhandledRejection', (reason, promise) => {
    // console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('exit', async () => {
    // You can close any connections hear
});

new Telegram(process.env.TELEGRAM_BOT_TOKEN)