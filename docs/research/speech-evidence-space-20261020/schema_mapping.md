# 共享 schema 的完整字段映射与合同差异

核对日期：2026-10-20。基准为共享 [tag-schema.md §3](visualization/baseline-tag-schema.md)（原文第282行） 和本轮 [tag_registry.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/tag_registry.md)；任务 ID 见 [task_coverage.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/task_coverage.md)，producer ID 见 [model_capabilities.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/model_capabilities.md)。本文件只审计表示、来源与派生关系，不修改共享合同，也不把接口核验当作声学准确率验证。

## 1. 计数与读表规则

原有六个结构分组共 **32 个字段**：basic 5、quality 5、room 3、sound 4、speaker 10、language 5；加 `deterministic_derived` 的 2 个字段为 **34**。复合字段的孩子不再次计数。`speaker.gender` 是单独的评测轴，真实 JSON 位置在 `descriptive.speaker_descriptions[].gender`，不是六组中第 33 个字段。12 个 `descriptive.*` 父字段也单独列出，不把 gender 的两处文档定义算两份观察。

表中的 SM01–SM34、SD01–SD12、G01–G05 是本文件的审计行号和缺口号，**不是新增 registry 类型**。`Txx` 是感知语义类型，`Rxx` 是关系，`Dxx` 是可重算视图，`E0` 是观察元信息。所有字段都应携带 E0；为减少重复，表中仅在字段自身就是元信息时再写 E0。

`k` 按固定语义粒度的感知类型计算，不能用公开字段数、评分轴数或模型调用数替代。元数据、ID、确定性别名、相同观察的多种序列化，以及仅消费已有 tags 的 LLM 描述不新增声学感知类型；它们仍有计算、存储、错误传播和 LLM token 成本。不同 producer 产生同类型也不增加 k，但增加调用成本。表中“新增 k=0”均指**给定父观察与规则后的该投影**，不是宣称父模型免费或没有新的不确定性。

空值统一遵守 E0：`null` 配合 unavailable/error/abstain 等原因；`0/false/[]` 只用于成功完成检查后的负例。当前公共 JSON 常只有 null，新增 sidecar 才能保存失败、未调用、证据不足等差别。`confidence=1.0` 的工具常量、自评概率和模型分数都不能冒充已校准正确率。

## 2. 32 个原始结构字段与 2 个派生字段

以下来源与规则主要来自 [schema §2.2](visualization/baseline-tag-schema.md)（原文第145行） 和 [§3](visualization/baseline-tag-schema.md)（原文第282行）。旧 schema 的 producer 路由与 active Plus 不一致时，先保留共同字段语义，具体差异在第 4 节登记。

| 行号 / 公开字段 | registry 映射 | 观察、派生或别名及依赖 | 对 k 与覆盖的影响 / 边界 |
| --- | --- | --- | --- |
| SM01 `basic_acoustic.duration_sec` | E0 的原音频 scope/时钟 | WAV header 或 ffprobe 读原始时长；秒、非负有限数 | 元数据，新增 k=0；不可用重采样/裁剪后的时长冒充原音频时长；Q01–Q06 的归一化分母 |
| SM02 `basic_acoustic.sample_rate_hz` | E0 transform；T14 录制元信息 | 原始流 Hz；正整数。另存模型输入重采样率 | 元数据，新增声学 k=0；源与 view 各留一份来源，不能只存 16 kHz 模型输入 |
| SM03 `basic_acoustic.channels` | T14 + E0 transform | 原始声道数；另记录选择第 0 声道/均值混合等 view 操作 | 元数据，新增声学 k=0；声道数不能证明远近场或声源方位 |
| SM04 `basic_acoustic.nonspeech_ratio` | T05 的确定性补集比例视图 | `round(sum(non_speech_end-start)/duration_sec,6)`；依赖 SM05、SM01；无合法正分母为 null | 新增 k=0；Q05。定义是未检出人类语音的比例，可含音乐/噪声，不能解释为物理静音 |
| SM05 `basic_acoustic.silence_segments` | T05 的确定性补集区间视图 | 优先 native metadata 的 speech/silence/VAD/segment/utterance/word；否则 FireRed VAD P09；区间裁到整段并合并排序 | 旧名字实际表示 non-speech；保留来源、阈值与边界。成功无非语音=[]；失败=null。补集不新增 k；独立 VAD 调用有成本 |
| SM06 `audio_quality.snr_db` | T09 | P13 Brouhaha 的所有有限 SNR 输出算术平均，dB、round6 | 条件类型；Q05。平均没有单独保留 speech mask 时不能当“仅有声帧 SNR”；不是 MOS 或 C50 |
| SM07 `audio_quality.dnsmos_sig` | T08，`metric=DNSMOS_P835_SIG` | P12 primary ONNX 校准后 hop 均值；[1,5] | Q05 的语音信号质量目标；与其他 MOS 子目标分别保留语义/误差 |
| SM08 `audio_quality.dnsmos_bak` | T08，`metric=DNSMOS_P835_BAK` | 同一 primary ONNX 的另一输出；校准后 hop 均值；[1,5] | 背景不干扰程度；不是第二次独立模型观察，也不是噪声类别 |
| SM09 `audio_quality.dnsmos_ovrl` | T08，`metric=DNSMOS_P835_OVRL` | 同一 primary ONNX 的另一输出；校准后 hop 均值；[1,5] | 整体质量；不能由 SIG/BAK 的某个未定义公式重建 |
| SM10 `audio_quality.dnsmos_p808` | T08，`metric=DNSMOS_P808` | 单独 P808 ONNX/mel 路径与 hop 均值；[1,5] | 与 P.835 的 OVRL 不等价；T08 在此有 4 个输出维度，采集调用/模型数不能按一个 ID 隐去 |
| SM11 `room_acoustic.far_field` | G03；已知 capture 条件才可映 T14 | schema 预留字段，没有 active producer/stage；正常 null；input-tags 保留值需保留原来源 | 本轮 deferred；Q05 分层潜在有用。模型猜测的 near/far 与录制 metadata 不能混为同一原生事实 |
| SM12 `room_acoustic.rt60_sec` | G01：独立 room decay 语义 | P14 Rec-RIR 估计 RIR → Schroeder 衰减曲线 → T₂₀ 拟合外推 RT60，秒 | 不能塞进 T08/T09；当前 F 未证明需纳入核心。保留拟合定义和失败；同一 RIR 的 RT60/C50 共用上游成本 |
| SM13 `room_acoustic.c50_db` | G02：独立 room clarity 语义 | P14 估计 RIR → 直达索引后 50 ms 早期能量与晚期能量比，dB | 不能等同 Brouhaha 内部 C50、RT60 或描述性“清晰”；不同估计器保留同语义候选及 method，禁止静默替代公开来源 |
| SM14 `sound_field_scene.speech_music_events` | T06；内部 AED 区间属于 T07 | P09 FireRed AED 三类固定顺序数组；singing/music 默认全段占比≥.10；保留 raw ratio/threshold | 公共数组只有 presence，无 onset/offset；Q06 定位仍需内部 T07。[] 只否定当前三类/门槛下的检出 |
| SM15 `sound_field_scene.music_present` | T06 的派生布尔视图 | sure-tagger 为门控后 SM14 是否含 music；其他系统获准直接预测 | 本 producer 路径是别名、新增 k=0；独立评分不构成独立证据。直接预测时另记 producer，不伪装与 SM14 同源 |
| SM16 `sound_field_scene.external_noise_type` | T06 的 ontology 聚合视图 | P10 DASS 527 类分窗 score 跨窗 max → 阈值/排除规则 → 六类排序 | 新增 k=0，但父 T06 含 527 维/窗口成本。没有强事件时间；未检出不是全部环境声不存在 |
| SM17 `sound_field_scene.noise_composition` | T06 的细分类及跨观察门控视图 | 固定六桶；DASS 默认≥.25、每桶 top3；仅 `music_present=false` 清空 music 桶 | 非纯 SM16 别名，包含更细标签；依赖 T06(DASS)+T06(AED) 的判定记录。门控后空桶不能反证 DASS 原分数为负 |
| SM18 `speaker.speaker_count` | T03 → D01 | 选定有效 timeline 中的 speaker ID 集合大小；合法空 timeline=0 | 计数不新增感知 k；Q02/Q03；缺时间线为 null，不能把失败输出0 |
| SM19 `speaker.speaker_present` | D01 布尔别名 | sure-tagger `count>0`；其他系统可直接预测且独立评分 | 本路径新增 k=0。直接 presence 不含完整 T03，不足以重建人数或活动时间 |
| SM20 `speaker.asr_transcript` | T01 | 路由所选原始 ASR，公开整段文本仅 trim；旧 main 中文 MOSS、其余 FireRed；Plus 路由另见第4节 | core；Q01/Q02/Q04/Q07/Q08。公共字段本身没有词时间、speaker ID 或引用单位；不可读 reference transcript 充当 ASR |
| SM21 `speaker.speaker_transcripts`，孩子 `speaker_id/text` | T01+T02+T03+R01 → D04；跨 view 可需 R02 | 可信归属原文按人汇总；ID 来自 timeline、与 profiles 一致；确认无人=[]，身份整体未知=null，单人文本不可用为该项 text=null | 派生视图不新增 k，但 R01 错误与覆盖率单独评测；不可凭全文语义拆人。原全文与逐人拼接保留两个不同视图 |
| SM22 `speaker.multi_speaker` | D01 布尔别名 | `count>=2`；依赖已知 count/timeline | 新增 k=0；多人不等于实际发生重叠或切换 |
| SM23 `speaker.speaker_change_count` | T03 → D03 | 按冻结 continuity/gap/change 规则计算 change points 数 | 新增 k=0；Q03。规则版本决定结果，不能直接解释为抢话/打断次数 |
| SM24 `speaker.speaker_change` | D03 布尔别名 | 是否有 change point；同规则下等于已知 change_count>0 | 新增 k=0；未知 count/timeline 不填 false |
| SM25 `speaker.overlap_ratio` | T03 → D02 | `round(overlap_duration/speech_union_duration,6)`；分子需符合冻结 floor/区间规则 | 新增 k=0；分母是语音并集，不是整段时长。保留分子/分母及合法无语音规则 |
| SM26 `speaker.speaker_overlap` | D02 布尔视图 | 冻结规则后是否存在 overlap interval | 新增 k=0；同规则、正分母时与 ratio>0 相关；聚合值不能替代 overlap 时间轴 |
| SM27 `speaker.profiles` 及全部孩子 | T03/T05+T01/R01→D05 rate；T10/T11→D05 bands；ID 为 E0 scope/R02 | `speaker_id` 首次活动排序；`speech_rate.{band,value,unit}`；`pitch`；`speaker_volume`。rate 单位/阈值/clean mask 与 F0/RMS 参照均版本化 | 复合字段不能当一个免费感知。F0 与 RMS 是 T10/T11 两类；率/档位/ID 派生不增 k。旧/Plus 的单位、枚举与参照不等价，详见第4节 |
| SM28 `language_content.language` | T04 | schema 指 P04 FireRed 音频 LID；未知路由与字段 null 分开；实际发布可存在 compare 语言复核路径 | core；Q07。音频 LID、ASR 自带语言和文本派生语言必须留不同 lineage，不能互算独立票 |
| SM29 `language_content.word_count` | T01/外部文本→D06；G05 来源合同检查 | simple multilingual tokenizer；英文词、数字、单汉字计单位。优先 supplied `sample.text.transcript`，否则 routed ASR | 新增 k=0；给定文本的词数不验证 ASR 质量。输入文本须另存 parent/hash/source，不能假设总是 SM20 |
| SM30 `language_content.punctuation`，孩子 `punctuation_count/has_terminal_punctuation` | T01/外部文本→D06；不是 T15 生成器 | 与 SM29 同源文本的 Unicode 标点计数和末尾标点判断 | 新增 k=0；仅统计已有标点，不等于补标点、规范化候选或声学停顿；不要据此声称 T15 已被完整覆盖 |
| SM31 `language_content.repetition`，孩子 `has_repetition/repetition_count` | T16 的规则聚合子集 | 同源文本中连续 1–3 gram 重复及计数 | 确定性部分新增 k=0；不覆盖口吃/自修/所有语用重复，更不能恢复 ASR 已删掉的内容 |
| SM32 `language_content.filler` | T16 的词表聚合子集 | 同源文本的英文 filler lexicon 命中数 | 确定性部分新增 k=0；规则/语言限定明确，不能宣称所有语言完整 filler 检测 |
| SM33 `deterministic_derived.speaker_change_rate_per_min` | D03 + E0 duration 的确定性视图 | 合法 count 且 duration>0：`round(count*60/duration,6)`，否则 null | 新增 k=0；独立评分轴不增加感知维度。其他系统直接预测另记 producer/误差 |
| SM34 `deterministic_derived.filler_ratio` | T16 规则聚合 + D06 的确定性视图 | 合法 filler 且 word_count>0：`round(filler/word_count,6)`，否则 null | 新增 k=0；冻结分子/分母的同源文本与 tokenizer；独立评分不等于独立观察 |

`speaker.profiles` 的所有孩子已在 SM27 覆盖：`speaker_id`、`speech_rate` 对象及 `band/value/unit`、`pitch`、`speaker_volume`。SM21、SM30、SM31 同理覆盖复合孩子。子字段存在不证明它有单独 producer；反过来，同父对象中的不同声学语义也不能只算一个类型。

## 3. 12 个描述字段及额外 gender 评分轴

共享 [schema §2.2](visualization/baseline-tag-schema.md)（原文第231行） 写明 12 个描述字段由 compare 侧配置的 DeepSeek 单次生成，输入是结构 JSON；不是 12 个声学模型。以下是证据依赖映射，不是把 LLM 输出注册为新的原生声学事实。自然语言的自评 confidence 不是输入模型分数，也不是标定概率。

| 行号 / 描述字段 | registry / gap 依赖 | 允许的解释与保留边界 |
| --- | --- | --- |
| SD01 `descriptive.caption` | 按实际内容引用 T01、T03/D01–D03、T06、T08/T09、G01/G02 等 + E0 | 1–3 句综合；只用本样本已有非空 evidence；缺房间/质量证据时不补空间或清晰度结论；新增声学 k=0 |
| SD02 `descriptive.topic` | T01 | 文本主题推断；ASR 缺失或不足为 null；继承文本错误，不是独立音频语义证人 |
| SD03 `descriptive.background_condition` | T09、T08(BAK)、T05 补集、T06 | 开放背景描述；没有冻结阈值不得转成结构分档。schema 描述中“静音比例”的措辞须按 SM04 non-speech 解释 |
| SD04 `descriptive.dominant_content_impression` | D01、T06、T05 补集 | 内容主导性是综合印象；公共事件数组缺完整时长，不能证明某类占比最高；non-speech 不能自动解释为静音 |
| SD05 `descriptive.clarity_intelligibility_impression` | T08(SIG/P808/OVRL)、T09 | 质量/可懂度的谨慎推断；识别出语言、有转写、词数>0 均不直接证明清晰；G02 C50 也不等于人工可懂度 |
| SD06 `descriptive.background_sound_summary` | T06(DASS 六类/细类) | 不补声源实例、时刻、持续方式、方位、频段或显著程度；这些需要 T07 或额外测量 |
| SD07 `descriptive.descriptive_phrases` | 每条短语各自的已有 T/D/G 父证据 | 开放去重词组是表达层，不因变成短标签就新增事实；“轻微混响”仍需对应房间证据及解释合同 |
| SD08 `descriptive.facets`，孩子 `name/description/evidence_tags/confidence` | 事实依赖 T/D/G；证据指针与 confidence 属 E0/解释记录 | `name` 是解释维度名，不是新感知类型；evidence_tags 必须真实存在且本样本非 null；自评分不作统计置信 |
| SD09 `descriptive.speaker_descriptions`，全部孩子 | D05/T10/T11；ID 对齐 T03/R02；gender 为 G04 | 自然语言仅写 profile 支持的语速/相对音高/音量；`speaker_id` 不创建新身份；`description/descriptive_phrases/evidence_tags/confidence` 不增声学 k。gender 的来源另见下表，不能由 T10 推出 |
| SD10 `descriptive.scene_hypotheses`，孩子 `description/evidence_tags/confidence` | T01、D01–D03、T06 等 | 场景/交互假设，保持 inferred/hypothesis；不写回结构事实，也不把自评 confidence 当真值概率 |
| SD11 `descriptive.usability_notes` | Q05/Q02/Q06 目标 + T08/T09/D02 等及 E0 failure | 任务适用性建议，需把任务和证据联系起来；“适合 ASR”需下游效用验证，不能由单 MOS 数保证 |
| SD12 `descriptive.uncertainties` | E0 缺失、失败、冲突及未覆盖语义 | 明示不能判断的内容；不把 unavailable 写成 negative；描述自身也要记录生成来源 |

| 附加评测轴 | 当前 registry | 合同与统计边界 |
| --- | --- | --- |
| SX01 `speaker.gender` ← `descriptive.speaker_descriptions[].gender` | G04；不等于 T10 pitch，也不等于 T12 speaker embedding | 每人 male/female/null，按首次活动排序成评测序列；WER 风格编辑距离归一到[0,2]。这是结构评分轴，不自动说明来源是声学分类器；不能把[0,2]分数写成准确率。SD09 的孩子不是第二份 gender 证据 |

## 4. 必须保留的合同差异

### 4.1 gender：结构评分类别不等于生产者类别

旧 [schema 生成链路](visualization/baseline-tag-schema.md)（原文第252行） 明确把 gender 写为“同一次模型调用生成”；[§3 定义](visualization/baseline-tag-schema.md)（原文第342行） 把它从描述语义评分中分出，仍没有保证它来自音频分类器。实际 compare 的 canonical_structural（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/compare/eval/extract_sure_tagger_deepseek_once.py:332`） 甚至在送入 DeepSeek 前删除兼容 `profiles.gender`；prompt（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/compare/eval/sure_tagger_deepseek_language_descriptive_prompt.txt:50`） 要求每项输出 gender。因而这条路径应记作 **结构标签上的 LLM 推断/未知有效支持**，不能登记成新声学感知，也不能以 profile pitch 充当充分证据。本轮未测它的分类质量。

当前 Plus 则存在独立 gender observer（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/backend_worker.py:217`），调用共享 `speaker_gender` 的语言路由模型，输入 canonical speaker clean_spans；多人 clean speech 不足、标签非法或推理失败时该人保留 null。单人路径调用完整 view，不能一概写成所有分支均只消费裁剪后的 clean PCM。local_models.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/configs/local_models.json:110`） 记录 Alice/AfriSpeech/Griko 路由资产；完整权重许可与跨域准确度不在本次核验结论内。

Plus validate_descriptions（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/policy.py:286`） 要求 gender 与独立 gender_evidence 完全一致，描述 LLM 的 模板约束（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/policy.py:312`） 明确冻结 ID、顺序、gender。该版本才可登记 G04 的声学分类观察；性别评测标签仍是该训练/标注协议的输出，不外推身份或生理事实。当前 registry 没有此类型，应补可追踪候选条目而非映到 T10/T12。

### 4.2 silence 命名不能改变 non-speech 定义

[schema §3](visualization/baseline-tag-schema.md)（原文第289行） 与生成链路一致定义 `silence_segments` 为 **没有检出人类语音的区间**。其补集可含音乐、交通或设备声；字段名和部分描述规则中的“静音”不能改变含义。建议研究 sidecar 使用 `non_speech_intervals`，公开旧 path 保留兼容并附语义版本。若任务需要真正的低能量静音，需另定义能量门槛、噪声底和测量协议，不能直接重命名后宣布已覆盖。

原生 metadata 的 word/utterance 边界与声学 VAD 也不是等精度来源；两个补集相同不证明独立确认。用 T03 union 替代 T05 的 speech support 时必须记 derived/parent T03，并接受继承 diarizer 漏检的后果。

### 4.3 Rec-RIR 公开 C50 与 Brouhaha 内部 C50

共享 main Brouhaha stage（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/pipelines/tagging.py:1462`） 把 `internal.brouhaha_c50_db` 留作内部证据，明确没有发布到 `room_acoustic.c50_db`。公开值来自 C50 estimator（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/room_acoustic/c50_estimator.py:32`）：以估计 RIR 最大绝对值的样点为直达索引，取其后50ms能量与剩余晚期能量之比；早/晚能量非正会失败。RT60 estimator（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/room_acoustic/rt60_estimator.py:36`） 对反向积分能量衰减做 T₂₀ 拟合再外推。这些是**估计 RIR 的确定性指标**，不是实测房间 RIR 真值。

本地 specialist audio_tools.normalize（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools.py:381`） 把 Brouhaha 数组压成 `snr_mean_db/c50_mean_db`，并标 `result_type=audio_quality_and_speech_activity`；这个包名既不能把 C50 变成 T08，也不能证明 normalized evidence 真有 speech intervals。该分支只在 evidence 中保留这两个均值，若需 T05 必须核对 raw payload/另一路输出。其 Rec-RIR 分支（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools.py:404`） normalized evidence 只有 sample rate/count 和 raw_samples_available，不直接发布 RT60/C50。共享 main 的 room estimators 不能据此当作 specialist 已自动执行的能力。

因此 P13 可产生 C50 候选、P14 可产生 RIR→C50 候选；实际 scope、帧聚合、50ms参考点和训练定义先对齐，之后才做同语义误差比较。共享音频与训练相关性未知；两个值一致仍不构成独立性证明。

### 4.4 profile、语言和路由版本

| 项目 | schema / 共享 main | active Plus 或 compare 实现 | 映射处理 |
| --- | --- | --- | --- |
| 决策路由 | `20260906.1`：仅 zh/zh-* MOSS，其他 FireRed ASR+DiariZen | Plus `20261008.1`：zh/en MOSS；other/mixed/unknown Nemotron，独立词文本 Qwen；FireRed 有单人一致性门控 | T01/T03 类型相同，producer/route/父观察不同；不能拼成一个不存在的默认流水线。[local_audit LA-01](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/local_audit.md) |
| profile pitch | §3 说片内相对音高；§2.2 却写固定140/220Hz、low/mid/high；shared code有 variable | Plus F0 相对有效说话人上中位数，.85/1.15，low/medium/high | schema 自身定义/实现也有张力；必须保留连续 F0与参照。仅把 medium 改成 mid 不能消除绝对/相对差异 |
| volume / rate | 片内中位 RMS、low/normal/loud/variable；中文 zh_char_per_sec | Plus 平均 RMS、quiet/normal/loud，无 variable；中文 char_per_sec；仅完全 clean 且可靠归属片段计率 | D05 规则版本绑定；不能仅靠枚举重命名宣称等值。profiles.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/profiles.py:139`） |
| language 发布 | schema 把公开 language 归于 FireRed LID，描述 JSON 只读 | compare resolve_language（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/compare/eval/extract_sure_tagger_deepseek_once.py:255`） 有明确的 language_verification 例外；有文本且 verdict 不同、未要求 dependency review 时允许发布新语言 | 这是当前 compare 的特定允许通道，不代表 Plus Planner 可任意改结构。保留原 LID、文本 hash、verified/published language、review状态；派生语言仍是 T04，继承 T01错误 |

## 5. registry 缺口、成本和下一步

| 缺口 | 当前处理与任务理由 | 建议定义 / 可验证的进入条件 |
| --- | --- | --- |
| G01 RT60 | schema 已有，主 registry 尚无；Q05 的混响分层潜在有用，当前 deferred | 秒、RIR/音频 scope、decay fit method 与失败；目标域参考 RIR/RT60 误差及质量路由收益。与 G02 分开语义 ID |
| G02 C50 | schema 已有，主 registry 尚无；P13/P14 候选不同路径 | dB、早期窗/直达参考/聚合规则与 model定义；同音频同语义对照，不强塞入 T08/T09。高维 RIR 若保留，另报采样点数与字节数 |
| G03 far-field inference | 旧字段预留；T14 只覆盖已知 capture metadata | 明确近远场任务标注协议、设备/距离域及 abstain；无 producer/GT 前保留 null，不由混响猜地点/距离 |
| G04 voice-gender 分类 | 已有公开评分轴和 Plus observer，主 registry 遗漏；当前 F 不要求它作为核心输出 | 独立类型、样本内 speaker scope、原标签协议、各路 checkpoint/训练域、clean秒数、校准/拒答；不从 pitch/identity embedding 直接投影。覆盖既有合同不等于必须加入 S_core |
| G05 文本统计的来源合同 | 主 registry 已用 D06 覆盖 word_count/punctuation；剩余问题是共享 schema 优先 supplied transcript，而 ASR 字段禁止读 reference | 固定 parent_text_id/hash/text_origin/tokenizer/rule version；不增加声学 k。filler_ratio 复用 D06；不要用 T15 normalization 代替“数已有标点”，也不能默认这些统计总由 ASR 生成 |

成本至少同时报 `k_types`、`output_dimensions`、`timeline_intervals`、`relation_edges`、`representation_bytes`、`producer_calls`、模型加载/运行时间和 LLM tokens。T08 的四个 MOS 目标、T06 的527类/三类、T03 的多标签时间轴与 T10/T11 连续参数在同一 ID 下也不能省略分辨率；对比实验应冻结 metric 集合后再比较 k。RT60/C50 共用一份 RIR；Brouhaha 的多任务输出共用一次调用；两个 wrapper 复用同一 LID checkpoint 不增加独立证人。

本轮完成字段全覆盖、源码路径核对、差异登记。未执行 gender/质量/房间模型推理或带 GT 精度验证；本文件没有据代码存在声称这些目标已达到可靠覆盖。下一步先完善研究 registry/sidecar 与合同兼容表，再按 [validation_plan.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/validation_plan.md) 的独立数据/版本口径验证；本文件不自动迁移生产 schema。

## 6. 核对快照与可复核范围

以下 SHA-256 是本次读取内容的版本锚点，不是 checkpoint hash。registry一行已更新到本轮合并核对版本；文件以后变动时应重新核对hash与ID join。

| 来源 | SHA-256 |
| --- | --- |
| 共享 `compare/docs/tag-schema.md` | `8e1bc7c646e01f2ec6e467a54f9d448bed4c70fcb48e985c137ff695e39c3b29` |
| 本轮 `tag_registry.md`（合并核对时） | `7a3fb4bcb8f3533e217cfb282fe656dc1b76950d42c3438f683fbd62f56cc617` |
| Plus `backend_worker.py` | `877bf89edcab01019f1918f236acb3cf1653b7e5cc88a2608aeac80e1f06fe46` |
| Plus `policy.py` | `c09ba62d6b41634d4be82d9cbaa666357d540031ff7d6222e92bfedbd1106ee9` |
| specialist `scripts/audio_tools.py` | `fc6b8022deeee6d17da91a7215b48d8bd60b9297716eb88fd33087c27c095008` |
| compare `extract_sure_tagger_deepseek_once.py` | `aae54e8233c235a0a81fb09a755a19dac8502603936cc2dac7bea5839ef49e5d` |
| compare `sure_tagger_deepseek_language_descriptive_prompt.txt` | `03c1558be18649aa8c4bd9957011f37daf22f4f167389836be9a1951c62bed82` |
| shared `c50_estimator.py` | `217565ea2819d2f15de8fc90dce892b0db3144602530bb17368152d157f2578d` |
| shared `rt60_estimator.py` | `a1c229c74d5b4b28162d96ec362e8c5334759a5654cb78240729ad3404ab3afe` |
| shared `tagging.py` | `ab4eef184df3221d57e1d9c018ec45cdadde39d067058cc0c4ae023e1a366df1` |

完整字段检验口径：从 schema §3 提取六组父字段32个、derived父字段2个、descriptive父字段12个；逐个检查表中存在唯一 SM/SD主行，compound孩子由上述显式列表覆盖；gender额外检查SX01与SD09引用同一JSON路径。所有本地文档/源码链接检查目标存在，跨文档T/R/D/P/Q标识与当前主表对照；这属于文档一致性核验，不是模型测试。

本次检验结果：32+2+12 个父字段集合逐一匹配，额外 gender 评分轴1个，25个本地链接目标均存在；T/R/D/P/Q 引用均能在主文档中找到。核验时最新 registry hash 为 `98a6eb3ea8882b3a370e1b07fb1e8dabb84df85dc4bad78add624be9ef7fd256`；上表保留初始读取快照，字段映射已同步 D06。
