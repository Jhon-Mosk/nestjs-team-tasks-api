import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule, nativeLoggerOptions } from 'nestjs-pino';
import configuration from './config/confuguration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: nativeLoggerOptions,
    }),
  ],
})
export class AppModule {}
