import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VenueService } from './venues.service';
import { CreateVenueDto, UpdateVenueDto } from './dto/venue.dto';
import { Public } from '../../common/decorators/auth.decorator';
import { Roles } from './venue.guards';

@ApiTags('venues')
@ApiBearerAuth()
@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenueService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Tìm kiếm sân/địa điểm theo khu vực hoặc từ khoá' })
  search(
    @Query('region') region?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.venues.search(region, keyword, Number(page), Number(limit));
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết địa điểm' })
  getById(@Param('id') id: string) {
    return this.venues.getById(id);
  }

  @Post()
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Tạo địa điểm (Admin/Moderator)' })
  create(@Body() dto: CreateVenueDto) {
    return this.venues.create(dto, '');
  }

  @Patch(':id')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Cập nhật địa điểm (Admin/Moderator)' })
  update(@Param('id') id: string, @Body() dto: UpdateVenueDto) {
    return this.venues.update(id, dto);
  }
}
