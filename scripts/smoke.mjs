import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

async function request(
  url,
  body,
  expected = 200,
  method = body ? 'POST' : 'GET',
) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${url}: ${text}`);
  return text ? JSON.parse(text) : undefined;
}
async function until(task, message, timeout = 45000) {
  const end = Date.now() + timeout;
  let error;
  while (Date.now() < end) {
    try {
      const result = await task();
      if (result) return result;
    } catch (e) {
      error = e;
    }
    await delay(250);
  }
  throw new Error(`${message}: ${error?.message ?? 'timeout'}`);
}
const account = `${process.env.ACCOUNT_URL ?? 'http://localhost:9000/api/account'}/user`;
const transaction =
  process.env.TRANSACTION_URL ?? 'http://localhost:9002/api/transaction';
const auth = `${process.env.AUTH_URL ?? 'http://localhost:9001/api/auth'}/auth`;

await until(
  async () => {
    const responses = await Promise.all([
      fetch(`${account.slice(0, -5)}/docs`, {
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${auth.slice(0, -5)}/docs`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${transaction}/docs`, { signal: AbortSignal.timeout(5000) }),
    ]);
    return responses.every((r) => r.ok);
  },
  'services did not start',
  60000,
);
console.log(
  'PASS: all three applications and Swagger started; HTTP endpoints are ready',
);
const createUser = async (login, phone) =>
  request(
    account,
    {
      login,
      phone,
      password: 'StrongPassword123',
      firstName: 'Роман',
      lastName: 'Слиньков',
      middleName: 'Викторович',
      email: `${login}@example.test`,
    },
    201,
  );
const run = Date.now();
const sender = await createUser(`chapter4.sender.${run}`, `+71${run}`);
const recipient = await createUser(`chapter4.recipient.${run}`, `+72${run}`);
const unknownUserId = randomUUID();
assert.equal(sender.balance, '0');
assert.equal(sender.middleName, 'Викторович');
const credentials = { login: sender.login, password: 'StrongPassword123' };
const jwt = await request(`${auth}/login`, credentials, 201);
assert(jwt.access && jwt.refresh);
assert((await request(`${auth}/login`, credentials, 201)).access);
const refreshResponse = await fetch(`${auth}/refresh/token`, {
  signal: AbortSignal.timeout(5000),
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ refresh: jwt.refresh }),
});
const refreshBody = await refreshResponse.json();
assert.equal(refreshResponse.status, 201, JSON.stringify(refreshBody));
assert(refreshBody.access && refreshBody.refresh);
await request(
  `${auth}/login`,
  { ...credentials, password: 'WrongPassword' },
  401,
);
console.log(
  'PASS: existing profile fields, password verification and login twice',
);

const balance = async (userId) =>
  (await request(`${account}/${userId}`)).balance;
const records = async () =>
  (
    await request(
      `${transaction}?take=100&userIds=${sender.userId}&userIds=${recipient.userId}&userIds=${unknownUserId}`,
    )
  ).items;
const perform = async (body, expectedCount, expectedStatus) => {
  const previous = new Set((await records()).map((t) => t.id));
  await request(transaction, body, 201);
  return until(async () => {
    const added = (await records()).filter((t) => !previous.has(t.id));
    return added.length === expectedCount &&
      added.every((t) => t.status === expectedStatus)
      ? added
      : false;
  }, `transaction ${body.transactionType} did not settle`);
};
const base = { userId: sender.userId };
const deposited = await perform(
  { ...base, amount: '1000', transactionType: 'DEPOSIT' },
  1,
  'COMPLETED',
);
assert.equal(await balance(sender.userId), '1000');
assert.equal(
  (await request(`${transaction}/${deposited[0].id}`)).status,
  'COMPLETED',
);
console.log(
  'PASS: DEPOSIT across HTTP -> Kafka -> Account -> Kafka -> Transaction',
);
await perform(
  { ...base, amount: '200', transactionType: 'WITHDRAWL' },
  1,
  'COMPLETED',
);
assert.equal(await balance(sender.userId), '800');
console.log('PASS: WITHDRAWL');
const transferred = await perform(
  {
    ...base,
    amount: '300',
    transactionType: 'TRANSFER',
    recipient: recipient.userId,
  },
  2,
  'COMPLETED',
);
assert.equal(await balance(sender.userId), '500');
assert.equal(await balance(recipient.userId), '300');
assert.deepEqual(transferred.map((t) => t.amount).sort(), ['-300', '300']);
console.log(
  'PASS: TRANSFER creates two completed records and correct balances',
);
await perform(
  {
    ...base,
    amount: '9999',
    transactionType: 'TRANSFER',
    recipient: recipient.userId,
  },
  1,
  'FAILED',
);
await delay(500);
assert.equal(await balance(sender.userId), '500');
assert.equal(await balance(recipient.userId), '300');
console.log('PASS: insufficient funds do not credit recipient');
await perform(
  { userId: unknownUserId, amount: '100', transactionType: 'DEPOSIT' },
  1,
  'FAILED',
);
console.log('PASS: unknown user produces FAILED');
const filtered = await request(
  `${transaction}?userIds=${sender.userId}&amounts=1000&transactionType=DEPOSIT&status=COMPLETED&take=20&skip=0`,
);
assert.equal(filtered.total, 1);
assert.equal(filtered.items[0].id, deposited[0].id);
await request(`${transaction}?ids=${deposited[0].id}`, undefined, 200);
await request(
  transaction,
  { ...base, amount: '-1', transactionType: 'DEPOSIT' },
  400,
);
await request(
  transaction,
  { ...base, amount: '5', transactionType: 'TRANSFER' },
  400,
);
await request(
  transaction,
  {
    ...base,
    amount: '5',
    transactionType: 'TRANSFER',
    recipient: sender.userId,
  },
  400,
);
await request(
  `${transaction}/11111111-1111-4111-8111-111111111111`,
  undefined,
  404,
);
console.log('PASS: real SQL filters, pagination, HTTP validation and 404');
await request(
  `${account}/${sender.userId}`,
  { firstName: 'Роман Обновлённый' },
  200,
  'PATCH',
);
assert.equal(
  (await request(`${account}/${sender.userId}`)).firstName,
  'Роман Обновлённый',
);
await request(`${account}/${sender.userId}`, undefined, 200, 'DELETE');
await request(`${account}/${sender.userId}`, undefined, 404);
console.log('PASS: existing edit and delete APIs; all smoke checks passed');
await request(`${account}/${recipient.userId}`, undefined, 200, 'DELETE');
