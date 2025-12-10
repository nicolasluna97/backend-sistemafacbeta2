import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerDto, user: User) {
    const customer = this.customerRepo.create({
      ...dto,
      user,
    });

    return this.customerRepo.save(customer);
  }

  async findAllByUser(userId: string) {
    return this.customerRepo.find({
      where: { user: { id: userId }, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOneOrFail(id: string, userId: string) {
    const customer = await this.customerRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return customer;
  }

  async update(id: string, userId: string, dto: UpdateCustomerDto) {
    const customer = await this.findOneOrFail(id, userId);

    Object.assign(customer, dto);

    return this.customerRepo.save(customer);
  }

  async remove(id: string, userId: string) {
    const customer = await this.findOneOrFail(id, userId);
    await this.customerRepo.remove(customer);
    return { success: true };
  }
}
