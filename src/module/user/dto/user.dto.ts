import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';
import { UserEntity } from '../entities/user.entity.js';

export class UserDto {
  @ApiProperty({
    description: 'Идентификатор пользователя',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Логин пользователя',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  login: string;

  @ApiProperty({
    description: 'Номер телефона пользователя',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Имя пользователя',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Фамилия пользователя',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Отчество пользователя',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  middleName: string;

  @ApiProperty({
    description: 'E-mail пользователя',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  email: string;

  @ApiProperty({ description: 'Баланс в копейках', type: String })
  @Expose()
  @IsString()
  balance: string;

  constructor(entity: Partial<UserEntity>) {
    Object.assign(
      this,
      plainToInstance(UserDto, entity, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
