import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export default class GetUserFilterDto {
  @ApiProperty({
    description: 'Список идентификаторов пользователей',
    required: false,
    type: [String],
    example: ['518f7913-36b8-4c0a-c0f1-c742e251acdf'],
  })
  @IsOptional()
  @IsString({ each: true })
  readonly userIds?: string[];

  @ApiProperty({
    description: 'Список телефонов пользователей',
    required: false,
    type: [String],
    example: ['+79001110102', '+79001110103'],
  })
  @IsOptional()
  @IsString({ each: true })
  readonly phones?: string[];

  @ApiProperty({
    description: 'Логин пользователя',
    required: false,
    type: String,
    example: 'ivan.petrov',
  })
  @IsOptional()
  @IsString()
  readonly login?: string;

  @ApiProperty({
    description: 'Лимит на количество элементов',
    required: false,
    type: Number,
    example: 20,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  readonly take?: number;

  @ApiProperty({
    description: 'Сколько элементов пропустить',
    required: false,
    type: Number,
    example: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  readonly skip?: number;
}
