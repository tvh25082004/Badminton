import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from './entities/venue.entity';
import { VenuesController } from './venues.controller';
import { VenueService } from './venues.service';

@Module({
  imports: [TypeOrmModule.forFeature([Venue])],
  controllers: [VenuesController],
  providers: [VenueService],
  exports: [VenueService],
})
export class VenuesModule {}
