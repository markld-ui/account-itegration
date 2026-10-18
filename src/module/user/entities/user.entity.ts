import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', {
    name: 'user_id',
    comment: 'Идентификатор пользователя',
  })
  userId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, comment: 'Номер телефона пользователя' })
  phone: string;

  @Column({ type: 'varchar', length: 50, nullable: false, comment: 'Логин пользователя' })
  login: string;

  @Column({ type: 'varchar', nullable: false, comment: 'Имя пользователя' })
  firstName: string;

  @Column({ type: 'varchar', nullable: false, comment: 'Фамилия пользователя' })
  lastName: string;

  @Column({ type: 'varchar', nullable: false, comment: 'Отчество пользователя' })
  middleName: string;

  @Column({ type: 'varchar', nullable: false, unique: true, comment: 'E-mail пользователя' })
  email: string;

  @Column({ type: 'varchar', nullable: false, comment: 'Хеш пароля пользователя' })
  passwordHash: string;

  @Column({ type: 'varchar', nullable: false, comment: 'Соль пароля пользователя' })
  passwordSalt: string;

  @Column({
    type: 'varchar',
    nullable: false,
    default: '0',
    comment: 'Баланс в копейках',
  })
  balance: string;

  @CreateDateColumn({ type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: false })
  updatedAt: Date;
}
