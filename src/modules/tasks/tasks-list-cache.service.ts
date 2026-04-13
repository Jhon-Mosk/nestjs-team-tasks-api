import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'node:crypto';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { REDIS_CLIENT } from '../redis/redis.provider';
import { UserRole } from '../users/users.entity';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { ListTasksResponseDto } from './dto/list-tasks-response.dto';

/** Версия списков задач по организации (инвалидация без перечисления ключей). */
export function orgTasksListVersionKey(organizationId: string): string {
  return `tasks:list:ver:${organizationId}`;
}

/**
 * Scope: разная выдача для EMPLOYEE (только свои задачи) и OWNER/MANAGER (организация).
 */
export function tasksListScope(actor: AccessTokenPayload): string {
  if (actor.role === UserRole.EMPLOYEE) {
    return `emp:${actor.sub}`;
  }
  return 'staff';
}

/**
 * Стабильный хеш параметров list (как в `TasksService.list` — фильтры + пагинация).
 */
export function tasksListFiltersHash(
  actor: AccessTokenPayload,
  query: ListTasksQueryDto,
): string {
  const parts: Record<string, string | number> = {
    p: query.currentPage,
    ipp: query.itemsPerPage,
  };
  if (query.status !== undefined) parts['s'] = query.status;
  if (query.priority !== undefined) parts['pr'] = query.priority;
  if (actor.role !== UserRole.EMPLOYEE && query.assigneeId !== undefined) {
    parts['a'] = query.assigneeId;
  }
  const keys = Object.keys(parts).sort();
  const stable = keys.map((k) => [k, parts[k]] as const);
  return createHash('sha1')
    .update(JSON.stringify(stable))
    .digest('hex')
    .slice(0, 16);
}

export function tasksListCacheEntryKey(
  organizationId: string,
  version: number,
  actor: AccessTokenPayload,
  query: ListTasksQueryDto,
): string {
  const scope = tasksListScope(actor);
  const hash = tasksListFiltersHash(actor, query);
  return `tasks:list:${organizationId}:v${version}:${scope}:${hash}`;
}

@Injectable()
export class TasksListCacheService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async getOrgListVersion(organizationId: string): Promise<number> {
    try {
      const raw = await this.redis.get(orgTasksListVersionKey(organizationId));
      if (raw === null) return 0;
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  buildCacheKey(
    organizationId: string,
    version: number,
    actor: AccessTokenPayload,
    query: ListTasksQueryDto,
  ): string {
    return tasksListCacheEntryKey(organizationId, version, actor, query);
  }

  async get(key: string): Promise<ListTasksResponseDto | null> {
    try {
      const raw = await this.redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as ListTasksResponseDto;
    } catch {
      return null;
    }
  }

  async set(key: string, value: ListTasksResponseDto): Promise<void> {
    const ttlSec = this.configService.getOrThrow<number>(
      'tasksListCacheTtlSec',
    );
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSec);
    } catch {
      // read path must stay healthy if cache write fails
    }
  }

  /** После create/update/delete задачи в организации — новая «эпоха» списков. */
  async bumpOrgListCache(organizationId: string): Promise<void> {
    try {
      await this.redis.incr(orgTasksListVersionKey(organizationId));
    } catch {
      // best-effort; TTL на записях всё равно ограничит staleness
    }
  }
}
