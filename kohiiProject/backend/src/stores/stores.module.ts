import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
