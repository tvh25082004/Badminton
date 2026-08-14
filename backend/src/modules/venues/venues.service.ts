import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { CreateVenueDto, UpdateVenueDto } from './dto/venue.dto';
import { NotFoundException } from '../../common/errors/app-exception';

@Injectable()
export class VenueService {
  constructor(@InjectRepository(Venue) private readonly repo: Repository<Venue>) {}

  async search(region?: string, keyword?: string, page = 1, limit = 20) {
    const qb = this.repo.createQueryBuilder('v').where('v.isActive = true');
    if (region) qb.andWhere('v.region ILIKE :region', { region: `%${region}%` });
    if (keyword) {
      qb.andWhere('(v.name ILIKE :kw OR v.address ILIKE :kw)', { kw: `%${keyword}%` });
    }
    const [items, total] = await qb
      .orderBy('v.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string): Promise<Venue> {
    const venue = await this.repo.findOne({ where: { id } });
    if (!venue) throw new NotFoundException('NOT_FOUND', 'Venue not found');
    return venue;
  }

  async create(dto: CreateVenueDto, actorId: string): Promise<Venue> {
    return this.repo.save(this.repo.create({ ...dto }));
  }

  async update(id: string, dto: UpdateVenueDto): Promise<Venue> {
    const venue = await this.getById(id);
    Object.assign(venue, dto);
    return this.repo.save(venue);
  }
}
