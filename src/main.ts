import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NativeLogger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('port');
  const nodeEnv = configService.get<string>('nodeEnv');

  await app.listen(port);

  const log = app.get(NativeLogger);
  app.useLogger(log);

  log.log(
    {
      port,
      environment: nodeEnv,
    },
    'Application started',
  );
}
bootstrap();
