import type { INestApplication, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';

function getBasicAuthCredentials(
  configService: ConfigService,
): { user: string; password: string } | undefined {
  const enabled = configService.get<boolean>('swagger.enabled');
  if (!enabled) return undefined;

  const user =
    configService.get<string>('swagger.user') ??
    configService.get<{ user?: string }>('swagger')?.user;
  const password =
    configService.get<string>('swagger.password') ??
    configService.get<{ password?: string }>('swagger')?.password;

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

export function setupSwagger(app: INestApplication, logger: LoggerService) {
  const configService = app.get(ConfigService);
  const basicAuth = getBasicAuthCredentials(configService);
  if (!basicAuth) {
    const enabled = configService.get<boolean>('swagger.enabled');
    if (enabled) {
      logger.warn(
        'Swagger is enabled but credentials are missing. Set SWAGGER_USER and SWAGGER_PASSWORD to enable /docs.',
      );
    }
    return;
  }

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
