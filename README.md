# 声音证据图谱

用交互二分图探索模型与标签的对应关系。默认打开 [SURE-Tagger 能力表](https://akiesuki.github.io/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/visualization/#sure)：选择模型或完整路径后，相关公共字段与平滑曲线高亮，其他关系淡化。

- SURE-Tagger 版展示 34 个结构父字段，区分有依据、条件候选和未确认路径；研究 sidecar 不计入公共覆盖。
- 新版包含 16 组待评测检查：M01–M08 比较不同 producer 对同一公共字段的候选输出，X01–X08 检查不同公共字段的一致性；检查结果保持空值，不改写公共 schema 或 Tag-Bench。
- [原研究关系图](https://akiesuki.github.io/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/visualization/#graph) 保留 63 个模型或工具代号、53 条组合路径和 51 类音频标签，支持预设、多选、搜索、L1–L6 筛选及组合 JSON 导出。
- [原研究互检](https://akiesuki.github.io/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/visualization/#checks) 保留 8 条基于研究侧 `t_*` 标签的检查方案，与新版 16 组公共字段检查分别展示。
- 原研究图独立展示含 H 的候选路径；6 类尚无确认模型的标签不计入覆盖。标签变化页保留对照 2026-10-09 公共 schema 的 47 条分组说明。

## 打开网页

下载仓库后，直接用浏览器打开 [index.html](index.html)；也可在仓库根目录运行：

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

访问 `http://localhost:8766/`。页面不依赖 npm、后端或外部 CDN，不运行音频模型。

## GitHub Pages

在仓库 **Settings → Pages → Build and deployment** 中选择：

- Source：**Deploy from a branch**
- Branch：**main**
- Folder：**/ (root)**

保存后，GitHub 完成部署即可访问：

`https://akiesuki.github.io/sure-tagger-plus-research/`

上述地址是启用 Pages 后的站点地址；提交文件本身不会改变仓库可见性或自动启用 Pages。根入口和相对资源路径已适配 GitHub 项目站点。

## 资料与更新

- [SURE-Tagger 模型能力对应表](docs/research/speech-evidence-space-20261020/SURE-Tagger模型能力对应表.md) · [机器可读映射](docs/research/speech-evidence-space-20261020/SURE-Tagger模型能力对应表.json) · [16 组交叉检查](docs/research/speech-evidence-space-20261020/visualization/sure_cross_checks.json)
- [模型与标签对应总表](docs/research/speech-evidence-space-20261020/模型与标签对应总表.md)
- [标签版本对比](docs/research/speech-evidence-space-20261020/标签版本对比.md)
- [当前 Tag Schema](docs/research/speech-evidence-space-20261020/tag_schema.md) · [跨标签互检定义](docs/research/speech-evidence-space-20261020/tag_schema.md#81-跨标签一致性检查互检链路)
- [展示页使用说明](docs/research/speech-evidence-space-20261020/visualization/README.md)

修改能力表、原研究总表、schema 或对比数据后，重新生成网页数据：

```bash
python3 docs/research/speech-evidence-space-20261020/visualization/build_data.py
```

构建脚本使用随仓库保存的基准快照，不依赖原服务器目录。`data.js` 和 `sure_cross_checks.json` 是生成文件，应与能力表 Markdown/JSON 等来源一起提交。新版 16 组检查由能力表第 5 节生成；原研究 8 条方案仍保存在构建脚本 `CROSS_CHECKS` 中。

## 发布范围与来源

本仓库保存展示页及支撑它的研究文档，不含模型权重、音频、运行目录或凭据。发布版使用系统字体；原研究文档中的本机路径和未随包发布的代码/日志链接已改为来源文字，保留核对位置。`baseline-tag-schema.md` 保持原始文档逐字节不变，其中原项目链接仍属于原始上下文。新版能力表引用的当前公共 schema 与 Tag-Bench 跨仓库文档未随包发布，不以这个历史快照替代。

[publication_manifest.json](publication_manifest.json) 保存原始输入和发布文件的指纹，以及未随页面发布的本地档案引用。原项目文件未被这些发布适配修改。

图中覆盖表示总表中模型组合条件成立，不代表已部署、可即时调用或通过准确率验证。新旧 schema 的字段粒度不同，不能直接将字段数量相减作为新增能力数量。
