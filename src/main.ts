import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { NativeLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { closeWithTimeout } from './common/utils/close-with-timeout';

function getBasicAuthCredentials():
  | { user: string; password: string }
  | undefined {
  const user = process.env['SWAGGER_USER'];
  const password = process.env['SWAGGER_PASSWORD'];
  if (typeof user !== 'string' || typeof password !== 'string') {
    return undefined;
  }
  if (!user || !password) return undefined;
  return { user, password };
}

function parseBasicAuthHeader(
  headerValue: unknown,
): { user: string; password: string } | undefined {
  if (typeof headerValue !== 'string') return undefined;
  const [scheme, token] = headerValue.split(' ');
  if (scheme?.toLowerCase() !== 'basic' || !token) return undefined;
  const decoded = Buffer.from(token, 'base64').toString('utf8');
  const idx = decoded.indexOf(':');
  if (idx < 0) return undefined;
  const user = decoded.slice(0, idx);
  const password = decoded.slice(idx + 1);
  return { user, password };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('port');
  const nodeEnv = configService.get<string>('nodeEnv');
  const shutdownTimeoutMs =
    configService.getOrThrow<number>('shutdownTimeoutMs');

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

  app.use(cookieParser());

  app.useGlobalFilters(new HttpExceptionFilter(logger));

  if (nodeEnv !== 'production') {
    const basicAuth = getBasicAuthCredentials();
    if (!basicAuth) {
      logger.warn(
        'Swagger is disabled. Set SWAGGER_USER and SWAGGER_PASSWORD to enable /docs.',
      );
    } else {
      app.use(
        ['/docs', '/docs-json'],
        (req: Request, res: Response, next: NextFunction) => {
          const creds = parseBasicAuthHeader(req.headers.authorization);
          if (
            creds &&
            creds.user === basicAuth.user &&
            creds.password === basicAuth.password
          ) {
            return next();
          }

          res.setHeader('WWW-Authenticate', 'Basic realm="swagger"');
          return res.status(401).send('Unauthorized');
        },
      );

      const swaggerConfig = new DocumentBuilder()
        .setTitle('Team Task Management API')
        .setDescription('NestJS + TypeORM + Postgres + Redis')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();

      const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('docs', app, swaggerDocument, {
        swaggerOptions: { persistAuthorization: true },
      });
    }
  }

  app.enableShutdownHooks();

  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, () => {
      logger.warn(`${signal} received. Shutting down...`);
      void closeWithTimeout(app, shutdownTimeoutMs)
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
    void closeWithTimeout(app, shutdownTimeoutMs).finally(() => {
      process.exit(1);
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught Exception');
    void closeWithTimeout(app, shutdownTimeoutMs).finally(() => {
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
