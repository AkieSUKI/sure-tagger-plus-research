# 验证台账与实验设计

日期：2026-10-20。研究对应 [任务](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/task_coverage.md)、[标签](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/tag_registry.md)、[能力](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/model_capabilities.md)。本轮新增验证为文档/源码/历史 JSON 静态检查及三个不加载模型的纯函数重放，没有声学重跑或大权重下载。

## 已有证据与本轮核验范围

| ID / 状态 | 数据、版本和产物 | 已支持结论 | 未支持结论 |
| --- | --- | --- | --- |
| V01 / historical observed | 全量 report（本地研究档案，未随页面发布：`../../../runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/report.md`）；302 条 AMI，2/3/4 人=84/120/98，920 个 GT speaker 流、7590.414 秒；run_config/来源详见 [local_audit](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/local_audit.md) | Plus 首轮/最终 cpWER 均约18.10%，逐人得分1.602/2；常规 probe 292样本/340调用，最终引用新 evidence=0、结构改变=0；language review 改路由59条发生在首轮之前 | 不能说 Planner 常规 probe 提高了该轮质量；不能把原版→Plus 全部变化归因 Planner；不外推中文/其它域 |
| V02 / historical replay | timeline replay v2 report（本地研究档案，未随页面发布：`../../../runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019_timeline_replay_v2/report.md`）；`speaker_timeline_derivation_v2.0-shadow.2`，相同302条冻结 initial evidence；回放不调模型/API、不读GT，评分独立读GT | 11字段宏76.50→80.76%；speaker_change 52.85→95.92%；cpWER18.099%不变；162样本切换计数变化、92样本ratio变化，1样本归属变化，cpCER +0.007pp | 这是规则统一的回放结果，非新声学模型收益、非当前代码新正式成绩；字段得分非严格 accuracy |
| V03 / historical smoke + static audit | specialist_smoke（本地研究档案，未随页面发布：`../../../runs/specialist_smoke/`）；主要同一19.0655秒英文样本；本轮提取 JSON（本地研究档案，未随页面发布：`local_artifact_check.json`）保存输入结果文件 hash | 27资产条目、23 callable、10 healthchecked；Qwen gateway v1有29单位，v2有32单位（3零时长）；Nemotron/DiariZen返回区间 | 不能由一次 smoke 得出 WER、DER、质量校准或本机持续吞吐；库存 false不证明模型永远不可运行 |
| V04 / static code/log supported | [local_audit](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/local_audit.md) 的 FireRed 日志、worker、ASR源码 | 历史 FireRed forced alignment 失败后均匀插值；wrapper LID 是独立模块；同 checkpoint 多 wrapper不独立；Plus 的零时长处理路径与gateway不同 | 本轮未修复执行代码；不能把旧smoke错误直接扩大为所有版本均失败 |
| V05 / upstream evidence inspected | sources manifest（本地研究档案，未随页面发布：`sources/manifest.json`）、[supplement](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/upstream_supplement.md)；commit与许可证分开 | 支持具体接口、输出类型、数据/评测合同及许可声明 | 上游 benchmark 不是当前管线通过验证；下载链接存在不代表已下载/运行 |

三个本地纯函数重放的结果（本地研究档案，未随页面发布：`local_probe_results.json`）和复现脚本（本地研究档案，未随页面发布：`reproduce_local_probes.py`）已保存，运行方式：从项目根目录执行 `python3 docs/research/speech-evidence-space-20261020/reproduce_local_probes.py`。本轮 JSON 检查是重新读取已有产物并计算摘要/hash；这是可重做的静态核验，不能写成新增 GPU probe。没有重新计算完整302条评分，数值引用对应冻结报告与其摘要文件。

## 建议顺序：先验证合同，再测替代收益

### V10：评分器和表示合同交叉核验 — planned，CPU

- 数据：302条已存在的 reference、prediction、timed sidecar；先10条人工选择的空/多流/overlap/跨窗边界fixture，再全量静态转换。只做开发诊断，不称独立 held-out。
- 生成研究用 SegLST（session_id/words/speaker/start_time/end_time）和 RTTM/UEM；保留时间戳缺失、零时长、原始文本和 normalized text，不为凑齐时间生成假边界。
- 自有 cpWER 与 MeetEval cpWER 固定同一 tokenizer/normalizer/词流顺序；明确空流补齐、额外 speaker 和 null 处理。tcpWER 只在有可验证时间时另外报告。工具参数以冻结版本 `--help` 为准，不在调研里捏造已运行命令。
- dscore 固定 overlap included、collar=0、UEM；另报 collar=0.25 s 的敏感性，不能挑有利口径当主成绩。输出 DER 的 miss/false_alarm/confusion、JER、overlap F1。
- 产物建议：`validation/scorer_contract/{manifest,conversion_errors,paired_metrics}.json`；预算≤1 CPU小时，无模型调用。若 scorer 不一致，停止收益比较，先解释到逐样本/逐编辑操作。

### V11：词时间来源与覆盖 — planned，CPU优先，必要时1 GPU

- 先对现有 lexical units 分类：native timing / forced alignment / interpolation / missing；统计文字单位数、正时长数、零时长数、拼回原文的一致性、越界率、窗口偏移次数。
- 新probe建议≤40段（5–30s），包含 clean、短词、重复、静音、错误文本、音频裁剪；由双人复核边界，保留 disagreement。一个录音不能分散到开发/测试。
- 比较 Qwen Aligner 与方法不同的 MFA/WhisperX aligner；固定相同 transcript 做定位实验，再单列真实ASR文本的联合质量。正确匹配词 MAE/p90 + 50/100/200ms hit rate，同时给漏词/错词/无时间率，防止只评易词。
- FireRed 首先修复/隔离 forced-align fallback 的合同后才参加声学时间比较；均匀插值永不计为对齐成功。修改代码属于后续实现，不在本轮完成状态中。
- 预算≤1 GPU小时作为实验上限而非性能预测；若10条中出现坐标越界/重复加偏移，停止下游归属实验。

### V12：语言路径和反事实提示 — planned

- 建议60段：中/英/第三语言、短句/专名/无语音、混语各有覆盖；样本/片段 GT独立标注。
- P04 FireRed audio LID、P01 native ASR language、text-derived language分别记录；同音频使用 language=None、正确/错误language、无关context。强制指定的language不得算一次正确LID。
- 指标：分语言 accuracy/macro F1、片段language F1、CER/WER、错误提示造成的替换、abstention与coverage；跟踪每条parent hash，测route改变前后差值。
- 预算≤1 GPU小时；若两个“不同工具”实际同checkpoint/transcript，仅记相关路径，不能用于独立性增益计算。

### V13：核心标签消融和producer替代 — planned

- 冻结新held-out会话及权重。比较 A=MOSS joint（精细定位任务另加aligner）、B=Qwen+Aligner+Nemotron、B′=Qwen+同aligner+DiariZen、C=WhisperX组合；只在共同语言/时长范围内作配对比较。
- 表达消融：删除T03；删除T02/R01；仅保留count/ratio；删除可重算bool；删独立VAD、保留T03 union。退化条件允许abstain，避免强迫下游猜答案。
- 分层：2/3/4人、overlap ratio区间、短turn、噪声；Q02 cpWER/cpCER、Q03 DER、Q01/tcpWER定位、有效coverage、LLM回答支持率分别报告。布尔别名删除预期无表达损失，经验结果仍须记录。
- 统计：按原录音bootstrap配对95% CI；不仅均值，还看最差任务/条件。样本数不足给区间/原始计数，不宣称显著；若测试集已用于调参，再留新会话确认。
- 预算先以40段≤2 GPU小时的小规模试验估计，再决定是否扩大；这是设计预算，不是已测成本。不能只因单模型参数更小就认定组合更便宜。

### V14：互证价值与定向probe — planned

- 用固定主producer结果选出冲突/不确定窗口；先比较“无probe、随机同成本probe、确定性选窗、Planner选窗”，相同总调用数/窗长预算。
- 记录 adoption、新增正确coverage、共同失败率 `P(eA=1,eB=1|condition)`、错误相关性以及新增错误；不要把agreement高当independence。
- 拆开“模型新观察质量”“resolver是否接受”“接受后任务收益”。历史340调用0采纳要求先查这三个环节，而非直接加大agent轮次。
- 若新增正确率/coverage无收益且成本增加，停止该路probe；可先用缓存回放诊断採纳规则，声学反事实仍需真正重跑。

### V15：条件扩展 — planned，不与核心闭环混算

| 扩展 | 数据/条件与GT | producer候选 | 主要指标、上限及停止依据 |
| --- | --- | --- | --- |
| 事件/非言语 | DESED/MAESTRO/AudioSet strong中合法可得子集；明确coverage mask；另少量笑/咳嗽人工复核 | FireRed AED仅speech/singing/music；DASS/BEATs/PANNs分类头作clip分类；PANNs帧级SED/DCASE可作T07候选，需独立后处理 | clip mAP与event F1/PSDS分开；先≤100片段、≤1 GPU小时；只有clip标签不能报告onset质量；事件归人R03另需GT/producer |
| 质量 | 有主观MOS或可控合成噪声的样本；真实远场另留测试 | DNSMOS、Brouhaha；SNR与MOS分开 | SRCC/PCC/MAE、质量筛选后的WER/覆盖；先≤60片段；域外失效则不作稳定路由阈值 |
| overlap内容 | 已有multi-speaker/混合语音数据，真值含目标身份、文字、时间；enrollment不得取GT目标转写 | DiCoW/SE-DiCoW、目标ASR/分离研究路径 | overlap cpWER、目标泄漏、错误enrollment鲁棒性；先核对权重/runtime再分配GPU；不是本轮已接入 |
| 检索/描述 | 声音查询与片段相关性标注；无匹配负例 | CLAP或text retrieval | Recall@K、片段IoU、引用支持；≤100片段；相似度不能自动当事实概率 |
| 情绪/韵律 | IEMOCAP等协议范围内，外加跨语/跨域人工一致性检查 | SenseVoice/emotion2vec、openSMILE参数 | macro F1/UA、校准、双标注一致性；暂不升级公共结构字段 |

## 通过门槛与未决项

本轮不能由文档选出生产阈值。暂定研究门槛：类型/坐标/来源错误=0；所有失败留在分母；critical任务不允许以未知值删除困难样本；替代模型同时报告质量差值CI和成本Pareto。允许多大的cpWER/DER退化及最低coverage，需在独立测试前按业务冻结，不能看测试结果反设阈值。

公共新字段的进入条件是：可独立理解的定义、可运行producer、固定许可证/版本、独立GT和错误边界、完整lineage、至少一次删除/替代实验。未达到条件保留internal/proposed；这不妨碍现有合同继续运行。

## v0.6直接感知与派生路径对照（planned）

[15项审查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_direct_audit.md)只完成来源与合同核对，以下均未执行，不改变前述历史验证结果。先核权重/代码与单位，再做同音频、同范围的比较；没有相同合同的结果不计为数值互证。

| 路线 | 所需GT/条件 | 后续检查与指标 |
| --- | --- | --- |
| P29音频人数 vs timeline人数 | 已有样本中真实人数，显式区分参考分段与独立VAD；`oracle_n_spkrs=False` | 人数MAE、完全正确率、漏人/拆人；报告与diarizer错误共现，不能把同一聚类的两种输出当两票 |
| P30 OSD / P31 SCD vs timeline规则 | 先取得可用checkpoint；人工重叠区间/变化边界，统一collar、gap、最短区间及有效范围 | OSD precision/recall/F1，SCD带固定容忍的边界F1；全局区间和已归人pair分开 |
| P32 SylNet音节率 vs 另一音节计数路线 | 同一完整窗口、人工音节数；覆盖不同语速/停顿，显式处理91音节上限 | 音节数MAE、syllable/s误差；不以word/s作可直接对比GT；逐人重叠另设验证 |
| P33 F0 vs 既有估计器 | 同一音频/帧坐标与F0参考，保留voiced/unvoiced及静音 | 音高误差、倍频/半频、未知覆盖；periodicity不直接当校准voicing |
| `t_word_count` / `t_rt60`候选 | 当前先补关键实现、权重及定义；之后分别用词定义一致的计数、可控RIR/实测混响GT | 未闭合源码与输出合同前不启动质量排名，不填精度或互证收益 |

每条路线先限定20条样本以内的合同/执行检查，资源和runtime确认后再确定声学评测预算；本轮未分配GPU或运行任何一条。通过名称/链接/计数检查只证明文档一致，不证明模型感知更准确。
