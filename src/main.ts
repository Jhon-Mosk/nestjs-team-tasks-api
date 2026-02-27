import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NativeLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('port');
  const nodeEnv = configService.get<string>('nodeEnv');

  const logger = app.get(NativeLogger);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(logger));

  app.enableShutdownHooks();

  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, () => {
      logger.warn(`${signal} received. Shutting down...`);
      void app
        .close()
        .then(() => {
          process.exit(0);
        })
        .catch((error: Error) => {
          logger.error({ error }, 'Error during shutdown');
          process.exit(1);
        });
    });
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Rejection');
    void app.close().finally(() => {
      process.exit(1);
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught Exception');
    void app.close().finally(() => {
      process.exit(1);
    });
  });

  await app.listen(port);

  logger.log(
    {
      port,
      environment: nodeEnv,
    },
    'Application started',
  );
}

void bootstrap();
