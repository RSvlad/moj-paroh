# Парохије (Мој парох)

Инстанца шаблона [`RSvlad/karta-teritorija`](https://github.com/RSvlad/karta-teritorija): исти код, друге речи. Све упутство (деплој на GitHub Pages, секрети, Sheet, цртање граница, PWA, локални развој) је у README-у шаблона; овде је само оно што је другачије.

## Речник

Речи ове инстанце налазе се у `profiles/paroh/profile.json` (активан је јер `profiles/ACTIVE` садржи `paroh`). Уместо речи из упутства шаблона важи:

| Шаблон | Мој парох |
|--------|-----------|
| лист **Територије** | лист **Парохије** (стари назив „Територије“ још ради, уз упозорење у билду) |
| колона `територија` (листови „Правила“, „Тачке“, „Обим“, „Границе“) | колона `парохија` (стара још ради) |
| врста **престоница** (лист „Тачке“) | **парохијски храм** (раде и `храм`, `church`, `престоница`) |
| „Територија 14 „Либерти““ у апликацији | „Парохија 14 „Либерти““ |

Подешавање Sheet-а, секрета (`GOOGLE_SERVICE_ACCOUNT`, `SHEETS_ID`) и променљиве `CUSTOM_DOMAIN` је као у шаблону.

## Шта се мења у овом репозиторијуму

Само: `profiles/paroh/`, `profiles/ACTIVE`, овај `README.md` (+ ред у `.gitattributes`) и `.github/workflows/sync-upstream.yml`. Све остало долази из шаблона и не дира се овде: измена код шаблона се иначе не би могла пренети без сукоба. Грешку или нову могућност исправите у шаблону.

## Ажурирање из шаблона

`.github/workflows/sync-upstream.yml` једном недељно (и на захтев, **Actions → Sync from template → Run workflow**) спаја `main` шаблона на грану `sync/upstream-<датум>` и отвара pull request. Потребан је секрет **`SYNC_TOKEN`** (fine-grained токен за овај репозиторијум са правима *Contents*, *Pull requests* и *Workflows*: read & write; обичан `GITHUB_TOKEN` не сме да мења workflow датотеке и не покреће CI на PR-у).

Ручно:

```sh
git remote add upstream https://github.com/RSvlad/karta-teritorija.git   # једном
git config merge.ours.driver true                                         # једном: README остаје овај
git fetch upstream && git switch -c sync/upstream-$(date +%Y%m%d)
git merge upstream/main
npm ci && npm test
```

Када шаблон дода нов текст, `npm test` падне са „нема текста „…““ док га не додате у `profiles/paroh/profile.json` (са парохијским речима и са истим `{пољима}`): то је намера, да нова реч не постане видљива у погрешном речнику. Више о профилима: `profiles/README.md`.

## Прелаз са ранијег облика (једнократно)

Док први деплој овог кода не замени објављене податке, `profiles/paroh/migrate-previous.mjs` чита претходно објављене податке у ранијем облику, да град са погрешним подацима у Sheet-у задржи претходну верзију. После првог успешног деплоја обришите `profiles/paroh/migrate-previous.mjs`. Први деплој ионако поново црта границе свих градова.
