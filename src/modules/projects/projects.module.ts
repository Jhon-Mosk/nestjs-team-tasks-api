import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './projects.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [],
  providers: [],
})
export class ProjectsModule {}
