import { Global, Module } from '@nestjs/common';
import { PrivilegeRevocationService } from './privilege-revocation.service';
import { AdminGuard } from './admin.guard';
import { UserGuard } from './user.guard';

/**
 * Global authentication module.
 *
 * Exposes guards and shared auth services application-wide so that feature
 * modules can use `AdminGuard` and `UserGuard` without re-declaring all auth
 * dependencies locally.
 */
@Global()
@Module({
  providers: [PrivilegeRevocationService, AdminGuard, UserGuard],
  exports: [PrivilegeRevocationService, AdminGuard, UserGuard],
})
export class AuthModule {}
