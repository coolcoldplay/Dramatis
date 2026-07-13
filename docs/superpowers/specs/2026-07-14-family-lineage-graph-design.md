# Dramatis 谱系关系图设计规格

**状态：** 已确认设计方向，待用户复核书面规格  
**日期：** 2026-07-14  
**目标版本：** JSON v5 / 家系图 v2  
**选定方案：** 方案 B，人物节点 + 关系事件节点 + 分层谱系布局

## 1. 背景

当前家系图从 `links[].familyRelation` 读取 `parent`、`child`、`spouse`、`sibling` 四种二元关系，再把人物强制组合成树状的夫妻单元。该实现可以覆盖简单的父母、配偶、子女结构，但无法可靠表达多配偶、多成员伴侣关系、不同关系所生子女、收养、监护、争议亲子、传闻关系和跨支系关系。

现有算法中，一个人物只能通过 `spouseList[0]` 进入一个夫妻单元。复杂关系实测显示：第二任配偶会被孤立，其子女会被错误挂到第一段婚姻下面。亲子关系成环时，布局可能返回无效横坐标；兄弟关系补全父母也不能正确处理传递分组。当前家系图还忽略隐藏状态和剧集进度，并缺少搜索、筛选、折叠、关系图例、诊断和详情检查器。

代码层面，`index.html` 约 6550 行，家系功能仍内嵌其中；根目录的 `ft-build.js`、`ft-layout.js`、`ft-render.js` 是另一套未接入且参数已经不同的实现。现有测试没有覆盖家系数据、布局和渲染。

## 2. 产品目标

1. 正确表达复杂虚构谱系，不限制配偶、父母、子女或关系参与者数量。
2. 保留从上到下阅读世代的直觉，同时允许关系图而非纯树结构。
3. 对近亲、跨代、多成员、非婚、收养、争议和超自然关系采用中性事实表达，不施加伦理拦截。
4. 复杂或矛盾数据必须显式提示，不能静默画错或丢弃。
5. 500 人、1000 条家系关系规模下，布局和浏览应保持流畅。
6. JSON v4 数据无需人工修改即可导入，现有普通关系网继续工作。
7. 把家系子系统从 `index.html` 中拆出，建立可单元测试的模块边界。

## 3. 非目标

- 不在本阶段实现从小说或剧本文本自动抽取家系关系。
- 不重写主关系网的力导向布局和现有剧情时间轴。
- 不对人物关系作道德判断，也不自动屏蔽现实中少见或敏感的关系。
- 不在首版实现完整的王位继承模拟、法律判定或遗传学计算。
- 不引入后端、账号、协作编辑或云存储。
- 不以自由拖拽排版代替自动布局；手工顺序提示可以后续加入。
- 首版继续使用 SVG 静态分层渲染；Canvas 混合渲染仅在超过性能目标时再评估。

## 4. 核心设计原则

### 4.1 家系是关系图，不是树

人物是稳定实体，婚姻、伴侣、亲子、监护、兄弟和继承是独立的关系事件。布局可以表现为世代图，但数据不能依赖“每人只有一个配偶”“每个孩子只有一对父母”等假设。

### 4.2 关系事件是多方关系

一条家系关系由多个参与者及其角色构成。婚姻可以有两个或更多参与者；亲子关系必须包含一个孩子和一个或多个父母；兄弟关系可以包含两个或更多成员。布局时，关系事件被转换成小型连接枢纽，避免用多条人物直连线制造歧义。

### 4.3 不静默修复

缺失端点、亲子环、重复关系或世代矛盾保留在数据中，并进入诊断列表。布局可以排除无法显示的关系或将其画成异常回边，但不得偷偷改写父母、配偶或子女。

### 4.4 布局与交互解耦

布局只在打开视图、修改结构、切换影响布局的筛选或主动点击“重新布局”时运行。选中、搜索、高亮和打开详情不得重新计算坐标，因此查看局部关系不会导致全图跳动。

## 5. JSON v5 数据模型

### 5.1 顶层字段

JSON v5 在现有字段基础上新增：

```json
{
  "version": 5,
  "nodes": [],
  "links": [],
  "familyRelations": [],
  "familyView": {},
  "tagCategories": []
}
```

`familyRelations` 是家系视图的权威数据。`links[].familyRelation` 仅作为 v4 兼容输入；当顶层 `familyRelations` 存在时，家系视图不再从普通 links 重复推断。

### 5.2 人物扩展字段

现有节点字段全部保留，并允许以下可选字段：

```json
{
  "id": "N1",
  "name": "Aureliano Buendia",
  "aliases": ["Colonel Aureliano Buendia"],
  "titles": ["Colonel"],
  "birth": { "year": 1840, "label": "约 1840" },
  "death": { "year": 1910, "label": "约 1910" },
  "generationLabel": "第二代"
}
```

家族、阵营和支系继续优先使用现有标签分类，避免再造一套 house/faction 字段。`aliases` 用于搜索和重名区分；`generationLabel` 是显示提示，不参与世代计算。

### 5.3 家系关系结构

```json
{
  "id": "F1",
  "kind": "union",
  "subtype": "marriage",
  "participants": [
    { "nodeId": "N1", "role": "partner" },
    { "nodeId": "N2", "role": "partner" }
  ],
  "contextId": null,
  "status": "active",
  "certainty": "confirmed",
  "label": "married",
  "time": {
    "start": { "year": 1860, "label": "1860" },
    "end": null
  },
  "episodes": [],
  "evidence": [],
  "notes": "",
  "hidden": false
}
```

字段约束：

- `id`：唯一，推荐 `F1`、`F2`。
- `kind`：`union`、`parentage`、`kinship`、`succession`、`other`。
- `subtype`：由 kind 决定的开放枚举；未知值必须保留并按 `other` 显示。
- `participants`：至少两个参与者，每个参与者包含 `nodeId` 和 `role`。
- `contextId`：可选，亲子事件可以引用相关 union，便于布局把子女接到正确的家庭单元。
- `status`：可选状态；选项由 kind 决定。
- `certainty`：`confirmed`、`probable`、`rumored`、`disputed`、`unknown`。
- `time`：可同时表达作品内年份和季/集/sequence；任一部分均可省略。
- `episodes`：继续兼容现有剧情进度过滤。
- `evidence`：来源与定位信息，不要求首版自动生成。
- `hidden`：控制关系是否默认参与家系视图。

### 5.4 kind、subtype 与角色

`union`：

- subtype：`marriage`、`partnership`、`betrothal`、`affair`、`political_union`、`former_union`、`other`
- participant role：`partner`
- status：`active`、`ended`、`annulled`、`widowed`、`unknown`

`parentage`：

- subtype：`biological`、`adoptive`、`legal`、`guardian`、`step`、`surrogate`、`supernatural`、`other`
- participant role：一个 `child`，一个或多个 `parent`
- status：`acknowledged`、`unacknowledged`、`disputed`、`unknown`

如果同一孩子与不同父母具有不同亲子类型，应拆成多个 parentage 事件，不强行合并。共享 `contextId` 的事件可以在视觉上接入同一个 union 枢纽。

`kinship`：

- subtype：`sibling`、`half_sibling`、`twin`、`step_sibling`、`other`
- participant role：`member`

兄弟关系通常由共同 parentage 推导；显式 kinship 用于父母未知、叙事只确认手足关系或特殊关系。系统不得再自动虚构父母占位节点，除非用户主动启用“显示推断占位”。该开关只影响显示，不写回数据。

`succession`：

- subtype：`heir`、`claimant`、`designated_successor`、`other`
- participant role：`predecessor`、`successor`

succession 仅作为可选叠加层，不影响世代计算。

### 5.5 时间点

```json
{
  "year": 1860,
  "label": "征服后 283 年",
  "season": 3,
  "episode": 5,
  "sequence": 2
}
```

`year` 用于排序时必须是数字；`label` 用于显示虚构纪年或模糊日期。存在 season/episode 时继续遵循当前剧情时间轴。两套时间可以同时存在，视图按用户选择的时间维度过滤。

### 5.6 家系视图设置

```json
{
  "layoutMode": "lineage",
  "houseTagCategoryId": null,
  "generationGap": 150,
  "branchGap": 48,
  "componentGap": 120,
  "collapsedNodeIds": []
}
```

只保存影响布局或用户长期组织结果的设置。临时搜索词、高亮节点、当前检查器和临时筛选不写入 JSON。

## 6. v4 兼容与迁移

### 6.1 权威来源

1. 如果输入包含非空 `familyRelations`，它是唯一权威家系来源。
2. 如果没有 `familyRelations`，从 `links[].familyRelation` 生成运行时 familyRelations。
3. 原始普通 links 保留，用于主关系图；家系视图不重复读取它们。
4. 标准导出写入 version 5 和 familyRelations。可映射的旧 link 字段可以保留，但不再作为权威来源。

### 6.2 映射规则

- `parent`：source 为 parent，target 为 child，生成一个 parentage 事件。
- `child`：source 为 child，target 为 parent，生成一个 parentage 事件。
- `spouse`：生成 union/marriage 事件，status 和 certainty 为 unknown。
- `sibling`：生成 kinship/sibling 事件，不补父母。

旧数据没有 subtype、status、certainty 和 contextId，迁移时不得猜测；统一使用保守默认值。多个旧 parent link 不自动合并，以避免把不同亲子性质错误归入同一家庭单元。渲染器可以在不改变数据的前提下合并视觉连接。

### 6.3 导出

- 默认：JSON v5，完整保留复杂关系元数据。
- 兼容导出：将可表达的二元关系压平为 v4 familyRelation，并在导出前列出无法表达的多成员、争议和时间元数据。
- 如果兼容导出会丢失关系，必须由用户确认，不能静默降级。

## 7. 系统架构

### 7.1 文件边界

- `src/family/family-schema.js`：v5 规范化、默认值、v4 迁移、导出转换。
- `src/family/family-index.js`：人物、关系、父母、子女、祖先、后代、关系上下文和组件索引。
- `src/family/family-validator.js`：结构诊断、重复关系、缺失端点、世代矛盾和亲子环检测。
- `src/family/family-layout.js`：把 familyRelations 转成布局图，生成 ELK 配置并规范化布局结果。
- `src/family/family-layout-worker.js`：在可用环境中执行 ELK 布局并返回可序列化结果。
- `src/family/family-renderer.js`：SVG keyed join、连线路由、关系枢纽、LOD 和高亮差分。
- `src/family/family-view.js`：打开/关闭、状态协调、筛选、搜索、聚焦、折叠和键盘交互。
- `src/family/family-editor.js`：家系关系结构化编辑器与诊断修复入口。
- `src/family/family-export.js`：PNG/SVG 导出，不依赖屏幕当前缩放。
- `styles/family-tree.css`：家系工作区样式与响应式规则。
- `vendor/elk.bundled.js`、`vendor/elk-worker.min.js`：固定版本的布局依赖及许可证。

模块继续使用当前项目的 UMD/no-build 模式，可以直接由 script 标签加载并在 Node 测试中 require。家系拆分只处理相关代码，不顺带重构其他侧栏和主图功能。

### 7.2 数据流

```text
JSON 导入
  -> family-schema 规范化/迁移
  -> family-index 建立 O(N+E) 索引
  -> family-validator 生成诊断
  -> family-layout 生成关系枢纽图
  -> Worker/ELK 计算静态坐标与正交路由
  -> family-renderer 一次性 keyed render
  -> 搜索/高亮/检查器只更新 class 与局部内容
```

结构变更使布局缓存失效；视觉筛选只有在影响节点集合或关系集合时才使缓存失效。选中、高亮、缩放和平移不使布局失效。

### 7.3 Worker 与 file:// 回退

通过 HTTP/HTTPS 打开时优先使用 Worker，避免大图布局阻塞界面。直接通过 `file://` 打开时，如果浏览器阻止本地 Worker，则回退到主线程 ELK，并显示非阻塞的布局进度遮罩。回退模式必须功能完整，但大型数据会提示“通过本地服务打开可获得更流畅布局”。

## 8. 布局设计

### 8.1 内部布局图

- Person 转换为固定尺寸人物节点。
- union 转换为小型 union hub，参与者连接到 hub。
- parentage 转换为 parentage hub；如果 contextId 指向可见 union，则复用 union hub 的子女出口。
- kinship 作为同代辅助边，不参与基本世代约束。
- succession 是可选叠加边，不参与基本世代约束。

### 8.2 世代约束

parentage 的 parent 必须位于 child 上一层或更高。union 参与者尽量同层，但这是软约束；跨代关系允许存在并通过跨层边表达。`generationLabel` 只做排序提示，不能覆盖明确亲子关系。

验证器先对亲子图执行强连通分量检测。正常部分进入分层布局；环内人物保持相近层级，造成环的边以“异常回边”绘制，并在诊断中列出。任何情况下都不得返回 NaN/Infinity 坐标。

### 8.3 多组件与家族分区

断开的家系组件先分别布局，再按面积进行紧凑矩形打包，禁止像当前实现一样简单横向排成一长列。`componentGap` 控制组件间距。

`house` 模式读取用户选择的标签分类，把家族作为 lane/区域软约束；跨家族婚姻位于区域交界或通过跨区连线表达。标签只影响分区，不改变亲子世代。

### 8.4 稳定性

布局排序使用稳定键：用户顺序提示、出生年、原始数组顺序、人物 ID。相同数据和设置必须产生相同坐标。重新打开、搜索或点击人物时节点不能无理由换位。

## 9. 家系工作区

### 9.1 顶部栏

- 标题改为“谱系图”。
- `谱系`、`家族分区`、`聚焦`使用分段控制。
- 搜索复用主图的精确/模糊规则；精确模式只匹配名称与 aliases。
- 提供适应视图、重新布局、导出、说明和关闭按钮。
- 影响结构的布局期间显示进度和取消入口。

### 9.2 左侧筛选栏

- 关系层：亲子、伴侣、手足、继承。
- 亲子 subtype：生物、收养、法律、监护、继亲、代理、超自然、其他。
- certainty：确认、可能、传闻、争议、未知。
- `包含已隐藏人物/关系` 默认关闭。
- `遵循当前剧集进度` 默认开启。
- 家族标签分类选择、世代间距、支系间距和组件间距。

窄屏下左侧栏变为抽屉，不与画布并排挤压。

### 9.3 右侧检查器

点击人物后显示：姓名、别名、称号、年代、标签、父母、子女、伴侣、手足、继承关系、关系状态、certainty、时间和 evidence。每条关系可以直接进入结构化编辑器。

点击关系枢纽后显示该事件的全部参与者和元数据。检查器打开或关闭不得触发布局。

### 9.4 聚焦与折叠

- 单击人物：高亮其直接家系关系，其他内容变暗，不移动节点。
- 双击人物或点击“聚焦”：只显示指定深度的祖先、后代、伴侣和手足。
- 分支折叠：在人物卡片旁显示折叠按钮与隐藏后代数量。
- 折叠状态存入 `familyView.collapsedNodeIds`。
- “返回全图”恢复视图，不改变数据。

### 9.5 诊断面板

顶部显示诊断计数。诊断分为：

- error：缺失人物、重复 ID、无 child 的 parentage 等无法布局的问题。
- warning：亲子环、世代矛盾、多个高置信度冲突亲子关系、未知 contextId。
- info：重复关系、缺少时间、未关联家族标签等可改进项。

诊断只描述数据事实，不把多配偶、近亲、多父母、跨代或超自然关系本身标为错误。系统可以计算共同祖先距离并显示“近亲关系”信息徽标，但不阻止保存。

## 10. 视觉设计

### 10.1 人物卡片

- 稳定尺寸约 132 x 60px，长姓名最多两行，不能溢出。
- 主行显示姓名；副行优先显示 generationLabel、年代、别名或称号。
- 可选头像位于左侧；无头像时显示首字母。
- 家族/阵营用左侧色条或小徽标，不用整张卡片染成单一色。
- 性别作为可选小徽标，不再通过方形/圆形强制编码。
- 聚焦、搜索、争议和折叠使用独立状态样式。

### 10.2 关系编码

- 确认的生物亲子：实线。
- 收养、法律和监护：点线，并使用关系徽标。
- 传闻或争议：虚线，增加 certainty 标记。
- union：人物连接到小型关系枢纽；婚姻、非婚、订婚、政治结合通过枢纽徽标区分。
- succession：单独开关的定向叠加线。
- 颜色主要表示家族/阵营；关系语义必须同时使用线型、图标或文字，不能只靠颜色。

### 10.3 信息密度与 LOD

- 远景：人物卡片简化为姓名和家族色条，隐藏次要徽标与关系文字。
- 中景：显示姓名、副标题和主要关系徽标。
- 近景：显示年代、状态、certainty 和折叠控制。

LOD 只改变显示内容，不改变节点尺寸或布局坐标，避免缩放时跳动。

### 10.4 可访问性

- 所有工具按钮具有可访问名称和至少 44px 的点击区域。
- 使用 `:focus-visible` 明确键盘焦点。
- 全屏家系工作区使用适当的 dialog/region 语义，打开时移动焦点，关闭时恢复到入口按钮。
- Esc 关闭抽屉/检查器，最后关闭家系工作区。
- 关系状态不能只用颜色表达。
- 减少动态效果模式下关闭非必要过渡。

## 11. 性能设计

### 11.1 目标

在当前开发机器和 Chromium 中：

- 100 人 / 200 条家系关系：打开并完成布局不超过 500ms。
- 500 人 / 1000 条家系关系：不超过 1.5s。
- 1000 人 / 2000 条家系关系：不超过 3s，并保持界面可响应。
- 布局完成后的平移和缩放目标为 55 FPS 以上。
- 搜索、高亮和打开检查器不得触发超过 100ms 的主线程任务。

性能指标以自动化 benchmark 和浏览器 PerformanceObserver 记录为准；若 CI/机器性能差异较大，同时保存相对基线。

### 11.2 手段

- 索引构建和迁移保持 O(N+E)，禁止在关系循环中反复 `Array.find`。
- ELK 输入和输出只包含可序列化的必要字段。
- 使用结构哈希缓存布局结果；搜索与高亮复用索引。
- SVG 使用稳定分层、keyed join 和单一 zoom transform，不在平移缩放时重建节点。
- 事件委托代替为每个子元素绑定多个监听器。
- 头像延迟加载；远景不绘制不必要的文字和徽标。
- 布局中的大任务放入 Worker；file:// 回退明确提示性能差异。

## 12. 错误处理

- JSON 解析失败：保持现有画布不变并指出具体字段路径。
- 无家系关系：显示空状态和“创建家系关系”入口，不弹阻断式 alert。
- 缺失参与者：关系保留在 state 和导出中，但不进入布局，并出现在诊断面板。
- Worker 失败：自动重试一次主线程布局，并给出降级提示。
- ELK 返回异常坐标：拒绝应用该结果，保留上次有效布局并显示诊断。
- 导出失败：回收临时 URL/Canvas，显示可重试错误，不关闭家系工作区。

## 13. 测试策略

### 13.1 单元测试

- `tests/family-schema.test.cjs`：v5 规范化、未知枚举保留、v4 迁移、兼容导出。
- `tests/family-index.test.cjs`：父母、子女、祖先、后代、组件和关系上下文索引。
- `tests/family-validator.test.cjs`：缺失端点、重复、亲子环、世代矛盾和诊断严重度。
- `tests/family-layout.test.cjs`：多配偶、多家庭单元、断开组件、稳定排序、无无效坐标。
- `tests/family-render-model.test.cjs`：LOD、线型、显示过滤和折叠模型。
- `tests/family-performance.test.cjs`：100/200、500/1000、1000/2000 合成数据基准。

### 13.2 Fixture

- `tests/fixtures/family/simple-v5.json`
- `tests/fixtures/family/twin-peaks-v4.json`
- `tests/fixtures/family/multiple-unions.json`
- `tests/fixtures/family/multiple-parent-types.json`
- `tests/fixtures/family/disputed-parentage.json`
- `tests/fixtures/family/repeated-names.json`
- `tests/fixtures/family/parentage-cycle.json`
- `tests/fixtures/family/disconnected-houses.json`
- `tests/fixtures/family/large-synthetic.json`

Fixture 使用虚构中性数据，不依赖人工点击才能复现。

### 13.3 浏览器和视觉测试

- 导入真实 v4 JSON，打开家系图并验证迁移后的节点和关系数量。
- 复杂多配偶用例必须把不同子女接到正确关系单元。
- 点击、搜索、打开检查器不得改变未受影响节点坐标。
- 切换隐藏状态、剧集、certainty 和家族分区后重新布局正确。
- 1440x900、1920x1080、390x844 视口无工具栏溢出、文字遮挡和抽屉重叠。
- 键盘完整遍历、Esc 层级关闭和焦点恢复。
- PNG/SVG 导出包含完整图例、关系线型和中文文字。

## 14. 交付阶段

### 阶段 1：数据基础

完成 family-schema、v4 迁移、family-index、validator、fixture 和 JSON-SPEC v5 文档。该阶段不替换现有家系按钮。

### 阶段 2：布局内核

引入固定版本 ELK、Worker、关系枢纽转换、多组件打包、环诊断、布局缓存和基准测试。通过纯数据测试确认复杂关系不会画错。

### 阶段 3：家系工作区

实现 family-renderer、family-view、顶部栏、筛选抽屉、检查器、聚焦、折叠、搜索和诊断面板。家系代码从 index.html 移出。

### 阶段 4：编辑与导出

实现结构化关系编辑器、v5 导出、v4 兼容导出提示、PNG/SVG 导出和 familyView 设置持久化。

### 阶段 5：性能与视觉验收

运行所有单元、浏览器、视觉和性能测试；使用真实复杂 JSON 修复卡顿、遮挡、响应式和可访问性问题。完成后删除旧内嵌家系实现以及未接入的根目录 ft 文件。

各阶段在独立提交中保持可测试；新家系入口只在阶段 3 达到基础功能对等后切换。旧实现删除安排在最终验收阶段，便于分支内比较和回滚。

## 15. 验收标准

1. v4 示例无需人工修改即可打开，标准导出升级到 v5。
2. 一人多段或多成员 union 全部可见，每个孩子连接到正确 parentage/union。
3. 收养、监护、争议、传闻、非婚、政治、近亲和超自然关系可录入、筛选和辨识。
4. 亲子环和缺失端点显示诊断，不出现 NaN、空白画布或静默丢失。
5. 隐藏状态和当前剧集默认与主图一致，并可在家系视图中覆盖。
6. 搜索、点击、高亮、检查器和缩放不触发全图重排。
7. 断开家族紧凑打包，家族分区模式保持世代可读。
8. 500 人/1000 关系达到性能目标，1000 人/2000 关系保持可操作。
9. 桌面和移动视口无控制溢出、文字遮挡或不可达操作。
10. 家系模块具有完整单元测试、浏览器测试和更新后的 JSON-SPEC。

