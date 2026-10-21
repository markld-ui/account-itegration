# ОНИ — запуск и проверка лабораторных

Три репозитория образуют одно приложение. Account хранит пользователей и баланс,
Auth выдаёт JWT, Transaction обрабатывает денежные операции через Kafka.
Лабораторные выполнены последовательно; текущая версия содержит общий результат.

## Подготовка

Нужны Docker Desktop и Node.js 24 для тестов. На Apple Silicon образы собираются
нативно, принудительно задавать `linux/amd64` не нужно.
Если проект уже находится в `ОНИ/Labs`, клонировать его повторно не требуется.
На новом компьютере разместите репозитории рядом под этими именами:

```sh
mkdir oni-labs
cd oni-labs
git clone https://github.com/markld-ui/account-itegration.git account
git clone https://github.com/markld-ui/auth-itegration.git auth
git clone https://github.com/markld-ui/transaction-itegration.git transaction
```

Дальнейшие команды общего запуска выполняются из `Labs` / `oni-labs`,
где рядом находятся `account`, `auth`, `transaction`.
Compose уже задаёт настройки подключения: создавать `.env` для него не нужно.
Запустите Docker Desktop и дождитесь успешного `docker info`.

## Полное приложение в Docker Compose

```sh
docker compose -f account/docker/docker-compose.yml up -d --build --wait --wait-timeout 240
docker compose -f account/docker/docker-compose.yml ps
node account/scripts/smoke.mjs
```

Сквозной тест создаёт двух временных пользователей, проверяет CRUD, вход,
обновление JWT, неверный пароль, пополнение, списание, перевод, недостаток средств,
несуществующего пользователя, фильтры и HTTP-валидацию. Он ожидает завершения
Kafka-операций и проверяет фактические балансы. При успехе пользователи удаляются;
тестовые транзакции остаются в истории. Для пустой базы используйте отдельную
тестовую среду, а не удаление рабочих данных.

| Интерфейс | Адрес |
| --- | --- |
| Swagger Account | http://localhost:9000/api/account/docs |
| Swagger Auth | http://localhost:9001/api/auth/docs |
| Swagger Transaction | http://localhost:9002/api/transaction/docs |
| Kafka UI | http://localhost:18080 |
| Redis Commander | http://localhost:29094 |

Логи и остановка:

```sh
docker compose -f account/docker/docker-compose.yml logs --tail=100 account auth transaction
docker compose -f account/docker/docker-compose.yml down
```

Обычный `down` сохраняет данные. Не добавляйте `--volumes`, если базы нужны.
При занятом порте проверьте `docker compose ls -a`: остановите прежний экземпляр
системы либо завершите port-forward Kubernetes перед запуском Compose.

## Что показывать по каждой лабораторной

| Работа | Демонстрация на текущем приложении |
| --- | --- |
| ЛР1 | Account: создание пользователя, чтение списка и профиля |
| ЛР2, глава 3 | Account: изменение, удаление, поиск, проверка пароля; Auth: вход и refresh JWT; Redis |
| ЛР3, глава 4 | Transaction: DEPOSIT, WITHDRAWL, TRANSFER; итоговый статус, баланс, Kafka |
| ЛР4, глава 5 | Сборка Docker-образов, общий Compose, Kubernetes, GitHub Actions |

В Swagger создайте двух пользователей через `POST /api/account/user`.
Для входа используйте `POST /api/auth/auth/login` с `login` и `password`;
для обновления — `POST /api/auth/auth/refresh/token` с полем `refresh`.
Для `POST /api/transaction` пример тела:

```json
{"userId":"UUID пользователя","amount":"1000","transactionType":"DEPOSIT"}
```

`amount` — целое число копеек строкой. Для списания тип — `WITHDRAWL`
(написание сохранено из книги), для перевода — `TRANSFER` и поле `recipient`
с UUID получателя. Ответ 201 означает принятие операции; дождитесь
`COMPLETED` или `FAILED` через GET Transaction и проверьте баланс в Account.
Исходные этапы разработки доступны через `git log --oneline` в каждом репозитории.

## Проверки каждого сервиса

Account (Yarn 1.22.22, используется `yarn.lock`):

```sh
cd account
corepack prepare yarn@1.22.22 --activate
yarn install --frozen-lockfile
yarn lint
yarn test
yarn build
```

Auth и Transaction (команды выполняются отдельно из соответствующего каталога):

```sh
npm ci
npm run lint
npm test
npm run build
```

Проверки не требуют запущенных баз. В Account/Auth остались шаблонные
`test:e2e` из Nest: они не являются полной проверкой приложения.
Для реального сквозного сценария запускайте `node account/scripts/smoke.mjs`
из общего каталога после старта Compose. Скрипт завершится ненулевым кодом при ошибке.

## GitHub Actions

В каждом репозитории есть `.github/workflows/ci.yml`.
Триггеры: push, pull request, ручной запуск `workflow_dispatch`.
Сервисы проверяются на Ubuntu с Node.js 24: установка по lock-файлу,
lint, unit-тесты, сборка. Auth и Transaction также собирают Dockerfile.
Account дополнительно клонирует Auth/Transaction из `main`, собирает и запускает
весь Compose-стек, выполняет сквозной тест, выводит логи при ошибке и останавливает
контейнеры. Секреты и registry для этого не требуются; Docker-образы не публикуются.

- Account: https://github.com/markld-ui/account-itegration/actions
- Auth: https://github.com/markld-ui/auth-itegration/actions
- Transaction: https://github.com/markld-ui/transaction-itegration/actions

Для показа преподавателю откройте Actions → нужный CI → запуск → шаги.
Ручной запуск: Actions → CI → Run workflow → main → Run workflow.
После изменения Auth/Transaction их CI запускается автоматически; полную интеграцию
повторно запустите вручную в Account. Она использует опубликованные `main`
соседних сервисов, поэтому сначала отправьте их изменения на GitHub.

## Kubernetes Docker Desktop

Включите Kubernetes в Docker Desktop. Используется локальный контекст `docker-desktop`.
Сначала остановите Compose, чтобы освободить порты для port-forward.

```sh
docker compose -f account/docker/docker-compose.yml down
bash account/scripts/deploy-local.sh
```

Скрипт предназначен для Docker Desktop на Mac с кластером kind и контекстами
`desktop-linux` / `docker-desktop`. Он собирает образы, загружает их в containerd
каждого локального узла, применяет манифесты и перезапускает приложения.
Так новый код не остаётся скрыт за старым кэшем тега `lab4`.
Манифесты используют локальные теги `oni-lab4-*:lab4` с `IfNotPresent`.

В трёх отдельных терминалах:

```sh
kubectl --context docker-desktop port-forward service/account 9000:9000
kubectl --context docker-desktop port-forward service/auth 9001:9001
kubectl --context docker-desktop port-forward service/transaction 9002:9002
```

После этого те же Swagger-адреса и `node account/scripts/smoke.mjs` проверяют
приложение в Kubernetes. Для диагностики: `kubectl --context docker-desktop logs
deployment/account --tail=100` (аналогично auth/transaction).
Данные Kubernetes хранятся в отдельных PVC и не совпадают с базами Compose.
