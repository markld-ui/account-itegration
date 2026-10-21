import { ValidationPipe } from '@nestjs/common';
import GetUserFilterDto from './get-users-filter.dto.js';

describe('Account query array filters', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const metadata = { type: 'query' as const, metatype: GetUserFilterDto };

  it('normalizes a single user ID and phone before building SQL IN filters', async () => {
    await expect(
      pipe.transform({ userIds: 'one-id', phones: '+79000000000' }, metadata),
    ).resolves.toMatchObject({ userIds: ['one-id'], phones: ['+79000000000'] });
  });

  it('preserves repeated query parameters as arrays', async () => {
    await expect(
      pipe.transform({ userIds: ['one-id', 'another-id'] }, metadata),
    ).resolves.toMatchObject({ userIds: ['one-id', 'another-id'] });
  });

  it('rejects bracketed property names unsupported by the API', async () => {
    await expect(
      pipe.transform({ 'userIds[]': 'one-id' }, metadata),
    ).rejects.toThrow();
  });
});
