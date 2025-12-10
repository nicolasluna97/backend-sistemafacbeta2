import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(AuthGuard())
export class CustomersController {
  constructor(private readonly customersSvc: CustomersService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.customersSvc.findAllByUser(req.user.id);
  }

  @Post()
    @UseGuards(AuthGuard())
    async create(@Req() req: any, @Body() dto: CreateCustomerDto) {
    return this.customersSvc.create(dto, req.user);
   }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersSvc.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.customersSvc.remove(id, req.user.id);
  }
}
