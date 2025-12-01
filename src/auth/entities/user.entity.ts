import { Product } from "src/products/entities/product.entity";
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('users')
export class User {
    
    @PrimaryGeneratedColumn('uuid')
    id: string;
    

    @Column('text', { unique: true })
    email: string;

    @Column('text', { select: false })
    password: string;

    @Column('text', { unique: true })
    fullName: string;

  
    @Column('bool', { default: false })
    isEmailVerified: boolean;

    @Column('text', { nullable: true })
    emailVerificationCode: string | null;

    @Column('timestamptz', { nullable: true })
    emailVerificationExpiresAt: Date | null;

    @Column('timestamptz', { nullable: true })
    lastLoginAt: Date | null;
 
    @Column('bool', { default: true })
    isActive: boolean;

    @Column('text', { array: true, default:['user'] })
    roles: string[];

    @Column('timestamptz', { nullable: true })
    lastVerificationEmailSentAt: Date | null;

    @Column('int', { default: 0 })
    verificationEmailResendCount: number;

    @OneToMany(
        () => Product,
        (product) => product.user
    )
    products: Product[];

    @BeforeInsert()
    checkFieldsBeforeInsert() {
        this.email = this.email.toLowerCase().trim();
    }

    @BeforeUpdate()
    checkFieldsBeforeUpdate() {
        this.checkFieldsBeforeInsert();
    }

}
