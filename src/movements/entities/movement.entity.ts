import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Movement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  customerId: string;

  @Column('text')
  customerName: string;

  @Column('uuid')
  productId: string;

  @Column('text')
  productTitle: string;

  @Column('int')
  quantity: number;

  @Column('numeric')
  unitPrice: number;

  @Column('int')
  priceKey: 1 | 2 | 3 | 4;

  @Column('text', { nullable: true })
  status: string | null;

  @Column('text', { nullable: true })
  employee: string | null;

  @Column('numeric', { default: 0 })
  purchasePriceAtSale: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
