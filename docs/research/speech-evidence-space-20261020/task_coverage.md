# 任务族与覆盖目标

日期：2026-10-20。研究入口：[总览](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/summary.md)；标签定义：[registry](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/tag_registry.md)；来源：[survey](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/model_survey.md)。这是有界调研，不是“任意语音任务”的充分性证明。

## 研究单位与暂定范围

`F={Q01,…,Q08}` 是本轮任务族；`q` 是其中一个任务定义；`x` 是一条音频；`Txx` 是具有固定语义粒度的标签类型；`o(x)` 是某 producer 对该类型的一次观察；`Pxx` 是模型/工具生产者。相同类型的多个观察不增加 `k=|S|`，但增加调用成本。时间映射、来源、关系边、候选和缺失状态随观察传递，另报字段数/字节数/LLM token 数，不利用“大对象算一个标签”隐藏复杂度。

本地近期任务以离线会议为中心：英文 AMI 302 条、2–4 人、约 126.5 分钟；并考察中文/多语字幕、事件检索、质量筛选、对话定位。输入允许混音、短轮次、重叠、噪声和非语音；主要假设是单声道或已明确选择的音频视图。多通道空间定位、实时延迟保证、语音生成、音色复制、医疗诊断、实名身份识别不在本轮覆盖承诺内。

未提供生产预算/任务分布，因此以下优先级和权重仅是下一轮选型的**暂定实验配置**，不用于宣称已经求出最优集合。权重之和为 1；关键 Q01–Q03 必须分别过关，不能用平均收益抵消某类任务失败。

| 任务 | 输出及输入条件 | 必需事实与关系 | 指标与评测口径 | 暂定权重/优先级 | 当前可靠性边界 |
| --- | --- | --- | --- | --- | --- |
| Q01 字幕/内容定位 | 原文、语言、词/字或段时间；单人/多语/长音频 | T01 文本、T02 定位、T04 语言；unit_id 与原音频时钟 | 各语言 WER/CER；正确匹配单位边界 MAE/p90；含漏词的联合定位召回；null/失败率 | .20 / P0 | Qwen+Aligner 本地有输出；不能将 30 语言 ASR 扩大成 30 语言对齐 |
| Q02 多人逐人转写 | 每个匿名 speaker 的文本及定位；允许重叠 | T01+T02+T03+R01 归属；跨窗 R02 ID 映射；T04 路由 | cpWER/cpCER、tcpWER、DER/JER、人数误差、unassigned 比例、有效覆盖率 | .30 / P0 | AMI 有整链结果；其他语言和 overlap 细分尚未验证 |
| Q03 时间结构统计 | 谁何时发言、重叠、切换/轮次/间隔 | T03 的多标签活动区间；D01–D03 规则版本 | DER 分解、overlap F1、boundary MAE、count MAE；另报旧公开字段得分 | .15 / P0 | replay 证明规则定义影响结果；没有新增声学质量结论 |
| Q04 对话检索与解释 | 定位某人说的话/同时说话；引用证据回答 | Q02 的证据 + R01、D02/D03；“打断/附和”还需语义及韵律人工标注 | 引用时间 IoU、回答正确率、事实支持率、拒答效用、双标注一致性 | .10 / P1 | 可表达“同时说话”；不能把 overlap 自动标成打断意图 |
| Q05 质量筛选/路由 | 排序/拒收低质语音，选择复听窗口 | T05 语音活动、T08 MOS/T09 SNR 按目标选用；view、duration | 质量相关性/MAE、错误接受/拒收率、筛选后 WER 与覆盖率、延迟 | .10 / P1 | 资产/适配器存在；本轮没有带 GT 的质量验证 |
| Q06 非言语/事件定位 | 笑/咳嗽/音乐等类别与区间，必要时归人 | T06 类别分数；定位必须 T07；归人另需 R03 event→speaker关系，不能只做时间交集猜来源 | clip mAP；event/segment F1、PSDS、onset/offset；按标注覆盖掩码计分 | .05 / P1 | FireRed AED 三类、AudioSet 类别粒度不同；DASS 非精确 SED |
| Q07 多语与混语复核 | 局部语言区间、文本与路由冲突 | T04 区间语言、T01；native audio / ASR-LID / text-LID 分开留 lineage | 样本语言正确率、片段语言 F1、每语言 CER/WER、错误语言提示敏感性 | .05 / P1 | 本地 AMI 的路由复核不是 code-switch 验证 |
| Q08 音频检索/保守描述 | 按文本/声音查询片段，生成可引用描述 | T01 或 T06/T17 embedding；所有回答带 evidence_refs | Recall@K/mAP、证据支持率、检索后答案质量、成本 | .05 / P2 | 文本路径可复用；CLAP 等为替代候选，本轮未跑 |

## 覆盖需分两张账

1. **表达覆盖**：schema 能否表达任务所需事实、时间、身份、来源和未知值。T01 与 T03 同时存在但没有 R01，Q02 仍不具备完整表达覆盖。
2. **经验效用**：在冻结数据/代码/路由上实际达到的指标。字段非空、API 成功、model card 宣称均不等于这一项。

本轮只完成表达覆盖与来源核验，以及已有运行的二次审阅；不填写未经测量的 coverage 百分比、producer 独立性或最优 k。

## 任务与候选集合的覆盖关系

| 集合 | 能表达的目标 | 失去的能力/限制 |
| --- | --- | --- |
| S_text={T01,T04} + E0 | 整段文本、主题与样本语言 | 不能回答精确时间、谁说了哪句话 |
| S_loc={T01,T02,T04} + E0 | Q01 字幕/词定位 | 多人归属不成立；词时间不证明词正确 |
| S_core={T01,T02,T03,T04} + R01/R02 + D01–D03 + E0 | Q01–Q03、Q04 的事实定位部分 | 自然重叠中两人内容仍可能漏识别；不能证明打断意图或情绪 |
| S_core + 条件 T05/T08/T09 | Q05 可表达且可设计验证 | 质量分不等于场景类别；须有目标域 MOS/SNR/下游效用 GT |
| S_core + 条件 T06/T07 | Q06的类别/定位；归人另需R03 | R03虽可表达但producer未验证，归人仍是可靠性缺口；弱标注空缺不等于negative |
| S_core 的 T04 分段化 + 多路径 lineage | Q07 | 增加分辨率也增加成本；共享文本的多个分类器不独立 |
| S_core + 条件 T17 | Q08 的声音检索 | 检索相似度不等于事实判断置信度 |

这里的 core 仅有 4 个语义类型，**不是整个 F 的充分集**，也没有证明是最小集。T03 可投影 T05（活动并集），独立 VAD 是按需取得同一语义的另一路观察。Q05 需要 independent speech coverage 时仍要实际调用 VAD；不能把 diarizer 的漏检投影当成复核。

## 数据边界与成本口径

- 302 条 AMI 已用于历史规则修正，应视为开发/回放证据；新结论必须保留按 meeting/session 隔离的外部或新 held-out 集。原录音的不同裁剪不能跨开发/测试分组。
- 中文会议候选 AliMeeting/AISHELL-4；域外 timeline 候选 VoxConverse v0.3/DIHARD III；事件候选 DESED/MAESTRO/AudioSet strong；逐语言候选 FLEURS/VoxLingua107。只有已实际打开的来源在 survey/supplement 中标 read；数据下载、授权、GT 完整性另行核验。
- 报告每音频分钟的 GPU/CPU 秒、峰值显存、冷/热启动延迟、p50/p95、调用数、失败重试、存储字节与 LLM token 数；一次调用产生多个 tag 只计一次成本。历史 72.6 分钟墙钟包含并发、队列、加载、API，不能作单模型 RTF 排名。
- 本轮资源范围：公开文档/源码读取、已有 JSON/日志静态检查；未下载大权重、未启动 GPU 或外部 LLM 批量任务。

下一阶段的具体数据、消融和停止条件见 [validation_plan.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/validation_plan.md)。
