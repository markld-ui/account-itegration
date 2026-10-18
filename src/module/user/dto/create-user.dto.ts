import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Логин пользователя',
    required: true,
    type: String,
    example: 'ivan.petrov',
  })
  @Expose()
  @IsString()
  @Length(3, 50)
  login: string;

  @ApiProperty({
    description: 'Пароль пользователя',
    required: true,
    type: String,
    example: 'StrongPassword123',
  })
  @Expose()
  @IsString()
  @Length(6, 128)
  password: string;

  @ApiProperty({
    description: 'Номер телефона пользователя',
    required: true,
    type: String,
    example: '+79001234567',
  })
  @Expose()
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Имя пользователя',
    required: true,
    type: String,
    example: 'Иван',
  })
  @Expose()
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Фамилия пользователя',
    required: true,
    type: String,
    example: 'Петров',
  })
  @Expose()
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Отчество пользователя',
    required: true,
    type: String,
    example: 'Иванович',
  })
  @Expose()
  @IsString()
  middleName: string;

  @ApiProperty({
    description: 'E-mail пользователя',
    required: true,
    type: String,
    example: 'ivan.petrov@example.com',
  })
  @Expose()
  @IsEmail()
  email: string;
}
