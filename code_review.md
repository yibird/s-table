Review partially complete: 240 finding(s); 17 of 307 selected item(s) failed.

─── packages/vue/LICENSE:3-3 ───
[maintainability · low] 版权声明与根目录 LICENSE 及包元数据不一致：根 `LICENSE` 与 `packages/vue/package.json` 的
`author` 均为 `zchengfeng <2684837849@qq.com>`，而这里只有 `zchengfeng`。该文件会被 npm 打包进发布产物（LICENSE 属于 npm
强制包含的文件），建议对齐为同一版权主体，避免不同包/仓库之间的版权声明出现分歧。

另外附带说明（不在本次评审文件范围内）：`packages/core/package.json` 是另一个待发布包，但仓库中不存在
`packages/core/LICENSE`，发布产物可能缺少许可证文本，建议一并补充。

- +Copyright (c) 2026 zchengfeng

* Copyright (c) 2026 zchengfeng <2684837849@qq.com>

─── .github/workflows/ci.yml:9-9 ───
[security · medium] `quality` job 未声明 `permissions`，会继承仓库默认的 `GITHUB_TOKEN`
权限（部分仓库默认即为读写），不符合最小权限原则，也与 `release.yml` 显式声明 `contents: read` 的做法不一致。建议显式收紧为只读。

    quality:

-     permissions:
-       contents: read

─── .github/workflows/ci.yml:10-10 ───
[maintainability · medium] 该 job 未设置 `timeout-minutes`。`playwright install` 与三浏览器 E2E 一旦挂起会长时间占用
runner（`release.yml` 已设置 30 分钟，二者不一致）。建议补充超时。

      runs-on: ubuntu-latest

-     timeout-minutes: 30

─── .github/workflows/ci.yml:3-6 ───
[performance · low] 工作流未配置 `concurrency`，同一分支的连续 push / PR 更新会并行触发多份冗余运行（含较重的浏览器安装与 E2E），浪费 runner
资源。建议加入并发组并在 PR 场景取消进行中的旧运行。

on:
push:
branches: ['main']
pull_request:

-
- concurrency:
- group: ci-${{ github.workflow }}-${{ github.ref }}
- cancel-in-progress: true

─── .github/workflows/ci.yml:13-13 ───
[security · medium] `pnpm/action-setup` 属于第三方 action，仅用可变 tag `@v4` 引用，tag 被劫持时存在供应链风险（`release.yml`
同样如此）。建议固定到完整 commit SHA。

─── .github/workflows/release.yml:55-55 ───
[security · low] 此处把 `${{ inputs.tag }}` 直接内插进 `run:` 脚本，构成表达式注入面；同一文件的 `Publish or promote package`
步骤已通过 `env: RELEASE_TAG` 传递，两处写法不一致。虽然该 input 为 `choice` 类型、当前风险有限，但仍建议统一为 env 传递以保持一致与可维护的防线。

-         run: npm publish --dry-run --access public --tag "${{ inputs.tag }}"

*         run: npm publish --dry-run --access public --tag "$RELEASE_TAG"

─── .github/workflows/release.yml:25-25 ───
[maintainability · low] job 级 `if` 使用 `github.ref == 'refs/heads/main'`：当维护者通过 workflow_dispatch 从非
main 分支（或选择 tag）触发时，整个发布任务会被静默跳过，日志中没有任何失败或提示，容易造成“以为已发布、实际未发布”的误判。建议在跳过时显式失败或输出明确原因。

─── playwright.config.ts:11-11 ───
[maintainability · low] `workers` 在配置里按 CI 判定为 2，而 `ci.yml` 又以 `pnpm test:e2e --workers=2`
覆盖一次，两处硬编码同一并发度，后续调整时容易失配。建议收敛为单一来源（保留配置里的默认值，CI 不再重复传参）。

─── docs/demos/s-table/custom-loading.vue:45-45 ───
[bug · medium] 该动画名称通过模板内联 `style` 引用，但 `@keyframes s-table-demo-spin` 定义在 `<style scoped>` 中。Vue 的
scoped 样式会把 `@keyframes` 名称改写为 `s-table-demo-spin-<scopeId>`，并且只会重写同一个 scoped 样式块内的
`animation`/`animation-name` 声明，模板上的内联 style 不会被改写，导致动画名与实际 keyframes 名不一致，loading 图标不会旋转。

建议：把动画声明改为 scoped 样式块中的类（类选择器会被自动加上 scope 属性，与改写后的 keyframes 名匹配），例如在 `<style scoped>` 中新增
`.s-table-demo-spinner { animation: s-table-demo-spin 0.8s linear infinite; }`，模板改为
`class="s-table-demo-spinner"`；或直接复用 `docs/.vitepress/theme/custom.css` 中已存在的全局 `s-demo-spin`
keyframes。

─── docs/demos/shared.ts:76-76 ───
[maintainability · low] `Order` 接口、`generateOrders` 以及其依赖的 `PRODUCTS/STATUSES/CATEGORIES/REGIONS`
常量在整仓中都没有被引用（搜索 `generateOrders` 仅命中本文件）。与此同时 `docs/demos/s-table/filter.vue`(第 5-13 行)
仍然内联重复声明了完全相同的 `Order` 接口并手写 mock 数据，`sort-filter-advanced.vue` 也自建了 Employee 类型。建议二选一：让订单类 demo
复用这里的 `Order`/`generateOrders`，或先移除暂未使用的导出，避免出现两份需要同步的 mock 数据模型。

─── docs/demos/shared.ts:89-89 ───
[maintainability · low] `STATUS_LABELS`/`CATEGORY_LABELS`/`REGION_LABELS` 同样没有任何 demo
导入（全仓搜索仅命中本文件），属于提前引入但未被使用的代码。若订单类 demo 暂未展示中文标签，建议等到实际使用时再添加，避免无用 API 长期留存。

─── docs/demos/shared.ts:28-28 ───
[maintainability · low] 同一组枚举存在两份声明：此处 `status` 的字面量联合类型与文件下方 `STATUSES` 常量数组（`category`/`region`
同理）。新增枚举值时需要在两处同步修改，建议由常量数组派生类型，例如把常量声明提前并写成 `export type OrderStatus = (typeof
STATUSES)[number];`，再让 `Order` 引用该派生类型，消除重复定义。

─── commitlint.config.js:1-1 ───
[bug · medium] 该配置文件使用 ESM 的 `export default` 语法，但根 `package.json` 未声明 `"type": "module"`（而
docs、packages/core、packages/vue、e2e/package-consumer 均声明了），文件扩展名仍是 `.js`。此时该文件会被视为 CommonJS，只有依赖
Node 的模块语法自动探测（Node ≥ 20.19 / 22.7）才能被当作 ESM 加载；在较旧 Node（packages 中 `engines.node` 仅要求 `>=20`）或通过
`require` 加载配置的场景下，会抛 `ERR_REQUIRE_ESM` / `Unexpected token 'export'`，导致 commitlint 直接失败。建议在根
package.json 补上 `"type": "module"` 保持与子包一致，或将该文件重命名为 `commitlint.config.mjs`。

─── package.json:45-45 ───
[maintainability · medium] 声明了 `husky`、`lint-staged`、`@commitlint/cli` 并配置了 `lint-staged` 字段，但
scripts 中没有任何 `prepare`（husky v9 的安装命令为 `husky`），仓库中也不存在 `.husky/` 钩子目录（已确认无 pre-commit / commit-msg
文件）。结果是 lint-staged 与 commitlint 配置永远不会被触发，提交前的 lint/格式化/提交信息校验全部失效，成为死配置。建议补充 `"prepare": "husky"`
并提交 `.husky/pre-commit`（`pnpm lint-staged`）、`.husky/commit-msg`（`pnpm exec commitlint --edit
$1`）钩子文件，同时在 `.gitignore` 中忽略 husky 自动生成的 `.husky/_` 目录。

─── docs/.vitepress/theme/DemoPreview.vue:40-42 ───
[maintainability · medium] 空 `catch {}` 会静默吞掉示例加载失败的全部原因（chunk 404、语法错误、SFC
编译失败等），调用方只能看到“重新加载”按钮，线上/CI 排查时没有任何日志线索。另外 `observer?.disconnect()`
只写在成功分支里，失败后观察器仍保持连接，元素再次进出视口会静默重复触发重试，且同样无日志。建议记录错误并在失败时一并断开观察器（若确实希望保留自动重试语义，也请补一条注释说明）。

- } catch {

* } catch (error) {
  failed.value = true;
*     observer?.disconnect();
*     console.error('[DemoPreview] 示例加载失败', error);
  } finally {

─── docs/.vitepress/theme/DemoPreview.vue:47-47 ───
[maintainability · low] `load()` 内部已用 try/catch/finally 吞掉所有异常，其返回的 Promise 永不 reject，因此这里的
`.catch(() => undefined)` 是不可能执行到的死代码，还会让读者误以为 load 可能抛出。建议直接去掉，或改为显式忽略返回值的写法。

- const requestLoad = () => load().catch(() => undefined);

* const requestLoad = (): void => {
* void load();
* };

─── docs/package.json:14-14 ───
[maintainability · low] `sass-embedded` 在 docs 目录下没有被使用：全目录搜索无任何 `.scss`/`.sass` 文件，也没有
`lang="scss"` 的样式块（组件样式走 `less`，主题样式为 `custom.css`），该依赖只会增加安装体积与供应链面。若只是沿用模板的默认依赖，建议删除；若计划后续改用
SCSS，建议在引入时再加，并补充说明。

─── .github/workflows/release.yml:68-68 ───
[bug · high] 发布流程只发布了 `packages/vue`，但 `packages/vue/src` 依赖的 `@zchengfeng/s-table-core` 在
`packages/vue/vite.config.ts` 中被显式 external
化（`/^@zchengfeng\/s-table-core(\/|$)/`），即它是发布产物的**运行时依赖**；而 `packages/vue/package.json` 中该依赖写成
`"@zchengfeng/s-table-core": "workspace:*"`。这里用的是 `npm publish`（不是会把 `workspace:` 协议重写成具体版本号的 `pnpm
publish`），npm 不会在打包时改写该 range，且本仓库也没有任何其他工作流发布 core 包。结果是：即使 vue 包发布成功，消费者安装时会因 `workspace:*` 非法
spec / core 包不存在而失败（`pnpm check` 里的 `attw --pack`、`publint` 只做本地打包检查，无法发现该问题）。建议在发布 vue 之前先发布
core（或统一改用 `pnpm publish` / changesets 之类的多包发布方案），并增加对发布产物中 workspace 依赖已被解析为具体版本的校验。

─── .github/workflows/ci.yml:24-24 ───
[maintainability · medium] 配置里设置了 `trace: 'retain-on-failure'`、`screenshot:
'only-on-failure'`、`video: 'retain-on-failure'` 并生成 HTML 报告，但 CI 中没有任何 artifact 上传步骤，失败后这些产物随 runner
一起被销毁，无法排查。建议在该步骤后补充 `actions/upload-artifact`（`if: failure()`）上传 `playwright-report/` 与
`test-results/`。

        - run: pnpm test:e2e --workers=2

-       - uses: actions/upload-artifact@v4
-         if: failure()
-         with:
-           name: playwright-report
-           path: |
-             playwright-report/
-             test-results/
-           retention-days: 7

─── .github/workflows/release.yml:39-39 ───
[maintainability · low] `install / check / bench:performance:quick / playwright install / test:e2e`
这 5 个步骤与 `ci.yml` 完全重复。发布前跑一遍质量门禁是合理的，但当前是复制粘贴，后续两边很容易漂移（例如 ci.yml 补了 timeout/artifact 上传而这里漏掉）。建议抽成
`workflow_call` 的可复用工作流（或让 release 依赖 CI 结果），保持单一来源。

─── docs/demos/s-table/column-drag.vue:5-5 ───
[maintainability · low] 本地接口名 `Record` 会遮蔽 TypeScript 内置工具类型 `Record<K, V>`，同一文件中将无法再使用内置
`Record`（若后续需要 `Record<string, unknown>` 之类写法会直接报错）。同目录其他 demo 均采用业务化命名（如
`UserRecord`/`Project`/`Order`），建议保持一致改为 `RowRecord` 之类并同步更新引用处。

─── docs/demos/s-table/column-drag.vue:55-60 ───
[maintainability · low] 这里内联重复声明的事件负载与包内已导出的 `STableColumnOrderChangeEvent` 结构完全一致（见
`types/interaction.ts:40`，且已在 `packages/vue/src/index.ts` 对外导出）。建议直接导入复用，避免后续事件结构演进时示例类型失配；同一 PR 的
tree-drag.vue 已复用 `STableRowOrderChangeEvent`，可保持一致。

- const onColumnOrderChange = (payload: {
- columns: STableColumn<Record>[];
- columnOrder: string[];
- fromIndex: number;
- toIndex: number;
- }) => {

* const onColumnOrderChange = (payload: STableColumnOrderChangeEvent<Record>) => {

─── docs/demos/s-table/column-drag-animation.vue:5-5 ───
[maintainability · low] 本地接口名 `Record` 会遮蔽 TypeScript 内置工具类型 `Record<K, V>`，同一文件中将无法再使用内置
`Record`。同目录其他 demo 均采用业务化命名（如 `UserRecord`/`Project`/`Order`），建议保持一致改为 `RowRecord` 之类并同步更新引用处。

─── docs/demos/s-table/column-drag-animation.vue:55-60 ───
[maintainability · low] 内联声明的事件负载与包内已导出的 `STableColumnOrderChangeEvent`
结构完全一致（`types/interaction.ts:40`，已由 `packages/vue/src/index.ts` 导出）。建议直接导入复用，避免后续事件结构变化时示例类型失配，并与
tree-drag.vue 复用 `STableRowOrderChangeEvent` 的写法保持一致。

- const onColumnOrderChange = (payload: {
- columns: STableColumn<Record>[];
- columnOrder: string[];
- fromIndex: number;
- toIndex: number;
- }) => {

* const onColumnOrderChange = (payload: STableColumnOrderChangeEvent<Record>) => {

─── docs/demos/s-table/events.vue:1-1 ───
[style · low] 该文件首行 `<script setup>` 前残留 UTF-8 BOM（U+FEFF）。项目 `.editorconfig` 声明 `charset = utf-8`（非
utf-8-bom），且本批次其他示例文件均无 BOM；BOM 会干扰部分构建/格式化/lint 工具，并在 diff、复制粘贴时引入不可见字符。建议去除该字节。

─── docs/demos/s-table/row-drag.vue:5-5 ───
[maintainability · low] 本地接口名 `Record` 会遮蔽 TypeScript 内置工具类型 `Record<K, V>`，同一文件中将无法再使用内置
`Record`。同目录其他 demo 均采用业务化命名（如 `UserRecord`/`Project`/`Order`），建议保持一致改为 `RowRecord` 之类并同步更新引用处。

─── docs/demos/s-table/row-drag-animation.vue:5-5 ───
[maintainability · low] 本地接口名 `Record` 会遮蔽 TypeScript 内置工具类型 `Record<K, V>`，同一文件中将无法再使用内置
`Record`。同目录其他 demo 均采用业务化命名（如 `UserRecord`/`Project`/`Order`），建议保持一致改为 `RowRecord` 之类并同步更新引用处。

─── docs/demos/s-table/summary.vue:129-129 ───
[bug · low] 部门列的汇总文案与统计口径不一致：`dataSource.length` 是记录数（6），却写成「个部门」。

该表实际只有 4 个部门，示例 4 中同一列已正确使用 `deptStats.size`。此处属复制错误，会误导使用者对 `#summary` 用法的理解。

-           <SummaryCell :index="4">{{ dataSource.length }} 个部门</SummaryCell>

*           <SummaryCell :index="4">{{ deptStats.size }} 个部门</SummaryCell>

─── docs/demos/s-table/sort.vue:158-158 ───
[documentation · low] 说明文案与组件实际的客户端数据管道不符。

客户端模式下排序在完整数据集上执行，分页切片在其之后（row model 顺序为 filtered → sorted → paginated）。因此并非「在当前页数据范围内生效」，65
条数据翻页时会看到全局排序结果。建议修正为：排序作用于全量数据，分页在其之后切片（如需仅排序当前页应使用 `manualSorting`）。

-       50 条数据，排序在当前页数据范围内生效

*       50 条数据，排序作用于全量数据（客户端模式），分页在其之后切片

─── docs/demos/s-table/sort-filter-advanced.vue:90-92 ───
[maintainability · low] 重置逻辑存在冗余且混用两套状态写入口：`scope.reset()` 已通过 `onReset` 清除该列过滤，紧随其后的
`scope.confirm()` 再以空数组触发一次 `onSetFilter`，对受控列（本示例 `filteredValue`）而言是空操作。

更关键的是，模板内联处理同时直接给 setup 中的 `departments` ref 赋值并调用面板 scope 方法，使用者容易照抄出状态不同步的写法。建议抽出命名函数（如
`resetFilter(scope)`）统一维护，模板中只保留一次调用。

                  scope.reset();
                  departments = [];

-                 scope.confirm();

─── docs/demos/s-table/serial-number.vue:9-9 ───
[maintainability · medium] `columns` 的类型注解用 `typeof dataSource` 引用了下一行才声明的
`dataSource`。块级作用域变量在声明前被引用，TypeScript 会报 `Block-scoped variable 'dataSource' used before its
declaration`（TS2448，类型查询位置同样会被校验）。注意 docs 只参与 `docs:build`（esbuild 擦除类型）不做类型检查，CI
拦不住这类错误，最终会体现在编辑器/使用者侧。建议把 `dataSource` 提到 `columns` 之前声明。

- const dataSource = Array.from({ length: 25 }).map((\_, index) => ({
- id: index + 1,
- name: `Tom${index + 1}`,
- age: index + 18,
- address: `Hangzhou${index + 1}`,
- }));
- const columns: STableColumn<(typeof dataSource)[number]>[] = [
- { id: 'name', accessorKey: 'name', header: '名称' },
- { id: 'age', accessorKey: 'age', header: '年龄', width: 80 },
- { id: 'address', accessorKey: 'address', header: '地址' },
- ];

─── docs/demos/s-table/column-accessors.vue:25-25 ───
[bug · low] 取值函数（以及下方 `sorter` 中的同一表达式）未对 `record.total === 0` 做保护，`cell` 里的 `Math.round(getValue()

- 100)`会把`NaN`/`Infinity`直接渲染成 “NaN%”/“Infinity%”。当前示例数据`total`恒为 20 不会触发，但该示例会被用户直接复制到`total`
  可能为 0 的业务列（如进度/占比列）中。建议示例中补一个兜底，顺带展示常见写法。

* column.accessor((record) => record.completed / record.total, {

- column.accessor((record) => (record.total ? record.completed / record.total : 0), {

─── docs/demos/s-table/footer.vue:47-47 ───
[maintainability · low] `actionColumns` 只是 `columns` 的浅拷贝且内容完全相同，示例中并未包含任何“操作列”，命名会让人误以为它与 `columns`
不同；每个 demo 都新建一份列数组还会额外触发一次列归一化。建议删除该变量并直接使用 `:columns="columns"`，或真正补上操作列。

─── docs/demos/s-table/context-menu.vue:15-15 ───
[maintainability · low] `clickedRow` 只被写入、从未被读取（模板只渲染 `message`），属于死状态；示例代码会被使用者直接复制，建议删除该
ref，或把它真正用于展示（如高亮/回显点击行）。

─── docs/demos/s-table/async-expandable.vue:42-43 ───
[bug · low] 异步加载缺少 try/finally：`loadingIds.add(record.id)` 之后若 await 抛错，`loadingIds.delete`
不会执行，插槽将永久停留在「正在加载项目详情...」（示例被复制到真实请求场景时会暴露）。建议用 try/finally 保证标记清理。

    loadingIds.add(record.id);

- try {

* await new Promise((resolve) => setTimeout(resolve, 500));

-     await new Promise((resolve) => setTimeout(resolve, 500));
-     details[record.id] = detailSource[record.id]!;
- } finally {
-     loadingIds.delete(record.id);
- }

─── docs/.vitepress/demoMarkdownPlugin.ts:22-23 ───
[maintainability · low] 这里的 `fs.readFileSync` 没有任何错误兜底：任一 `<demo vue="..." />` 的路径写错、文件被移动或改名时，整站
`vitepress build` / dev 会直接以一个裸 ENOENT 中断，报错里只有解析后的绝对路径，既不包含出错的 markdown 页面，也不包含原始 `vue`
声明，定位成本较高（该插件会改写所有页面的 `<demo>` 标签，问题页面可能离报错点很远）。建议捕获后抛出附带页面路径与 demo 路径的错误，便于快速定位。

          const absoluteDemoPath = path.resolve(path.dirname(pagePath), demoPath);

-         const source = fs.readFileSync(absoluteDemoPath, 'utf8').trimEnd();

*         let source: string;
*         try {
*           source = fs.readFileSync(absoluteDemoPath, 'utf8').trimEnd();
*         } catch (error) {
*           throw new Error(
*             `[s-table-demo] 无法读取示例文件：page=${pagePath}, demo=${demoPath}, resolved=${absoluteDemoPath}`,
*             { cause: error }
*           );
*         }

─── docs/.vitepress/theme/DemoPreview.vue:73-73 ───
[other · low] 加载指示用的是无 role 的空 `<span>`，其隐式角色为 generic，而 generic 角色上不允许 `aria-label`（axe 的
aria-prohibited-attr 规则会报此问题），辅助技术实际读不到“示例加载中”，加上外层 `aria-busy` 只有状态语义而无公告能力，屏幕阅读器用户无法感知示例正在加载。建议补上
`role="status"`（下方 `v-else` 处同一指示器一并处理），或改用视觉隐藏文本。

-       <span v-if="loading" class="s-demo-loading" aria-label="示例加载中" />

*       <span v-if="loading" role="status" class="s-demo-loading" aria-label="示例加载中" />

─── e2e/app/src/App.vue:9-11 ───
[maintainability · low] 这里用 `computed` 包裹的表达式不含任何响应式依赖（`window.location.search`
不是响应式源），因此只会在首次求值时计算一次并永久缓存，语义上等同于常量，容易让后续维护者误以为 URL 参数变化会自动驱动夹具切换（实际只有整页刷新才生效）。建议改为普通常量并移除不再使用的
`computed` 导入；若确实希望支持前端路由式切换，应显式监听 `popstate`/`hashchange`。

- const fixture = computed(
- () => new URLSearchParams(window.location.search).get('fixture') ?? 'core'
- );

* const fixture = new URLSearchParams(window.location.search).get('fixture') ?? 'core';

─── e2e/support/test.ts:22-22 ───
[maintainability · low] 断言失败时只有一条笼统消息，缺少当前页面 URL 与夹具名，跨 fixture 运行时难以定位异常的来源，建议把 `page.url()`
一并写入消息。另外该 fixture 为 `auto`，会对所有用例（含将来需要故意触发 console.error 的错误分支用例）生效，请在注释中说明这类用例需自行清理
`runtimeErrors`，避免出现与业务无关的失败。

-       expect(runtimeErrors, '页面运行期间不应产生未处理异常或 console.error').toEqual([]);

*       expect(runtimeErrors, `页面 ${page.url()} 运行期间不应产生未处理异常或 console.error`).toEqual(
*         []
*       );

─── docs/demos/s-table/theme-isolation.vue:11-14 ───
[maintainability · low] `WorkspaceItem` 接口与 `dataSource` 中都定义了 `owner` 字段，但 `columns` 只声明了
`task`/`status` 两列，`owner` 数据永远不会被渲染。示例中存在“有数据无列”的不一致会让人误以为遗漏了列定义；建议补上负责人列（或从接口与数据中移除该字段）。

const columns: STableColumn<WorkspaceItem>[] = [
{ id: 'task', accessorKey: 'task', header: '事项' },

- { id: 'owner', accessorKey: 'owner', header: '负责人', width: 88 },
  { id: 'status', accessorKey: 'status', header: '状态', width: 88 },
  ];

─── docs/demos/s-table/import.vue:37-49 ───
[bug · low] 剪贴板导入缺少异常捕获，存在未处理的 Promise rejection。
`createSTableImportController` 的 `importClipboard` 在解析失败时会先 `onError`（触发 `import-error`）再**重新
throw**（见 `packages/vue/src/hooks/useSTableImport.ts` 的 `withError`）。因此当 textarea 内容非法（例如引号未闭合，测试用例
`import.test.ts` 即覆盖此场景）时：`@import-error` 会设置 message，同时这里的 Promise 会 reject；由于 `@click` 不会
await，控制台会出现 unhandled rejection。
下方的 `runFileImport` 已经用 try/catch 处理了同类错误，此处应保持一致。

const runClipboardImport = async () => {

- try {

* const result = await tableRef.value?.importClipboard({

-     const result = await tableRef.value?.importClipboard({

*     text: clipboardText.value,

-       text: clipboardText.value,

*     mode: mode.value,

-       mode: mode.value,

*     upsertKey: 'id',

-       upsertKey: 'id',

*     columns: [...mappings],

-       columns: [...mappings],

*     validateRow: (record) =>

-       validateRow: (record) =>

*       Number.isFinite(record.score) && record.score >= 0 && record.score <= 100

-         Number.isFinite(record.score) && record.score >= 0 && record.score <= 100

*         ? true

-           ? true

*         : '分数必须在 0 到 100 之间',

-           : '分数必须在 0 到 100 之间',

* });

-     });

* if (result) message.value = `导入 ${result.importedCount} 行，跳过 ${result.skippedCount} 行`;

-     if (result) message.value = `导入 ${result.importedCount} 行，跳过 ${result.skippedCount} 行`;
- } catch (error) {
-     message.value = error instanceof Error ? error.message : String(error);
- }
  };

─── e2e/package-consumer/index.html:1-2 ───
[maintainability · low] 该入口 HTML 只有片段内容，缺少 DOCTYPE 与 `<html>/<head>/<body>` 结构，与同仓库
`e2e/app/index.html` 的写法不一致。缺少 DOCTYPE 会让浏览器进入 quirks 模式，缺少 `<meta charset>` 在页面含非 ASCII
内容时可能乱码（虽当前仅供 `vite build` 冒烟使用，影响有限）。建议补齐文档结构，保持仓库内 Vite 入口写法统一。

- +<div id="app"></div>
- +<script type="module" src="/src/main.ts"></script>

* +<!doctype html>
* +<html lang="en">
* - <head>
* - <meta charset="UTF-8" />
* - <meta name="viewport" content="width=device-width, initial-scale=1.0" />
* - <title>STable Package Consumer</title>
* - </head>
* - <body>
* - <div id="app"></div>
* - <script type="module" src="/src/main.ts"></script>
* - </body>
* +</html>

─── packages/core/vite.config.ts:25-25 ───
[maintainability · low] `collectDeclarationFiles` 与 `fixDeclarationImports` 各自实现了一份 `readdir`
递归遍历（后者虽复用了前者收集的文件集合，但仍自行再遍历一次目录树），过滤条件 `.d.ts` / `.d.ts.map` 需在两处同步维护，后续新增过滤规则（如排除 `__tests__`
产物）容易漏改导致不一致。建议抽出一个通用的「遍历目录并产出 (相对目录, 绝对路径)」辅助函数，两处共用；`packages/vue/vite.config.ts` 存在同样结构，可一并统一。

─── packages/core/vite.config.ts:42-42 ───
[performance · low] 此处对每个 `.d.ts` 串行执行 `readFile` → 改写 → `writeFile`，各文件之间是相互独立的 IO，却按顺序等待；当 dist
下声明文件数量增加时构建耗时会线性叠加。建议先并行读取全部文件（`Promise.all`），改写后再并行写回，同时保留单个文件写失败时的错误上下文。

─── packages/core/package.json:11-11 ───
[maintainability · low] 本包声明 `license: ISC` 且通过 `publishConfig` 发布到公共 registry，但 `packages/core`
目录下没有 LICENSE 文件（同仓库的 `packages/vue` 已包含）。npm 只会自动打包「包根目录」下的
LICENSE，不会向上查找仓库根目录，因此发布产物将不包含许可证文本。建议把仓库根 LICENSE 复制到 `packages/core/LICENSE`，保持两个包一致。

─── e2e/app/src/styles.css:40-41 ───
[maintainability · low] `.context-action` 这个类在 e2e 应用里没有任何元素使用（`InteractionFixture.vue`
中右键菜单按钮用的是库自带的 `s-table-context-menu-item` 类，`context-action` 只作为 `data-testid`
出现）。这条选择器实际是死代码，建议删除，或把该类真正加到对应按钮上以免误导维护者。

- .fixture-controls button,
- .context-action {

* .fixture-controls button {

─── e2e/app/tsconfig.json:6-6 ───
[maintainability · low] `include` 只覆盖 `src/**`，没有包含同目录的 `vite.config.ts`；而根 tsconfig 的 `include` 仅含
`packages/**`、`docs/**`，`e2e/tsconfig.json` 也只包含 specs/support/playwright.config.ts。因此
`typecheck:e2e`（`vue-tsc -p e2e/app/tsconfig.json`）不会检查这个 vite 配置文件，其类型错误不会被发现。建议把 `vite.config.ts`
加入 include。

- "include": ["src/**/*.ts", "src/**/*.vue"]

* "include": ["src/**/*.ts", "src/**/*.vue", "vite.config.ts"]

─── docs/demos/s-table/footer.vue:39-39 ───
[bug · low] `v-model:selected-row-keys` 的回写事件类型是 `STableRowKey[]`（`string | number`），而这里把目标 ref
声明成了更窄的 `number[]`：模板编译后会生成 `selectedRows.value = $event`，`$event` 为 `STableRowKey[]`，在 vue-tsc /
编辑器里会报 “Type '(string | number)[]' is not assignable to type 'number[]'”。其他
demo（`row-selection.vue`、`virtual.vue`、`selection-actions.vue`）与
`docs/components/s-table/selection.md` 的受控写法都用 `ref<(string | number)[]>` /
`ref<STableRowKey[]>`。建议对齐，避免误导使用者用窄类型接住组件的选择键。

- const selectedRows = ref<number[]>([]);

* const selectedRows = ref<(string | number)[]>([]);

─── docs/demos/s-table/group-header.vue:119-119 ───
[documentation · low] 姓名列复用了部门列的合并条件（`record.department === '技术部'` → `rowSpan: 3` / `0`），会把第 1、2
行（王五、钱七）的姓名单元格隐藏，最终这三行都显示“张三”，与真实数据不符（此处的“按部门合并”注释也是从部门列传抄的）。`rowSpan` 合并应只用于取值相同的列（如
`department`），或对姓名按同值合并；否则示例会向使用者传达错误的合并范式。

─── docs/demos/s-table/scroll-to-bottom.vue:44-46 ───
[bug · medium] 与 async-expandable.vue 中同类问题：`loading.value = true` 之后没有
try/finally，一旦示例被替换为真实请求（fetch/axios 可能 reject），`loading` 将永远为 true，`loadMore` 开头的 `if
(loading.value || !hasMore.value) return;` 会永久拦截触底事件，指示器也一直停在「加载中...」。示例代码易被直接复制，建议用 try/finally
保证标记复位。第 2 个示例的 `loadMore2` 存在完全相同的写法。

    loading.value = true;

- try {

* // 模拟网络请求延迟

-     // 模拟网络请求延迟

* await new Promise((resolve) => setTimeout(resolve, 800));

-     await new Promise((resolve) => setTimeout(resolve, 800));
-     const newData = generateData(data.value.length, 30);
-     data.value = [...data.value, ...newData];
-     loadCount.value++;
- } finally {
-     loading.value = false;
- }
- // 模拟最多加载 5 次
- if (loadCount.value >= 5) {
-     hasMore.value = false;
- }

─── docs/demos/s-table/locale.vue:17-17 ───
[maintainability · low] 该国际化示例的 `dataSource` 为空数组，且没有传入 `pagination`。而 basic.md
的「国际化」一节声明“语言切换会同步更新空状态、过滤面板、分页等组件内文案”，此示例实际只能体现空状态（以及展开表头过滤面板后）的文案切换，分页文案完全无法验证；同时 status 列的
`filters`/`onFilter` 在没有数据行时也起不到过滤效果。建议补充少量示例数据并显式传入分页配置（如 `:pagination="{ defaultPageSize: 5
}"`），使示例覆盖文档所述的分页/过滤文案切换。

─── docs/demos/s-table/theme-mode.vue:162-165 ───
[maintainability · low] 该暗色分支规则与上方 `.theme-mode-switch button.active` 的声明完全相同（`background`/`color`
取值一致），属于冗余规则，暗色模式实际上未对激活按钮做任何差异化处理。若希望暗色下沿用品牌色，可直接删除该规则；若本意是区分暗色下的激活态配色，请改成不同的取值。

─── packages/core/vite.config.ts:27-28 ───
[maintainability · low] 这里的分支是死代码：调用方 `replace` 已经在 `specifier.endsWith('.js') ||
specifier.endsWith('.d.ts')` 时提前原样返回，因此 `resolveSpecifier` 永远不会收到以 `.js` 结尾的
specifier，`specifier.slice(0, -3)` 永不执行。建议把 `base` 直接写成 `const base = specifier.replace(/\.d\.ts$/,
'')` 或保留注释说明该防御是为将来调用方复用，避免后续读者误以为存在其他调用路径。

─── packages/core/vite.config.ts:41-41 ───
[maintainability · low] `entry.name.endsWith('.d.ts.map')` 恒为 false：`.d.ts.map` 名字不以 `.d.ts`
结尾，左侧判断已将其排除，该条件永远不会生效（`collectDeclarationFiles` 中同样的写法也是如此）。建议删除该冗余判断，或改为显式的
`!entry.name.endsWith('.map')`，以免后续维护者误以为此处还有其他过滤语义。

─── packages/core/vite.config.ts:47-48 ───
[documentation · low] 这段相对导入改写逻辑（为什么要把 `../types` 改写成 `../types/index.js`、为何只处理 `from` 与 `import()`
两种形态）没有任何说明，而 `packages/vue/vite.config.ts` 中对同一算法有完整的中文注释。建议在这里补一段注释说明「node16 ESM 声明解析要求显式扩展名且
specifier 必须命中真实 .d.ts」，否则后续维护者难以判断该逻辑能否简化。

─── e2e/package-consumer/src/App.vue:21-22 ───
[bug · medium] 该目录新增了 `.vue` 文件，但缺少与 `docs/`、`packages/vue/`、`e2e/app/` 同构的嵌套
`.oxlintrc.json`（那三处的写法是 `extends` 根配置 + `plugins: ["vue"]` + 对自己目录下的 `*.vue` 关闭
`no-unused-vars`）。本文件里 `STable`、`columns`、`dataSource`、`slots` 均只在模板中被引用，而根配置把 `no-unused-vars` 设为
`error`；若 oxlint 未将模板引用计入使用（这正是其它三个目录需要 override 的原因），CI 的 `pnpm check`（首步 `pnpm lint`，即 `oxlint
.`）会在本文件报未使用变量而失败。建议在 `e2e/package-consumer/` 下补充同构的 `.oxlintrc.json`，例如：

```json
{
  "$schema": "../../node_modules/oxlint/configuration_schema.json",
  "extends": ["../../.oxlintrc.json"],
  "plugins": ["vue"],
  "overrides": [
    { "files": ["e2e/package-consumer/**/*.vue"], "rules": { "no-unused-vars": "off" } }
  ]
}
```

（若已确认当前 oxlint 版本能识别模板引用，则可忽略此项。）

─── packages/core/src/state/selectionIntent.ts:6-9 ───
[maintainability · medium] `EMPTY_SELECTION_INTENT` 以模块级共享常量导出，其内部的 `includedRowKeys`
数组对外可写。目前内部调用点（`normalizeSelectionIntent` / `updateSelectionIntentRows` / `useSelectionIntent` /
`useSTableRowSelection`）都经由 `cloneSelectionIntent` 复制，但该常量会通过 `@zchengfeng/s-table-core` 以及 Vue 包公开
API 暴露，外部任何一次 `push/splice` 都会污染全局默认选择意图，导致后续所有以“空意图”为初值的选择状态串扰，且很难定位。建议冻结该常量，或改为每次新建的工厂函数。

- export const EMPTY_SELECTION_INTENT: STableSelectionIntent = {

* /\*_ 每次调用都返回新的空意图，避免共享可变数组被外部污染。 _/
* export const createEmptySelectionIntent = (): STableSelectionIntent => ({
  mode: 'include',
  includedRowKeys: [],

- };

* });

─── packages/core/src/scroll/scrollUtils.ts:180-183 ───
[bug · low] `isScrolledToBottom` 的默认参数为 `0`，与同文件导出的 `DEFAULT_SCROLL_TO_BOTTOM_OFFSET = 50`（以及
`normalizeScrollToBottomOffset` 的回退值）不一致。当前 Vue 侧调用点恰好总是显式传入归一化后的 offset，所以未暴露问题；但该函数已通过 core
入口对外导出，调用方省略 offset 时会退化为“必须精确滚动到底部”才判定触底，与文件内统一默认阈值 50 的语义冲突。建议默认值复用命名常量。

export function isScrolledToBottom(
element: HTMLElement | null | undefined,

- offset: number = 0

* offset: number = DEFAULT_SCROLL_TO_BOTTOM_OFFSET
  ): boolean {

─── packages/core/src/scroll/scrollUtils.ts:50-54 ───
[bug · low] 当容器该轴可视长度小于 `2 * edgeThreshold`（默认
80px）时，起始边感应区与结束边感应区重叠，而起始边分支先返回，导致结束边判定被完全短路：此时无论鼠标在该轴何处都返回负速度，只能向起点滚动（例如容器高度不足
80px，或横向滚动区域很窄时）。建议在重叠时按容器中点划分滚动方向。

- // 两侧感应区重叠（容器过短）时按中点划分方向，避免结束边被永久短路
- const overlap = start + edgeThreshold >= end - edgeThreshold;
- // 接近起始边（上 / 左）→ 反向滚动

* if (pos < start + edgeThreshold) {

- if (pos < start + edgeThreshold && (!overlap || pos <= (start + end) / 2)) {
  const ratio = (start + edgeThreshold - pos) / edgeThreshold;
  return -Math.ceil(Math.min(ratio, 1) \* maxSpeed);
  }

─── packages/core/src/state/selectionIntent.ts:35-38 ───
[maintainability · low] `${typeof key}:${String(key)}` 这一 key 身份标识在 `normalizeSelectionIntent` 与
`updateSelectionIntentRows` 中重复实现，core 的 `utils/resolveRowKey.ts` 里已有语义相同的 `encodeRowKey`（`n:` /
`s:` 前缀）。三处规则必须保持同步，一旦其中一处调整（例如需要支持 bigint 等新 key 类型），去重与比较语义就会漂移，出现“同一行被当成不同 key”的重复选中。建议抽出共享
helper 复用。

    const keys = intent.mode === 'all' ? intent.excludedRowKeys : intent.includedRowKeys;
    const seen = new Set<string>();
    const unique = keys.filter((key) => {

-     const identity = `${typeof key}:${String(key)}`;

*     const identity = encodeRowKey(key);

─── packages/core/src/exportTable.ts:62-62 ───
[bug · high] 过滤条件与取值逻辑不一致：`getColumnValue`（第 45 行）支持 `column.accessorKey ?? column.dataIndex`
回退，`getColumnTitle`（第 36 行）也读取 `column.dataIndex`，但这里只放过 `accessorKey`/`accessorFn`。Vue 层的
`STableDataIndexColumn`（`dataIndex` 且 `accessorKey?: never`）是公开列类型，`columns.value` 传的是用户原始列定义，因此仅声明
`dataIndex` 的列会被静默丢弃，导致导出结果缺失整列。建议同步放行 `dataIndex`。

-       if (typeof column.accessorKey !== 'string' && typeof column.accessorFn !== 'function') return;

*       if (
*         typeof column.accessorKey !== 'string' &&
*         typeof column.dataIndex !== 'string' &&
*         typeof column.accessorFn !== 'function'
*       )
*         return;

─── packages/core/src/exportTable.ts:220-220 ───
[maintainability · low] `getSTableDataCodec('xlsx').serialize!(...)`
的非空断言不安全：`STableDataCodec.serialize` 在类型上是可选的，且允许通过 `registerSTableDataCodec(codec, { overwrite:
true })` 注册仅实现 `parse` 的 xlsx codec。此时不会抛出 `export.ts` 中那种带说明的友好错误，而是底层 `TypeError: codec.serialize
is not a function`。建议先取出 codec 并显式校验 `serialize`，与控制器 `if (!codec.serialize) throw ...` 的风格保持一致。

- const serialized = await getSTableDataCodec('xlsx').serialize!(built.document, {

* const codec = getSTableDataCodec('xlsx');
* if (!codec.serialize) throw new Error('[STable] codec "xlsx" 未实现 serialize。');
* const serialized = await codec.serialize(built.document, {

─── packages/core/src/export.ts:39-41 ───
[bug · low] 以最后一个 `.` 判定“已存在扩展名”会把含点/版本号的文件名整体截断：`withExtension('report.2024-01-01', 'xlsx')` 会得到
`report.xlsx` 而非 `report.2024-01-01.xlsx`，可能覆盖用户预期的文件名。建议仅在末尾确实存在需要替换的扩展名时才做替换，否则直接追加。

    const separatorIndex = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'));
    const dotIndex = fileName.lastIndexOf('.');

- if (dotIndex > separatorIndex + 1) return `${fileName.slice(0, dotIndex)}.${extension}`;

* if (dotIndex > separatorIndex + 1) {
*     const existing = fileName.slice(dotIndex + 1);
*     if (/^[A-Za-z0-9]+$/.test(existing)) return `${fileName.slice(0, dotIndex)}.${extension}`;
* }

─── packages/core/src/columns/normalize.ts:219-221 ───
[maintainability · medium] 这里直接复用 TanStack 内置的 `filterFn_includesString`，它内部会对 filterValue 调用
`toLowerCase()`，即**要求 filterValue 必须是字符串**，而这个前提完全依赖适配层保证：Vue
适配层（useSTableSortFilter.ts）用一份**重复实现**的同名判定，只在「纯搜索」列才塞入字符串。两处判定一旦漂移——例如搜索列声明了 `filterMode:
'custom'`（HeaderCell 会因此渲染 Filter 面板并写入 `{values, valueSet}`），或外部直接通过 TanStack 的 `setColumnFilters`
写入数组/对象——内置函数就会收到非字符串并抛 TypeError（或搜索恒不命中）。建议把该判定从 core 导出给适配层复用，或在此处包一层兜底：filterValue
非字符串时回退到下面这个组合 filterFn。

─── packages/core/src/columns/normalize.ts:224-226 ───
[style · low] `filterFn`（此处）、`sortFn`、`aggregationFn`
三处都使用了链式（嵌套）三元表达式，可读性差且与「禁止嵌套三元」的规范冲突。建议拆成独立的解析函数或用 if/else 提前 return，例如：`const resolveSortFn = ()
=> { if (typeof userSorter === 'function') return ...; return userSorter === true ? 'auto' :
undefined; }`。

─── packages/core/src/columns/normalize.ts:236-236 ───
[bug · medium] 枚举匹配以 `values.length > 0` 作为门槛，但同一类型契约（`STableColumnFilterValue`）里 `valueSet`
是可独立存在的字段：当消费方只提供 `valueSet`（或 `values` 为空而 `valueSet` 非空）时，整段枚举匹配被跳过并 `return
true`，筛选静默失效、结果集偏大；同时带 `onFilter` 的分支也会因为遍历空 `values` 而永不命中。此外 `Object.is` 与
`Set.has`（SameValueZero）在 `-0/NaN` 上语义并不一致。建议统一二者：要么以 `const valueSet = filterValue.valueSet ?? new
Set(values)` 为唯一依据（用 `valueSet.size` 判断、遍历 Set 调用 `onFilter`、`rows` 侧统一 `valueSet.has`），要么从公开契约中删除
`valueSet` 只保留 `values`。

─── packages/core/src/columns/normalize.ts:161-161 ───
[maintainability · low] `column.accessorKey ?? column.dataIndex` 这条回退规则在
columnId.ts（`resolveSTableColumnId`）与本文件各写了一遍，属于同名语义的重复实现；后续规则变更（例如新增取值别名、调整优先级）很容易只改一处，导致「列
ID」与「实际取值列」不一致（列 ID 由 columnId.ts 决定，而真正传给 TanStack 的 accessorKey 由这里决定）。建议抽成公共 helper（如
`resolveSTableAccessorKey`）供两处复用。

─── packages/core/src/utils/resolveRowKey.ts:62-62 ───
[bug · medium] 当 `rowKey` 属性存在、但值为 `null`/`undefined`/布尔/对象（接口返回 `id: null`、可选 id 为 undefined
都很常见，且泛型未绑定时 `STableRowKeyField` 退化为任意字符串字段）时，这里会直接抛 `TypeError`。而 `getRowId` 是在 TanStack
行模型构建（渲染热路径）中调用的，异常会导致整张表渲染失败——这与本函数对“属性缺失 / NaN / Infinity / -0”采用「回退索引 + onInvalid
告警」的降级策略明显不一致。建议把 `null`/`undefined` 等不可用值也纳入回退分支。

另外，回退返回的 `index` 与真实数字 key 可能撞车（例如某行 `id` 恰好为 `3`，另一行缺少该字段而回退为 `3`），两者的公开 rowKey 相同，基于 rowKey
的选择/展开状态会互相串扰，建议在告警文案或文档中明确该限制。

-     throw new TypeError(`[STable] 数据行缺少有效的 rowKey 字段 "${rowKey}"。`);

*     // 缺失/不可用值统一回退索引，避免在行模型构建（渲染热路径）中抛异常导致整表崩溃。
*     options.onInvalid?.(
*       `[STable] 数据行缺少有效的 rowKey 字段 "${rowKey}"（第 ${index} 行），已回退到索引。`
*     );
*     return index;

─── packages/core/src/utils/resolveRowKey.ts:86-86 ───
[bug · medium] 去重后缀与业务 key 复用同一个 `\0` 标记，而解码时无条件取第一个 `\0` 截断：若业务字符串 key 本身含 `\0`（如
`"a\0b"`，`encodeRowKey` 产出 `s:a\0b`），`decodeRowKey` 会返回 `"a"`，公开 rowKey 被篡改，选择、展开、固定行、拖拽等以 rowKey
为键的状态会错位或互相覆盖；这也与上方注释「`s:` 后的内容无需额外转义：解码只移除首个类型前缀」的假设相矛盾。建议二选一：在 `encodeRowKey` 中对 `\0`
做转义并在解码时反转义；或在 `isValidRowKeyValue` 中拒绝含 `\0` 的字符串 key（走回退 + 告警），使该不变量可被强制保证。

─── packages/core/src/utils/objectPath.ts:56-60 ───
[security · low] 与 `setImmutablePath` 不同，这里没有调用 `parseSafePath`，直接按 `keys`
逐段写入：`__proto__`/`constructor` 等键会走原型链写入（对普通对象而言 `obj['__proto__'] = v` 改的是原型），空 `keys` 还会把值写到字面量
`"undefined"` 键上，两个写入 API 的安全语义不一致。当前唯一调用方 `setImportValue` 已先经 `parseSafePath` 过滤，但作为 core 导出
API，建议补上同等校验（或至少在 JSDoc 中明确「keys 必须来自 parseSafePath」这一前置契约），以免后续新调用方把用户可控字段名直接传入。

export const setMutablePath = (
target: MutableContainer,
keys: readonly string[],
value: unknown
): void => {

- if (keys.length === 0 || keys.some((key) => !key || UNSAFE_PATH_SEGMENTS.has(key))) {
-     throw new Error(`字段路径 "${keys.join('.')}" 非法。`);
- }

─── packages/core/src/data-transfer/importRows.ts:62-64 ───
[bug · high] 位置映射只识别 `accessorKey`，而上面的 `inferMappings` 使用 `accessorKey ?? dataIndex`。vue 层把原始列定义（含
Ant Design 风格 `dataIndex`、可能没有 `accessorKey`）原样放进 `columnMap` 并交给 `getImportColumns`，因此当列定义为 `{
dataIndex: 'id' }` 这类别名列时，无表头导入会整体跳过该列：它不消耗 `source` 序号，导致其后的列 `source` 前移并读到前一列的值（如
`[{dataIndex:'id'}, {accessorKey:'name'}]` 导入 `1\tGrace` 会得到 `{name:'1'}`），造成数据错列/污染。建议与
`inferMappings` 保持一致。

-     if (column.accessorKey) {
-       result.push({ source: result.length, target: String(column.accessorKey) });

*     const accessorKey = column.accessorKey ?? column.dataIndex;
*     if (accessorKey) {
*       result.push({ source: result.length, target: String(accessorKey) });
      }

─── packages/core/src/data-transfer/codecs/hucre.ts:143-145 ───
[bug · medium] 该前置校验按「遇到未转义引号即切换开合状态」扫描整段文本，不区分引号是否位于被引号包裹的字段起始位置。因此只要数据中非引号字段里出现奇数个引号字符（如测量值
`5"`、文本 `He said "hi`），就会判定为「未闭合的引号」并直接抛错，使本可正常解析的文件/剪贴板内容导入失败（`assertClosedQuotes('5"', '"')`
会抛错）。建议删除该前置校验、交由具体解析器报错，或仅在字段起始位置识别引号（RFC 4180 语义）并避免对非引号字段内的引号计数。

─── packages/core/src/data-transfer/codecs/hucre.ts:369-369 ───
[style · low] 常量名拼写有误：`HUCRC_CODECS` 应为 `HUCRE_CODECS`（下方 `registerHucreDataCodecs`
中引用处需同步修改）。拼写错误会影响可读性，且后续按 `HUCRE` 检索时容易漏掉。

- const HUCRC_CODECS: Record<STableBuiltInDataFormat, STableDataCodec> = {

* const HUCRE_CODECS: Record<STableBuiltInDataFormat, STableDataCodec> = {

─── packages/core/src/data-transfer/codecs/hucre.ts:165-165 ───
[maintainability · low] 「对象行/数组行混用」这一校验（含相同文案）在 `sheetToMatrix`、`sheetToObjects` 中共出现 4
次，`validate.ts`、`importRows.ts` 也各自实现了一份。条件与提示分散在多处，后续调整语义时容易遗漏（例如新增「单元素行」或空行的处理）。建议抽取为一个共享守卫（如
`assertUniformRowShape(rows, label?)`）统一复用。

─── packages/core/src/types/data-transfer.ts:62-62 ───
[maintainability · low] `Extract<keyof TData, string> | string` 与 `string` 联合后约束完全失效，等同于
`string`，无法提供字段级类型提示（`upsertKey` 也存在同样写法）。若确需支持 `addresses.0.city` 这类嵌套路径，建议直接声明为 `string`
并补注释说明；若希望保留字段提示，可改为「字面键 + 嵌套路径模板」的联合类型。

─── packages/core/src/editing/index.ts:68-68 ───
[bug · medium] `isColumnEditable` 只把 `accessorKey` / `valueSetter` 当作写回入口，未兼容 core 中声明为
`accessorKey` 别名的 `dataIndex`（见 `columns/types.ts` 注释「Ant Design
风格取值别名」）：`columns/columnId.ts`、`columns/normalize.ts`、`data-transfer/importRows.ts`、`exportTable.ts`
都按 `accessorKey ?? dataIndex` 解析，且归一化只在生成的 ColumnDef 上做别名解析，列 Map 中保存的仍是原始用户列（只有 `dataIndex`）。因此 `{
dataIndex: 'name', editable: true }` 会被判定为不可编辑（`startCellEdit` 直接返回
false，整行编辑也会漏掉该列），`applyEditingValues` 中 `else if (column.accessorKey)` 同样会静默跳过该列的写回。建议把 `dataIndex`
一并纳入判定与写回（并同步为 `STableEditableColumnLike` / `STableEditWriteColumnLike` 补上 `dataIndex?: string`）。

- return Boolean(column.accessorKey || column.valueSetter);

* return Boolean(column.accessorKey || column.dataIndex || column.valueSetter);

─── packages/core/src/editing/index.ts:32-32 ───
[maintainability · low] 注释声明「克隆编辑状态，避免调用方修改内部草稿」，但 `values`
只做了一层浅拷贝：当草稿值是对象/数组（如自定义编辑器写入的标签数组、日期对象）时，克隆结果与内部草稿共享嵌套引用，调用方对嵌套值的原地修改仍会污染内部状态，且 `sameEditingState`
的 `Object.is` 浅比较也无法察觉这类原地变更。建议要么对嵌套值做一次拷贝（如按数组/对象展开），要么在注释中明确「仅保证顶层键隔离」。

─── packages/core/src/scroll/scrollUtils.ts:32-32 ───
[documentation · low] JSDoc 示例的返回值与实现不符（虽然只是注释，但它是对外导出的公共 API 示例，会误导调用方）。默认
`edgeThreshold=40`、`maxSpeed=18` 时，`computeScrollSpeed(105, 100, 500)` 的比率为 (100+40-105)/40 =
0.875，结果为 -16；同理 `computeScrollSpeed(495, 100, 500)` 应为 16。±18（满速）只在 `pos` 恰好落在容器边缘（100 /
500）时成立，同文件单测（scroll.test.ts）断言的也是 -16 / 16。建议修正示例数值。

- - computeScrollSpeed(105, 100, 500) // -18 (向上滚动)

* - computeScrollSpeed(105, 100, 500) // -16 (向上滚动)

─── packages/vue/benchmarks/run.mjs:130-131 ───
[bug · medium] `JSON.parse(child.stdout)` 没有异常保护：exit code 为 0 但 stdout 非法（例如 stdout
混入其它输出、进程结束时缓冲区未刷新完整）时，这里会抛出未捕获异常，整个基准套件直接中断，已完成的场景结果也不会落盘，同时也无法区分“子进程失败”和“解析失败”。建议包一层
try/catch，把解析失败降级成一条 status: 'failed' 的结果继续跑完其余场景。

-     try {

*     results.push(JSON.parse(child.stdout));

-       results.push(JSON.parse(child.stdout));
-     } catch (error) {
-       results.push({
-         scenario,
-         status: 'failed',
-         error: `Worker produced non-JSON stdout: ${error.message}`,
-       });
-     }
      continue;

─── packages/vue/benchmarks/run.mjs:113-113 ───
[maintainability · medium] quick 模式用 `scenarios.slice(0, 3)`
按数组位置裁剪，隐式依赖“重场景排在后面”这一顺序约定：一旦新增/重排场景（例如把 `1m-x-100` 或 `1m-x-500-sparse` 提前），CI 就会跑 1M 行、`heapMb:
6144` 且 timeout 12 分钟的场景，共享 runner 上极易超时或 OOM 失败。建议改为按 id 白名单过滤，让 quick 的覆盖范围显式可读。

- const activeScenarios = quick ? scenarios.slice(0, 3) : scenarios;

* const quickScenarioIds = new Set(['1k-x-20', '10k-x-50', '100k-x-100']);
* const activeScenarios = quick
* ? scenarios.filter((scenario) => quickScenarioIds.has(scenario.id))
* : scenarios;

─── packages/vue/benchmarks/table-core-worker.mjs:179-180 ───
[maintainability · low] 排序列/过滤列/列宽列使用魔法字符串 `'c1'`、`'c2'`，与 `createColumns` 生成的 id 强耦合：若列数、列顺序或
`createColumns` 的 id 规则调整，`setSorting`/`setColumnFilters`/`setColumnSizing`
会静默变成空操作，指标只会“变快”，形成假阴性回归。建议在构造 columns 后按位置取出列 id 并断言其存在，避免静默失效。

-     table.setSorting([{ id: 'c1', desc: index % 2 === 1 }]);

*     table.setSorting([{ id: sortColumnId, desc: index % 2 === 1 }]);
      return table.getRowModel().rows.length;

─── packages/vue/benchmarks/table-core-worker.mjs:85-85 ───
[maintainability · low] `maxDepth` 只作为断言使用，树的真实形状完全由 `branchFactor = 4` 与行数决定（10 万行时最大分支深度为
9）：当前配置下这条 `throw` 恒不成立（形同死代码），场景 id `tree-100k-depth-10` 也不一定能反映实际结构，容易让 expandAll / flatRows
的结论被误读为“深度 10 的树”的性能。建议按 `maxDepth` 推导 branchFactor，或在输出中记录实测最大深度（如 counts.maxObservedDepth）以便核对。

─── packages/vue/vite.config.ts:109-109 ───
[maintainability · low] dts 的 `exclude` 里 `src/type-tests/**` 与仓库实际布局不符：类型测试位于包根
`packages/vue/type-tests/`（见 `tsconfig.build.json` 的 `include: [..., 'type-tests/**/*',
...]`），`src/type-tests` 目录并不存在，因此该排除项是失效/误导性的配置。另外 `include` 中的 `env.d.ts` 位于
`entryRoot`（`src`）之外，作为 `.d.ts` 输入不会被 emit，同样属冗余项（保留无害，但容易让后续维护者误判生效范围）。建议把排除路径改为包根相对路径以与
`tsconfig.build.json` 对齐。

-       exclude: ['src/__tests__/**', 'src/type-tests/**', 'node_modules', 'dist'],

*       exclude: ['type-tests/**', 'src/__tests__/**', 'node_modules', 'dist'],

─── packages/vue/env.d.ts:3-3 ───
[maintainability · low] 首行已通过 `/// <reference types="vite/client" />` 引入了 Vite 内置的资源模块声明（其中包含
`*.less`），此处再以 shorthand 形式（无类型体，等价 `any`）声明 `*.less` 属于重复声明：若 vite/client 已提供带类型的声明，这行反而会让 `.less`
导入失去类型约束。建议删除该行、只保留 reference；若确有存在理由（例如 vite/client 未覆盖该扩展名），请补一行注释说明原因。

─── packages/vue/type-tests/public-api.vue:33-34 ───
[maintainability · low] `payload.text.length < 0 && payload.range.startRow < 0` 恒为
`false`，既不构成有效断言（length/startRow
正常取值不可能为负），也不产生任何副作用，读起来像是存在边界校验，属误导性死代码。类型契约测试若只是想「消费」入参，建议写成显式类型断言，例如：

- const handleCellRangeCopy = (payload: STableCellRangeCopyEvent) =>
- payload.text.length < 0 && payload.range.startRow < 0;

* const handleCellRangeCopy = (payload: STableCellRangeCopyEvent) => {
* const textLength: number = payload.text.length;
* const startRow: number = payload.range.startRow;
* return textLength >= 0 && startRow >= 0;
* };

─── packages/vue/package.json:82-82 ───
[bug · low] `vite.config.ts` 中使用了 `import.meta.dirname`（Node 20.11+ 才支持），而这里 engines 仅声明 `>=20`：在
Node 20.0~20.10 上 `import.meta.dirname` 为 `undefined`，`resolve(packageRoot, ...)` 会直接抛错，构建/`prepack`
失败。建议将 engines 收窄为 `>=20.11`，或把 `vite.config.ts` 改为 `fileURLToPath(import.meta.url)`。

-     "node": ">=20"

*     "node": ">=20.11"

─── packages/core/src/editing/index.ts:118-123 ───
[bug · medium] 写回路径只认 `accessorKey`，与 core
其他消费方（`columns/columnId.ts`、`columns/normalize.ts`、`data-transfer/importRows.ts`、`exportTable.ts` 均为
`accessorKey ?? dataIndex`）不一致：使用 Ant Design 风格 `dataIndex` 的列即使被判定为可编辑，这里的 `continue`
会让草稿值被静默丢弃（`valueSetter` 与 `accessorKey` 都没有，值既不写入也不报错）。建议写回侧同样兼容别名，并同步在 `STableEditWriteColumnLike`
中声明 `dataIndex`。

-     } else if (column.accessorKey) {

*     } else if (column.accessorKey ?? column.dataIndex) {
        nextRecord = setImmutablePath(
          nextRecord as object,

-         String(column.accessorKey),

*         String(column.accessorKey ?? column.dataIndex),
          value
        ) as TData;

─── packages/core/src/editing/index.ts:95-95 ───
[bug · medium] `setTreeChildren` 的回退策略与 `getTreeChildren` 不对称：若使用方只提供 `tree.getChildren`（未提供
`setChildren`，也未配置同名 `childrenColumnName`），读取走 `getChildren`，而这里会按默认 `children` 字段写回。结果是 `found:
true` 但实际上子节点未被替换，同时记录上多出一个 `children` 属性（数据被污染且提交“成功”却看不到变更）。建议在此处对「自定义 getChildren 但缺少
setChildren」做一次显式校验（开发态告警或抛错），避免静默失败。

─── packages/core/src/types/row.ts:29-29 ───
[maintainability · low] `Extract<keyof TData, string> | string` 会被联合类型吸收，等价于
`string`，泛型约束提示完全失效（悬停也只显示 `string`）。若想保留「自动补全 + 允许任意字符串」的效果，应使用 `string & {}` 这种不吸收字面量的写法。

- childrenColumnName?: Extract<keyof TData, string> | string;

* childrenColumnName?: Extract<keyof TData, string> | (string & {});

─── packages/core/src/exportCsv.ts:62-65 ───
[bug · medium] 公式注入防护被套在“已字符串化”的单元格上，导致数值类型被判成字符串而误加 `'` 前缀：`String(-5)` → `'-5`。结果是默认 CSV/TSV
分块导出（`exportData({format:'csv'})`、`buildCsvContent`）里负数变成文本；而走 codec 的同名导出（hucre
`serializeDelimited`）只在 `typeof value === 'string'` 时加前缀，数字仍是 `-5`。同一次 `exportData` 仅因是否传
`codecOptions`/`codec` 就产生不同结果，且负数列在 Excel 中无法参与数值计算。建议与 codec 保持一致：仅对原始值为字符串的单元格做前缀，或用原始值类型参与判断。

─── packages/core/src/exportTable.ts:73-75 ───
[bug · medium] `JSON.stringify` 对 `Date` 返回的是**带双引号的 JSON 字符串字面量**（`JSON.stringify(new Date())` →
`'"2024-01-02T03:04:05.000Z"'`），因此 CSV/TSV 单元格会被写成
`"""2024-01-02T03:04:05.000Z"""`，解析回来的内容里带有多余的字面引号；而 XLSX/ODS 路径的 `toXlsxCellValue` 会原样保留
`Date`，两条路径行为不一致。建议在对象分支前显式处理 `Date`。

- if (value instanceof Date)
-     return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  if (typeof value === 'object') {
  try {
  return JSON.stringify(value) ?? String(value);

─── packages/core/src/data-transfer/codecs/hucre.ts:238-241 ───
[bug · medium] 这三行在展开用户选项之后被无条件覆盖，导致 `codecOptions` 中同名配置被静默忽略：例如 `codecOptions: { write: { bom:
false } }`（不要 BOM）、`{ write: { delimiter: ';' } }`（分号分隔）、`{ write: { escapeFormulae: true } }`（复用
hucre 自带转义）都不会生效。而 `codecOptions` 的文档约定是「原样传给 codec」（docs/components/s-table/import.md 也这样描述），读取侧
`parseDelimited` 同样覆盖了 `delimiter`/`header`。建议让用户值优先，仅在其缺省时套用默认值。

-     ...getPhaseOptions(context, 'write'),
-     delimiter: context.delimiter ?? defaultDelimiter,
-     bom: true,
-     escapeFormulae: false,

* const phaseOptions = getPhaseOptions(context, 'write');
* const options = {
*     ...phaseOptions,
*     delimiter: context.delimiter ?? (phaseOptions.delimiter as string) ?? defaultDelimiter,
*     bom: phaseOptions.bom ?? true,
*     escapeFormulae: phaseOptions.escapeFormulae ?? false,
* } as Parameters<typeof writeCsv>[1];

─── packages/core/src/data-transfer/importRows.ts:108-114 ───
[maintainability · low] 这里嵌套了两层三元表达式（`objectInput ? ... : headerEnabled ? ... :
...`），可读性较差且难以扩展（例如后续再增加「对象行但有表头」的分支）。建议拆成显式分支或独立函数。

- const mappings =
-     options.columns ??
-     (objectInput
-       ? []
-       : headerEnabled

* const resolveMappings = (): STableImportColumn<TData>[] => {
*     if (options.columns) return options.columns;
*     if (objectInput) return [];
*     return headerEnabled

-         ? inferMappings(headerIndex, getImportColumns)

*       ? inferMappings(headerIndex, getImportColumns)

-         : inferPositionalMappings(getImportColumns));

*       : inferPositionalMappings(getImportColumns);
* };
* const mappings = resolveMappings();

─── packages/vue/src/locales/index.ts:34-34 ───
[bug · low] `mergeLocale` 各分支采用 `{ ...base.x, ...overrides.x }` 浅合并，但 `STableLocaleOverrides` 的分支类型是
`Partial<...>`，而工程未开启 `exactOptionalPropertyTypes`，因此调用方可以写出 `{ empty: { title: undefined } }`
这类合法代码。展开后会用 `undefined` 覆盖基准语言包中的有效文案，渲染出空白文本，而不是按注释所述“未覆盖即回退”，与设计意图不符。建议合并时过滤掉值为 `undefined`
的键（例如先 `Object.entries(...).filter(([, v]) => v !== undefined)` 再展开），或把各分支类型声明为不允许 `undefined`
的精确可选属性。

─── packages/core/src/utils/resolveRowKey.ts:44-44 ───
[bug · high] `rowKey` 为函数时，只要返回值是 `null`/`undefined` 等非 string/number（例如接口尚未返回 id、可选字段未取到，或函数提前
`return`）就会直接抛 `TypeError`。该函数实际在 TanStack 行模型构建的 `getRowId` 热路径中被调用（`useSTable.ts` 的
`getRowId`），异常会导致整张表渲染失败；这与本函数上方「属性缺失 / NaN / Infinity / -0 一律回退索引 + `onInvalid`
告警」的降级策略（也与已确认的字段分支问题同源）明显不一致。建议函数分支同样把 `null`/`undefined`（可含布尔、对象）纳入「回退索引 + `onInvalid`
告警」，仅在完全无法降级时才抛错。

─── packages/core/src/utils/objectPath.ts:42-42 ───
[performance · low] `getPath` 每次调用都会对字符串路径重新执行 `parseSafePath`（`split` + Set 校验 +
数组分配）。它的主要调用方恰好是导出热路径：`exportTable.getColumnValue` 会为字符串 `accessorKey` 生成 `(record) =>
getPath(record, accessorKey)` 的闭包，并在 `exportCsv` / `exportTable` 的行循环里以 `column.getValue(record, …)`
每行每列调用一次（见 exportCsv.ts:63、exportTable.ts:157），10 万行 × N
列会重复解析同一个路径数十万次。建议对字符串路径做一次解析结果缓存，或在热路径调用方预解析为 `keys` 数组后传入（该 API 已支持 `readonly
string[]`），避免在行循环内重复解析。

─── packages/vue/src/locales/en_US.ts:10-10 ───
[maintainability · low] `empty.description` 在 `STableLocale`（types.ts）、en_US / zh_CN
中均已定义，但全仓库没有任何消费方：`components/empty/index.vue` 只渲染了 `locale.empty.title`，而 `styles/empty.less` 里还保留了
`.s-table-empty-default-description`
样式，说明描述文案原本应被渲染。当前属于“声明但从未引用”的配置项，会误导二次开发者以为该文案会生效（并在翻译时做无用功）。建议在空状态组件中补上描述渲染，或删除该字段及对应的 less 规则。

─── packages/vue/benchmarks/table-core-worker.mjs:47-47 ───
[bug · medium] `forceGc` 用了可选调用，未带 `--expose-gc` 时 `globalThis.gc` 为 `undefined`，这里会静默跳过而不是报错：此时
`heapAfterDataMb`/`heapAfterCoreMb`/`dataHeapDeltaMb`/`coreHeapDeltaMb` 变成“含未回收垃圾”的快照，而
`memory.heapAfterCoreMb` 恰好是 run.mjs 里唯一带预算的内存指标，会产生随机通过/随机失败的假结果（测试/文档中若有人直接 `node
benchmarks/table-core-worker.mjs` 单独调用同样会中招）。建议启动时断言 GC 可用，缺失时直接失败退出。

- const forceGc = () => globalThis.gc?.();

* if (typeof globalThis.gc !== 'function') {
* throw new Error('table-core-worker requires --expose-gc so memory checkpoints are meaningful');
* }
* const forceGc = () => globalThis.gc();

─── packages/vue/benchmarks/check-dist-size.mjs:13-13 ───
[maintainability · low] 缺少失败路径兜底：当 `dist` 尚未构建（本地直接跑 `pnpm check:bundle-size`）或产物改名时，`readFileSync`
会抛出 `ENOENT: no such file or directory` 并以堆栈结束，既不会输出后面的 JSON 报告，也没有“先执行
build”这类可操作提示，容易被误读成预算超限或脚本自身坏掉。建议捕获后给出明确信息（或把该条目标记为 `missing` 并计入失败）。

- const content = readFileSync(resolve(packageRoot, file));

* let content;
* try {
*     content = readFileSync(resolve(packageRoot, file));
* } catch {
*     throw new Error(`Missing build artifact ${file}; run "pnpm --filter @zchengfeng/s-table-vue build" first.`);
* }

─── packages/vue/benchmarks/table-core-worker.mjs:273-277 ───
[maintainability · low] 这里只做“估算 + 上报”，并没有真正的拒绝逻辑：run.mjs 的 `methodology.denseGuard`（“Dense payload
memory is estimated separately and rejected before allocation”）与场景 `note`（“a dense 500-field payload
is rejected by preflight”）都声称 preflight 会拦截密集分配，但代码里没有任何阈值判断，`denseAllocationExecuted` 只是
`denseColumns === columns` 的推导值。一旦有人把 `1m-x-500-sparse` 的 `denseColumns` 调成 500（甚至只是调大，让估算值达到 GiB
级），子进程会在 `--max-old-space-size=6144` 下真的去构造上亿个值，直接
OOM/超时，而文档承诺的“保护”并不存在。建议补上真实守卫（例如估算值超过阈值且本场景会做密集分配时抛错退出），或修正上述文案以免误导。

─── packages/core/src/columns/normalize.ts:378-378 ───
[maintainability · low] 这里直接使用未收敛的 `column.size` 来累加 `explicitMinWidth` / `explicitWidthIds`，而
`normalizeColumn` 对用户列走的是经 `minSize/maxSize` 收敛后的 `resolvedSize`（第 178-181 行，且与本文件测试断言的 `80 + 150 +
100` 一致）。两条路径产出的同名字段在适配层是直接相加的（`useSTableColumns` 的 `explicitMinWidth` / `explicitWidthIds`
合并），因此注入列的 `size` 一旦落在 `[minSize, maxSize]` 之外（或注入列今后出现子列——本函数不递归），表格 min-width、`<col>` 固定宽度与 sticky
偏移就会和 TanStack `column.getSize()` 的真实布局不一致。建议抽一个共享 helper（按 min/max
收敛、必要时递归子列），让两条路径复用同一规则，避免规则只改一处。

─── packages/core/src/columns/normalize.ts:14-14 ───
[maintainability · low] 该接口是 core 的 filterFn 与适配层之间的“线协议”，但 Vue 包在 `types/config.ts`
又原样定义了一份同名类型，并为了消除与 core 星号重导出（`types/dataTransfer.ts` 的 `export type * from
'@zchengfeng/s-table-core'`）的冲突，在 `types/features.ts` 显式重导出本地那份。结果是同一个运行时对象被两处独立定义的类型各自断言（core
`normalize.ts` 的 filterFn 与 `useSTableSortFilter.ts` 的
cast），其中任一处漂移都会出现“公开类型与真实过滤值形状不符”且编译期无法发现（类似问题在 `usesBuiltInSearch` 判定上已经出现过）。建议只保留 core 这一份定义，Vue
层直接复用该类型，从而不再需要本地重定义与显式重导出。

─── packages/vue/vite.config.ts:88-88 ───
[bug · high] 外部化声明与源码中的实际导入不一致：`src/adapter/tableDisplayOrder.ts` 第 1 行导入的是子路径
`@tanstack/table-core/static-functions`，而这里用的是裸包名字符串。数组中的字符串项是按模块 id **精确匹配**（Rollup/Rolldown
语义，子路径不会自动外部化），因此该子路径模块（及其在包内的相对依赖）会被打进 `dist/index.js`，与上方注释 “Keep runtime dependencies external in
the published library” 的意图相悖：既可能重复内联 TanStack 核心代码、显著撑大产物（`dist/index.js` 有 64KB gzip
预算），也可能因模块级状态出现两份实例。`@zchengfeng/s-table-core`、`hucre` 已用正则处理子路径，建议这里保持同样写法；若
`@tanstack/vue-table`、`@tanstack/vue-virtual` 将来出现子路径导入，也应一并改为正则。

- '@tanstack/table-core',

* /^@tanstack\/table-core(\/|$)/,

─── packages/vue/src/constants.ts:43-43 ───
[maintainability · low] `PERFORMANCE_CONSTANTS`
中以下成员在仓库范围内没有任何读取点：`FLIP_ANIMATION_THRESHOLD`、`DEV_WARN_NON_VIRTUAL_ROWS`、`DEV_WARN_NON_VIRTUAL_CELL
S`、`DEV_WARN_DATA_SIZE_50K`、`DEV_WARN_DATA_SIZE_100K`、`DEV_WARN_LARGE_KEY_ARRAY`（仅
`useSTableVirtual` / `useExpandedRowMeasurement` 消费了
`BATCH_MEASURE_THRESHOLD`、`DEFAULT_OVERSCAN`、`MAX_OVERSCAN`、`MIN_ROW_HEIGHT`、`DEFAULT_ESTIMATE_SIZE`
）。这些常量带有「开发环境告警」「FLIP 降级」等描述，会误导维护者以为对应保护已生效，属声明即死代码。建议删除未接入的成员，或补齐对应告警/降级逻辑。

─── packages/vue/src/context/table.ts:53-53 ───
[maintainability · low] 该注入键用 `any` 抹掉了 `TData`（以便 `provide` 各具体 `TData` 的实现与 `injectXXX<TData>()`
的断言共存），但未按规范补充原因注释。建议加一行说明「此处刻意擦除泛型，消费端由 injectTablePresentationContext<TData>()
还原」，避免后续被误当作漏标类型而改动。

─── packages/vue/src/context/table.ts:27-27 ───
[maintainability · low] 同一文件内两个拖拽上下文的类型不一致：`TableHeaderContext.dragColumnFromIndex` 声明为 `number |
undefined`，而 `TableBodyContext.dragRowFromIndex` 为 `number`。而两者底层都来自 `useDrag` 的
`shallowRef(-1)`（`packages/vue/src/hooks/useDrag.ts`），真实类型均为 `number`，未拖拽时哨兵值是 `-1` 而非
`undefined`。建议统一为 `number`（使用方 `header/index.vue`、`HeaderCell.vue` 已用 `?? -1` 兼容，但类型放宽会掩盖 `-1` 语义）。

- dragColumnFromIndex: Readonly<Ref<number | undefined>>;

* dragColumnFromIndex: Readonly<Ref<number>>;

─── packages/vue/src/features/row-pinning/index.ts:120-122 ───
[maintainability · low] 该 `pinningActive` 计算后被 return，但没有任何消费方使用：`useSTableDataState` 仅解构
`rowPinningState / onRowPinningChange / pinRow / getPinnedRowKeys`，而 `hooks/useSTable.ts` 已经从同一个
`rowPinningState` 计算出完全相同的谓词（用于 top/center/bottom 行来源切换）。这属于重复逻辑 + 死代码，建议删除该字段，避免后续两处判定逻辑漂移（例如将来
`keepPinnedRows` 语义变化时只改一处）。

─── packages/vue/src/features/grouping/index.ts:79-81 ───
[maintainability · low] `normalizeGroupBy` 会在 `groupingState` 这个 `computed` 的求值过程中被调用，在其中执行
`console.warn` 属于「在响应式 getter 内做副作用」：当 `columnMap`（列配置）或受控 `groupBy` prop 变化导致 computed 重新求值，且非法列 id
一直存在（受控模式下 prop 不会被内部状态修正）时，同一条告警会被反复打印，控制台噪声较大。建议像 `warnedTreeConflict` 那样对非法 id 做一次性去重，或把告警移动到
`setGroupBy` / `onGroupingChange` 等显式入口，保持 computed 纯函数语义。

─── packages/vue/src/features/grouping/index.ts:125-127 ───
[bug · low] 这里想表达的是「分组维度变化后重置为全部展开」，但 `normalizeGroupBy` 每次调用都会返回新数组（空数组字面量或新构造的 `valid`），因此只要
`groupingState` 因 `columnMap` 身份变化（例如运行时改列、列级 `filteredValue` / 列配置更新触发 `columnIndex`
重算）而重新求值，就会把用户手动折叠的分组重新全部展开，即使分组列根本没变。建议按内容比较后再重置，例如 `watch(groupingState, (next, prev) => { if
(!sameValues(next, prev)) groupExpandedState.value = true; })`。

─── packages/vue/src/features/row-pinning/index.ts:1-1 ───
[style · low] 文件首行带有不可见 BOM（U+FEFF），与本包其他新增源文件不一致，会造成 diff/tooling 噪声（部分 lint、formatter
与按行比对的脚本会把它算作首个字符）。建议去掉 BOM，保持文件统一以 UTF-8 无 BOM 保存。

─── packages/vue/src/components/icon/DragHandleIcon.vue:8-8 ───
[style · low] 此处使用了静态内联样式 `style="display: block"`，属于固定样式而非动态样式，与项目“避免内联样式（动态样式除外）”的约定不符，也与其他 7
个图标仅靠 class 控制表现的方式不一致。建议改用 CSS 类（例如在 `.s-table-icon` 上统一声明 `display: block; vertical-align:
middle;`），既可消除内联样式，又能让全部图标行为统一。

─── packages/vue/src/components/icon/DragHandleIcon.vue:29-31 ───
[maintainability · low] `size` 默认值为数字 `14`，与其余 7 个图标（默认 `'1em'`，随字体大小缩放）不一致；注释也未标注默认值。这会导致不传 `size`
时拖拽句柄固定为 14px，而其他图标随上下文缩放，调用方预期不一致。建议统一为 `'1em'`（如需固定尺寸由使用方显式传入），并补全注释中的默认值说明。

─── packages/vue/src/components/icon/SearchIcon.vue:21-27 ───
[maintainability · medium] 8 个图标组件的脚本与根节点属性几乎完全重复：均重复声明 `size?: number | string` / `className?:
string`，并重复书写 `:class="['s-table-icon', className]"`、`fill`、`aria-hidden`、`focusable` 等。任一处需统一调整（如新增
`role`/`aria-label`、改 `display` 策略）都要改 8 个文件，容易漏改导致图标行为分叉。建议抽取共享的 props 类型（如 `icon/types.ts` 中的
`STableIconProps`）供各图标 `defineProps` 复用；根 svg 的公共属性如需强一致，也可考虑用一个极薄的 `<Icon>` 包装组件统一承载。

─── packages/vue/src/components/icon/ArrowDownIcon.vue:12-12 ───
[maintainability · low] 新增的图标组件与包内已有的内联 SVG 存在逐字节重复：本图标（DownOutlined）的 path 与
`packages/vue/src/ui/select/Select.vue`（`.s-select-arrow`）完全一致；同理 `ExpandIcon` 的 path 与
`packages/vue/src/ui/pagination/Pagination.vue` 的下一页箭头完全一致。本次改动同时引入了图标组件与这些内联
SVG，同一个字形出现多处定义，后续调整字形/颜色/尺寸时需要改多份，容易漏改导致视觉分叉。建议将这些重复字形统一收敛到 `components/icon`（或抽到更底层的共享图标模块）并让 ui
组件复用。

─── packages/vue/src/adapter/tableDisplayOrder.ts:73-74 ───
[maintainability · medium] 这里直接覆盖了第三方实例的公开方法 `table.getRowsInDisplayOrder`，但没有幂等标记，也没有还原/卸载逻辑。目前
`useSTable` 每个 table 实例只安装一次，但一旦同一个 table 被二次安装（hook 被复用、表实例在组件间共享等），第二次会以“已包装过的方法”作为
`getDefaultRowsInDisplayOrder` 基准，形成包装链，并让旧闭包里的 `rows`/`enabled` 引用永久驻留。建议加安装标记（WeakSet 或实例上的 Symbol
标记）后再覆盖，或返回 restore 函数由调用方在卸载时还原。

─── packages/vue/src/adapter/tableDisplayOrder.ts:76-80 ───
[bug · medium] 该分支调用 `getRowsInDisplayOrder(table)` 后丢弃返回值，注释声称用于“还原默认显示索引”。若
`table_getRowsInDisplayOrder` 是纯函数（本文件上方注释也正是按“只依赖 prePaginatedRowModel + paginateExpandedRows
的纯输入”来建模的），这次调用与 `restoreDefaultIndexes` 状态机都不产生任何效果；若它确实会写回 `row.index`，则 STable 对外承诺的
`row.index`（`utils/column.ts` 中标注为“原始数据索引”）会被上游改写，同样需要在适配层显式说明或恢复。建议确认上游是否有副作用：无副作用则删除该调用及
`restoreDefaultIndexes`，有副作用则补注释写明契约。

─── packages/vue/src/adapter/tableDisplayOrder.ts:85-86 ───
[performance · low] 该缓存命中条件仅在 `table_getRowsInDisplayOrder` 原样返回传入的 `rows` 引用时成立（即 `indexedRows` 与
`rows.value` 是同一数组）。若上游在该分支返回新数组（内部重新展开/去重等），缓存将永不命中：每次调用都重新计算并返回新引用，破坏下游（如 TanStack cellSelection
依赖该方法求显示索引）拿到的引用稳定性。建议补一条针对 `table.getRowsInDisplayOrder()` 返回引用稳定性的用例固定这个假设；若不成立则改为返回 `rows.value`
或对结果做浅比较后再缓存。

─── packages/vue/src/adapter/tableExport.ts:21-22 ───
[bug · low] 用 `hasSTableDataCodec('xlsx')` 代表“hucre 已注册”并不严谨：`registerSTableDataCodec` 是公开
API，用户若只注册了自定义 `xlsx` codec，这里会直接 return，随后导出 `csv`/`json` 等格式时 `getSTableDataCodec` 找不到对应 codec
会抛错。建议改为按本次导出的目标格式判断（`options.format ?? 'csv'`），或用模块级“已注册 hucre”标记 / 缓存的 in-flight Promise
做一次性初始化（`registerHucreDataCodecs` 本身幂等，重复调用安全）。

─── packages/vue/src/adapter/tableExport.ts:27-27 ───
[documentation · low] 注释结尾出现编码损坏字符（U+FFFD + 多余的 `?`）：`由 core 完成�?`，会影响可读性并干扰格式化/工具链对注释文本的处理（`*/`
虽仍能终止注释，但内容已损坏）。建议修正为正常中文句号。

- /\*_ TanStack 适配器：只提供当前行模型和列定义，导出编排与序列化由 core 完成�?_/

* /\*_ TanStack 适配器：只提供当前行模型和列定义，导出编排与序列化由 core 完成。 _/

─── packages/vue/src/adapter/useTableBridge.ts:18-19 ───
[maintainability · low] `EMPTY_CELL_SELECTION` / `EMPTY_COLUMN_SIZING` 是模块级共享可变对象，作为 computed
的兜底值被所有 table 实例共用：只要有消费方原地修改（例如对 `cellSelectionState.value` 做 `push`/排序），就会跨表污染。另外
`CellSelectionState` 实际是数组类型（`useSTableCellRange` 以 `.length`、`.at(-1)` 消费），这里用 `as unknown as`
双重断言掩盖了真实结构，没必要。建议用 `Object.freeze` 生成兜底值，并把双重断言收敛为单次断言。

─── packages/vue/src/components/header/useMouseColumnDragBridge.ts:38-38 ───
[bug · medium] 拖拽桥接只校验“th 是否可拖拽”，未排除表头内的交互控件。可拖拽列的表头里同时存在 Filter/Search 触发按钮与 Sort 标题（它们只做了
`@click.stop`，未拦截 mousedown），鼠标在这些控件上按下后仅需位移 4px 就会进入拖拽态：轻则残留拖拽高亮，重则把落点判到别的列并在 mouseup 时提交列重排（同时原生
draggable 也可能吞掉 click）。Resizer 已用 `@mousedown.stop` 规避，建议这里对交互控件直接放弃启动拖拽（或在 Filter/Search/Sort 上补
`@mousedown.stop`）。

-     // 交互控件（按钮 / 输入 / 分隔条等）上的按下不应启动列拖拽，否则轻微位移会吞掉点击并误触发重排。
-     if (event.target.closest('button, input, textarea, select, a, [role="separator"]')) return;
      const source = event.target.closest<HTMLTableCellElement>('th[data-column-id]');

─── packages/vue/src/components/header/SelectionDropdown.vue:18-19 ───
[maintainability · low] 该浮层缺少键盘关闭与焦点回归：Filter.vue / Search.vue 都实现了
`@keydown.esc.stop.prevent="closeDropdown(true)"`（关闭并把焦点还给触发按钮），此处仅靠外部点击关闭，键盘用户无法用 Esc
退出且关闭后焦点停留在已卸载的菜单项上。建议补齐同样的 Esc 关闭 + 焦点回到 `.s-table-selection-dropdown-trigger` 的处理。

─── packages/vue/src/components/header/useColumnDragPreview.ts:63-64 ───
[bug · low] setCustomDragImage 在创建新预览前未清理上一次的预览节点与 rAF 句柄：上一帧的清理回调以 `dragPreviewEl === preview`
为条件，句柄被覆盖后旧 preview 永远不会被移除，`dragPreviewCleanupFrame` 也会被旧回调置空，形成残留 DOM 节点。建议进入函数时先调用
clearCustomDragImage() 做幂等清理。

-     // 清理上一次可能残留的预览节点/帧，保证重复调用时不会留下孤儿节点。
-     clearCustomDragImage();
      ownerDocument.body.appendChild(preview);
      dragPreviewEl = preview;

─── packages/vue/src/components/header/Filter.vue:200-200 ───
[maintainability · low] 渲染 key 由“父路径 + 当前层级索引 + 序列化后的 value”拼接，分隔符与被序列化内容共用同一字符空间：当 option.value
字符串本身含 `:` 或 `/`（如路径、日期）时，理论上可与另一节点的后代路径拼出相同 key，触发 v-for 重复 key 告警与节点复用错位。key 只需在本次遍历内唯一，改用与 value
无关的单调序号即可稳定去重。

-       const path = `${parentPath}${index}:${typeof option.value}:${String(option.value)}`;

*       const path = `${parentPath}${index}#${result.length}`;

─── packages/vue/src/components/context-menu/index.vue:98-105 ───
[bug · medium] 该处同时存在两个问题：
1）4 层嵌套三元表达式可读性差、后续新增按键分支极易改错；
2）ArrowUp 在 `currentIndex === -1` 时（焦点仍停留在菜单容器 floatingRef 上，例如点击菜单空白区域后）会计算为 `(-1 - 1 + n) % n = n

- 2`，焦点落到倒数第二项而不是最后一项。仓库内同类键盘导航（`packages/vue/src/ui/select/Select.vue`的`moveActiveOption`）对
`activeIndex < 0` 是显式按方向回退到首/末项的，这里与既有约定不一致，属边界 off-by-one。
  建议改为 if/else 并按方向处理 -1 的情况。

- const nextIndex =
-     event.key === 'Home'
-       ? 0
-       : event.key === 'End'
-         ? items.length - 1
-         : event.key === 'ArrowDown'
-           ? (currentIndex + 1) % items.length
-           : (currentIndex - 1 + items.length) % items.length;

* let nextIndex: number;
* if (event.key === 'Home') {
*     nextIndex = 0;
* } else if (event.key === 'End') {
*     nextIndex = items.length - 1;
* } else if (event.key === 'ArrowDown') {
*     nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
* } else {
*     // 焦点不在任何菜单项上时（currentIndex 为 -1），ArrowUp 应聚焦最后一项。
*     nextIndex =
*       currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
* }

─── packages/vue/src/components/pagination/index.vue:34-34 ───
[maintainability · medium] `props` 声明后在 script 中从未被引用（模板直接按 prop 名取值），属于未使用变量：根 `tsconfig.json` 开启了
`noUnusedLocals`（`typecheck:all` 会走 `vue-tsc`），且 `.oxlintrc.json` 将 `no-unused-vars` 设为
error，存在构建期报错风险；即便不报错也是无效代码。
建议参照同目录/同仓库其他仅仅透传模板的组件（如 `components/icon/*.vue`、`components/footer/index.vue`）不接返回值，即
`withDefaults(defineProps<{...}>(), {...});`。

─── packages/vue/src/components/footer/index.vue:10-18 ───
[style · low] `withDefaults(..., {})` 未提供任何默认值，属于冗余包装（`withDefaults` 的空对象不会产生任何行为），可直接用
`defineProps`，与仓库内其他无默认值组件（如 `components/header/SelectionDropdown.vue`）写法保持一致。

- withDefaults(
- defineProps<{

* defineProps<{

-     /** 语义化样式。 */

* /\*_ 语义化样式。 _/

-     styles?: CSSProperties;

* styles?: CSSProperties;

-     /** 语义化类名。 */

* /\*_ 语义化类名。 _/

-     classes?: string;

* classes?: string;

- }>(),
- {}
- );

* }>();

─── packages/vue/src/components/body/useBodyEventDelegation.ts:163-165 ───
[bug · medium] mousedown 委托未校验鼠标按键：右键/中键按下在框选模式下同样会命中单元格，从而执行 `event.preventDefault()`
并启动框选拖拽（`useSTableCellRange.handleCellMouseDown`），会阻断原生右键菜单与中键相关行为。仓库内同类入口（`components/header/useMou
seColumnDragBridge.ts`）已显式按主键过滤，建议此处保持一致，仅响应主键。

-     if (event.button !== 0) return;
      const cell = getEventCell(event);
      if (!cell) return;
      event.preventDefault();

─── packages/vue/src/components/body/useRowRenderItems.ts:66-66 ───
[documentation · low] 注释与实现相互矛盾：此处声明渲染项“跨帧原地复用（Hidden Class 稳定）”，但紧随其后的注释与代码均为“渲染项按求值创建新对象”，且
CHANGELOG 已记载该原地复用/隐式缓存设计被移除。建议统一为“每次求值重新创建、由 v-memo 纯值比较决定 DOM 复用”，避免误导后续维护者。

- - 渲染项对象跨帧原地复用（Hidden Class 稳定），行展示（rowClassName/rowStyle）

* - 渲染项在每次求值时重新创建（是否复用 DOM 由 v-memo 的纯值比较决定），行展示（rowClassName/rowStyle）

─── packages/vue/src/components/body/index.vue:64-68 ───
[bug · high] `<tr>` 的 `v-memo` 依赖数组未包含 `props.renderedColumns`（横向虚拟化的列窗口）与 `locale`，但该子树实际依赖它们：

- `getRenderedCells(item.row)` 直接消费 `props.renderedColumns`，决定可见单元格集合与列虚拟
  spacer（`useBodyRowRendering`）；
- 分组行展开按钮的 `aria-label` 读取 `locale.accessibility.expandTrigger`。

横向滚动只会改变 `renderedColumns`（`visibleColumnIds` 是全量可见列 ID、`useSTableTableModel` 中做引用保留，不会随之变化），而
`item.row/index/flags/rangeMemoKey/...` 对同一批行保持不变，于是 memo 判定相等并直接复用旧 vnode，表体停留在旧列窗口（对侧
`header/index.vue` 的 `renderRows` 是依赖 `props.renderedColumns` 的
computed，会同步更新，因此会出现表头已换列、表体未换列的错位）。同理运行时切换 `locale`（或 `$slots.groupRow`）时行内文案不会刷新。建议把列窗口（及
locale）纳入依赖。

            item.row,
            item.index,
            item.flags,

-           props.renderedColumns,
            tableCtx.fixedColumnStyles,
            visibleColumnIds,
-           locale,

─── packages/vue/src/components/body/BodyCell.vue:112-119 ───
[style · low] 此处（以及模板中 `:type="editorType === 'number' ? 'number' : editorType === 'checkbox' ?
'checkbox' : 'text'"`）使用了嵌套三元表达式，与项目规范「禁止嵌套三元表达式」冲突，且编辑器类型继续扩展时可读性会迅速下降。建议抽成一个映射/独立函数统一处理，例如：

```ts
const EDITOR_INPUT_TYPE = { text: 'text', number: 'number', checkbox: 'checkbox' } as const;
const resolveEditorInputType = (type) => EDITOR_INPUT_TYPE[type ?? 'text'];

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (props.editorType === 'checkbox') return setValue(target.checked);
  if (props.editorType === 'number') {
    return setValue(target.value === '' ? undefined : Number(target.value));
  }
  return setValue(target.value);
};
```

─── packages/vue/src/components/summary/SummaryCell.vue:42-42 ───
[maintainability · low] 单元格已经解析出了目标列（`columnId` / `index`），但对齐只取自身 `align`（默认 `'left'`），没有复用该列上的
`align`/`meta.align`。而表头与表体都是通过 `resolveColumnAlignStyle(column)` 从列配置推导对齐（见
`utils/column.ts:50`、`HeaderCell.vue:153`、`useBodyColumnFeatures.ts:61`），文档 `summary-export.md` 也承诺
Summary“保持…对齐行为一致”。结果是：列上声明了 `align: 'right'`（或内置选择/序号列）时，汇总格仍会左对齐，用户必须在每个 `SummaryCell` 上重复写
`align`，容易与表体不一致。

建议把 `TablePresentationContext` 里已有的 `getColumnById` 一并注入 `SummaryContext`（`context/summary.ts` 的
`SummaryContext` 增加该字段，`summary/index.vue` 的 `provide` 同步传入），然后在 `align` 未显式传入时回退为
`resolveColumnAlignStyle(column)`。

─── packages/vue/src/components/summary/SummaryCell.vue:40-40 ───
[test · low] 这里承担了两个非平凡分支：`columnId` 优先、`index` 越界/未传（`?? -1`）时的降级，以及命中固定列后 `fixedColumnStyles`
的查表。目前 `packages/vue/src/__tests__/` 下没有任何 Summary 相关单测，仅 `e2e/specs/core.spec.ts` 断言了默认（非固定列、无
`columnId`）的渲染文本，上述分支与固定列 sticky 样式（含右侧固定列）都未被覆盖。建议补一个组件单测，覆盖：`columnId` 优先于 `index`、`index`
越界/未传返回无样式、右侧固定列的 `className`/`bodyStyle` 映射、以及 `colSpan` 大于 1 时的表现。

─── packages/vue/src/features/data-transfer.ts:1-4 ───
[maintainability · low] 该公开入口（`@zchengfeng/s-table-vue/data-transfer`）只转发了 6 个值，但实现模块
`./data-transfer/codecs` 以及 core 的同名入口（`packages/core/src/data-transfer.ts`）都还导出了
`isSTableDataDocument` / `assertSTableDataDocument`，类型侧也少了 `RegisterSTableDataCodecOptions`。而主入口
`src/index.ts` 同样未导出这两个函数，因此只安装 `@zchengfeng/s-table-vue` 的消费方（pnpm 严格依赖下无法直接 import
`@zchengfeng/s-table-core`）拿不到数据文档的校验 / 断言能力，而 `useSTableImport` 内部却依赖它们做文档合法性兜底。建议补齐导出口径，与 core
入口保持一致。

export {

- assertSTableDataDocument,
  getSTableDataCodec,
  hasSTableDataCodec,
  isSTableBuiltInDataFormat,
- isSTableDataDocument,
- listSTableDataCodecs,
- registerSTableDataCodec,
- unregisterSTableDataCodec,
- } from './data-transfer/codecs';
- export type { RegisterSTableDataCodecOptions } from './data-transfer/codecs';

─── packages/vue/src/context/table.ts:7-7 ───
[maintainability · low] 此处本地声明的 `FilterValue` 与公开类型
`STableFilterValue`（packages/vue/src/types/config.ts，`useSTableSortFilter` 产出的 filter
状态正是该类型）完全重复，并且同样的本地声明还出现在
`components/header/Filter.vue`、`components/header/HeaderCell.vue`。三处各自维护同一联合类型，后续任一处扩展（例如支持日期/bigint
过滤值）都会造成类型漂移，且此文件作为 provide 的类型契约会先失配。建议直接复用公开类型：在已有的 `from '../types'` 导入中追加
`STableFilterValue`，并把它作为 `FilterValue` 的别名。

- type FilterValue = string | number | boolean;

* type FilterValue = STableFilterValue;

─── packages/vue/src/adapter/tableDisplayOrder.ts:70-70 ───
[maintainability · low] 合成输入把 `paginateExpandedRows` 写死为 `true`，而不是取自
`table.options.paginateExpandedRows`（同文件上方声明的 `DisplayOrderTable`
已把该字段建模为「最小输入」的一部分，说明这里本就期望传入真实配置）。

今天能对上，只是因为 STable 内部没有暴露该选项、沿用了上游默认值；但 STable 通过 `getTanStackTable()` 公开了底层实例（types.ts
中标注为「供高级能力直接复用官方 API」），一旦真实表将该选项置为 false，这里返回的显示顺序就会与 `table.getPrePaginatedRowModel()`
的语义分叉，而调用方（cellSelection 等依赖 `getRowsInDisplayOrder()` 求索引的逻辑）完全无感知。

建议改为读取真实值；若确实只支持 `paginateExpandedRows: true` 分支，请同时补齐该分支所需的行字段并显式断言该前提，避免把「隐式假设」伪装成可配置项。

─── packages/vue/src/components/empty/index.vue:24-24 ───
[bug · medium] 默认空状态只渲染了 `locale.empty.title`，而 locale 类型（`locales/types.ts`）强制的
`empty.description`（en_US: 'No data available to display' / zh_CN: '当前暂无可展示的数据内容'）以及
`styles/empty.less` 中已定义的 `.s-table-empty-default-description` 都没有任何使用方；`empty.less` 里
`-default-action` 的注释（“与描述拉开层级间距”）和 `emptyAction`
文档（“在默认空状态说明后追加操作”）都表明这里本该有一行描述文本。缺少该行导致默认空状态比自定义空状态（见
demos/s-table/empty.vue）少一层信息，同时让语言包字段与样式成为死代码。建议补齐描述行（并补一条对应断言，当前 Empty 的默认渲染没有任何测试覆盖）。

        <div class="s-table-empty-default-title">{{ locale.empty.title }}</div>

-       <div v-if="locale.empty.description" class="s-table-empty-default-description">
-         {{ locale.empty.description }}
-       </div>

─── packages/vue/src/components/context-menu/index.vue:117-117 ───
[bug · medium] 打开菜单时把焦点移入菜单（此处 focus 第一项或容器），但关闭路径只调用 `props.close()`，没有任何焦点还原：被聚焦的菜单项会随 `v-if`
卸载，焦点落到 `document.body`。仓库内同类键盘浮层都做了还原（`components/header/Filter.vue` 的
`closeDropdown(restoreFocus)` / `Search.vue` / `ui/select/Select.vue` 均在关闭时 `nextTick(() =>
triggerRef.value?.focus())`），而 STable 的键盘导航依赖焦点留在表格容器/单元格内，按 Esc 关闭右键菜单后键盘用户必须重新 Tab 回表格。建议在打开时记录
`getOwnerDocument(...)?.activeElement`，并在 `close`（至少 Escape 分支）后于 `nextTick` 中还原焦点。

─── packages/vue/src/components/body/index.vue:71-71 ───
[bug · medium] `<tr>` 的 v-memo 依赖数组同样遗漏了 `props.keyboardNavigation`，但该子树直接消费它：分组行/普通行的
`:tabindex="keyboardNavigation ? -1 : undefined"`，以及 BodyCell 的 `:focusable="keyboardNavigation"`。

由于 v-memo 命中时整棵子树不会重新求值，运行时切换 `keyboardNavigation`（`<STable :keyboard-navigation="...">` 是公开
prop，外层容器 `:tabindex` 会立即更新）会出现 DOM 与状态不一致：由 `false` 改为 `true` 后，已在屏的行仍缺少
`tabindex`，`handleBodyClick` 的 `td[tabindex]` 聚焦与方向键导航目标都会缺失，直到该行因其他原因重建；反向切换则会残留多余的
`tabindex="-1"`。

建议与 `props.treeIndentSize` 等标量 prop 一起加入 memo 数组（与 renderedColumns / locale 属于同类遗漏）。

            props.cellRenderToken,

-           props.keyboardNavigation,

─── packages/vue/src/hooks/useDrag.ts:40-46 ───
[bug · medium] `handleDrop` 为 async 且只用 `try/finally` 复位状态，并未捕获 `controller.drop()` 的异常。该函数最终会经
`useFlipDropAnimation` → `ctx.onRowDrop` 绑定为 DOM 事件处理器（`body/index.vue` 的
`@drop`），链路上的用户回调（`onMove`、`beforeDrop`）一旦 reject，就会从 DOM 事件处理器向上冒泡成未处理的 Promise
rejection，且没有任何用户可见反馈。

本仓库在同类 DOM 边界已有兜底先例（`BodyCell.vue` 的 `requestCommit` 用 `.catch` 并注明“DOM
事件不能等待异步校验”）。建议在此处捕获并上报（例如通过错误回调，或在 DEV 下 `console.error`），保持与其一致，避免静默的未处理拒绝。

─── packages/vue/src/hooks/useFlipAnimation.ts:42-42 ───
[bug · medium] 这里返回的 `handleDrop` 会被直接绑定为 DOM 拖拽处理器（`body/index.vue` 的 `@drop`、Header 的列拖拽事件），而
`createFlipDropController` 内部会 `await onDrop()` / `await afterCommit?.()`，没有错误兜底。`onDrop` 最终走到
`useDrag` 的 `drop()`（用户 `onMove`/`beforeDrop` 可能 reject），异常同样会变成未处理的 Promise rejection。建议与
`useDrag.handleDrop` 统一在 Vue 适配层捕获并上报，避免调用方未 await 时无提示失败。

─── packages/vue/src/hooks/index.ts:26-27 ───
[maintainability · low] hooks 目录下其余 Hook（包括仅在 hooks 内部使用的 `useRafValue`、`useModelState`、`useDrag`
等）都在此统一导出，唯独 `useExpandedRowMeasurement` 未出现在导出清单里（它目前只被 `useSTableVirtual` 以相对路径直接
import）。若非刻意将其作为纯内部实现，建议补上 `export * from './useExpandedRowMeasurement';`
以保持一致性与可发现性；若确为内部细节，建议加一行注释说明为何不导出，避免后续被误判为遗漏。

─── packages/vue/src/components/body/useEditingFocus.ts:46-46 ───
[bug · medium] `select()` 的类型守卫不完整：`HTMLInputElement.select()` 只对支持文本选择的输入类型有效，对
`type="number"|date|time|month|week|range|color|file` 等会直接抛
`InvalidStateError`（Chromium/WebKit/Firefox 均如此）。而本表格的编辑器确实会渲染 `input[type=number]`（见
BodyCell.vue），因此在这些列上进入编辑时，`focus()` 之后的 `select()` 会抛异常：异常被 Vue 的 errorHandler
捕获并打印错误，全选失效。建议加防御或收窄类型判断。

-     if (target instanceof HTMLInputElement && target.type !== 'checkbox') target.select();

*     if (target instanceof HTMLInputElement && target.type !== 'checkbox') {
*       // number/date 等类型不支持文本选择，直接调用 select() 会抛 InvalidStateError
*       try {
*         target.select();
*       } catch {
*         // 忽略不支持选择的输入类型
*       }
*     }

─── packages/vue/src/components/summary/SummaryCell.vue:38-38 ───
[maintainability · low] 同一 feature 内部出现了两种上下文消费方式：`Summary`（index.vue）用 `proxyRefs` 解包后在模板里写
`ctx.classes?.summary`，而这里保留原始 Ref 并在模板里写 `ctx?.summaryCellClasses?.value`。后者全项目没有先例（其它组件要么
`proxyRefs`，要么在 script 中消费 Ref），一旦后续把 `Summary` 的 `provide` 形态改成解包后的对象，类名/样式会静默失效而不报错。建议统一为一种方式。

另外，`SummaryCell` 只在 `STable` 的 `#summary` 插槽内有意义（`Summary` 未从包根导出，用户无法自行 provide 该上下文），因此可选注入 + 全程
`?.` 只会掩盖误用：把 `SummaryCell` 用在插槽外时固定列定位与语义类名/样式会静默丢失。项目已有必填注入约定（`context/table.ts:60` 的
`injectRequired`，缺少上下文时抛出带指引的错误），建议对齐该约定（或至少在 dev 下告警），顺带可去掉 `if (!ctx) return undefined` 这类空路径。

─── packages/vue/src/styles/table.less:648-650 ───
[bug · medium] 框选锚点单元格缺少样式规则：`useCellRangePresentation.ts` 会为锚点格输出
`s-table-cell-range-focused`，`token.less` 也定义了对应的 `--s-color-bg-cell-range-active`（文档 css.md
标注为「框选锚点背景」），但本样式清单中不存在任何 `.s-table-cell-range-focused` 规则，导致锚点格没有任何视觉标识、该令牌实际成为死变量。建议补齐（需用更高优先级覆盖
`.s-table-cell-range-selected` 的背景）。

-     .@{prefix}-cell-range-edge-right {
-       --s-cell-range-right: -2px;

*     .@{prefix}-row .@{prefix}-cell.@{prefix}-cell-range-selected.@{prefix}-cell-range-focused {
*       --s-table-cell-bg: var(--s-color-bg-cell-range-active);
*       background-color: var(--s-table-cell-bg);
      }

─── packages/vue/src/styles/token.less:57-57 ───
[maintainability · low] `--s-color-text-quaternary` 与上方 `--s-color-text-tertiary` 取值完全相同（明/暗色下均为
0.45），两级文本色实际没有层级区分；注释中「0.45 满足 WCAG AA 最低对比度要求」也不成立（rgba(0,0,0,0.45) 在白底对比度约 3.4:1，低于普通文本
4.5:1）。若确需占位/禁用这一层级，建议给出可区分的取值并修正注释。

─── packages/vue/src/styles/menu.less:50-51 ───
[maintainability · low] 危险色硬编码 `#ff4d4f`（含下方 12%/20% 混色），未纳入 `token.less`
的变量体系，暗色模式与自定义主题无法覆盖，与其它组件的令牌化风格也不一致。建议在 token.less 中补充错误色令牌（如 `--s-color-error`）后统一引用。

─── packages/vue/src/styles/table.less:732-732 ───
[maintainability · low] `--s-fixed-blur-shadow` 全项目仅在此处被赋值为透明，没有任何地方将其改为可见阴影（固定列滚动阴影实际由
`.s-table-fixed-column-shadow` 元素实现），因此这两处 `box-shadow: var(--s-fixed-inset-shadow),
var(--s-fixed-blur-shadow)` 的第二段恒为透明，上方「仅边界列开启模糊投影」的注释也与实现不符。建议删除该死变量/分支，或补齐边界列的赋值逻辑。

─── packages/vue/src/styles/loading.less:6-6 ───
[maintainability · low] 层级使用魔法数字 `1000`，而 `token.less` 已收敛了 `--s-z-index-*` 层级令牌（最高为 dropdown 的
1050），层级关系被分散在两处、不易维护。建议改用/新增令牌（如 `--s-z-index-loading`），保持层级定义单一来源。

─── packages/vue/src/styles/dropdown.less:2-2 ───
[style · low] 文件首行带 UTF-8 BOM，且第 1、2 行注释内容重复。BOM 会造成 diff 噪音，并可能在 Less 拼接 / 格式化链路中带来不一致行为，建议清理文件头
BOM 并合并重复注释（`table.less` 首行同样带有 BOM，建议一并清理）。

─── packages/vue/src/setup/useSTableCellRangeBridge.ts:102-102 ───
[bug · medium] `copyCellRange` 直接 await 剪贴板写入，权限被拒绝或非安全上下文（navigator.clipboard.writeText reject）时整个
Promise 会拒绝，导致已经序列化好的文本无法按文档约定返回；而同文件 `handleCellRangeCopyShortcut` 对同一调用做了 `.catch(() =>
undefined)`，两条路径错误处理不一致。建议此处也吞掉写入异常，只保留文本返回值。

-     if (options.writeToClipboard !== false && typeof navigator !== 'undefined') {
-       try {

*       await navigator.clipboard?.writeText?.(payload.text);

-         await navigator.clipboard?.writeText?.(payload.text);
-       } catch {
-         // 剪贴板权限被拒绝或非安全上下文时忽略，保证仍返回已生成的文本。
-       }
-     }

─── packages/vue/src/setup/useSTableApi.ts:130-130 ───
[bug · low] 这里把行索引硬编码为 0。`resolveRowKey` 在 rowKey 字段缺失或其值为 NaN/Infinity/-0 等无效值时会回退使用传入的 index（并据此输出
DEV 告警文案），因此该兜底路径会解析出错误 key（如 `n:0`），后续 `rowsById[...]?.original !== row` 校验失败后静默 return，使
`toggleRowSelection(row, true/false)` 无声失效。建议与下方无 rowKey 分支一致，传入该行在数据源中的真实索引。

-         key = resolveRowKey(row, 0, keyConfig);

*         const index = dataSource.value.indexOf(row);
*         key = resolveRowKey(row, index < 0 ? 0 : index, keyConfig);

─── packages/vue/src/components/header/Sort.vue:36-38 ───
[maintainability · low] `sorterInnerClass` 附加的 `s-table-column-sorter-inner-active`
在全仓库样式中没有定义（`table.less` 只定义了 `.s-table-column-sorter-up-active` / `-down-active`，而这两个 class
已经挂在上/下箭头 svg 上表达激活态）。该 computed 与 `:class` 绑定属于死代码：既不会改变渲染结果，也会让后续维护者误以为存在未生效的样式钩子。建议删除 computed
与绑定，或在样式中补上对应规则。

─── packages/vue/src/components/header/SelectionDropdown.vue:89-94 ───
[maintainability · low] `VNodeRenderer` 使用 `defineComponent` 定义在 `<script setup>` 内，会在每个
SelectionDropdown 实例（每个含选择列的表格）执行一次并生成一份新的组件类型；仓库内同类渲染辅助组件（如
`components/body/CachedCellContent.ts`）都定义在模块作用域。建议将其提升为模块级常量，避免重复创建组件类型、保持与既有写法一致。

─── packages/vue/src/hooks/useSTableRowSelection.ts:486-486 ───
[bug · medium] intent 策略下 `selectedRowKeys` 在 `mode: 'all'` 时恒为 `[]`（不物化全量键，这是
`getSelectedRowKeys()` 的既定设计并有文档/测试覆盖），但同一处回调的第二个参数 `selectedRows` 走的是意图分支，会返回全部实际选中行。于是自定义选择项的
`onSelect` 会拿到「键为空、行非空」这一对互相矛盾的入参，业务侧极易误判为「未选中」。建议 intent 模式下改为把 `selectionIntent`
交给回调（或至少在文档/类型上明确该回调在 intent 下不可用），避免公开 API 语义分叉。

─── packages/vue/src/hooks/useSTableRowSelection.ts:203-205 ───
[maintainability · low] 该 `get` trap 对任意字符串属性（`hasOwnProperty`、`toString`、`valueOf`、`__proto__`
等）都直接返回布尔值，且自有键只有 `INTENT_ALL_TOKEN`。这个对象会作为受控 `state.rowSelection` 传入 TanStack，任何标准对象操作（如
`state.hasOwnProperty(id)`、`Object.entries`）都会得到与真实选中集不符的结果，`state.hasOwnProperty(...)` 甚至会因取到
`true` 而直接抛错。建议只在明确的行 id 语义上返回布尔值，对内置/符号键回退到 `Reflect.get`，降低对下游实现的隐式约束。

─── packages/vue/src/hooks/useSTableEditing.ts:128-128 ───
[bug · low] `in` 会沿原型链命中 `toString`、`constructor`、`valueOf`、`__proto__` 等内置键，当列 id
恰好与这些键同名时会被误判为「该列正处于编辑态」，进而把不存在的列写入草稿。项目在 `resolveRowKey` 中已采用「仅检查自有属性」的防御写法，这里建议保持一致，改为
`Object.hasOwn` / `Object.prototype.hasOwnProperty.call`。

-     if (!current || !(columnId in current.values)) return;

*     if (!current || !Object.hasOwn(current.values, columnId)) return;

─── packages/vue/src/hooks/useSTableContextMenu.ts:69-69 ───
[maintainability · low] 这里把 Teleport 菜单的 CSS
类名硬编码为「点击菜单内部」的判定依据，与该组件实现强耦合；一旦类名调整，外部点击判定会静默失效（表现为点击菜单即关闭）。建议改由父组件传入菜单元素 ref 进行 `contains`
判定，或使用专用的 `data-*` 属性标记，避免依赖样式类名。

─── packages/vue/src/hooks/useSTableCellRange.ts:175-176 ───
[maintainability · low] 查找 `firstCell` 与 `lastCell`
的两段循环逻辑几乎完全一致，仅遍历方向相反，属于可抽取的重复代码；后续若调整「可选中」判定（例如跳过某类列）需要同时改两处，容易走偏。建议抽成一个 `findSelectableCell(row,
columnGroups, reverse)` 辅助函数供两处复用。

─── packages/vue/src/hooks/useSTableImport.ts:117-126 ───
[maintainability · medium] format 解析使用了三层嵌套三元表达式（`sourceFileName ? ... : sourceIsDocument ? ... :
options.delimiter === '\t' ? ... : ...`），分支语义很难一眼看清，后续再插入一个格式分支时容易放错优先级。建议抽成带提前 return 的帮助函数，用
if/else 表达各分支。

-     const format =
-       options.format ??
-       options.codec?.format ??
-       (sourceFileName
-         ? detectFileFormat(sourceFileName)
-         : sourceIsDocument
-           ? 'custom'
-           : options.delimiter === '\t'
-             ? 'tsv'
-             : 'csv');

*     const resolveSourceFormat = () => {
*       if (sourceFileName) return detectFileFormat(sourceFileName);
*       if (sourceIsDocument) return 'custom';
*       return options.delimiter === '\t' ? 'tsv' : 'csv';
*     };
*     const format = options.format ?? options.codec?.format ?? resolveSourceFormat();

─── packages/vue/src/hooks/useSTableImport.ts:49-52 ───
[bug · low] 未知扩展名被静默回退为 `csv`：传入 `.docx` / 二进制等不支持的文件时不会报错，而是按 CSV
解析，可能产出脏数据或空表，调用方很难定位原因。建议区分「无扩展名」（保留 CSV 兜底）与「有扩展名但不在支持列表」（显式抛错），并由 `options.format` 作为显式覆盖入口。

    if (extension && ['csv', 'tsv', 'json', 'ndjson', 'xlsx', 'ods', 'xml'].includes(extension)) {
      return extension;

- }
- // 无扩展名时保留 CSV 兜底；带扩展名但不受支持时显式报错，避免二进制内容被当作 CSV 静默解析。
- if (fileName.includes('.')) {
-     throw new Error(`[STable] 暂不支持的文件扩展名 ".${extension}"，请通过 options.format 指定格式。`);
  }
  return 'csv';

─── packages/vue/src/hooks/useSTableRowDrag.ts:217-222 ───
[maintainability · low] drop 位置判定同样是嵌套三元表达式，且 `0.33` / `0.67` / `0.5`（以及上文把 `event.timeStamp` 按
`1000 / 60` 分帧）都是散落的魔法数字，后续调整拖拽灵敏度时容易只改一处造成行为不一致。建议抽模块级常量并用 if/else 表达。

-       currentDropPosition.value =
-         config.value?.allowTreeReparent && tree?.value && ratio >= 0.33 && ratio <= 0.67
-           ? 'inside'
-           : ratio < 0.5
-             ? 'before'
-             : 'after';

*       const canDropInside = config.value?.allowTreeReparent && tree?.value;
*       if (canDropInside && ratio >= DROP_INSIDE_MIN_RATIO && ratio <= DROP_INSIDE_MAX_RATIO) {
*         currentDropPosition.value = 'inside';
*       } else {
*         currentDropPosition.value = ratio < DROP_HALF_RATIO ? 'before' : 'after';
*       }

─── packages/vue/src/hooks/useSTableRowDrag.ts:5-6 ───
[style · low] 同一文件内从 `../utils` 重复 import 了两条语句（分别取 `toColumnDef` 与 `decodeRowKey`），可合并为一条，避免冗余声明。

- import { toColumnDef } from '../utils';
- import { decodeRowKey } from '../utils';

* import { decodeRowKey, toColumnDef } from '../utils';

─── packages/vue/src/hooks/useSTableScroll.ts:414-416 ───
[maintainability · low] 「先取 ownerWindow 上的构造器，再回退到全局构造器」这段降级逻辑在本文件出现两次（IntersectionObserver /
ResizeObserver），`useThemeVariables.ts` 里还有一份 MutationObserver 版本。建议抽成一个公共工具（如
`resolveObserverConstructor(element, 'ResizeObserver')`），既避免重复，也便于统一处理无全局构造器的降级分支。

─── packages/vue/src/hooks/useSTableColumnDrag.ts:116-118 ───
[maintainability · low] `moveColumn` 在 splice 之前已通过 `!next.includes(targetColumnId)` 校验目标列存在，删除源列后
`targetColumnId` 必然仍在数组中，`indexOf` 不可能返回 -1（仅当列 ID
重复这种异常输入才可能命中）。该分支属于实际不可达的死代码，容易被维护者误读为正常防御路径，建议删除或补注释说明其只兜底重复 ID。

      next.splice(fromIndex, 1);
      const targetIndex = next.indexOf(targetColumnId);

-     // 仅当列 ID 重复（异常输入）时才会为 -1，正常路径不可达。
      if (targetIndex < 0) return;

─── packages/vue/src/hooks/useSTableColumnDrag.ts:27-38 ───
[maintainability · low] `collectLeafColumnIds` 与 `utils/columnIndex.ts` 的
`buildColumnIndex(...).leafIds` 语义完全重复（同一 `walkColumnTree` 遍历、同一 `resolveSTableColumnId` 解析、同样的
`children.length === 0` 叶子判定），而 `buildColumnIndex` 已从 `../utils` 桶导出。建议直接复用
`buildColumnIndex(columns).leafIds`（或把统一的叶子收集函数下沉到 utils 供两者共用），避免后续调整叶子判定规则时两处不同步。注意替换后本文件顶部的
`resolveSTableColumnId`、`walkColumnTree` 导入会变为未使用，需要一并清理并补 `buildColumnIndex` 导入。

export const collectLeafColumnIds = <TData extends RowData, TValue>(
columns: readonly STableColumn<TData, TValue>[]

- ): string[] => {
- const ids: string[] = [];
- walkColumnTree(columns, (column, \_depth, children) => {
-     if (children.length === 0) {
-       const id = resolveSTableColumnId(column);
-       if (id) ids.push(id);
-     }
- });
- return ids;
- };

* ): string[] => buildColumnIndex(columns).leafIds;

─── packages/vue/src/types/dataTransfer.ts:4-4 ───
[maintainability · medium] 该兼容入口用星号把 core 的**整个**公开类型面（`STableRowKey` / `STableTree` /
`STableSelectionIntent` / core 内部的 `STableColumnFilterValue` 等与数据传输无关的类型）都挂到了 `dataTransfer`
路径上，带来两个问题：

1. core 之后新增任意类型都会不受控地泄漏进 Vue 包的公开类型入口；
2. `features.ts` 因此必须为 `STableColumnFilterValue` 写显式重导出消歧（否则同名类型冲突）。

core 已提供职责更精确的子路径 `@zchengfeng/s-table-core/data-transfer`（内部 `export type * from
'./types/data-transfer'`，本包用到的 `STableImport*` / `STableExport*` / `STableData*`
类型全部覆盖），建议收窄重导出范围，即可同时消除上述歧义。

- export type \* from '@zchengfeng/s-table-core';

* export type \* from '@zchengfeng/s-table-core/data-transfer';

─── packages/vue/src/types/config.ts:59-59 ───
[maintainability · low] `STableColumnFilterValue` 与 core 的 `packages/core/src/columns/normalize.ts`
中的同名接口是同一份契约的两份定义（此处只是去掉了 `readonly`）。Vue 侧会把该形状的值交给 core 的归一化管线消费（见 `useSTableSortFilter.ts`，此处仅读取
`values` / `keyword`），一旦两边字段漂移就会出现隐性不兼容；这也正是 `features.ts` 需要额外显式重导出消歧的根因。建议直接复用 core 的声明，保持单一来源。

- export type STableColumnFilterValue = {

* export type { STableColumnFilterValue } from '@zchengfeng/s-table-core';

─── packages/vue/src/types/config.ts:159-160 ───
[documentation · low] 这里连续出现两段 JSDoc：`树形数据配置…` 描述的树配置实际由上方从 core 重导出的 `STableTree`
提供，此处没有对应声明，属于悬空注释（实际生效的只有紧随其后的 `表格编辑模式`）。上方 `// 表格行键值` 标签与其后的 `公开的行固定状态…` 同样不匹配。悬空/错位注释会导致 IDE
悬浮提示与生成的 API 文档归属错误，建议删除或将注释移动到对应声明处。

─── packages/vue/src/types/types.ts:57-62 ───
[documentation · low] `columns` 前连续两段 JSDoc，只有紧邻声明的第二段会生效，第一段的 `@description` 与 `@default []`
会被丢弃（成为悬空注释）。另外这里用内联 `import('../utils/column').STableColumns<TData>`，而文件顶部已从同一模块 import 了
`STableColumn`，两处写法不一致。建议合并注释并统一为顶部 import。

- /\*\*
- - @description 表格列集合
- - @default []
- \*/
- /\*_ 异构列数组在集合边界擦除 TValue；每个 helper 返回的单列仍保留精确值类型。 _/
- columns?: import('../utils/column').STableColumns<TData>;

* /\*_ 表格列集合：异构列数组在集合边界擦除 TValue；每个 helper 返回的单列仍保留精确值类型。 _/
* columns?: STableColumns<TData>;

─── packages/vue/src/types/selection.ts:58-58 ───
[maintainability · low] 公开泛型接口默认值不统一：同文件的 `STableSelectionOption<TData extends RowData = RowData>`
提供了默认值，而 `STableRowSelection`（以及 `interaction.ts` 的 `STableExpandable`）缺少 `=
RowData`，导致使用者无法省略类型实参（如 `const cfg: STableRowSelection = {...}` 会报缺少类型实参），公开 API
易用性与一致性下降。建议统一补上默认值。

- export interface STableRowSelection<TData extends RowData> {

* export interface STableRowSelection<TData extends RowData = RowData> {

─── packages/vue/src/ui/wave.ts:63-69 ───
[bug · low] `wave.animate` 未做异常兜底：此处 span 已 `appendChild` 到 body，仅靠 `animation.onfinish/oncancel`
清理。当关键帧无法被解析时（例如调用方传入的 `explicitColor` 来自被覆盖的主题变量、值为空串或非法颜色），`animate()` 会抛
`TypeError`，此时节点不会被移除而永久残留在 body 中（每次点击泄漏一个节点），同时异常会冒泡进点击事件链路。建议补 try/catch，失败时移除节点。

- const animation = wave.animate(

* let animation: Animation;
* try {
*     animation = wave.animate(

-     [

*       [

-       { boxShadow: `0 0 0 0 ${color}`, opacity: 0.4 },

*         { boxShadow: `0 0 0 0 ${color}`, opacity: 0.4 },

-       { boxShadow: `0 0 0 6px ${color}`, opacity: 0 },

*         { boxShadow: `0 0 0 6px ${color}`, opacity: 0 },

-     ],

*       ],

-     { duration: 400, easing: 'cubic-bezier(0.08, 0.82, 0.17, 1)' }

*       { duration: 400, easing: 'cubic-bezier(0.08, 0.82, 0.17, 1)' }

- );

*     );
* } catch {
*     wave.remove();
*     return;
* }

─── packages/vue/src/ui/wave.ts:54-54 ───
[maintainability · low] 重复获取同一节点的计算样式：`resolveWaveColor` 内部已调用一次 `getComputedStyle(node)`，这里为取
`borderRadius` 又调用一次，两次读取的样式快照也可能不一致。建议让 `resolveWaveColor` 同时返回/复用已取得的 `CSSStyleDeclaration`（或拆一个
`resolveWaveStyle` 辅助函数），避免重复计算。

─── packages/vue/src/ui/wave.less:4-4 ───
[maintainability · low] `z-index: 9999` 为硬编码魔法值，项目已有层级 token 体系（`styles/token.less` 中
`--s-z-index-cell-fixed/header/resizer/dropdown`）。建议改为可覆盖的层级变量（并在 token.less
中登记），否则消费者自定义层级顺序时波纹会脱离统一控制；同时扩散半径 6px、时长 400ms 等魔法数字也可考虑抽为模块常量。

- z-index: 9999;

* z-index: var(--s-z-index-wave, 9999);

─── packages/vue/src/styles/table.less:449-450 ───
[bug · high] `.s-table-cell-editor` 被嵌套在 `&-header` 内部，编译后选择器是 `.s-table-header
.s-table-cell-editor`；但该输入框实际渲染在**表体**单元格里（`components/body/BodyCell.vue` 中 `<td
class="s-table-cell">` 内的 `<input
class="s-table-cell-editor">`，全项目仅此一处使用该类名），表头永远不存在这个元素。结果是编辑态的输入框（以及 `&[type='checkbox']`
的尺寸规则）拿不到任何样式，退化为浏览器默认 input 外观，在 `table-layout: fixed` 的单元格里还可能撑破列宽。建议把该规则块移出 `&-header`（提升到根级或放入
`&-body` 作用域）。

─── packages/vue/src/styles/table.less:705-706 ───
[bug · medium] 尺寸修饰块（`&-small / -middle / -large`）显式把 `&-summary .s-table-cell` 也纳入了 padding /
font-size 的调整，但编译后的 `.s-table-small .s-table-summary .s-table-cell` 与本处更靠后的 `.s-table-summary
.s-table-summary-row .s-table-cell` 同为 0-3-0 特异性，后者胜出，导致汇总行的 padding / font-size 恒为 `8px 16px` /
`14px`，不随 size 变化（small 下汇总行反而比表体行更“大”），尺寸块中针对 summary 的声明成为死代码。建议提高尺寸块选择器特异性（例如链路上补
`.s-table-summary-row`）或把汇总行规则前移到尺寸块之前。

─── packages/vue/src/styles/empty.less:43-44 ───
[maintainability · low] `&-default-description` 对应的 class `s-table-empty-default-description`
在整个源码中没有任何使用点：`components/empty/index.vue` 只渲染了 `-default-title` 与
`-default-action`（`locale.empty.description` 虽已定义却未被渲染）。该规则目前是死样式，建议补上描述节点（与 locale
对齐）或删除该规则，避免样式与组件契约脱节。

─── packages/vue/src/styles/table.less:758-760 ───
[maintainability · low] 此块对 `.s-table-selection-header` / `.s-table-selection-cell` 的 `display` /
`align-items` / `justify-content` 声明与下方（约 793-813 行）同名规则重复且冲突：下方 `.s-table
.s-table-selection-header` 特异性更高且位置更靠后，`display` 实际生效的是 `flex` 而非此处的
`inline-flex`，本块这几条声明是无效代码（注释内容也与选择列无关，疑为搬运遗留）。建议合并为一处，避免后续在该块上的修改被认为已生效。

─── packages/vue/src/hooks/useModelState.ts:10-11 ───
[maintainability · low] `deep` 选项目前没有任何调用方传入：6
个使用点（`useSTableEditing`/`useSTableRowSelection`/`useSTableExpandable`/`useSTablePagination`/`useSele
ctionIntent`/`features/grouping`/`features/row-pinning`）与测试都没有传 `deep`，因此 `{ deep: deep ?? false }`
恒为 `false`，deep watch 分支从未被执行、也没有测试覆盖。若近期没有启用计划，建议移除该选项以缩小内部 API 面积；若需保留，建议补一个使用它的用例（例如外部受控数组原地
push/splice 的场景），避免后续被误用或误删。

─── packages/vue/src/ui/button/styles.less:115-115 ───
[bug · medium] `ghost` 只在 `primary` 分支内实现，`type="default"/"dashed"` 搭配 `ghost` 时没有任何样式生效（背景仍为
`--s-color-bg-cell`、边框仍为控件边框色），与 types.ts 中“幽灵按钮（背景透明）”的语义不符，属于静默失效。建议把 ghost 的透明背景/边框提到 `&-ghost`
顶层规则，或在文档/类型注释中明确 ghost 仅对 primary 有效。

─── packages/vue/src/ui/button/styles.less:211-211 ───
[bug · medium] danger 只覆盖了 default / primary / text / link 四种类型，缺少 `dashed`：`type="dashed" danger`
渲染后完全没有危险色，且 hover 会被上方的 `&-dashed:hover` 改为 primary 蓝，与 danger 语义冲突。建议补充 `&-dashed.s-btn-danger`
规则（或抽出一份 danger 的通用声明复用，避免四处重复硬编码）。

─── packages/vue/src/ui/button/styles.less:102-102 ───
[maintainability · low] 危险态颜色（#ff4d4f / #ff7875 / #d9363e）在文件中重复硬编码 5 处以上，而其余颜色均走 `var(--s-*,
fallback)` 约定。这样使用方无法通过 CSS 变量定制 danger 色，暗色主题下也没有对应的 token 可覆盖。建议在 styles/token.less 中补充
`--s-color-error` / `--s-color-error-hover` / `--s-color-error-active`（含暗色值），此处改为
`var(--s-color-error, #ff4d4f)` 形式。

─── packages/vue/src/ui/button/styles.less:231-232 ───
[maintainability · low] `pointer-events: none` 会让元素完全不参与指针命中测试，浏览器因此不会应用该元素自身的 `cursor:
not-allowed`，即这条 cursor 声明实际不生效（生效的是 `&-loading` 同样的写法）。建议二选一：保留 `cursor: not-allowed` 而移除
`pointer-events: none`，或保留 `pointer-events: none` 并删掉这条无效的 cursor 声明，避免后续维护者误以为禁用态光标已处理。

─── packages/vue/src/ui/button/Button.vue:8-8 ───
[maintainability · low] 可见性问题：1) 加载态内联 SVG 未加 `aria-hidden="true"`（项目内 icon/\*.vue
全部显式声明，避免图形被读屏器当作无意义内容读出）；2) `s-btn-icon-only` 分支没有可访问名称来源，使用方若只用 `<template #icon>`
传图标，读屏器只会读出“按钮”。建议给 loading svg 补 `aria-hidden="true"`，并为图标按钮提供 `ariaLabel` 属性（参考
ui/select、components/header/Filter 的 `aria-label` 约定）。

─── packages/vue/src/types/types.ts:451-452 ───
[documentation · medium] 注释与实现不一致：`getSelectionIntent()` 的实现是 `useSTableApi` 里的
`getSelectionIntentSnapshot()`，其数据源 `selectionIntent` 只在 intent 模式（`rowSelection.strategy ===
'intent'`，或传入 `selectionIntent` / `defaultSelectionIntent`）下才会被写入 `includedRowKeys`（见
`hooks/useSelectionIntent.ts`、`hooks/useSTableRowSelection.ts` 中 `toggleRow/selectRow` 的分支）。因此 key
模式下该值恒为 `{ mode: 'include', includedRowKeys: [] }`，与当前 `selectedRowKeys` 无关，按注释取用会得到空集合。建议二选一：key
模式下用 `selectedRowKeys` 合成 include 意图，或把注释改为「key 模式不维护意图，恒返回空 include 意图，请改用 `getSelectedRowKeys()`」。

─── packages/vue/src/types/interaction.ts:40-41 ───
[maintainability · medium] 同一契约被定义了两份：`hooks/useSTableColumnDrag.ts` 内部有一个未导出的同名接口
`STableColumnOrderChangeEvent<TData, TValue>`（`columns: STableColumn<TData,
TValue>[]`），与本处公开类型形状相同但泛型形参不同。列拖拽 hook 通过 `emit('columnOrderChange', payload)`
把内部那份传给这里的公开类型，仅靠结构兼容，一旦公开契约增删字段，内部实现不会报错、容易静默漂移。建议删除 hook 内的局部声明，改为 import 本类型（或反过来统一到一处）。

─── packages/vue/src/types/selection.ts:21-22 ───
[maintainability · low] `STableSelectionColumnAlign` 与 `types/config.ts` 中的 `STableColumnAlign`
完全同构（都是 `'left' | 'center' | 'right'`），且两者都从包入口导出，属于同一契约的重复定义，后续若只改一处会出现语义分叉。建议直接复用：`export type
STableSelectionColumnAlign = STableColumnAlign;`。

─── packages/vue/src/types/types.ts:318-323 ───
[maintainability · low] 过滤值联合类型 `string | number | boolean` 已在 `types/config.ts` 定义为公开的
`STableFilterValue`，但这里（`filterChange.payload.filters`）以及下方
`STableFilterPanelSlotContext.selectedKeys` / `setSelectedKeys` 又各自内联了一份。同一联合在多处重复，后续扩展取值类型（例如新增
`Date`）时容易漏改。建议统一引用 `STableFilterValue`。

─── packages/vue/src/ui/input/Input.vue:101-103 ───
[bug · medium] `modelValue` 是可选 prop，`withDefaults` 只在“未传值（undefined）”时生效；若调用方传入 `null`（例如
`v-model="someNullableRef"`），`props.modelValue.length` 会抛 `Cannot read properties of null`，在
`allowClear` 为 true 时直接导致渲染失败。建议做空值兜底。

const showClear = computed(

- () => props.allowClear && !props.disabled && !props.readonly && props.modelValue.length > 0

* () =>
*     props.allowClear &&
*     !props.disabled &&
*     !props.readonly &&
*     (props.modelValue ?? '').length > 0
  );

─── packages/vue/src/ui/input/styles.less:15-17 ───
[style · low] `.s-input-wrapper:hover`（0,2,0，含伪类）特异性高于
`.s-input-wrapper-disabled`（0,1,0），导致禁用状态下鼠标悬停时边框仍会变成主题色，出现“已禁用却高亮”的误导。建议让 hover 排除禁用态。

- &:hover {

* &:not(.s-input-wrapper-disabled):hover {
  border-color: var(--s-primary-color, #1677ff);
  }

─── packages/vue/src/ui/input/Input.vue:9-10 ───
[maintainability · low] `s-input-wrapper-has-prefix` / `s-input-wrapper-has-suffix` 在 `styles.less`
中没有任何对应规则，属于只挂类名不生效的死代码。建议补上对应样式（如调整 padding）或移除这两个类名，避免后续维护者误以为已有布局处理。

─── packages/vue/src/ui/input/Input.vue:50-50 ───
[maintainability · low] 清除按钮是可交互元素但缺少无障碍属性：没有 `aria-label`，也没有
`role="button"`/`tabindex`，键盘用户无法聚焦和触发清除。同目录的 `Select.vue` 至少为图标加了 `aria-hidden="true"`。建议补上
`role="button"`、`tabindex="0"`、`aria-label`（或 props 文案）以及 Enter/Space 键处理。

─── packages/vue/src/ui/input/Input.vue:125-126 ───
[test · low] 新增的 UI 组件缺少单测：`__tests__/rendering/ui-controls.test.ts` 已覆盖 Button/Checkbox/Radio，但
Input 的 v-model 双向绑定、`allowClear` 清除、textarea 分支、disabled/readonly
下不显示清除按钮等关键路径都没有用例。建议在该测试文件中补充基础交互用例。

─── packages/vue/src/ui/button/Button.vue:5-5 ───
[bug · medium] `:disabled="disabled || loading"` 会在 loading 时给原生 button 打上 `disabled` 属性，而
styles.less 中的 `.s-btn[disabled]`（0,2,0 特异性）会覆盖 `&-primary` 等类型规则（0,1,0）：loading 的
primary/danger/link 按钮会变成灰色底 + `--s-color-text-quaternary` 文本，而不是预期的“淡化保留类型色”（`&-loading` 的
`opacity: .65` 实际只叠加在这层灰底上）。建议让 disabled 样式不作用于 loading，例如把规则写成
`.s-btn[disabled]:not(.s-btn-loading)`，或 loading 时不输出原生 `disabled`（点击已由 handleClick 守卫 + `&-loading`
的 pointer-events 兜住）。

─── packages/vue/src/ui/button/Button.vue:62-62 ───
[bug · medium] `s-btn-icon-only` 上的 `!props.loading` 会导致 loading 期间该 class 被移除：图标按钮失去
`padding-left/right: 0` 与固定 `width`（32/24/40px），宽度会跳到 middle/large 的 padding 尺寸，出现明显布局抖动。loading
时渲染的仍是 loading 图标，语义上依旧是 icon-only，建议去掉该条件。另外 `slots.icon` 被读进 computed，而 Vue 的 slots
对象不是响应式依赖：父组件动态增删 `#icon` 时该 computed 不会失效（模板里的 `v-if="slots.icon"` 反而会更新），建议把这段 class
计算放回模板，或在需要时改用 `$slots` 在渲染期读取。

-     's-btn-icon-only': !props.loading && !!slots.icon && !slots.default,

*     's-btn-icon-only': !!slots.icon && !slots.default,

─── packages/vue/src/ui/button/styles.less:253-256 ───
[maintainability · low] 旋转动画没有处理系统减弱动效偏好。项目已有约定：`styles/loading.less` 用 `@media
(prefers-reduced-motion: reduce)` 关闭动画，`ui/wave.ts` 也直接跳过动画，这里建议保持一致，避免无限旋转对前庭敏感用户造成不适。

    &-loading-icon {
      display: inline-flex;
      animation: s-btn-spin 1s linear infinite;

-
-     @media (prefers-reduced-motion: reduce) {
-       animation: none;
-     }
  }

─── packages/vue/src/ui/button/Button.vue:67-67 ───
[test · low] 这是组件唯一的交互分支逻辑（禁用/加载时不得触发 click），但 `__tests__/rendering/ui-controls.test.ts` 中 Button
只覆盖了“正常点击触发 click”与波纹卸载场景。建议补一条用例断言 `disabled`、`loading` 下点击不 emit click（原生 disabled 在 happy-dom
下会拦截 click 事件，需要显式派发事件或直接调用处理器，才能真实覆盖该守卫）。

─── packages/vue/src/ui/checkbox/CheckboxGroup.vue:5-5 ───
[bug · low] `CheckboxOption.value` 类型为 `string | number`，直接用原始值作为 key 存在类型冲突风险：当选项同时包含数字 `1` 与字符串
`'1'` 时（`isChecked` 基于 `Set.has` 是严格类型比较，二者会被视为两个独立选中项），Vue 会因 key 重复而报 “Duplicate keys” 并复用/错位 DOM
节点，出现渲染状态与模型不一致。同目录的 `RadioGroup.vue` 已用 `getValueKey` 显式编码类型来规避该问题，此处建议保持一致。

-       :key="option.value"

*       :key="`${typeof option.value}:${String(option.value)}`"

─── packages/vue/src/ui/checkbox/Checkbox.vue:20-20 ───
[bug · low] 视觉类名逻辑用的是 `indeterminate && !modelValue`（第 9 行），但这里把 `indeterminate` 原样绑到原生 input
上。当调用方同时传入 `indeterminate` 与 `modelValue=true`（例如表格行选择自定义 `getTitleCheckboxProps`
时未做互斥判断）时，界面展示对勾、而原生控件的 `indeterminate` 仍为 true，辅助技术会播报“混合”状态，语义与视觉不一致。建议与类名逻辑保持同一判定条件。

-         :indeterminate="indeterminate"

*         :indeterminate="indeterminate && !modelValue"

─── packages/vue/src/ui/checkbox/CheckboxGroup.vue:44-44 ───
[test · low] `CheckboxGroup` 已通过 `ui/index.ts` 对外导出为公共 API，但全仓库无任何使用点与测试用例（现有
`__tests__/rendering/ui-controls.test.ts` 只覆盖了单选 Checkbox 的切换与波纹）。建议补充该组件的单测，至少覆盖：多选增删（`toggle`
的分支）、`disabled`（组级与选项级）拦截、受控/非受控边界，以及 `Checkbox` 的 `indeterminate` 分支，以降低回归风险。

─── packages/vue/src/hooks/useSTableRowSelection.ts:146-148 ───
[bug · medium] 兜底分支把「顶层遍历未命中」等同于「该 key 已不存在」，并把结果当作白名单返回（调用方据此裁剪选中 key）。但树形场景下嵌套子行的 id 只存在于 core row
model 的 `rowsById` 中，顶层 `dataSource` 遍历找不到，于是子行的选中 key 会被误判为已删除剔除；又因为下面 `selectedRowKeys` 的 `flush:
'sync'` watch 会把裁剪结果写回 `internalKeys`，这次误删是持久的（之后 `validatedInternalDataSource === records`
命中缓存，不再重新解析）。而且该分支并不只在「table 尚未创建」时生效：`useSTable` 里把 `tableData` 换成新引用的 watcher 是 pre-flush，而 sync
watch 会在数据引用变动的同一 tick 内先执行，此时 `table.options.data !== records`，因此每次数据更新都会先落到这里（回归测试「复用 TanStack
rowsById 校验树形子行 key」用的是不变更数据的平铺数组，覆盖不到该路径）。建议兜底同样遍历树形子行（复用 core 的 `getTreeChildren`），或在行模型尚未同步时返回
`undefined`（表示「无法校验」而非「不存在」），把真正的删除清理留给同步完成后的 `rowsById` 主路径。

─── packages/vue/src/ui/pagination/styles.less:231-238 ───
[style · medium] 紧凑模式本意是“更小间距”，但父级 `.s-pagination` 已有 `gap: 8px`，这里再给每个 `.s-pagination-item` 追加
`margin-right: 4px`，实际项间距反而变成 12px，比默认 8px 更大，与紧凑语义相悖。建议改为在 `&-compact` 上收窄 `gap`，并去掉项上的
`margin-right`。

    &-compact {

-     gap: 4px;
-      .s-pagination-item {
         min-width: 24px;
         height: 24px;
         line-height: 22px;
         font-size: 12px;

*       margin-right: 4px;
      }

─── packages/vue/src/ui/pagination/Pagination.vue:208-216 ───
[bug · medium] 1）`Number(newSize)` 缺少有效性校验：Select 的 `update:model-value` 类型为 `SelectValue = string |
number | (string|number)[]`，一旦传入数组/空串（`Number([])===0`、`Number('')===0`）或非数字，`Math.ceil(props.total
/ size)` 与 `Math.min(props.current, size)` 会产生 `NaN/Infinity`，随后的 `update:pageSize` 会把 pageSize 污染成
0/NaN，`totalPages` 直接变成 `Infinity`。2）`const size` 与模块级 `const size = useComponentSize(...)`
同名遮蔽，易误读。建议改名并加守卫。

const handleSizeChange = (newSize: string | number | (string | number)[]) => {

- const size = Number(newSize);
- emit('update:pageSize', size);

* const newPageSize = Number(newSize);
* // 防御 Select 可能传出的空串/数组等非法值，避免 pageSize 被污染为 0/NaN
* if (!Number.isFinite(newPageSize) || newPageSize <= 0) return;
* emit('update:pageSize', newPageSize);
  // 调整 current 防止越界

- const maxPage = Math.max(1, Math.ceil(props.total / size));

* const maxPage = Math.max(1, Math.ceil(props.total / newPageSize));
  const newCurrent = Math.min(props.current, maxPage);
  emit('update:current', newCurrent);

- emit('change', newCurrent, size);

* emit('change', newCurrent, newPageSize);
  };

─── packages/vue/src/ui/pagination/Pagination.vue:137-137 ───
[bug · medium] `Pagination` 对外暴露 `current` 但内部完全不做越界纠正：当外部（表格已自行 clamp，但该组件被 `ui/index.ts`
独立导出，直接使用时报错场景存在）传入 `current > totalPages`（如数据变少后）时，`page.page === current`
永不成立，`s-pagination-item-active`/`aria-current` 全部失效，用户看不到当前页；同时 `range`
会算出类似「981-32」的错误范围文案，`pageList` 也会丢掉相邻页。建议基于 `totalPages` 做一次显示用 clamp。

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

-
- // 显示用当前页：受控 current 越界时收敛到有效范围，避免高亮与范围文案失效
- const safeCurrent = computed(() => Math.min(Math.max(1, props.current), totalPages.value));

─── packages/vue/src/ui/pagination/Pagination.vue:93-99 ───
[maintainability · low] 快速跳转输入框完全不受控且缺少输入约束：`parseInt` 会接受 `12abc`（得到 12），也不过滤负号/小数点/空格，且不感知
`props.disabled`（仅靠原生属性）。建议按整数值解析并校验，同时声明数字键盘类型以改善移动端体验。

        <input
          type="text"

-         inputmode="numeric"
          class="s-pagination-quick-jumper-input"
          :disabled="disabled"
          :aria-label="jumpToText"
          @keydown.enter="handleJump"
        />

─── packages/vue/src/ui/radio/Radio.vue:45-45 ───
[bug · medium] `isChecked` 未排除 `value` 未定义的情况：当 `value` 与 `modelValue` 同时为 `undefined`（独立使用 Radio 未传
`value`，或外部把 `undefined` 作为选项值）时会被判定为“已选中”，组件渲染成选中态，并且 `handleClick` 会因 `isChecked` 为真直接
return，点击无任何反馈，形成不可交互的“假选中”。建议显式判空（注意不能用真值判断，否则 `value === false` 会被误判）。

- const isChecked = computed(() => props.modelValue === props.value);

* const isChecked = computed(() => props.value !== undefined && props.modelValue === props.value);

─── packages/vue/src/ui/radio/Radio.vue:52-52 ───
[bug · medium] 波纹目标 `.s-radio` 自身没有 border，`showWave` 内部 `resolveWaveColor` 会取到 `currentColor`（即文字色
rgba(0,0,0,.88)）而非主题色，波纹会呈深灰色，与选中态/主题不一致。Checkbox 已针对同样的问题显式传入 `--s-primary-color`（见 Checkbox.vue 第
59-62 行及其单测），此处建议对齐。

- if (boxRef.value) showWave(boxRef.value);

* if (boxRef.value) {
*     // .s-radio 自身没有边框色，显式读取实例继承的主题色，避免波纹回退为文字色。
*     const themeColor = getComputedStyle(boxRef.value).getPropertyValue('--s-primary-color').trim();
*     showWave(boxRef.value, themeColor || '#1677ff');
* }

─── packages/vue/src/ui/radio/styles.less:128-134 ───
[bug · low] 禁用态的覆盖不完整：`.s-radio-wrapper-disabled .s-radio-inner` 与后面的 `.s-radio-wrapper-checked
.s-radio-inner` 权重相同（0,2,0），但后者在文件末尾，会覆盖禁用态的 `border-color`，导致「选中 +
禁用」的单选框边框仍为主题蓝，而内部圆点与背景已置灰，视觉不一致（antd 中此时边框也为灰色）。另外 `.s-radio-wrapper-checked:hover`
未排除禁用态，禁用项悬停时边框仍会变为 hover 色。建议在该块内补齐 `border-color`，并在 hover 选择器中排除禁用态。

    &.s-radio-wrapper-disabled .s-radio-inner {
      background-color: var(--s-color-bg-disabled, #f5f5f5);

-     border-color: var(--s-color-border-control, #d9d9d9);

      &::after {
        background-color: var(--s-color-text-icon, #bfbfbf);
      }

  }

─── packages/vue/src/ui/radio/RadioGroup.vue:2-2 ───
[maintainability · low] 分组容器缺少单选组语义：内部每个 Radio 都是独立的原生 `<input type="radio">`，且没有共享 `name`，容器也没有
`role="radiogroup"`，浏览器不会把它们视为同一组，读屏会逐个朗读为互不相关的单选按钮，方向键也无法在选项间切换（本库 Select 已补充 role/aria
语义，可参考）。建议为组提供统一的 `name`（或生成唯一 name）并补充 `role="radiogroup"`。

─── packages/vue/src/hooks/useSTableSortFilter.ts:108-110 ───
[bug · medium] 当 `columns` 在挂载后才就绪时（异步列配置很常见，`columns` prop 的默认值就是 `[]`），这里会误清空排序状态：hook 初始化会同步执行一次
`applyColumnDefaults()`，此刻 `columnMap` 为空，`map.get(item.columnId)` 全部返回 undefined → `validSorting`
恒为 `[]` → `updateSorting([], 'column-removed')` 会把 `defaultSorting`（或受控 `sorting`）整体清空，并派发一次 reason
为 `column-removed` 的 `sortChange`（使用 `v-model:sorting` 时还会被写回父级）。而 `defaultSorting`
只在初始化时读取，列就绪后不会恢复，默认排序将永久丢失。建议列索引为空时跳过剪枝（即“列尚未建立”不算“列被移除”）。

-     if (validSorting.length !== sorting.value.length) {

*     if (map.size > 0 && validSorting.length !== sorting.value.length) {
        updateSorting(validSorting, 'column-removed');
      }

─── packages/vue/src/hooks/useSTableImport.ts:166-166 ───
[maintainability · low] 该三元表达式的两个分支恒等于局部变量 `format`：走自定义 codec 时 `resolveCodec` 已强制
`options.codec.format === format`，内置 codec 也一定以其注册名（即
`format`）返回，因此条件判断没有任何作用，反而让读者误以为这里可能上报“不同”的格式。建议直接使用 `format`。

-       format: sourceIsDocument ? format : (options.codec?.format ?? format),

*       format,

─── packages/vue/src/ui/input/styles.less:96-99 ───
[bug · high] `textarea&` 的写法编译出来的选择器无法命中实际 DOM。Less 中 `&` 代表的是**完整父选择器链**（不只是最近一层，官方示例 `.grand {
.parent { && {} } }` 会编译成 `.grand .parent.grand .parent`），因此这里的父链 `.s-input-wrapper .s-input` 会被原样代入
`&` 的位置，得到 `textarea.s-input-wrapper .s-input` —— 它要求存在 `<textarea class="s-input-wrapper">` 且内部有
`.s-input` 后代，而模板里 wrapper 是 `div`，所以该规则是永远不生效的死规则。

后果：`type="textarea"` 时拿不到 `min-height: 80px`，反而会套用尺寸类里的固定 `height`（small/middle/large 分别
22/30/38px），文本域会被渲染成一行高。建议把该规则移出 `.s-input` 嵌套、放到 `.s-input-wrapper` 一层，直接用 `textarea.s-input`
选择器（特异性 0,2,1 仍高于尺寸类）。

-     textarea& {

* // 注意：& 会展开为完整父选择器链，元素名 + & 的写法无法命中，需移出 .s-input 嵌套
* textarea.s-input {

-       min-height: 80px;

*     min-height: 80px;

-       padding: 4px 11px;

*     padding: 4px 11px;

-     }

* }

─── packages/vue/src/ui/input/Input.vue:16-18 ───
[bug · medium] addon 的 DOM 结构与样式设计不一致：`styles.less` 里的 `.s-input-addon` 是按 wrapper 的**并列兄弟**来写的（自带
`border`、用 `margin-left/right: -1px` 与 wrapper 边框重叠、外侧 6px 圆角，块注释也写着「Addon（独立于 wrapper 之外）」），但这里把
addon 渲染进了本身带 1px 边框的 `.s-input-wrapper` 内部。

实际效果：① addon 的上下边框只与 wrapper 左侧做了 -1px 重叠补偿，上下各会出现 2px 的双线；② `&-addon { border-radius: 0 }` 会无条件清零
wrapper 的全部圆角，当只传 `addonBefore` 时，输入框右端本该保留的 6px 圆角也会变成直角。建议二者取其一：把 addon 移到 wrapper 之外作为兄弟节点，或去掉
addon 自身边框/负 margin，并把 wrapper 的圆角改为只清零有 addon 的那一侧。

─── packages/vue/src/ui/select/Select.vue:299-299 ───
[bug · medium] 单选模式下清除会写入空字符串 `''`，而 `selectedValues` 只排除 `undefined | null`，因此 `'' !== undefined &&
'' !== null` 仍然成立，清除后 `selectedValues` 变成 `['']`（length 为 1）。这会带来两个问题：

1. `showClear` 依赖 `selectedValues.length > 0`，清除后鼠标仍悬停时清除图标不会消失，与右侧箭头（同为 `right: 11px` 绝对定位）重叠；
2. 外部无法用 `modelValue === undefined` 表达“未选中”，也无法把“未选中”与“合法选项值为空串”区分开。
   建议让清除写入 `undefined`（同时把 `SelectValue` 扩展为包含 `undefined` 并同步 `emit` 类型），或在 `selectedValues` 中额外过滤空串。

- const empty: SelectValue = isMultiple.value ? [] : '';

* const empty: SelectValue = isMultiple.value ? [] : undefined;

─── packages/vue/src/ui/select/Select.vue:30-30 ───
[bug · medium] 清除按钮与多选标签的删除按钮都是不可聚焦的 `span` 且标记为 `aria-hidden="true"`，屏幕阅读器无法感知这两个操作，键盘用户目前只能通过
`Delete`（清除）或 `Backspace`（仅删除最后一个标签）操作，无法用键盘删除指定标签。建议将这两个元素改为可聚焦元素（如 `button type="button"`）并补充
`aria-label`（可复用 `locale.select.*` 文案），或至少在触发区提供可发现的键盘入口。

─── packages/vue/src/ui/select/Select.vue:392-392 ───
[bug · low] 此处未像 `components/header/useFloatingDropdown.ts` 那样对 `trigger` 做空值守卫（该文件注释明确说明：不应对缺失的
reference 使用 `getOwnerDocument` 的全局 document 兜底，否则未挂载的下拉会去监听全局 document）。当 `isOpen` 为 true 而
`triggerRef.value` 已为 null（例如 ref 被置空/卸载过程中）时，`getOwnerDocument(null)` 会回退到全局
`document`，从而把外部点击监听到错误的文档上并可能残留。建议与既有实现保持一致改为 `open && trigger ? getOwnerDocument(trigger) :
undefined`。

- const ownerDocument = open ? getOwnerDocument(trigger) : undefined;

* const ownerDocument = open && trigger ? getOwnerDocument(trigger) : undefined;

─── packages/vue/src/ui/checkbox/styles.less:137-146 ───
[bug · medium] 禁用态选中样式会被 hover 覆盖导致视觉回归。

`&-disabled` 中的 `&.s-checkbox-wrapper-checked .s-checkbox-inner` 特异性为 (0,3,0)，而这里的 `&-checked
&:hover .s-checkbox-inner` 编译为 `.s-checkbox-wrapper-checked:hover .s-checkbox-inner`，特异性同为 (0,3,0)
且在源码中更靠后，因此**禁用 + 选中**的复选框中，鼠标 hover 会把灰底改成主色（color-mix 结果），禁用视觉失效。

同目录的 `radio/styles.less` 通过把 `.s-radio-wrapper-checked.s-radio-wrapper-disabled` 规则放在 checked
规则之后规避了该问题；checkbox 这里缺少同样的处理。建议给 hover 加上非禁用限定（注意不要写 `:not(&-disabled)`，在 `&-checked` 上下文里 `&` 会解析成
`.s-checkbox-wrapper-checked`，生成永不匹配的 `.s-checkbox-wrapper-checked-disabled`）。

-     &:hover .s-checkbox-inner {

*     &:not(.s-checkbox-wrapper-disabled):hover .s-checkbox-inner {
        background-color: var(
          --s-primary-color-hover,
          color-mix(in srgb, var(--s-primary-color, #1677ff) 80%, white)
        );
        border-color: var(
          --s-primary-color-hover,
          color-mix(in srgb, var(--s-primary-color, #1677ff) 80%, white)
        );
      }

─── packages/vue/src/ui/checkbox/Checkbox.vue:61-61 ───
[maintainability · low] 这里直接使用了全局
`getComputedStyle`，是全仓库唯一这样写的地方：`wave.ts`、`useThemeVariables.ts`、`useColumnDragPreview.ts` 都统一使用
`utils/dom.ts` 提供的 `getOwnerWindow(node)?.getComputedStyle(node)`，以便在 iframe / 非当前文档场景下解析的是节点所属
window。波纹节点是通过 `getOwnerDocument` 挂到目标所属 document 的，建议颜色解析也保持一致，避免跨文档时取到宿主文档的计算样式。

-     const themeColor = getComputedStyle(boxRef.value).getPropertyValue('--s-primary-color').trim();

*     const themeColor =
*       getOwnerWindow(boxRef.value)
*         ?.getComputedStyle(boxRef.value)
*         .getPropertyValue('--s-primary-color')
*         .trim() ?? '';

─── packages/vue/src/ui/select/styles.less:9-14 ───
[bug · medium] 尺寸修饰类的样式会被后面的基础规则覆盖，导致 small/large 尺寸实际不生效。
`.s-select-small .s-select-selector` 与后面 `.s-select { .s-select-selector { ... } }` 编译出的 `.s-select
.s-select-selector` 特异性完全相同（都是两个 class），而基础规则在源文件中更靠后，因此 `min-height` / `padding` / `font-size` /
`border-radius` 全部以后者的值（min-height:32px、padding:0 30px 0 11px、font-size:14px、radius-md）为准，small 与
large 看起来与 middle 完全一致。
建议把这些尺寸覆盖移到基础规则之后（或提升特异性，如 `.s-select.s-select-small .s-select-selector`），同时也便于 `&-middle`
与基础规则的重复声明合并。

─── packages/vue/src/ui/select/styles.less:55-56 ───
[bug · medium] `.s-select-open &` 编译后是后代选择器（`.s-select-open .s-select .s-select-selector`），而
`s-select-open` 类是加在根元素 `.s-select` 自身上的，不存在 `s-select-open` 祖先节点，因此展开时的边框高亮/阴影（此处）以及后续
`.s-select-arrow` 里的 `transform: rotate(180deg)`（同样写法）都不会生效。
建议改为同一元素上的修饰类写法，例如在 `.s-select` 内使用 `&.s-select-open .s-select-selector { ... }`、`&.s-select-open
.s-select-arrow { ... }`（与 `styles/dropdown.less` 中 `&-open` 的既有写法保持一致）。

─── packages/vue/src/hooks/useSTableColumnMetrics.ts:56-56 ───
[bug · low] `column.id in sizing` 会沿原型链查找：当列 id 命中 `constructor` / `toString` / `valueOf` 等原型键（列 id
常来自数据字段名，这类字段名真实存在）时，即使该列从未被拖拽调整过宽度，也会被判定为 `hasExplicitWidth: true`，从而输出固定 `<col width>`、不再参与
`table-layout: fixed` 的剩余宽度分配，与相邻列布局不一致。建议按仓库既有约定（`utils/resolveRowKey.ts` 中的
`Object.prototype.hasOwnProperty.call`）改用自身属性判断。

-           hasExplicitWidth: widthIds.has(column.id) || column.id in sizing,

*           hasExplicitWidth:
*             widthIds.has(column.id) || Object.prototype.hasOwnProperty.call(sizing, column.id),

─── packages/vue/src/hooks/useSTableFixedColumnModel.ts:137-137 ───
[maintainability · low] `firstVisibleLeaf ??= leaf;` 与 `lastVisibleLeaf = leaf;`
在同一个可见叶子的迭代中同时赋值，因此只要存在可见叶子，两者必定都已赋值，`!lastVisibleLeaf` 恒为 false，是实际不可达的判断（且与 `!firstVisibleLeaf`
重复）。建议删除，避免维护者误以为存在“有首个可见叶子但没有末个可见叶子”的状态。

-           if (!firstVisibleLeaf || !lastVisibleLeaf || !allVisibleLeavesPinned) continue;

*           if (!firstVisibleLeaf || !allVisibleLeavesPinned) continue;

─── packages/vue/src/hooks/useSTableColumnVirtual.ts:100-102 ───
[bug · low] `20` / `3`（以及 `estimateSize` 中的 `150`）是裸写的调优常量，且未做有限性校验：若调用方传入 `NaN`（例如 `columnOverscan:
Number(cfg.overscan)` 得到 NaN），`Math.max(0, Math.min(20, NaN))` 仍返回 `NaN` 并传入虚拟器，会污染
`getVirtualItems()` 的区间计算导致渲染窗口异常。建议抽为具名常量并补 `Number.isFinite` 兜底（core 的
`resolveFiniteSize`、`useSTableVirtual` 的 `PERFORMANCE_CONSTANTS` 已是同类做法）。

- const overscan = computed(() =>
-     Math.max(0, Math.min(20, Math.trunc(config.value?.columnOverscan ?? 3)))
- );

* const overscan = computed(() => {
*     const value = config.value?.columnOverscan;
*     // 非法值（NaN / Infinity）回退默认值，避免污染虚拟器区间计算。
*     const resolved = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 3;
*     return Math.max(0, Math.min(20, resolved));
* });

─── packages/vue/src/utils/column.ts:389-392 ───
[bug · medium] `STableColumnCommon` 的 `Omit` 列表遗漏了 `dataIndex`，但 `STableColumnBase` 中定义了
`dataIndex?: STableAccessorKey<TData>`。这导致 `STableDisplayColumn` / `STableGroupColumn` /
`STableAccessorFnColumn` 仍可声明 `dataIndex`，与注释「非法的 accessor/display/group 组合会在编译期被拒绝」相矛盾，也与这几个变体已声明的
`accessorKey?: never` 不对称。例如展示列带上 `dataIndex` 时，core 的 `normalizeColumn`（`column.accessorKey ??
column.dataIndex`）会把它当成数据列处理，产生非预期的取值行为。建议把 `dataIndex` 一并在 `Omit` 中排除，仅在
`STableDataIndexColumn`（已显式声明该字段）上保留。

type STableColumnCommon<TData extends RowData, TValue> = Omit<
STableColumnBase<TData, TValue>,

- 'id' | 'columns' | 'accessorKey' | 'accessorFn'

* 'id' | 'columns' | 'accessorKey' | 'accessorFn' | 'dataIndex'
  > ;

─── packages/vue/src/utils/columnIndex.ts:25-27 ───
[maintainability · low] `buildColumnIndex` 对重复列 ID 采用静默覆盖（`map.set` 只保留最后一次写入），对解析不到 ID 的列直接
`return` 跳过，两者均无任何告警（core 的 `normalizeColumn` 同样静默覆盖）。当列配置出现分组列与叶子列同名、内置列与业务列重名，或展示列漏写 `id`
时，问题只会在排序/筛选/编辑/拖拽行为异常时以「某列莫名失效」的形式暴露，排查成本较高。建议在 DEV 下对重复 ID 与空 ID 输出一次性告警（可复用 `columnTree.ts` 的
warn-once 机制），或明确去重策略。

─── packages/vue/src/utils/index.ts:2-2 ───
[maintainability · low] 该 barrel 自述为「内部工具统一入口，业务模块只依赖该目录，避免散落深层导入路径」，但导出清单缺少 `./column`，而它承载了
`STableColumn`、`STableColumns`、`STableAccessorColumn`、`createSTableColumnHelper`
等对外核心列类型。实际结果是内部模块（`types/`、`adapter/`、`components/`、`hooks/`）只能深层导入
`../utils/column`，与统一入口的约定不一致（`./column` 与其余模块也无命名冲突）。若此处是刻意排除，建议同步修正注释说明原因；否则建议补上该导出以保持入口一致。

─── packages/vue/src/ui/pagination/styles.less:24-29 ───
[bug · high] 尺寸修饰类被后面的基础规则覆盖，`small` / `large` 实际不生效。`&-small .s-pagination-item` 编译为
`.s-pagination-small .s-pagination-item`（特异性 0,2,0），而第 76 行的基础规则编译为 `.s-pagination
.s-pagination-item`（同为 0,2,0）却声明在后，因此基础规则胜出：`size="small"` 时 `min-width/height` 仍是
32px（`line-height:22px` + `height:32px` 还会导致数字错位），`&-large` 的 40px 与 `svg font-size:18px`
同样被基础规则吃掉（`.s-pagination-prev svg` 基础规则声明在第 133 行之后同样获胜）。建议把尺寸分支移到基础 `.s-pagination-item` 规则之后，或用
`&&-small/&&-middle/&&-large` 提升特异性。

- &-small {

* &&-small {
  font-size: 12px;

  .s-pagination-item {
  min-width: 24px;
  height: 24px;

─── packages/vue/src/ui/pagination/styles.less:11-14 ───
[bug · medium] 全局禁用态样式同样被基础规则覆盖。`&-disabled .s-pagination-item`（`.s-pagination-disabled
.s-pagination-item`，0,2,0）与 `&-disabled .s-pagination-item:hover`（0,3,0）都声明在第 76 行基础规则之前，而基础规则里的
`color: var(--s-color-text)`、`border-color` 与 `&:hover` 特异性相同且在后，因此只有 `cursor: not-allowed`
生效：`disabled` 时不带 `s-pagination-item-disabled` 类的页码按钮和省略号按钮仍显示正常文字色，看起来像可点击。建议同样用 `&&-disabled`
提升特异性或把该块移到基础规则之后。

- &-disabled {

* &&-disabled {
  .s-pagination-item {
  cursor: not-allowed;
  color: var(--s-color-text-quaternary, rgba(0, 0, 0, 0.25));

─── packages/vue/src/ui/radio/styles.less:18-21 ───
[bug · high] 尺寸与禁用等修饰符被写在了基础内部元素规则之前，导致同权重规则由后者胜出，`size` 实际不生效。

`&-small .s-radio-inner` 编译为 `.s-radio-wrapper-small .s-radio-inner`（权重 0,2,0），而基础块编译为
`.s-radio-wrapper .s-radio-inner`（同样 0,2,0），但基础块位于文件第 78-89 行、更靠后，Less 会按源码顺序把嵌套规则输出在修饰符之后，因此
`width/height: 16px` 会覆盖此处的 14px（`&-large` 的 18px 同理）。结果是 `size="small"/"large"` 只改变了文字字号，圆形尺寸恒为
16px。

建议按 `checkbox/styles.less` 的既有范式调整顺序（该文件第 14 行注释明确要求“内部元素必须在状态修饰符之前，确保 cascade
优先级正确”）：把「内部元素」基础块（`.s-radio` / `.s-radio-input` / `.s-radio-inner` /
`.s-radio-label`）整体前移到尺寸/禁用/hover 修饰符之前。

─── packages/vue/src/ui/radio/styles.less:43-44 ───
[bug · medium] 同一处顺序问题的另一表现：基础 `.s-radio-wrapper .s-radio-inner`（第 84 行 `background-color:
var(--s-color-bg-cell,
#fff)`）与本规则权重相同（0,2,0）但位于其后，会覆盖禁用态背景色，使“禁用且未选中”的单选框内部仍为白色（边框色因两者取值相同看不出差异）。将基础内部元素块前移即可一并修复。

─── packages/vue/src/utils/exportTable.ts:35-35 ───
[maintainability · low] 这里对内部列 id 的判定与 `constants.ts` 中已导出的 `isInternalColumn(id)` 完全重复。直接复用该
helper 可避免内部列前缀/规则调整时两处逻辑不一致（同时把上方 `import { INTERNAL_COLUMN_IDS } from '../constants';` 改为 `import
{ isInternalColumn } from '../constants';`）。

-     skipColumn: (column) => Boolean(column.id && INTERNAL_COLUMN_IDS.has(column.id)),

*     skipColumn: (column) => isInternalColumn(column.id),

─── packages/vue/src/utils/cachedCell.ts:12-12 ───
[maintainability · medium] 这里直接读取并写入 TanStack 的非公开内部字段 `_cellsCache`，并与 `constructCell` 组成唯一的 Cell
创建入口。当前的 identity 行为已由测试（performance-hot-paths）锁定，但该字段不在公开契约内：如果上游把缓存改成按列 ID 索引的 Map、或更换 Cell
创建入口，同一个 (row, column) 会派生出两个不同的 Cell 实例，破坏 `useBodyRowRendering` / `useSTableCellRange` 依赖的
identity 与选择状态（编译期只能拦住类型变化，拦不住索引键变化）。建议在此处集中做一次显式的“内部适配”封装（内部类型声明 + 注释说明来源与升级风险，并提供 `row.getCell()`
/ `getAllCells()` 降级路径），避免该依赖散落到业务代码中。

─── packages/vue/src/utils/cellRangeClipboard.ts:45-45 ───
[bug · medium] 表头行取的是 `getColumnIds()`（`table.getCellSelectionColumnIds()`，即全部可参与框选的业务列），而数据行来自
`getSelectedValues()`（`table.getSelectedCellRangesData().at(-1)`，只取最后一个范围）。两者列集合并不保证一致：当框选只覆盖部分列，或存在
多个范围（并集 vs 最后一个范围）时，开启 `includeHeaders` 会出现表头列数 ≠ 数据列数，粘贴到 Excel/WPS 后会整列错位。建议表头与值矩阵使用同一来源（同一范围的列
ID），或在长度不一致时显式降级/告警。

─── packages/vue/src/utils/cellRangeClipboard.ts:43-43 ───
[bug · low] `??` 只兜底 null/undefined，调用方传入空串 `delimiter: ''` 时不会回退到制表符；此时 `escapeCopiedValue` 中的
`text.includes('')` 恒为 true，所有字段都会被强制加引号，且 `join('')` 会把列直接拼在一起，复制文本完全错乱。建议对空串同样回退默认分隔符（或做参数校验）。

-     const delimiter = options.delimiter ?? '\t';

*     const delimiter = options.delimiter || '\t';

─── packages/vue/src/utils/rowState.ts:37-38 ───
[maintainability · low] 这里用 64 与 `k·log2(k) >= n`
的启发式决定“顺序扫描行模型”还是“收集后排序”，属于不易自解释的复杂度取舍，后续维护者难以判断阈值与条件是否仍然成立。建议抽成具名常量并补齐注释（说明 k 为命中数、n 为 flatRows
长度，以及切换依据）。

- // 扫描行模型为 O(n)，收集后排序为 O(k·log2 k)；当排序代价更大时直接按已有行顺序扫描。
- const SCAN_ORDER_MIN_ACTIVE = 64;
  const scanRowsInOrder =

*     activeIds.length >= 64 && activeIds.length * Math.log2(activeIds.length) >= flatRows.length;

-     activeIds.length >= SCAN_ORDER_MIN_ACTIVE &&
-     activeIds.length * Math.log2(activeIds.length) >= flatRows.length;

─── packages/vue/src/ui/select/Select.vue:100-100 ───
[bug · high] 多选模式下点击选项后下拉会保持展开，但选项是 Teleport 到 body 且**不可聚焦**的 `div`（无 `tabindex`）。浏览器在 mousedown
的默认行为中会把当前焦点从 `role="combobox"` 触发区移走（落到 `body`），而 `keydown` 监听只挂在触发区上，于是之后
`ArrowDown`/`Escape`/`Enter` 等键盘操作全部失效，键盘用户必须先重新点击触发区才能继续操作；同时 `aria-activedescendant` 这种“焦点留在
combobox 上”的模式也因此失效（单选模式靠 `closeDropdown(true)` 恢复焦点掩盖了该问题，多选模式无此兜底）。建议在选项或下拉容器上阻止 mousedown
的默认行为以保留焦点（或每次选择后用 `nextTick` 把焦点交还 `triggerRef`）。

-           @mousedown.prevent
            @click="selectOption(option)"

─── packages/vue/src/ui/select/Select.vue:256-256 ───
[bug · low] 下拉面板由 `floatingSize` 中间件设置了 `max-height: min(availableHeight, 256)` 且样式为 `overflow-y:
auto`，但 `activeIndex` 变化时没有任何滚动处理：当选项较多时，用方向键/Home/End
走到可视区之外的选项后，用户看不到当前高亮项（`aria-activedescendant` 指向的元素也不在视口内）。建议在 activeIndex 变化后（`nextTick` 中）对
`getOptionId(activeIndex)` 对应元素执行 `scrollIntoView({ block: 'nearest' })`。

─── packages/vue/src/utils/exportCsv.ts:8-8 ───
[maintainability · low] 该类型在同一个 barrel 下被重复导出：`utils/exportTable.ts` 已在其 `export type { ... }` 列表中导出
`STableExportRowIndexResolver`，而 `utils/index.ts` 通过 `export * from './exportTable'` 与 `export *
from './exportCsv'` 合并两者。同名符号来自两条 `export *` 路径会让 barrel 出现来源歧义（TS 可能报 TS2308，或该名称在 barrel
中被静默丢弃），后续维护者也难以判断唯一出口。建议只保留 `exportTable.ts` 一处（它与该类型的声明位置一致），此处删除。

─── packages/vue/src/utils/resolveRowKey.ts:18-22 ───
[performance · low] 该包装函数会被 `useSTable.getRowId` 按行调用（Core Row Model 每次重建都会走一遍，仓库自身基准覆盖 100K
行场景），而这里每行都会新建一个 `{ onInvalid }` 对象和一个箭头闭包，属于典型的「每行热路径额外分配」。建议把带 DEV 判定的回调提升为模块级常量复用，行为与
DEV/生产分支完全不变：

```ts
const devRowKeyWarningOptions = {
  onInvalid: (message: string) => {
    if (import.meta.env?.DEV) console.warn(message);
  },
};
```

- resolveCoreRowKey(record, index, rowKey, {
-     onInvalid: (message) => {
-       if (import.meta.env?.DEV) console.warn(message);
-     },
- });

* resolveCoreRowKey(record, index, rowKey, devRowKeyWarningOptions);

─── packages/vue/src/utils/cellRangeClipboard.ts:19-20 ───
[maintainability · low] 这段「分隔符转义 + 公式注入防护」与 core 的 `exportCsv.ts`（`quoteDelimitedValue` /
`protectFormula`，已被 `buildCsvContent`、`buildCsvBlobAsync` 等导出能力使用）是两份彼此独立的实现，而它们必须长期保持同一套规则（RFC4180
引号转义、`= + - @`/制表符/回车前缀加 `'`）。本模块本身是无 Vue 依赖的纯文本序列化，建议把该规则下沉到 core
并导出后复用（或至少共用同一转义函数），否则后续只调整其中一处，会让「导出 CSV」与「框选复制」在转义/防注入行为上产生偏差。

LLM retry report summary: 1 of 3295 requests affected -- 1 request cancelled

Context compaction (1 request):

- docs/demos/s-table/cell-range-copy.vue,docs/demos/s-table/cell-range.vue,docs/demos/s-table/editing.vue,docs/demos/s-table/events.vue,docs/demos/s-table/instance-actions.vue,docs/demos/s-table/row-selection.vue,docs/demos/s-table/selection-actions.vue: cancelled (HTTP 200)

Per-attempt detail: --format json (retry_report).
