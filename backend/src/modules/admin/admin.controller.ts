import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { ResolveDisputeDto, SuspendUserDto, UpdateEloConfigDto, VoidMatchDto } from './dto/admin.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/auth.decorator';
import { UserService } from '../users/users.service';
import { User } from '../auth/entities/user.entity';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles('MODERATOR', 'ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly users: UserService,
  ) {}

  private ctx(req: Request) {
    return {
      requestId: (req.headers['x-request-id'] as string) ?? undefined,
      ip: req.ip,
    };
  }

  private async actor(user: AuthenticatedUser): Promise<User> {
    return this.users.findById(user.userId);
  }

  // ---------------- Users ----------------

  @Get('users')
  @ApiOperation({ summary: 'Tìm kiếm user (xem phone đầy đủ)' })
  searchUsers(@Query() pagination: PaginationDto, @Query('q') q?: string) {
    return this.admin.searchUsers(q, pagination.page, pagination.limit);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Inspection user (read-only, có access audit)' })
  async inspectUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.admin.inspectUser(await this.actor(user), id, this.ctx(req));
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend tài khoản (reason + idempotency + audit)' })
  async suspend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @Req() req: Request,
  ) {
    return this.admin.suspendUser(
      await this.actor(user),
      id,
      dto.reason,
      dto.idempotencyKey,
      this.ctx(req),
    );
  }

  @Post('users/:id/unsuspend')
  @ApiOperation({ summary: 'Unsuspend tài khoản (reason + idempotency + audit)' })
  async unsuspend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @Req() req: Request,
  ) {
    return this.admin.unsuspendUser(
      await this.actor(user),
      id,
      dto.reason,
      dto.idempotencyKey,
      this.ctx(req),
    );
  }

  // ---------------- Matches ----------------

  @Get('matches/:id')
  @ApiOperation({ summary: 'Inspection match (read-only, có access audit)' })
  async inspectMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.admin.inspectMatch(await this.actor(user), id, this.ctx(req));
  }

  @Post('matches/:id/void')
  @ApiOperation({ summary: 'Void match đã RATED → REVERSAL + recompute metadata (atomic)' })
  async voidMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VoidMatchDto,
    @Req() req: Request,
  ) {
    return this.admin.voidMatch(
      await this.actor(user),
      id,
      dto.reason,
      dto.idempotencyKey,
      this.ctx(req),
    );
  }

  // ---------------- Disputes ----------------

  @Get('disputes')
  @ApiOperation({ summary: 'Danh sách dispute' })
  listDisputes(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.admin.listDisputes(pagination.page, pagination.limit, status);
  }

  @Post('disputes/:id/resolve')
  @ApiOperation({ summary: 'Resolve dispute: KEEP_RESULT (thay thế ngưỡng 3/4) hoặc VOID_MATCH' })
  async resolveDispute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @Req() req: Request,
  ) {
    return this.admin.resolveDispute(
      await this.actor(user),
      id,
      dto.decision,
      dto.reason,
      this.ctx(req),
    );
  }

  // ---------------- Elo config ----------------

  @Get('elo-config')
  @ApiOperation({ summary: 'Xem cấu hình Elo hiện tại' })
  getEloConfig() {
    return this.admin.getEloConfig();
  }

  @Roles('ADMIN')
  @Put('elo-config')
  @ApiOperation({ summary: 'Cập nhật cấu hình Elo (ADMIN only, có audit)' })
  async updateEloConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEloConfigDto,
    @Req() req: Request,
  ) {
    return this.admin.updateEloConfig(
      await this.actor(user),
      dto.key,
      dto.value,
      this.ctx(req),
    );
  }

  // ---------------- Audit ----------------

  @Get('audit-logs')
  @ApiOperation({ summary: 'Audit log (append-only, không sửa/xoá)' })
  auditLogs(
    @Query() pagination: PaginationDto,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.admin.auditLogs(pagination.page, pagination.limit, action, actorId);
  }
}
