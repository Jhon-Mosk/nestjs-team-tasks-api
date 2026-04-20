import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule, nativeLoggerOptions } from 'nestjs-pino';
import configuration, { Configuration } from './config/confuguration';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { Organization } from './modules/organizations/organizations.entity';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { Project } from './modules/projects/projects.entity';
import { ProjectsModule } from './modules/projects/projects.module';
import { ReportsModule } from './modules/reports/reports.module';
import { Task } from './modules/tasks/tasks.entity';
import { TasksModule } from './modules/tasks/tasks.module';
import { User } from './modules/users/users.entity';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        ...nativeLoggerOptions,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { host, port, user, password, name } =
          configService.getOrThrow<Configuration['database']>('database');

        return {
          type: 'postgres',
          host,
          port,
          username: user,
          password,
          database: name,
          entities: [User, Organization, Project, Task],
          synchronize: false,
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { host, port, user, userPassword } =
          configService.getOrThrow<Configuration['redis']>('redis');
        return {
          connection: {
            host,
            port,
            username: user,
            password: userPassword,
          },
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
          },
        };
      },
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    TasksModule,
    ReportsModule,
    EventsModule,
  ],
})
export class AppModule {}
