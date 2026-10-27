# 语音证据空间与标签基底：调研结论

**模型与标签的对应关系直接看：[模型 m ↔ 标签 t 两列表](模型与标签对应总表.md)。** 左列是模型组合，右列是音频标签组合；详细条件、来源和反查关系见能力调查与符号版。旧公共 schema 的结构字段和描述字段兼容映射见 [schema_mapping.md](schema_mapping.md)，不把描述字段混入音频标签表。

需要集合箭头表示时，看[符号版 `{m_a,m_b} -> {t_x,t_y,t_z}`](模型与标签对应关系_符号版.md)。

符号版与现行总表同步，只展开音频标签、派生路径及模型证据的对应关系。

本套目录使用三种命名空间：`t_*` 描述音频自身，`d_*` 记录派生路径，`e_*` 保存模型中间证据。总表右列只保留 `t_*`。

新的分层 schema 见 [tag_schema.md](tag_schema.md)：L0 只负责证据封装元数据，L1–L5 沿用共享 schema 的词汇内容、说话人、时间结构、副语言/非语音和声学场景/事件五层，L6 保留为音频内关系层。v0.3 将人数、具体重叠区间、轮次、文字统计等可重算结果移为 `d_*`；v0.4 明确以声音差异和感知还原检查标签覆盖，四类感知仅作为转写子集，标点/文字规范化移出音频维度。

v0.5 新增 `t_spectral_envelope`、`t_phonation`、`t_note_event`、`t_spatial_image` 四种 schema 候选，完整语义支持仍为 `[H]`。总表补查已将 Basic Pitch / P28 列为音符音高、模型起止与 pitch bends 的部分支持候选，本地未运行。`t_event_speaker_candidate` 更名并扩充为 `t_event_source_candidate`；既有事件模型与 diarizer 组合仍只支持人声归属的候选路径，不自动获得非人声声源区分、持续性与属性归属能力。F0/RMS/loudness 的逐声源描述与音素实际发音实现属于语义扩展；既有 profile 摘要和 MFA 规范/字典音素对齐不自动覆盖这些新增要求。新增类型定义、已有类型扩充及去重边界见 schema 第 10 节。

当前v0.6逐项审查全部15个 `d_*`，修正“能推导就退出标签”的过宽规则：音频属性可以同时有直接感知与派生路径。恢复人数、重叠区间、说话人切换、语速值4类有模型/组合依据的入口，以及词数、RT60两类待核候选，目录从45类变为 **51类**。直接人数不是CountNet窗口最大同时人数；SylNet音节率不是word/s；OSD/SCD具体可用权重未核实。原生逐人ASR、VAD、F0、C50和事件观察继续复用既有类型，规则统计仍保留 `d_*`。[逐项结论与来源](d_direct_audit.md)

总表已列全51/51类名称，其中 `∅` 明确标出 `t_voicing`、`t_phonation`、`t_spectral_envelope`、`t_spatial_image`、`t_word_count`、`t_rt60` 六类尚无确认producer。名称列全不表示51类已可用或独立；openSMILE/torchcrepe轨迹、摘要范围和部分语义的限制见[总表覆盖核对](模型与标签对应总表.md#标签清单覆盖核对)。

模型中间证据不计入音频标签类型数。本次定义调整不代表有限标签已经能够唯一还原原音频。

日期：2026-10-20。依据 [设计文档](../../design/语音任务的证据空间与标签基底设计.md) 和 speech-evidence-space 技能，完成公开来源调查、本地源码/配置/历史产物审计及三个无需加载模型的复现。**当前可推荐的是任务限定的候选紧凑集，尚未测得全局最小基底或新增模型组合的质量增益。**

## 1. 先读结论

对本轮转写任务子族，优先建设“**文本 + 文本时间 + 说话人活动 + 语言**”四类语义，以及不能丢弃的归属关系、原音频坐标和来源/未知状态。这四类并非完整音频描述基底。同一timeline的人数、存在性、切换次数、overlap布尔/比例是可重算视图；直接音频人数与专用OSD/SCD等观察仍可另取。人数等聚合值不能替代“谁何时和谁同时说话”的区间信息。[标签与删减论证](tag_registry.md)

这四类服务字幕、多人逐人转写和结构定位；**不覆盖所有语音任务**。事件/非言语、质量、声纹和音频检索按任务启用；情绪、角色、年龄、交互意图等暂不升级为当前稳定公共事实。共享registry允许这些扩展存在，运行时无需全部调用。[八类任务覆盖](task_coverage.md)

本轮最有价值的发现不只是新的模型名单，还包括当前证据链里可复现的能力误归因：

| 发现 | 意义与推荐动作 | 证据 |
| --- | --- | --- |
| FireRed历史smoke的词时间实际为CTC失败后的均匀token插值 | 明确标记`fallback_interpolation`；数组非空不能作为声学定位成功。该smoke use_half=True，不能外推Plus use_half=False全部失败 | [LA-02](local_audit.md) |
| FireRed ASR附带的language来自额外FireRed LID；与standalone同源 | 两个wrapper一致不是两个独立语言见证；费用也应计实际LID调用 | [LA-03](local_audit.md) |
| Plus不识别FireRed `token/start_s/end_s`时间字段 | 已有合法text可能因适配失败整条报错；纯函数复现float(None)，与历史两条observer错误同类 | [LA-04](local_audit.md)、重放结果（本地研究档案，未随页面发布：`local_probe_results.json`） |
| Qwen同一完整文本，gateway v1有29个词时间、v2有32个（3个零时长） | shared normalizer删除这3个，Plus直接aligner路径拒绝；需要保留原文字和缺时间状态，分开评文字覆盖/边界质量 | [LA-05](local_audit.md)、复现脚本（本地研究档案，未随页面发布：`reproduce_local_probes.py`） |
| 旧schema与active route、profile规则不一致 | active是zh/**en**走MOSS，其它走Nemotron+Qwen；profile绝对/相对音高、音量参照也不同；字段名不能替代版本合同 | [LA-01/08](local_audit.md)、[能力冲突表](model_capabilities.md) |
| DASS跨窗max分数不保留精确时间；AED ratio是过阈值帧占比 | 类别presence、事件区间、区间时长占比须分别定义；不能共享一个看似相同的“ratio”语义 | [LA-07](local_audit.md) |
| 完整字段映射发现gender来源、language发布权限和room输出存在pipeline差异 | Plus gender来自专用观察并冻结；共享描述链路与language复核另有合同；Brouhaha/Rec-RIR上游能力不能直接等同specialist实际保留的输出 | [32+2结构字段及12描述字段映射](schema_mapping.md) |

## 2. 已有结果支持什么

302条AMI历史评测中，Plus首轮与最终cpWER均约18.10%；常规probe 340次、292个样本，最终新probe证据采纳与结构改变都是0。语言复核改变59条路由发生在首轮之前，因此既不能把语言复核收益算到后续probe，也不能宣称常规Planner闭环已在此轮带来新增质量。[历史验证台账](validation_plan.md)

统一时间轴回放保持声学观察不变，11字段宏得分76.50%→80.76%，speaker_change 52.85%→95.92%，cpWER保持18.099%。这支持“规则漂移会显著影响结构字段得分”，不支持“模型听得更准”。302条最长约94.5秒，不能作为>5分钟长音频和多语能力的验证。[回放与版本核验](local_audit.md)

## 3. 模型组合的研究选择

| 用途 | 推荐候选 | 需要保留的边界 |
| --- | --- | --- |
| 当前核心基线 | MOSS joint；或Qwen3-ASR0.6B + ForcedAligner + Nemotron/DiariZen | 前者主要段级联合关系，后者依赖独立时间与归属；两者都需按overlap/人数分层，不凭模型名决定优劣 |
| 方法替代/定位对照 | WhisperX、MFA；SenseVoice新版本CTC词时间路径 | WhisperX是多模型组合；SenseVoice的时间同源条件对齐，不是独立ASR见证；对齐不纠错 |
| overlap文字补证 | DiCoW/SE-DiCoW | 显式消耗diarization mask/enrollment，可产生新文字候选；未在本地运行；demo checkpoint与训练分支能力分开 |
| 非言语和事件 | FireRed AED三类；SenseVoice事件；DASS/BEATs/PANNs分类；PANNs帧级SED/DCASE用于定位候选 | 三类speech/singing/music不覆盖笑/咳嗽；clip分类不能自动升级强时间标签 |
| 质量、韵律与检索 | DNSMOS/Brouhaha；openSMILE；CLAP | MOS/SNR/混响是不同量；声学特征不能确定推出情绪；检索点积不是事实概率 |

全表包含33个producer ID（含组合工具/任务路径，**不是33个独立或已部署checkpoint**），保留既有21个主要claim、补充13个claim及P28 Basic Pitch记录；本次增加DA-C01–05的5条感知路线。字段、producer、任务、来源对应见 [model_capabilities.md](model_capabilities.md)。新增候选均未做声学精度验证，词数/RT60待核项目没有登记为确认producer。

许可证必须按组件：DiariZen代码MIT/权重CC-BY-NC；Nemotron本地卡为OpenMDW-1.1；openSMILE为Research License；SenseVoice代码与权重条款不同。具体已读/未知项和源码revision见 [model_survey.md](model_survey.md)、[扩展调查](upstream_supplement.md)。

另一个重要比较限制：Nemotron官方card说明AMI等使用forced-alignment reference RTTM；DiariZen/pyannote的同名benchmark不保证相同标签/通道/collar。应在同一GT上重评分后比较，不能直接横排上游DER。

## 4. 下一步优先级

1. **先修正/冻结证据合同。** 单独处理FireRed字段适配与fallback标识、Qwen缺时间单位、profile/routing映射；本轮仅报告与复现，未改生产代码。
2. **用既有产物交叉核验评分。** 对齐SegLST/RTTM/UEM，以MeetEval/dscore比对cpWER/DER，再补tcpWER与边界指标。chronological WER不等于tcpWER。
3. **做有界组合消融。** 固定原录音划分，比较MOSS joint、模块组合、DiCoW；测单删/组合删、替代、实际成本与新增正确覆盖，而不是增加总调用次数。
4. **按任务扩展条件证据。** 事件/质量/检索各用匹配GT；情绪与交互意图先解决定义和标注一致性。当前AMI结果不能外推所有语音任务。

这些实验均标为planned，数据要求、指标、资源上限和停止条件见 [validation_plan.md](validation_plan.md)。没有把下一步计划冒充当前完成的结果。

## 5. 产物导航与完成边界

| 文件 | 内容 |
| --- | --- |
| [task_coverage.md](task_coverage.md) | 8个有界任务、输入/输出、优先级、指标、覆盖缺口 |
| [tag_registry.md](tag_registry.md) | 类型/关系/派生视图、unknown与negative、core/conditional/deferred、删减替代论证 |
| [model_capabilities.md](model_capabilities.md) | producer→tag→task、native/derived/inferred、版本冲突和依赖图 |
| [model_survey.md](model_survey.md) | 官方来源/代码/许可证、候选比较、排除与访问缺口 |
| [validation_plan.md](validation_plan.md) | 历史证据、新静态复现、未执行probe/消融与验收门槛 |
| [schema_mapping.md](schema_mapping.md) | 32原始结构字段、2派生字段与12描述字段逐项映射、兼容与语义缺口 |
| [tag_schema.md](tag_schema.md) | v0.6分层schema，51类目录、15个派生路径与直接感知并存、候选/能力边界 |
| [d_direct_audit.md](d_direct_audit.md) | 全部15个 `d_*` 的模型直接感知审查、6类恢复与已有类型复用、单位/同源边界 |
| [人数/时间分报告](d_audit_speaker_temporal.md)、[声学分报告](d_audit_acoustics.md)、[内容/事件分报告](d_audit_content_events.md) | 本轮实际来源、精确输入输出、revision/许可与未确认接口 |
| [local_audit.md](local_audit.md) | 当前源码、run_config、33项文件指纹与具体异常 |
| [upstream_supplement.md](upstream_supplement.md) | overlap、事件、情绪、韵律、检索和评测的扩展来源 |
| local_probe_results.json（本地研究档案，未随页面发布：`local_probe_results.json`） | 3项纯函数重放输入、源码hash、结果/异常 |
| sources/manifest.json（本地研究档案，未随页面发布：`sources/manifest.json`） / supplement manifest（本地研究档案，未随页面发布：`sources_supplement/manifest.json`） | 官方文本/源码/许可证快照及URL、访问状态和SHA-256 |
| review_checks.json（本地研究档案，未随页面发布：`review_checks.json`） | 最终本地链接、来源hash、字段完整性及ID对应核对结果；不代表模型质量验证 |

完成：本地/上游实际来源调查、能力与语义审计、候选紧凑集、已有结果核验和静态复现。未完成：新模型推理、目标域精度/延迟/校准、互证错误相关性、held-out消融、部分权重revision/许可正文、全语种/全场景覆盖。HF/部分论文与数据页的访问失败逐项保留；本次不声称全面普查或已找到最优模型。
