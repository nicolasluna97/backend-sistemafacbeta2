import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique, BeforeInsert, BeforeUpdate, Index } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';

@Unique('UQ_category_user_name', ['userId', 'name'])
@Index('IDX_category_user_name', ['userId', 'name'])
@Entity()
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('text')
  name: string;

  @OneToMany(() => Product, (p) => p.category)
  products: Product[];

  @BeforeInsert()
  @BeforeUpdate()
  normalizeName() {
    this.name = (this.name ?? '').trim();
  }
}
