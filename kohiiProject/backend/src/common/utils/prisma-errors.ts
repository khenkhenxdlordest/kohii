import { ConflictException, NotFoundException } from '@nestjs/common';

// Ginagawang malinaw na HTTP error ang mga karaniwang Prisma error
export function rethrowPrismaError(error: unknown, entity: string): never {
  const code = (error as { code?: string })?.code;
  if (code === 'P2002') throw new ConflictException(`A ${entity.toLowerCase()} with this name already exists.`);
  if (code === 'P2025') throw new NotFoundException(`${entity} not found.`);
  throw error;
}
