import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Configuration } from 'src/config/confuguration';
import { EventsEmitterService } from './events-emitter.service';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Configuration, true>) => ({
        secret: config.getOrThrow('jwt', { infer: true }).accessSecret,
      }),
    }),
  ],
  providers: [EventsGateway, EventsEmitterService],
  exports: [EventsEmitterService],
})
export class EventsModule {}
