import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './users.service';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/auth.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Thông tin tài khoản + hồ sơ + rating của user hiện tại' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.meView(user.userId);
  }
}
