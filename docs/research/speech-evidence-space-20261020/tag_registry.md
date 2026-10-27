# 标签、关系与候选紧凑集

日期：2026-10-20。[任务 ID](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/task_coverage.md)、[producer/claim](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/model_capabilities.md)、[来源](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/model_survey.md)。本文件是研究表示，**不修改共享 tag-schema 或生产输出合同**。

现行全量类型目录以 [tag_schema.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/tag_schema.md) v0.6 的51类 `t_*` 为准。下文T01–T17是原调查任务族的历史索引，其中embedding/文字规范化等不自动成为现行音频标签；四类 `S_core` 仅指转写子集。v0.6将音频属性与派生路径分开：人数、重叠、切换、语速的直接估计保留相应 `t_*`，D01–D06只约束已有观察的固定计算，不能排除同一属性的另一模型观察。全部15个 `d_*` 的审查见 [d_direct_audit.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_direct_audit.md)。

## 统一观察封装 E0

E0 是每条观察的必需元信息，不作为一个额外感知类型计入 k：

```yaml
observation_id: immutable-id
sample_id: dataset-id
sample_sha256: original-audio-hash
view_id: original-or-crop-id
transform: {channel: 0, resample_hz: 16000, time_mapping: explicit}
tag_id: T03
value: [{start_sec: 1.2, end_sec: 2.1, speaker_local_id: S01}]
producer_id: P05
code_revision: exact-commit-or-unknown
checkpoint_revision: exact-revision-or-unknown
checkpoint_sha256: hash-or-unknown
adapter_revision: hash-or-unknown
route_version: explicit
scope: {interval_sec: [0, 19.0655], speaker: all}
path_kind: native
parent_observation_ids: []
confidence: {value: null, meaning: unknown, calibration_version: null}
status: available
failure_reason: null
```

这是研究合同示例，未部署 JSON Schema。半开区间 `[start,end)`、秒、原始音频坐标为建议规范；必须额外保留原单位/局部时钟。`unknown` 表示未取得事实，不能用 `false` 假装检查失败。运行状态：`available/negative/unavailable/error/low_confidence/conflict/abstain`；`ambiguous` 是归属的专门原因，映射为 conflict/abstain 时保留原 cause。

`negative` 要求成功完成观察及已知搜索范围；空数组只表示在该范围/阈值/类别清单中没有检出。两来源冲突须先对齐同一音频、时间、speaker、类型和单位；不要求已证明统计独立才可记录 conflict，但其互证权重要另行评估。

## 感知类型 registry

所有未校准概率/相似度的 confidence 统一标“模型分数，非正确概率”。表中范围可细化，不能把整段值直接复制到每个 speaker。公开映射同时保留现有字段与 internal/proposed，不暗示公开已有同名字段。

| ID / 类型 | 定义、类型、单位与粒度 | 依赖/成功负例与未知 | 现有/提议映射 | 任务 / 选择与理由 |
| --- | --- | --- | --- | --- |
| T01 lexical_content | 原始转写字符串及稳定 unit_id；segment/word/character 粒度注明 tokenizer；保留标点/数字原形 | 声学 ASR 观察，包含逐说话人/目标说话人 ASR 的 `t_text[speaker]`；成功无语音文本为空需结合 status；错误或不可辨为 null，不能用空串遮蔽失败 | `speaker.asr_transcript`；units 为 timed sidecar；逐人归属见 R01 | Q01/Q02/Q04/Q07/Q08；**core**，文本任务不可缺 |
| T02 lexical_time | `{unit_id,start_sec,end_sec}`；单位粒度与 T01 一一对应；允许显式无时间单位 | 原生时间或 audio+T01 forced alignment；无可定位单位为 missing，零时长另标；不可把均匀插值当声学边界 | timed_transcript/internal；公开全文不包含此关系 | Q01/Q02/Q04；**core**，恢复定位与归属所需 |
| T03 speaker_activity | 多标签活动区间，speaker ID 仅在 observation/session 内有效；允许同时多个 speaker；可另存阈值前帧分数及 frame_hop、speaker列映射 | diarizer 或 joint段时间投影；成功无人为 []，失败为 null；跨窗必须 R02；区间不能恢复原始帧分数 | public 仅有聚合人数/重叠等，完整区间为内部 evidence；帧分数是否保留需逐adapter核对 | Q02/Q03/Q04；**core**，人数/ratio 不能替代区间 |
| T04 language | `{language_code,scope,alternatives}`，样本或语言片段；明确 taxonomy/version | audio LID、ASR language 或 text-derived；强制 language 回显不是自动识别；无语音/混语未知不能硬填单语言 | `language_content.language` + language_route；span language 为 proposed | Q01/Q02/Q07；**core 类型**，具体路径按运行需求选 |
| T05 speech_activity | speech interval/probability；含无 speaker 的人声支持；non-speech≠静音 | 独立 VAD native 或 T03 的 union derived；两者不能重复算独立票；成功无语音=[] | speech coverage/non_speech_ratio 的输入；内部区间 | Q01/Q05；**conditional acquisition**，筛选/短音频/冲突时启用 |
| T06 event_presence | 指定 ontology 类别的 clip/window score；类 ID、窗口、threshold 需保存 | AED/AudioSet classifier；未训练/未标注类=unknown，低分不等于物理不存在 | acoustic_scene 事件投影；映射须核对既有枚举 | Q06/Q08；**conditional**，类别检索可用 |
| T07 event_interval | `{event_id,class_id,onset,offset,score}` 强事件时间轴；event_id在观察内稳定且与observation_id联合唯一；声源归人单列 | strong SED 或明确窗口检测后处理；T06 仅有 clip score 不能还原 | proposed internal event timeline | Q06；**conditional**，定位任务必需；当前粗分窗不足 |
| T08 perceptual_quality | MOS 标度上的预测，注明 SIG/BAK/OVRL/P808 或其它定义；样本/窗 | DNSMOS 等；无参考预测不等于人工 MOS；无适用语音/模型失败=null | 质量类现有字段须按量纲投影 | Q05；**conditional**，按感知质量目标启用 |
| T09 snr | speech/noise 比估计，dB；窗口、语音掩码和模型定义固定 | Brouhaha 等；无有效语音/噪声支持时未知；不是 MOS 的别名 | 现有 SNR/噪声维度的候选来源 | Q05；**conditional**，仅在路由收益验证后保留 |
| T10 f0 | 有声帧基频 Hz/轮廓；估计器、帧长、voicing mask | clean PCM + pitch tool；unvoiced 不填 0 Hz 为实测音高；overlap 条件明确 | `speaker.profiles[].pitch` 为相对投影 | Q04 扩展；**conditional**，韵律/重音研究；不推断年龄/情绪 |
| T11 intensity | RMS/能量或相对 dB；片内参照、通道、增益记录 | clean PCM；未校准录音无绝对声压；静音/失败分离 | `speaker.profiles[].speaker_volume` 为片内值 | Q04/Q05；**conditional**，不能由振幅推断愤怒 |
| T12 speaker_embedding | 固定 encoder 向量/成对相似度；crop、长度、通道记录 | CAM++/ECAPA 等；阈值需目标域校准；无 enrollment 不给实名 | R02 辅助 internal evidence | Q02 长音频；**conditional**，跨窗消歧；不常驻每任务 |
| T13 affect | 受标注协议约束的情绪类别/维度分数；区间+speaker（若已核验） | 专用分类器；类别集外保留未知；模型输出不等于内在心理状态 | 新研究扩展；现公开描述禁止据 profile 猜情绪 | 暂不属于 F 必需输出；**deferred public**，标注一致性/跨域尚缺 |
| T14 capture_metadata | 已知 channel/device/IHM/SDM 等录制元数据；来源记录 | 优先数据元信息；模型猜测须另列 inferred；未知不由混响补齐 | 元信息扩展，**不计声学 k** | Q05 分层；conditional；电话/会议场景推断 deferred |
| T15 normalized_text | ITN/标点/大小写等规范化候选及 edit map | 规则投影或神经推断必须分开；父 T01 hash 不变 | scoring normalizer 已存在；rich transcription 编辑通道 proposed | Q01；**conditional/deferred**，先冻结 verbatim/normalized 双轨 |
| T16 disfluency | filler/重复/自修 spans，关联原始文本/声音 | 词表匹配为 derived；自修识别可能 inferred；ASR 已删 filler 时不能恢复 | 现有 filler/repetition aggregate 与完整 disfluency 不等价 | Q04 扩展；**deferred**，当前任务无独立 GT |
| T17 acoustic_embedding | 带representation_kind/shared_space_id的音频表征；CLAP可另有配对text encoder/相似度；checkpoint/切窗/模板固定 | CLAP共同空间与BEATs原始audio-only表征不能互替；与T12声纹不同；similarity非事件概率 | proposed retrieval index | Q08；**conditional**，非文字音频检索时启用 |

T08/T09 分开登记，防止把质量、SNR、混响等装进单字段后宣称 k 很小。T08是族级索引；计数时按实际输出语义拆为T08.SIG、T08.BAK、T08.OVRL、T08.P808（本地DNSMOS四项），不能把四个分数计成一个标量类型。T17也必须按representation_kind/共同空间分别报告维度和成本；只有S_core的4个类型已固定本轮计数粒度。T10/T11 也分开；声学参数仍需报告向量长度和时间分辨率。T15/T16 中确定性投影不增加独立感知维度，推断型新增观察则增加相应表示/调用成本。

T03的区间表示与帧分数表示同属活动语义，但信息量不同，须分别报告分辨率、分数含义和存储成本。MOSS的活动视图由带speaker的转写段投影，不代表另有声学活动概率头；DiCoW要求逐帧diarization probabilities→STNO masks，现有interval-only产物需要新增适配或重新取得帧分数。将区间栅格化为0/1只是派生替代，不能冒充原始概率或已验证的等价输入。

## 关系与派生视图

| ID | 合同与依赖 | 为什么保留 / 为什么不作为独立感知票 |
| --- | --- | --- |
| R01 unit_speaker_assignment | `{unit_id,speaker_id,candidate_ids,method,support_ids,reason}`；MOSS joint 原生关系或 T01+T02+T03 的版本化投影；无法唯一归属保留 ambiguous | Q02 必需，joint 关系和时间交集的证据强度不同；不能由语言语义强分；方法依赖不能隐藏 |
| R02 cross_view_speaker_map | `{source_view,local_id,target_session_id,score,support}`；活动重合/声纹/锚点的匹配，保留未匹配 | 不同 producer 的 S01 不一定同一个人；按首次发言排序只是样本内编号，不是跨窗口识别 |
| R03 event_speaker_assignment | `{event_id,speaker_id,candidates,method,support_ids}`；只用于可归属于人的发声事件；native event-speaker producer或可验证推断，不能凭时间同现确定声源 | Q06归人所需的conditional关系；目前无本地验证，保留unknown；音乐/环境事件可标not_applicable而非无人发声 |
| D01 count/presence/multi | T03 中有效 ID 集大小；presence=count>0；multi=count≥2 | 此处只指timeline统计；另一音频声纹/自动聚类路线保留 `t_speaker_count`。从任一选定count算present/multi仍是规则；count不能恢复完整T03 |
| D02 overlap | T03 中 active speaker set 大小≥2 的区间；ratio=overlap_duration/speech_union_duration；floor 版本化 | 此处只指timeline求交；专用音频OSD另保留 `t_overlap_interval`，不必有参与者ID；bool/ratio须绑定所选区间与分母，不能作为额外独立证据 |
| D03 turns/gaps/change | activity→continuity→change 算子；阈值、gap floor、样本边界规则明确 | 当前 replay 为 activity≥100 ms、continuity gap≤300 ms、change gap≤1 s、atomic overlap interval≥100 ms（在合并前应用）；这是操作定义，不直接等于交互意图 |
| D04 speaker_transcripts | 经 R01 接受的原有文字按冻结源顺序拼接；保持 raw_text、source_index、scoring_streams 独立 | 仅排序、拼接已有文字，不包含重新识别或决定说话人归属；逐说话人 ASR 的新文字属于 T01；不能按 speaker 数量从全文猜分，也不能用逐人拼接替代原模型全文 |
| D05 rate/profile bands | 可靠文本单位/clean active sec；T10/T11 相对统计与离散化 | 单位受语言/tokenizer 影响；无清晰语音/样本过短=null；不是情绪/性别证据 |
| D06 text_statistics | 基于明确来源的T01或外部provided_text，按冻结tokenizer/规则得到word_count、punctuation counts；filler/repetition与T16规则子型关联 | 不增加独立感知票；必须存text_origin和hash，外部reference不能混入模型转写路径；不同系统可按旧评测合同独立预测这些字段 |

E0、R01/R02 与派生操作有真实复杂度和错误率。k 只统计按表固定粒度的感知类型，同时必须报告 relation count、interval 数、representation bytes，避免“排除关系计数”变成压缩作弊。

## 候选紧凑集与替代路径

**S_core={T01,T02,T03,T04}**，附 E0、R01/R02、D01–D03。它服务字幕/逐人转写/结构定位这个核心子族，不覆盖整个 F。独立 VAD、事件、质量、跨窗声纹、检索按任务和当前样本冲突启用。条件标签进入共享 registry，不要求每次运行全部调用。

| 组合 | producer 路径 | 互补性 / 不能作出的结论 |
| --- | --- | --- |
| A 联合 | P03 MOSS → 文本、段时间、speaker 关系；需词定位再加 P02 对齐；T04 另取 | 一次模型覆盖多个类型；同源 text/activity agreement 不独立；段级联合输出不能替代精细 VAD |
| B 模块化 | P01 Qwen → text/language；P02 → 词/字时间；P05 Nemotron 或 P06 DiariZen → activity；R01 投影 | 易审计每一误差来源；共同混音导致 overlap 漏词，aligner 不能创造缺失文本 |
| C 方法对照 | P07 WhisperX 的 ASR+aligner+pyannote 或独立 MFA 对齐 | 可比较替代，不是单一新声学证人；工具内部依赖完整计成本 |
| D overlap 条件 | 已读补充调查中的 DiCoW/SE-DiCoW、目标说话人 ASR/分离研究路径 | 可改变声学目标选择；需要 enrollment/mask 与本地训练/运行验证，目前 planned，不承诺即插即用 |

删除/替代论证：

- 删 D01 presence/multi 或 D02 bool，不删 T03 和规则，可无损重算相同合同；公共字段可保留兼容，但不新增模型调用。
- 上条只删除同一父证据的重复派生字段，不删除另一模型的音频人数、重叠或变化观察；v0.6恢复的类型与各自限制见下节。
- 删 T03 仅留人数/overlap_ratio，无法区别“前半段 A 与 B 重叠”和“后半段 B 与 C 重叠”。这会令 Q02/Q03/Q04 无法定位，属于确定的表达损失。
- T01 与 T03 需要 T02/R01 才能合成“谁何时说了哪句”；仅单标签排序会漏掉联合收益。实际增益用单删/组删消融测，不假设 submodular。
- 独立 VAD 可按需省略，使用 T03 union 作为 coverage，但漏检会完全继承 diarizer；Q05 或失配检测需独立 T05 时必须恢复调用。
- MOSS 替换 Qwen+Aligner+diarizer 仅是候选表示替代；需要同录音、同输出粒度、相同语言和评测合同下比较 cpWER/DER/tcpWER，不能凭 model card 单个指标宣布等价。

## 公共合同迁移建议（未执行）

先增加可审计内部 registry/sidecar，不改共享合同。把 raw observation、normalized observation、resolution 和 public view 分开版本。未来公开词时间/事件时间时，明确半开区间、粒度、缺失状态、unit→speaker 关系以及零时长语义；对已有客户维护兼容投影。当前 Plus Planner 只选择既有文字、窗口、配置，原 ASR 不可覆盖；文本纠错可另设候选通道，但需要新的发布合同和验证。共享评测pipeline另有基于transcript复核公开language的明确通道，不能把Plus的冻结策略泛化到所有字段和pipeline；详见schema映射。

完整公开字段（32原始结构字段、2派生字段、12描述字段）与本registry的对应，以及未纳入的房间/性别语义，见[schema_mapping.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/schema_mapping.md)。这些未覆盖维度不由T08/T09/T10/T12替代。

## v0.6直接感知补充

| 现行类型 | 新的感知路径与状态 | 与既有派生项的关系 |
| --- | --- | --- |
| `t_speaker_count` | P29 SpeechBrain音频embedding + 非oracle自动聚类 `[C]` | 对比D01的timeline人数；同一聚类生成的timeline不算第二份见证 |
| `t_overlap_interval` | P30专用OSD任务/解码代码已核实，具体checkpoint未核实 `[C/H]` | 对比D02全局重叠；无身份输出不能提供指定pair交集 |
| `t_speaker_change` | P31专用SCD任务/峰提取已核实，具体checkpoint未核实 `[C/H]` | 对比D03变化部分；不把边界模型当完整回应/发言意图 |
| `t_speech_rate_value` | P32 SylNet音节计数除窗时 `[C]` | 音节率与D05文字词率须先对齐分子/分母；非原生word/s |
| `t_word_count` | 直接声学回归README声明，代码/权重未核实 `[H]` | D06同一原文的tokenizer计数继续保留；音节数不替代词数 |
| `t_rt60` | BERP盲估候选具体RT60输出链未核实 `[H]` | 同一已有RIR求指标仍为 `d_room_metrics`；Brouhaha `t_c50`早已另存 |

这些类型不改变 `S_core` 的任务范围，也不说明已经增加独立信息维数或完成互证增益实验。P33 torchcrepe的逐帧F0直接复用T10/`t_f0`；原生逐人ASR、独立VAD与事件模型也继续复用既有类型。来源与完整合同见[能力记录](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/model_capabilities.md)、[审查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_direct_audit.md)。
