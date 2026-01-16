import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Category } from 'src/categories/entities/category.entity';

@Entity()
@Unique('UQ_product_user_title', ['userId', 'title'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  title: string;

  @Column('int', { default: 0 })
  stock: number;

  @Column('numeric', { default: 0 })
  purchasePrice: number;

  @Column('numeric', { default: 0 })
  price: number;

  @Column('numeric', { default: 0 })
  price2: number;

  @Column('numeric', { default: 0 })
  price3: number;

  @Column('numeric', { default: 0 })
  price4: number;

  @Column('uuid')
  categoryId: string;

  @ManyToOne(() => Category, (c) => c.products, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  category: Category;

  @ManyToOne(() => User, (user) => user.products, { onDelete: 'CASCADE' })
  user: User;

  @Column('uuid')
  userId: string;
}
