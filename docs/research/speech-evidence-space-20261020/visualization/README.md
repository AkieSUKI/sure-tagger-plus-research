# 声音证据图谱

直接用浏览器打开 [index.html](../../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/visualization/index.html)。页面使用本地 HTML、CSS、JavaScript 和数据快照，不需要安装依赖、连接外部服务或运行模型。保留同目录文件；发布版使用系统字体，不依赖本机字体文件。

也可以在项目根目录运行静态服务：

```bash
cd sure-tagger-plus-research
python3 -m http.server 8765 --bind 127.0.0.1
```

访问 `http://127.0.0.1:8765/docs/research/speech-evidence-space-20261020/visualization/`。若在远程机器上运行，可在 IDE 中转发 8765 端口。服务从仓库根目录启动，页面中的原始文档链接也可访问。

## 使用

- 默认展示“Qwen3-ASR + 对齐器 + 说话人分离角色”的逐人转写组合。使用组合预设，或点击左侧模型节点多选；已选模型及其满足条件的标签、曲线会高亮，其他节点淡化。
- 实线表示有依据的路径，虚线表示含 `[H]` 的待验证路径；两者分别计数。∅ 标签始终显示为尚无确认模型，旧 OASR 不可调用节点不能选择。
- 搜索模型、标签 ID 或中文含义；按 L1–L6 筛选，或打开“只看当前组合”。长图在面板内滚动，小屏可以在面板内横向滚动。
- 点击标签查看定义、范围限定、各条模型路径、缺失组件和旧版对应；“补齐此组合”保留已选模型并补上缺少的组件。
- “标签变化”按新增、细化、派生、元数据、描述输出与暂缓分组，支持搜索新旧字段。点击 `t_*` 可跳回关系图。完整依据见 [标签版本对比](../../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/标签版本对比.md)。
- “导出当前组合”下载 JSON，含模型、覆盖标签、候选标签、满足的原始路径和源文件指纹。

## 组合与计数规则

数据来自 [模型与标签对应总表](../../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/模型与标签对应总表.md) 的 53 行关系：63 个模型或工具代号、51 类标签，其中 6 类尚无确认 producer。63 个代号包含泛称、组合工具和不可调用的旧候选，不表示 63 个已部署模型。

总表中的逗号表示共同参与，斜线表示替代选项。例如 `{a,b}` 需要同时选择 a 和 b，`{a / b}` 选择任一个即可。只有整条路径的模型条件满足，才计入其输出标签；单条曲线只表示参与关系。同一标签优先归入“有依据路径”，只有全部满足路径都含 H 时才归入“仅候选路径”，避免重复计数。

`m_asr`、`m_diarizer`、`m_event` 是总表中的角色泛称，具体实现另行指定；前端按原表代号计算，不擅自把某个具体模型视作所有泛称的替代者。选择这些节点表示满足组合的角色条件。强制对齐所需文字/语言、模型权重、任务头、后处理、适配和质量验证仍以详情与原始研究文档为准。

标签按稳定 ID 去重；`[frame]`、`[median]`、`[target]` 等限定保留在路径详情和导出中。路径满足不证明全部粒度已支持，不证明模型可即时运行或已通过准确率验证。页面不执行模型推理。

## 更新数据

修改总表或当前 schema 后运行：

```bash
python3 docs/research/speech-evidence-space-20261020/visualization/build_data.py
```

脚本读取总表、`tag_schema.md` 与 `schema_comparison.json`，校验对应标签并生成 `data.js`。新模型和标签需要在脚本的显示名称映射中补充中文名。页面直接加载本地脚本，没有 `fetch`，因此支持 `file://` 打开。

旧新字段的语义映射由人工依据文档核对，保存在 `schema_comparison.json`；新增或调整类型时需同步维护该文件和对比报告。`baseline-tag-schema.md` 是指定 2026-10-09 共享文档的逐字节快照；共享源文件没有被修改。旧父字段与新语义类型的粒度不同，不能直接用数量相减推算新增标签。

实现文件：`index.html` 布局、`styles.css` 样式、`app.js` 交互、`build_data.py` 数据构建、`data.js` 数据快照。

## 验证记录

2026-10-27 使用 Chromium 130 / Playwright 检查本地文件打开、预设/多选、AND/OR 条件、候选与 ∅ 边界、筛选、详情补齐、版本对比跳转及 JSON 导出；19 组交互断言通过，无浏览器脚本错误。检查桌面和手机布局，整页无横向溢出，图谱面板允许横向滚动。全选 59 个可选代号后覆盖45类，6类 ∅ 仍不计入覆盖。此验证仅涉及展示和数据逻辑，不涉及音频模型质量。
