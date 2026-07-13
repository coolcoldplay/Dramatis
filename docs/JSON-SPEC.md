# Dramatis 人物关系图 JSON 数据规范

当前版本：`version: 5`
更新日期：2026-07-14

本规范对应 Dramatis 当前的 JSON 导入、JSON 导出、主人物关系网和谱系图。v5 新增独立的 `familyRelations` 与 `familyView`，用于无损表达多段婚姻、多方伴侣、收养、监护、争议亲子、继承等复杂家系关系。

## 1. 顶层结构

```json
{
  "version": 5,
  "title": "作品或数据集名称",
  "description": "数据集说明",
  "sources": [],
  "coveragePolicy": {},
  "episodeGuide": [],
  "nodes": [],
  "links": [],
  "familyRelations": [],
  "familyView": {},
  "tagCategories": [],
  "nextId": 1,
  "linkTypes": {},
  "graphStyle": {},
  "graphBackgroundColor": "#0d0e12",
  "clusterSpacing": 1,
  "topologySizing": { "mode": "none", "strength": 0.65 },
  "forceConfig": {}
}
```

| 字段 | 类型 | 状态 | 说明 |
|---|---|---|---|
| `version` | number | 推荐 | 当前标准导出固定写 `5`。v4 仍可直接导入。 |
| `title` | string | 可选 | 数据集标题；导入和标准导出会保留。 |
| `description` | string | 可选 | 数据集用途或覆盖范围说明；导入和标准导出会保留。 |
| `sources` | array | 可选 | 来源列表，可包含 `id`、`label`、`url`、`usage`。 |
| `coveragePolicy` | object | 可选 | 收录、排除和时间精度规则等数据说明。 |
| `episodeGuide` | array | 推荐 | 逐集标题、日期、摘要和关联节点；回顾模式会在时间线显示。 |
| `nodes` | array | 必需 | 人物、事件、地点等节点。 |
| `links` | array | 必需 | 主关系网中的二元剧情关系或行动。 |
| `familyRelations` | array | 推荐 | 谱系图的权威多方关系数据。非空时不再从 `links[].familyRelation` 重复推断。 |
| `familyView` | object | 推荐 | 谱系布局模式、间距和折叠状态。 |
| `tagCategories` | array | 推荐 | 标签分类，可用于主图分群和谱系图家族分区。 |
| `nextId` | number | 推荐 | 新建普通节点/连线/标签时使用的计数器。导入后会自动修正。 |
| `linkTypes` | object | 推荐 | 主图 `relation` / `action` 连线样式。 |
| `graphStyle` | object | 可选 | 主图节点名称、缩放等视觉设置。 |
| `graphBackgroundColor` | string | 可选 | 主画布背景色。 |
| `clusterSpacing` | number | 可选 | 主图标签分群间距，范围 `0.5` 到 `2.4`。 |
| `topologySizing` | object | 可选 | 主图按拓扑属性调节节点大小。 |
| `forceConfig` | object | 可选 | 主图力导向参数。 |

### 1.1 `episodeGuide`

```json
{
  "season": 2,
  "episode": 1,
  "raw": "S2E1",
  "title": "愿巨人与君同在",
  "englishTitle": "May the Giant Be with You",
  "airDate": "1990-09-30",
  "summary": "本集剧情摘要。",
  "sourceUrl": "https://example.com/episode-1",
  "eventNodeIds": ["event-s2e01-a"],
  "participantNodeIds": ["person-a", "person-b"]
}
```

`season` 与 `episode` 必须为正整数。同一季同一集只保留第一条记录，并按季、集排序。`eventNodeIds` 与 `participantNodeIds` 用于审计和后续逐集聚焦；当前时间线使用标题、播出日期和摘要，并按该集累计显示当时已出现的节点与连线。

## 2. `nodes`

基础字段：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 唯一 ID，推荐 `N1`、`N2`。 |
| `name` | string | 是 | 节点显示名称。 |
| `gender` | string | 否 | 可选人物属性，不影响关系合法性。 |
| `avatar` | string/null | 否 | 头像 data URL。 |
| `notes` | string | 否 | 备注；模糊搜索会检索。 |
| `tags` | object | 否 | `{ "分类ID": "标签ID" }`。 |
| `episodes` | array | 否 | 首次出现或相关剧集。 |
| `hidden` | boolean | 否 | 默认是否隐藏。 |
| `x`,`y` | number | 否 | 主力导图坐标。 |
| `fx`,`fy` | number/null | 否 | 主图固定坐标。谱系图不读取这些坐标。 |

谱系图可选扩展字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `aliases` | string[] | 别名；主图和谱系图的名称搜索都同时匹配姓名与别名。 |
| `titles` | string[] | 称号、职位或爵位。 |
| `birth`,`death` | TimePoint | 出生/死亡年代与显示文本。 |
| `generationLabel` | string | 显示用世代标签，不覆盖亲子关系计算。 |

```json
{
  "id": "N1",
  "name": "Aureliano Buendia",
  "aliases": ["Colonel Aureliano Buendia"],
  "titles": ["Colonel"],
  "birth": { "year": 1840, "label": "约 1840" },
  "death": { "year": 1910 },
  "generationLabel": "第二代",
  "notes": "",
  "tags": { "C1": "T1" },
  "episodes": [],
  "hidden": false
}
```

## 3. `links`：主关系网二元连线

`links` 继续服务于剧情、行动和一般人物关系。它不是复杂谱系的权威来源。

```json
{
  "id": "L1",
  "source": "N1",
  "target": "N2",
  "label": "investigates",
  "type": "action",
  "directed": true,
  "episodes": [{ "season": 1, "episode": 1, "raw": "S1E1" }],
  "notes": "",
  "hidden": false,
  "familyRelation": ""
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 唯一连线 ID。 |
| `source`,`target` | string | 必须指向存在的 `nodes[].id`，否则导入时丢弃该 link。 |
| `label` | string | 连线注释。 |
| `type` | string | `relation` 或 `action`。 |
| `directed` | boolean | 兼容字段；渲染主要读取 `linkTypes[type].directed`。 |
| `episodes` | array | 剧集进度。 |
| `notes` | string | 连线备注。 |
| `hidden` | boolean | 是否隐藏。 |
| `familyRelation` | string | 仅用于 v4 迁移：`parent`、`child`、`spouse`、`sibling`。新数据应优先写 `familyRelations`。 |

## 4. `familyRelations`：谱系关系事件

谱系关系是多方事件，不限制参与者数量，也不对近亲、多配偶、跨代、超自然或争议关系进行伦理拦截。系统只检查结构是否完整。

```json
{
  "id": "F1",
  "kind": "union",
  "subtype": "political_union",
  "participants": [
    { "nodeId": "N1", "role": "partner" },
    { "nodeId": "N2", "role": "partner" },
    { "nodeId": "N3", "role": "partner" }
  ],
  "contextId": null,
  "status": "active",
  "certainty": "confirmed",
  "label": "政治联姻",
  "time": {
    "start": { "year": 1860, "label": "1860" },
    "end": null
  },
  "episodes": [],
  "evidence": [{ "source": "Chapter 4" }],
  "notes": "",
  "hidden": false
}
```

通用字段：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 关系唯一 ID，推荐 `F1`。 |
| `kind` | string | 是 | `union`、`parentage`、`kinship`、`succession`、`other`。未知值会保留并按其他关系显示。 |
| `subtype` | string | 推荐 | 细分类型，开放枚举。 |
| `participants` | array | 是 | 至少两项，每项包含 `nodeId` 与 `role`。 |
| `contextId` | string/null | 否 | 通常让 `parentage` 引用相关 `union`，把孩子连接到正确关系单元。 |
| `status` | string | 否 | 关系状态，默认 `unknown`。 |
| `certainty` | string | 否 | `confirmed`、`probable`、`rumored`、`disputed`、`unknown`。 |
| `label` | string | 否 | 用户可读名称。 |
| `time` | object | 否 | `{ start: TimePoint/null, end: TimePoint/null }`。 |
| `episodes` | array | 否 | 用于剧集进度过滤。 |
| `evidence` | array | 否 | 字符串或来源对象；UI 每行保存一条 `{source}`。 |
| `notes` | string | 否 | 备注。 |
| `hidden` | boolean | 否 | 默认是否隐藏。 |

### 4.1 kind、subtype、role 和 status

`union`：

- subtype：`marriage`、`partnership`、`betrothal`、`affair`、`political_union`、`former_union`、`other`
- role：`partner`，至少两位，可多于两位
- status：`active`、`ended`、`annulled`、`widowed`、`unknown`

`parentage`：

- subtype：`biological`、`adoptive`、`legal`、`guardian`、`step`、`surrogate`、`supernatural`、`other`
- role：一个 `child`，一个或多个 `parent`
- status：`acknowledged`、`unacknowledged`、`disputed`、`unknown`

同一孩子与不同父母的亲子性质不同时，应拆成多条 `parentage`。若这些亲子事件属于同一伴侣/婚姻单元，可共用相同的 `contextId`。

`kinship`：

- subtype：`sibling`、`half_sibling`、`twin`、`step_sibling`、`other`
- role：`member`，至少两位
- status：`unknown`

`succession`：

- subtype：`heir`、`claimant`、`designated_successor`、`other`
- role：`predecessor`、`successor`
- status：`active`、`ended`、`disputed`、`unknown`

`other` 使用 `member`；自定义 kind/subtype/role 会被保留，但编辑器的标准选项优先使用上述结构。

### 4.2 正确连接不同婚姻所生子女

```json
{
  "familyRelations": [
    {
      "id": "F1", "kind": "union", "subtype": "marriage",
      "participants": [
        { "nodeId": "N1", "role": "partner" },
        { "nodeId": "N2", "role": "partner" }
      ]
    },
    {
      "id": "F2", "kind": "parentage", "subtype": "biological", "contextId": "F1",
      "participants": [
        { "nodeId": "N1", "role": "parent" },
        { "nodeId": "N2", "role": "parent" },
        { "nodeId": "N3", "role": "child" }
      ]
    },
    {
      "id": "F3", "kind": "union", "subtype": "former_union",
      "participants": [
        { "nodeId": "N1", "role": "partner" },
        { "nodeId": "N4", "role": "partner" }
      ]
    },
    {
      "id": "F4", "kind": "parentage", "subtype": "adoptive", "contextId": "F3",
      "participants": [
        { "nodeId": "N1", "role": "parent" },
        { "nodeId": "N4", "role": "parent" },
        { "nodeId": "N5", "role": "child" }
      ]
    }
  ]
}
```

## 5. 时间与剧集

Episode：

```json
{ "season": 2, "episode": 7, "sequence": 3, "raw": "S2E7" }
```

TimePoint：

```json
{
  "year": 1860,
  "label": "征服后 283 年",
  "season": 3,
  "episode": 5,
  "sequence": 2
}
```

- `year`、`season`、`episode`、`sequence` 必须可转换为有限数字。
- `label` 可保存虚构纪年、约数或文字时间。
- `episodes: []` 表示不受剧集进度限制。
- 主图和谱系图都按首次出现时间小于等于当前进度的方式累积显示。

## 6. `familyView`

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

| 字段 | 范围/枚举 | 默认值 |
|---|---|---|
| `layoutMode` | `lineage` / `house` | `lineage` |
| `houseTagCategoryId` | 分类 ID/null | `null` |
| `generationGap` | 90-260 | 150 |
| `branchGap` | 24-120 | 48 |
| `componentGap` | 60-260 | 120 |
| `collapsedNodeIds` | 去重后的节点 ID 数组 | `[]` |

`house` 模式按指定标签分类形成家族分区，但不会改写亲子世代。

## 7. 标签、主图样式与力场

标签分类：

```json
{
  "id": "C1",
  "name": "家族",
  "visible": true,
  "tags": [
    { "id": "T1", "name": "Stark", "color": "#7f9caf" },
    { "id": "T2", "name": "Lannister", "color": "#c49a57" }
  ]
}
```

`graphStyle` 支持：`nodeLabelColor`、`nodeLabelFontSize`、`nodeScale`、`nodeLabelOpacity`、`nodeLabelPlacement`（`outside` / `inside`）。

`topologySizing`：

```json
{ "mode": "degree", "strength": 0.9 }
```

- `mode`：`none`、`degree`、`connectivity`
- `strength`：0 到 1

`forceConfig`：

```json
{
  "centerStrength": 0.05,
  "chargeStrength": -650,
  "linkStrength": 0.5,
  "linkDistance": 170
}
```

## 8. v4 兼容规则

当 `familyRelations` 不存在或为空时，程序从 `links[].familyRelation` 迁移：

| v4 值 | v5 结果 |
|---|---|
| `parent` | source=`parent`、target=`child` 的 `parentage/biological` |
| `child` | source=`child`、target=`parent` 的 `parentage/biological` |
| `spouse` | 两位 `partner` 的 `union/marriage` |
| `sibling` | 两位 `member` 的 `kinship/sibling` |

迁移不会猜测 certainty、status、contextId，也不会虚构父母。只要存在非空 `familyRelations`，它就是唯一权威家系来源。

复杂 v5 关系降级为 v4 时可能丢失多方参与、争议状态、时间、证据和自定义类型，因此标准导出始终使用 v5。

## 9. AI 生成检查清单

1. 所有 `id` 在各自集合内唯一；所有参与者与连线端点都能在 `nodes` 找到。
2. 普通剧情联系写入 `links`；谱系事实写入 `familyRelations`，不要混为一套。
3. 多段婚姻分别建立独立 `union`；子女通过 `parentage.contextId` 指向正确 union。
4. 不把收养、监护、继亲、代理或超自然亲子错误写成 `biological`。
5. 传闻或矛盾事实保留，并使用 `certainty: rumored/disputed`，不要替用户擅自裁决。
6. 不要因为伦理、近亲、多配偶、多人伴侣或跨代关系而删减数据；只需忠实记录作品设定。
7. 父母未知时可写显式 `kinship`，不要自动生成虚构父母节点。
8. 低优先级支线可设 `hidden: true`，但不能通过删除关系来“简化”事实。
9. 大图无需预写谱系坐标；ELK 会确定性布局。主关系网的 `x/y/fx/fy` 可省略。
10. 输出前检查 parentage 恰有一个 child、至少一个 parent，union 至少两个 partner。

## 10. 最小 v5 示例

```json
{
  "version": 5,
  "nodes": [
    { "id": "N1", "name": "Parent One", "tags": {}, "episodes": [] },
    { "id": "N2", "name": "Parent Two", "tags": {}, "episodes": [] },
    { "id": "N3", "name": "Child", "tags": {}, "episodes": [] }
  ],
  "links": [],
  "familyRelations": [
    {
      "id": "F1",
      "kind": "union",
      "subtype": "marriage",
      "participants": [
        { "nodeId": "N1", "role": "partner" },
        { "nodeId": "N2", "role": "partner" }
      ],
      "status": "active",
      "certainty": "confirmed"
    },
    {
      "id": "F2",
      "kind": "parentage",
      "subtype": "biological",
      "contextId": "F1",
      "participants": [
        { "nodeId": "N1", "role": "parent" },
        { "nodeId": "N2", "role": "parent" },
        { "nodeId": "N3", "role": "child" }
      ],
      "status": "acknowledged",
      "certainty": "confirmed"
    }
  ],
  "familyView": {
    "layoutMode": "lineage",
    "generationGap": 150,
    "branchGap": 48,
    "componentGap": 120,
    "collapsedNodeIds": []
  },
  "tagCategories": [],
  "nextId": 4
}
```
