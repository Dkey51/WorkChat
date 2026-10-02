import 'dotenv/config';

export interface AppConfig {
  port: number;
  mongoUri: string;
  mongoDb: string;
}

/** Конфигурация сервера: значения берутся из переменных окружения (.env). */
export const config: AppConfig = {
  port: Number(process.env.PORT) || 3001,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27018',
  mongoDb: process.env.MONGO_DB || 'workchat',
};
