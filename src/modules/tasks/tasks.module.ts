import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/projects.entity';
import { RedisModule } from '../redis/redis.module';
import { User } from '../users/users.entity';
import { TasksListCacheService } from './tasks-list-cache.service';
import { TasksController } from './tasks.controller';
import { Task } from './tasks.entity';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, User]), RedisModule],
  controllers: [TasksController],
  providers: [TasksService, TasksListCacheService],
})
export class TasksModule {}
