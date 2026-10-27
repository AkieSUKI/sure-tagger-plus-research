# 语音特征 Tag Schema

版本：`speech-evidence-space-20261020.v0.6`  
状态：`draft / research-sidecar`  
基线：[共享 `tag-schema.md`](visualization/baseline-tag-schema.md)  
模型关系：[模型与标签对应总表](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/模型与标签对应总表.md) · [符号版](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/模型与标签对应关系_符号版.md)

本文只把**描述音频特征的观察**称为 tag，目录包含音频属性、派生路径及其模型证据。本文不会自动修改共享 `tag-schema.md`、生产 JSON 或已有评测字段。

本版以**音频描述的完整性与感知还原程度**作为标签取舍的依据，并保留对同一声音属性的多路感知。`t_*` 定义音频属性；`d_*` 记录由已知观察重算的具体路径。某属性能由其他标签推导，不妨碍音频模型直接感知它并产生 `t_*` 观察。同一观察的容器、输入视图或 speaker scope 不再各建一个标签，不同 producer 的原始观察各自保留。

## 1. 标签边界

一个 `t_*` 标签必须满足：

1. 它描述音频中的内容、语言、说话人、时间结构、声学质量、场景、事件或副语言特征；
2. 它有明确的音频、片段、词、音符、可听声源或声源对 scope；说话人是可听声源的一类；
3. 它能追溯到音频模型、时间轴、转写或确定性音频规则；
4. 它不依赖外部查询、LLM 的措辞选择、系统路由或回答策略。

### 1.1 用音频还原检查标签覆盖

设计问题是：**只给出这些标签，原音频还有哪些可听特征无法被约束？补充什么描述，能让逆向生成的声音更接近原音频？** 例如，同样的文字、时间、F0 和能量，仍可能对应不同音色、发音实现、背景纹理和空间布局。能区分这些声音的描述才是候选增量。

标签取舍遵循：

1. **补声音事实**：固定已有标签后，找到仍明显不同的声音及差异原因；新描述应缩小这种听觉差异。
2. **检查已有覆盖**：若差异已包含在音素、声学特征分量、事件 ontology 或完整 RIR 中，完善原有定义与分辨率，不重复增设标签。正文未单列某个名称不等于没有覆盖。
3. **去掉重复路径，保留直接感知**：给定现有观察和规则得到的结果记为 `d_*`，不把重算包装成新证据；若模型直接从音频预测相同属性，则保留相应 `t_*` 观察。区分“语义上可推导”和“这份结果确实由已有观察计算而来”，不因前者删除另一模型的感知结果。
4. **分开研究目标与实现**：模型能否输出、接口如何组织、如何存储和评测属于能力与工程问题，不能替代音频语义覆盖，也不能因为当前模型做不到就忽略一种声音差异。

样本 ID、跨窗口 ID 映射、模型版本、缺失/冲突状态、文本编辑映射等用于正确记录观察，不作为新增音频标签的理由。后文保留这些记录约定，但不将其列为音频描述缺口。这里检查的是可听特征的还原程度，尚未证明有限标签能够唯一还原原始波形。

因此：

- `t_text`、`t_language`、`t_word_time` 是音频内容观察；
- 人数、重叠区间和说话人切换既可由活动区间重算，也可有专用音频模型直接预测；直接感知为 `t_*`，时间轴统计路径仍为 `d_*`；
- `t_snr`、`t_f0`、`t_event_interval` 是声学或事件特征；
- embedding、decoder posterior 和原始帧分数是模型证据，使用 `e_*` 命名，不冒充可解释标签。

## 2. 三种命名空间

```text
t_*   音频属性及必要归属关系：保留模型直接感知的观察，需有 scope、单位和缺失合同
d_*   已有观察的确定性重算路径：引用父证据和规则，可对应已有 t_* 语义，不单独再计类型
e_*   模型证据：embedding、posterior、帧分数和中间波形，供标签派生或审计
```

能力状态仍使用：

```text
[D] documented/native   模型或已实现接口直接返回
[C] conditional/derived 已有观察经固定组合或确定性规则得到
[H] hypothesis          需要任务头、标注、校准或实验验证
```

`[D/C/H]` 是能力状态，`source` 是证据来源；二者不能互换。`source` 取值为 `native`、`derived`、`text_inferred` 或 `hypothesis`。

`t_*` 可以包含从模型帧分数提取的活动或事件区间，也可以包含音频加文本生成的对齐结果；取舍以它们实际描述的声音属性为准。`d_*` 专门表示已有观察的统计、集合运算、固定映射和重排。同一语义类型可同时有直接模型观察和派生路径，类型只计一次；模型观察数与新增声音信息量另行区分，不能将新增类型数解释成数学上的独立维数。不能把“可以从原始波形重新跑模型”当作无损重算，也不能因两个模型输出同名字段就删去其中一份证据。

交叉核验要求语义、时间范围、单位、分母和类别集一致。不同模型可以提供不同观察，但不自动意味着错误独立；同一 checkpoint 的包装接口、同一帧分数的不同阈值和同一时间轴的统计不算多条独立感知。直接检测的结果若无 speaker ID，也不能与指定说话人对的结果直接等同。完整 `d_*` 逐项审查见 [直接感知审查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_direct_audit.md)。

## 3. 统一观察对象

`t_*` 和 `e_*` 都使用可追溯 observation；`d_*` 使用相同的引用合同，但不额外增加标签类型。`d_*` 必须使用 `source=derived`，并保存 `parent_evidence_ids` 与 `rule_version`。

```json
{
  "evidence_id": "ev_000123",
  "tag": "t_word_time",
  "value": [
    {"unit_id": "u_7", "start": 1.20, "end": 1.56, "score": 0.91}
  ],
  "scope": "word",
  "time_base": "audio_abs_sec",
  "speaker_ids": ["S01"],
  "source": "native",
  "status": "observed",
  "producer": {
    "model_id": "m_qwen_aligner",
    "checkpoint": "Qwen3-ForcedAligner-0.6B",
    "adapter": "local_adapter_revision_or_unknown"
  },
  "ontology": "lexical.v1",
  "calibration": null,
  "parent_evidence_ids": ["ev_asr_000122"],
  "rule_version": null,
  "failure": null
}
```

| 字段 | 合同 |
| --- | --- |
| `evidence_id` | 在样本内唯一；关系和派生视图通过它引用父证据 |
| `tag` | `t_*`、`d_*` 或 `e_*` 的稳定 ID |
| `scope` | `clip`、`frame`、`segment`、`word`、`phone`、`note`、`event`、`speaker`、`sound_source`、`channel`、`pair` 或 `corpus`；具体声源归属另由下列字段表达 |
| `time_base` | 时间统一使用原音频绝对秒；流式窗口另保存 `window_origin` |
| `speaker_ids` | 样本内匿名 ID；没有可审计归属时为 `null` |
| `sound_source_ids` | 可选的可听声音流归属；人声直接沿用已有 speaker ID，非人声使用样本内匿名 ID。描述能听出的声音流及持续性，不断言真实物体/动物个体数；未知为 `null` |
| `source` | `native`、`derived`、`text_inferred` 或 `hypothesis` |
| `producer` | 模型/工具、checkpoint、adapter、代码或配置版本；未知写 `unknown` |
| `ontology` | 类别集和版本，例如 `AudioSet527`、`emotion2vec9` |
| `calibration` | 校准集、版本、阈值和分数含义；没有校准时为 `null` |
| `parent_evidence_ids` | 对齐、派生视图和关系必须引用输入证据；例中的词文字由父 ASR 的 `unit_id` 取得 |
| `failure` | 失败、缺失和不可重试原因；不能用空数组伪装成功 |

`null` 表示未知/失败/不支持；`[]` 表示已确认的空集合；`not_applicable` 表示输入不适用；`abstained` 表示主动拒答。缺失不能写成 `false` 或 `0`。

## 4. 五个基线音频标签层与 L6 关系层

L0 是证据封装元数据，不是音频标签；L1–L5 沿用共享 `tag-schema.md` 的五层分类，L6 保留为新增的音频内关系层。

| 层 | 名称 | 描述的音频特征 | 保留观察 / 派生视图 |
| --- | --- | --- | --- |
| L0 | Evidence Envelope（非标签） | 样本、文件、版本和时间基准 | `meta_sample_id`、`meta_duration`、`meta_sample_rate`、`meta_channels` |
| L1 | Lexical Content（词汇内容层） | 音频中的语言内容和文字定位 | `t_text`、`t_language`、`t_word_time`、`t_phone_time` |
| L2 | Speaker（说话人层） | 匿名说话人及其音频归属 | `t_spk_activity`、`t_unit_speaker`、`d_speaker_summary` |
| L3 | Temporal（时间结构层） | 发言、重叠、间隔、切换和局部语速 | `t_overlap_interval`、`t_speaker_change`、`t_speech_rate_value`；另有对应 `d_*` 路径 |
| L4 | Paralinguistic & Non-verbal（副语言层） | 基频、能量、可听发声状态、情绪和非言语发声 | `t_f0`、`t_phonation`、`t_emotion`；事件复用 L5 的统一类型 |
| L5 | Acoustic Scene & Events（声学场景层） | 质量、房间、频谱形状、音乐音符、空间声像、非语音事件和通道特征 | `t_snr`、`t_rir`、`t_spectral_envelope`、`t_note_event`、`t_spatial_image`、`t_event_interval` |
| L6 | Audio-grounded Relations（音频关系层） | 可听声音流的归属与交互候选；确定性时序关系另存视图 | `t_event_source_candidate`、`t_interruption_candidate`、`d_event_timing` |

### 4.1 L0：Evidence Envelope（不计入标签）

| ID | 建议路径 | 类型 | 来源 |
| --- | --- | --- | --- |
| `meta_sample_id` | `sample.sample_id` | string / clip | 输入合同 `[D]` |
| `meta_duration` | `sample.duration_sec` | number / clip | WAV/ffprobe `[D]` |
| `meta_sample_rate` | `sample.sample_rate_hz` | integer / clip | WAV/ffprobe `[D]` |
| `meta_channels` | `sample.channels` | integer / clip | WAV/ffprobe `[D]` |
| `meta_capture_metadata` | `sample.capture_metadata` | object / clip | 原始 metadata `[D]` |

这些字段是音频的捕获属性和时间基准，不是感知标签；保留它们是为了让其他标签可复核。

### 4.2 L1：Lexical Content

| tag | 建议路径 | 粒度 | 来源/状态 |
| --- | --- | --- | --- |
| `t_text` | `content.transcript` | segment/speaker/clip | ASR（含逐说话人 ASR）`native` `[D]` |
| `t_word_count` | `content.word_count` | segment/clip；词定义及语言明确 | 直接声学词数回归的项目README声明 `[H]`；代码/权重未核实，不代表已取得可用producer；区别于同一ASR文字的计数 |
| `t_language` | `content.language` | segment/clip | LID/ASR `native` `[D]` |
| `t_word_time` | `content.word_time` | word | aligner/CTC/DTW `native/derived` `[D/C]` |
| `t_phone_time` | `content.phone_time` | phone | 规范读音对齐 `[C/H]`；实际音值与实现细节的支持待验证 `[H]` |
| `t_code_switch_span` | `content.code_switch_span` | segment | ASR+LID `hypothesis` `[H]` |
| `t_self_repair_candidate`、`t_hesitation_span` | `content.disfluency` | word/segment | text+time probe `hypothesis` `[C/H]` |

转写及基于转写的观察必须保留 `text_origin`、语言、tokenizer 和 ASR parent evidence。直接声学计数记录音频、语言及所估计单位，不伪造ASR依赖。文本模型不能覆盖原始 `t_text`。

词/字与音素保留各自粒度；强制对齐是生成方法，不再另建 `t_alignment` 容器。对同一原文的文字统计由 `d_text_statistics` 生成，另一声学计数模型的候选观察另存。标点补全、数字规范化和大小写变换属于文字呈现；其结果保留在非标签辅助输出，不再以 `t_punctuated_text` / `t_normalized_text` 作为音频维度。声音中实际的停顿、读音和句调由相应时间、发音与声学观察描述；规范化后的文字不能替代实际说出的内容。

`t_phone_time` 同时容纳规范读音和实际语音实现，但必须明确区分二者。实际读音单位包含可听音值、起止及所用音标体系；必要时以细音标或局部发音属性描述送气、鼻化、弱化、闪音、爆破释放或不除阻。音素替换、插入与脱落按实际发出的序列表达；未发出的音素不伪造发声时长。已有细音标能够表达的属性不重复保存。词典约束对齐不能自动升级为实际发音观察，也不能据此补造口音、误读或省音结论；本版扩充语义，不宣称 MFA 等现有接口已经支持这些细节。

### 4.3 L2：Speaker

| tag | 建议路径 | 粒度 | 来源/状态 |
| --- | --- | --- | --- |
| `t_spk_activity` | `speaker.activity` | speaker/interval | diarizer/MOSS 投影 `native/derived` `[D/C]` |
| `t_unit_speaker` | `speaker.unit_assignment` | word/segment | 对齐+diarizer 或 MOSS `native/derived` `[D/C]` |
| `t_speaker_count` | `speaker.count` | clip/segment；指定范围内不同说话人的总数 | 独立音频分段、声纹与自动聚类估计 `[C]`；不把同时人数模型当作整段总人数，见 [审查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_direct_audit.md) |
| `t_gender` | `speaker.gender` | speaker | 专用分类 head `native/derived` `[D/C]` |
| `t_same_speaker_candidate` | `speaker.same_speaker_candidate` | pair | 声纹匹配 `derived/hypothesis` `[C/H]` |

`speaker_id` 是样本内匿名标签。声纹中间向量使用 `e_spk_embedding`，不作为 `t_*` 标签；它不能直接产生真实姓名、年龄、角色或身份。

从已有活动区间统计人数和存在性的路径为 `d_speaker_summary`；直接音频人数估计另保留为 `t_speaker_count`，不能用时间轴统计覆盖。按已接受归属拼接的逐人文本由 `d_speaker_text` 计算。**逐说话人 ASR 计入音频标签 `t_text[speaker]`，说话人归属由 `t_unit_speaker` 表达。** 联合模型原生的逐人/逐段文字仍保留为 `t_text` 的独立观察，并附 speaker scope 或 `t_unit_speaker` 关系。目标说话人 ASR/对齐复用 `t_text`、`t_word_time`，记录目标、分离波形引用及输入视图，不另建 target 标签；与原混音的结果分别保留，准确率仍待验证。

### 4.4 L3：Temporal（直接观察与派生视图）

本层保留直接从音频检测的重叠、说话人切换及音频模型语速估计；从已有活动区间、文字和时间计算的路径仍保留为 `d_*`。这些观察可用于比较不同感知路线，但不是互相独立的数学坐标。

| tag | 建议路径 | 粒度 | 来源/状态 |
| --- | --- | --- | --- |
| `t_overlap_interval` | `temporal.overlap` | interval；未归人时 speaker IDs 为未知 | 专用OSD任务/区间解码源码已核实，具体checkpoint未核实 `[C/H]`；区别于diarizer区间求交 |
| `t_speaker_change` | `temporal.speaker_change` | boundary/frame | 专用SCD任务/峰提取源码已核实，具体checkpoint未核实 `[C/H]`；不自动给切换双方ID或发言意图 |
| `t_speech_rate_value` | `temporal.speech_rate` | segment；单位与时间分母明确 | SylNet 音频音节计数除以窗口秒数 `[C]`；当前支持候选为 syllable/s，不能冒充 word/s 或去停顿发音速度 |

下面是已有时间轴的确定性派生路线。令 `I_s` 为说话人 `s` 的活动区间并集，采用半开区间：

```text
A(t) = {s | t ∈ I_s}                  同时活动的不同说话人集合
U    = ⋃s I_s                         语音活动并集
O    = {t | |A(t)| ≥ 2}               具体多人重叠区间
O_ab = I_a ∩ I_b                       指定说话人对的重叠区间
overlap_ratio = duration(O) / duration(U)
```

例如 A 在 `[0,3)`、B 在 `[2,5)` 活动，则重叠为 `[2,3)`，比例为 `1/5`。`d_overlap` 按活动集合变化切成原子区间，并保留各区间的 `active_speaker_ids`；三人同时活动的时长在全局分子中只算一次，不能把各对交集时长直接相加。

重算需使用同一样本、时间坐标、已统一的 speaker ID、有效覆盖范围和 `rule_version`；阈值、最短区间、平滑/合并及样本边界规则必须固定。依赖缺失时保留未知，分母为零时比例为 `null`。这些派生结果继承上游漏检，不能作为额外独立证据。完整派生视图见 4.8。

时间重叠只能描述同时活动，不能单独证明打断、附和、同意或互动意图。

OSD 给出“至少两人同时说话”的区间时，不自动提供参与者；只有与同一范围的全局 `d_overlap` 合同一致才可比较，不能直接替代指定 pair 的交集。SCD 模型检测的声线变化与 continuity/gap 规则生成的轮次切换须先统一边界定义。音节率模型路线无需已有 ASR 文字，但经 ASR/对齐计算的词率仍是 `d_speech_rate`；两者不能仅靠单位换算互证。来源版本与未运行边界见 [直接感知审查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_direct_audit.md)。

### 4.5 L4：Paralinguistic & Non-verbal（副语言层）

| tag | 建议路径 | 粒度 | 来源/状态 |
| --- | --- | --- | --- |
| `t_f0`、`t_rms`、`t_loudness`、`t_voicing` | `profile.raw` | frame，附 speaker/sound_source 归属；粗摘要另标 speaker/segment，不能替代轨迹 | 既有 profile 仅 F0/RMS 摘要 `[C]`；openSMILE LLD 的 F0/响度路径待适配 `[C/H]`；独立 voicing 输出及非人声逐源支持待确认 `[H]` |
| `t_jitter`、`t_shimmer`、`t_hnr` | `profile.voice_quality` | speaker/segment | clean crop + feature tool `[C/H]` |
| `t_phonation` | `paralinguistics.phonation` | speaker/interval | 可听发声状态及转换；新增语义，producer 待调查/验证 `[H]`，见 10.2 |
| `t_emotion` | `paralinguistics.emotion` | segment/speaker | SenseVoice/emotion2vec+ `[D/H]` |
| `t_arousal`、`t_valence`、`t_stress`、`t_engagement` | `paralinguistics.probe` | segment/speaker | supervised probe `[H]` |

笑、哭、呼吸和咳嗽复用 L5 的 `t_event` / `t_event_interval`，由 ontology 和 `class_id` 区分；掌声也归统一事件表，不解释为人体发声。类别观察不自动提供事件时间。

F0/能量模型直接输出的轨迹仍是 `t_f0` / `t_rms` / `t_loudness` 的逐帧观察；对已有轨迹作说话人筛选、裁剪和平滑才使用 `d_contours`。eGeMAPS 等特征包使用 `e_acoustic_feature_bundle`，单项通过 feature ID、单位、配置和聚合方式引用，不与包内同一分量重复保存或计数。不同单位/算法的 F0、RMS 与感知 loudness 仍分别记录；不再用一个 `t_voice_quality` 泛容器重复包装已有测量。

`t_f0`、`t_rms`、`t_loudness` 的语义扩展到可辨认的非人声声音流，复用相同类型与单位，不另建“音乐响度”“机器音量”等标签。音符内的音高轨迹也复用 `t_f0`。混音整体观察不能直接赋给每个声源；逐声源观察必须确实描述相应声音流。无可辨基频的噪声不强填 F0，多音同时发出的结构由 `t_note_event` 表达。扩充适用范围不意味着现有 producer 已能分解混音；有声性、jitter 等人声特征也不因此自动适用于所有声源。

### 4.6 L5：Acoustic Scene & Events（声学场景层）

| tag | 建议路径 | 粒度 | 来源/状态 |
| --- | --- | --- | --- |
| `t_speech_activity` | `acoustic.speech_activity` | clip/interval | VAD/Brouhaha/AED `[D/C]` |
| `t_snr` | `quality.snr` | frame/clip | Brouhaha `[D/C]` |
| `t_mos_sig`、`t_mos_bak`、`t_mos_ovrl`、`t_mos_p808` | `quality.dnsmos` | window/clip | DNSMOS `[D/C]` |
| `t_rir` | `quality.rir` | clip | Rec-RIR `[D]` |
| `t_c50` | `quality.c50` | frame/clip | Brouhaha 原生回归，仅接口实际暴露时记录 `[D/C]` |
| `t_rt60` | `quality.rt60` | segment/clip；单位秒，衰减定义明确 | 音频盲估候选 `[H]`；BERP具体RT60输出链未核实，不能将RIR派生或仓库文件名当作直接头证据 |
| `t_spectral_envelope` | `acoustic.spectral_envelope` | frame，附 sound_source 或整体混音归属 | 局部频谱包络；新增语义，producer 待调查/验证 `[H]`，见 10.1 |
| `t_note_event` | `events.notes` | note/sound_source | Basic Pitch 对音高/模型起止有部分接口依据；完整语义仍待验证 `[H]`，见 10.3 |
| `t_spatial_image` | `acoustic.spatial_image` | sound_source/interval | 可听声像的位置、宽度和远近感；新增语义，producer 待调查/验证 `[H]`，见 10.4 |
| `t_channel_sync_offset`、`t_channel_consistency`、`t_channel_dropout_candidate`、`t_channel_quality_skew` | `quality.channels` | channel/clip | 多通道波形规则或质量模型 `[C/H]` |
| `t_event` | `events.class` | clip/segment | event model `[D/C]` |
| `t_event_interval` | `events.intervals` | event interval | frame score + merge `[C]` |

AudioSet、PANNs 或 BEATs 的类别分数是 `e_event_scores`，不是可直接发布的 `t_event`；必须固定 ontology、阈值和时间聚合。

独立 VAD 的 `t_speech_activity` 按任务取得；从 `t_spk_activity` 求并集的结果记为 `d_speech_activity`，不再新增一个独立观察。两条路径的漏检可能不同，不能相互冒充。非语音补集和比例、RIR 的 RT60/C50、事件占比、音乐过滤和背景声分组见 4.8。

局部或目标人质量直接复用具体的 SNR/MOS 等类型，附时间、speaker 和输入视图。对裁剪/分离波形重新推理的观察与全局分数的聚合分别保留，不能互相替代。`C50[RIR]` 为派生值，Brouhaha C50 为另一原生估计；两者必须记录不同的 `metric_source`。DNSMOS、SNR、RT60 不能单独证明房间名称、麦克风距离或人工可懂度。

`t_event` 保留仅有 clip/segment 类别判断的来源，`t_event_interval` 保留有时间定位的来源；同一完整事件时间轴的类别列表使用派生视图。clip 分类不能反推精确区间，同类事件的不同 producer 也各自保留。

事件类别进一步区分录音中可听的具体形态，例如削波爆裂、金属颤音、细碎撞击；仅在现有 ontology 无法区分时补充本地扩展子类，并明确类别定义。已有的失真、耳语、喊叫、噪声类型等直接复用，不能因为本文未逐个列出就重建标签。细型、可听严重程度及其时间变化可在事件观察中表达，严重程度须有明确定义，不能用 MOS/SNR 直接替代；当前分类器的粗类输出也不能自动细化。连续音色复用 `t_spectral_envelope`，各声源强弱复用 `t_rms` / `t_loudness`，细小可定位事件复用 `t_event_interval`，不另设一个重复包装它们的“背景纹理”标签。这些描述仍不保证完整覆盖全部微观纹理与失真。

### 4.7 L6：Audio-grounded Relations（音频关系层）

| tag | 建议路径 | 粒度 | 来源/状态 |
| --- | --- | --- | --- |
| `t_event_source_candidate` | `relations.event_source_candidate` | event/sound_source pair | 原人声归属路径及扩展的可听声音流归属；均待验证 `[H]` |
| `t_interruption_candidate` | `relations.interruption_candidate` | turn pair | timeline + semantic/prosodic probe `[H]` |
| `t_backchannel_interval` | `relations.backchannel_candidate` | turn | timeline + annotation `[H]` |
| `t_repair_sequence` | `relations.repair_candidate` | turn pair | text + time + annotation `[H]` |

L6 只保存能由音频时间轴、可听声源归属和事件/声学观察定义的关系候选；重叠或相邻不能单独证明声源归属、打断、附和、同意、角色或因果意图。

`t_event_source_candidate` 描述某次事件属于哪个可听声音流，以及不同时刻的事件是否延续同一声音流。人声沿用 speaker ID，非人声可区分音色或空间表现不同的声音流；它们的音高、响度、频谱和声像通过相同 `sound_source_ids` 关联。例如两种可辨声线交替吠叫，不再只留下若干无归属的“狗叫”区间。它不要求推断真实动物/设备身份，也不能仅凭时间相交或同类名称合并声源；不可辨时保留未知或多个候选。

事件与发言的相交、先后关系可以由区间计算，移到 `d_event_timing`；事件由谁发出及交互意图不能仅凭区间求交得到，继续保留为待验证的归属或交互候选。

### 4.8 可重算视图 `d_*` 与直接感知路径

下表保存计算合同和旧符号兼容索引，**只限定由已有观察重算的路径**，不再宣称相同属性只能是派生值。直接感知使用对应 `t_*`，派生结果继续用 `d_*` 并引用父证据；两者可并存核验。容器、scope 变体、固定补集和类别过滤继续复用已有类型。完整逐项来源与尚未确认的路径见 [直接感知审查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_direct_audit.md)。

| 派生视图 | 已有观察的固定计算路径 | 音频模型路径与现行标签 | 旧符号去向 |
| --- | --- | --- | --- |
| `d_text_statistics` | 指定原文、tokenizer、重复/filler规则后计算次数与比例 | 声学词数回归保留 `t_word_count` 候选 `[H]`，只核实到README；音节数不能冒充词数。重复/填充语声学检测可按 `t_event` 类别研究，精确犹豫定位复用 `t_hesitation_span`，当前新增专用producer未确认 | 恢复候选 `t_word_count`；同一原文计数仍派生。标点计数不属于音频标签；重复/filler次数与比例仍为规则量，不另建 `t_has_repetition` 类别别名 |
| `d_speaker_summary` | 对同一有效时间轴统计不同ID数，再算 `present=count>0`、`multi=count≥2` | 不依赖已有说话人时间轴的音频分段/声纹/自动聚类路线保留 `t_speaker_count`；CountNet 的窗口最大同时人数不等于此处总人数 | 恢复 `t_speaker_count`；`t_speaker_present`、`t_multi_speaker` 仍按具体来源人数派生 |
| `d_speaker_text` | 按已接受 `t_unit_speaker` 与冻结原文顺序拼接 | 联合或目标说话人 ASR 保留 `t_text[speaker]` 及归属，不是拼接路径 | 不恢复 `t_speaker_text` 容器别名 |
| `d_speech_activity` | 对已有 `t_spk_activity` 求并集 | 独立 VAD 早已是 `t_speech_activity` | 复用既有类型 |
| `d_overlap` | 活动区间求全局/指定pair交集、参与者及统一分母下比例 | 专用OSD保留 `t_overlap_interval`；无身份OSD不能提供pair交集 | 恢复 `t_overlap_interval`；`t_overlap_ratio` 及bool仍按选定时间轴计算 |
| `d_turn_structure` | 固定continuity/gap规则生成turn/gap/duration与change统计 | 独立SCD保留 `t_speaker_change`；输入右端“说完/未说完”不等于全段轮次或说话人切换 | 恢复 `t_speaker_change`；`t_turn_interval`、`t_gap_interval`、`t_turn_duration`、change次数/速率仍为规则路径 |
| `d_response_latency` | 已有可审计回应对应关系后计算时间差 | 本轮未确认直接识别实际回应对应关系并回归已发生latency的模型；未来发言预测不能替代 | `t_response_latency` 的时间差部分仍派生，缺回应关系则未知 |
| `d_speech_rate` | 文字单位、时间、语音掩码与固定分母生成局部/逐人语速、词时长、停顿 | SylNet对音频独立估音节数，再除窗口秒数，保留 `t_speech_rate_value[syllable/s]` 的模型组合观察 | 恢复 `t_speech_rate_value`；不恢复scope别名 `t_local_speech_rate`；`t_word_duration`、`t_pause_interval` 仍由已接受边界/掩码计算 |
| `d_contours` | 对已有F0/RMS等轨迹做归属、裁剪、平滑和归一化 | 音频直接估计的轨迹复用 `t_f0`、`t_rms`、`t_loudness`，不同模型原值分别保留 | 不恢复 `t_pitch_contour` / `t_intensity_contour` 别名 |
| `d_profile_bands` | 指定clean mask、全片参照与固定阈值分档 | 本轮未核实与同一片内参照合同一致的直接档位模型；主观高/低、响/轻不自动等价 | `t_pitch_band`、`t_volume_band` 仍为具体参照下的规则映射 |
| `d_nonspeech` | 对已确认覆盖范围内所选speech timeline求补集与占比 | 独立speech/non-speech模型复用 `t_speech_activity`；同一二分类头的负类不再算另一独立感知 | `t_nonspeech_interval` / `t_nonspeech_ratio` 为选定观察的补集/比例；non-speech不等于静音 |
| `d_room_metrics` | 从指定RIR按固定算法计算RT60/C50，记录 `metric_source=RIR` | Brouhaha原生C50已保留 `t_c50`；恢复 `t_rt60` 音频盲估候选 `[H]`，BERP的具体输出链未核实 | RIR路径仍派生，独立模型估计另存；不将候选写成已验证的直接RT60回归头 |
| `d_event_summary` | 事件类别列表、过滤、区间并集占比；帧占比需帧分数及hop | 独立clip分类/SED复用 `t_event` / `t_event_interval`，包含音乐、笑哭等ontology类别 | 不恢复笑/哭/咳嗽/音乐等类别别名；`t_event_frame_ratio` / `t_event_interval_ratio` 仍为对应分数/区间统计 |
| `d_background_categories` | 对指定事件分数应用排除表、top-k、类别映射与音乐门控 | 独立声音类别判断复用 `t_event`；类别存在不能自动证明该声音在背景，本轮未核实前景/背景归属模型 | `t_external_noise_type` / `t_noise_composition` 不作为规则分组的额外类型；声源相对强弱另用响度/归属描述 |
| `d_event_timing` | 对event/turn区间作相交、先后、邻接判断 | 本轮未确认匹配这些纯时序合同的独立关系头；新的SED时间轴可提供另一组比较输入，但关系求交仍派生 | `t_event_during_speech` / `t_event_before_turn` / `t_event_after_turn` 仍为时序算子，不推断归属或因果 |

结构合并：`t_alignment` 使用 `t_word_time` / `t_phone_time` 及方法字段；`t_target_speaker_text` / `t_target_speaker_word_time` 使用 `t_text` / `t_word_time` 的目标输入视图；`t_quality_by_segment` / `t_quality_by_speaker` / `t_target_quality` 使用具体质量指标及 scope。`t_acoustic_features` 的特征包改存 `e_acoustic_feature_bundle`，`t_voice_quality` 的测量集合直接引用单项，不再作为额外标签。`t_punctuated_text` / `t_normalized_text` 退出音频标签清单，作为文字呈现另存。上述合并均保留实际 producer、输入和分数，不把不同来源观察合成一条。

v0.5 将 `t_event_speaker_candidate` 泛化为 `t_event_source_candidate`；旧符号及路径只作为人声归属的迁移入口，不再单列独立标签。已有关系保留其 speaker ID、候选状态和来源；改名不能凭空产生非人声归属。`sound_source_ids` 是声音特征的归属信息，不是另一个标签类型。

## 5. 模型证据 `e_*`

下面的模型中间证据支撑音频观察，不作为独立音频标签；可重算的 `d_*` 视图另见 4.8。

| ID | 含义 | 典型 producer |
| --- | --- | --- |
| `e_spk_frame_scores` | 逐帧说话人后验 | Nemotron、Sortformer |
| `e_spk_embedding` | 声纹中间向量 | CAM++、ECAPA、WeSpeaker |
| `e_speech_frame_scores` | VAD 帧分数 | FireRed VAD、Silero、FSMN-VAD |
| `e_event_scores` | 事件类别分数 | DASS、PANNs、BEATs |
| `e_event_frame_scores` | 事件逐帧分数 | FireRed AED、PANNs SED |
| `e_token_score`、`e_token_posterior` | ASR token 分数/后验 | ASR decoder |
| `e_audio_embedding`、`e_text_embedding` | 表征向量 | CLAP、BEATs、PANNs |
| `e_acoustic_tokens` | 离散声学 token | BEATs tokenizer |
| `e_acoustic_feature_bundle` | 带 feature 名、单位、配置及聚合定义的原始特征包；保留全部分量，单项标签通过引用访问 | openSMILE eGeMAPSv02 等 |
| `e_target_waveform` | 目标说话人波形中间结果 | WeSep |
| `e_latent_embedding` | hidden state 或 layer 表征 | 暴露 hidden state 的模型 |

这些证据可以支撑 `t_*` 标签或人工复核，但不能因为模型返回了向量，就命名成情绪、语义、风格或身份标签。

## 6. 推荐 JSON 结构

```json
{
  "schema": {
    "id": "speech-feature-tags",
    "version": "20261020.v0.6",
    "status": "research-sidecar"
  },
  "sample": {
    "sample_id": "...",
    "audio_ref": "...",
    "duration_sec": null,
    "sample_rate_hz": null,
    "channels": null,
    "capture_metadata": null
  },
  "tags": {
    "lexical": [],
    "speaker": [],
    "paralinguistic": [],
    "scene_events": [],
    "relations": []
  },
  "derived_views": [],
  "evidence": [],
  "errors": []
}
```

`tags` 只放保留的 `t_*`；`derived_views` 按需放 `d_*`；`evidence` 只放 `e_*`。派生视图通过 `parent_evidence_ids` 追溯父证据。

## 7. 与现有公共 schema 的兼容映射

| 保留观察或派生视图 | 旧公共字段 | 兼容规则 |
| --- | --- | --- |
| `t_text` | `speaker.asr_transcript` | 保留原始文本和 producer；描述模型不能覆盖 |
| `d_speaker_text` 或原生 `t_text` 的逐人观察 | `speaker.speaker_transcripts` | 只发布有可审计 speaker/time 归属的文本；保留 native/derived 路径区别 |
| `d_text_statistics` | `language_content` 的文字统计、`deterministic_derived.filler_ratio` | 沿用旧文本来源、tokenizer、词表与分母合同 |
| `t_speaker_count` 或 `d_speaker_summary` | `speaker.speaker_count`、`speaker.speaker_present`、`speaker.multi_speaker` | 区分音频人数估计与timeline统计；present/multi各自绑定所选count；未知不写 `0/false` |
| `d_turn_structure` | `speaker.speaker_change_count`、`speaker.speaker_change`、`deterministic_derived.speaker_change_rate_per_min` | 绑定 timeline、continuity rule 和每分钟单位 |
| `t_overlap_interval` 或 `d_overlap` | `speaker.overlap_ratio`、`speaker.speaker_overlap` | 区分专用OSD与timeline求交；只有已知的参与者才发布；比例绑定区间来源与speech-union分母 |
| `t_speech_activity` / `d_speech_activity`、`d_nonspeech` | `basic_acoustic.silence_segments`、`basic_acoustic.nonspeech_ratio` | 明确所选时间线及覆盖范围；`non-speech` 不等于低能量静音 |
| `t_snr`、`t_mos_sig`、`t_mos_bak`、`t_mos_ovrl`、`t_mos_p808` | `audio_quality.*` | 保存窗口、聚合方式和模型版本 |
| `t_rir` → `d_room_metrics` | `room_acoustic.rt60_sec`、`room_acoustic.c50_db` | 旧公共值只走 RIR 算法；Brouhaha 原生 `t_c50` 不能补位；旧 `far_field` 继续按旧合同处理 |
| `t_event` / `t_event_interval` → `d_event_summary` / `d_background_categories` | `sound_field_scene.*` | 类别集、阈值、帧占比定义和门控版本随值保存；区间占比不能替代旧帧占比 |
| `d_speech_rate`、`d_profile_bands` | `speaker.profiles` | 语速依赖文字/时间；音高和音量档位依赖 `t_f0` / `t_rms`、clean mask 和片内参照规则 |
| `t_gender` | `descriptive.speaker_descriptions[].gender` 或独立 gender axis | 标记声学 head/LLM 来源，不能用 embedding 或 F0 补造 |
| `t_spectral_envelope`、`t_phonation`、`t_note_event`、`t_spatial_image` | 无直接对应的旧公共字段 | 新增研究侧标签定义，完整语义支持均为 `[H]`；不从旧 profile、事件粗类或单个 RIR 补造新值 |

旧字段按旧合同计分。已有公共统计字段可以继续由视图发布，退出独立标签清单不等于删除公共接口。跨系统评测中独立直接预测的粗粒度字段仍保留原预测，不用本次派生规则覆盖。新表示默认进入 sidecar；迁移到公共字段需要新 schema version、字段级 GT 和兼容转换。

## 8. 标签语义准入与能力验证

候选音频标签首先需要说明：

1. 它具体描述哪种声音特征，以及已有标签相同而声音仍不同的例子；
2. 该差异是否已由现有音素、频谱/能量、事件或空间响应表达，或可由它们推导；
3. 补充后能约束哪些原本不确定的可听特征，要求怎样的时间与声源分辨率；
4. 它描述的是录音中可听/可测的现象，还是无法由声音确定的心理、身份或物理成因。

语义候选与可用能力分开登记。稳定发布还需 producer 可复现、同域标注或确定性规则、概率校准，以及固定数据上的质量验证；组合路径需要报告依赖失败。消融应同时考察可听信息损失、直接模型观察的补证收益与下游效用。公共字段迁移另按第 7 节执行，工程记录不增加音频维度。`d_*` 路径验证重算一致性、依赖失败和规则版本；对应 `t_*` 模型观察另评感知精度、冲突和错误相关性。

## 9. 转写任务子集

以下四类与 [tag_registry.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/tag_registry.md) 的 T01–T04 对齐，覆盖字幕、逐人转写和结构定位所需的基本内容。它们只约束“谁在何时说什么”，不构成完整音频描述或音频还原的充分集：

```text
T_transcription = {
  t_text, t_language, t_word_time, t_spk_activity
}
```

`t_unit_speaker` 是逐人转写必需的归属关系，另列为 `R_required={t_unit_speaker}`；不能因它不计入四类感知就省略。它可以来自联合模型或对齐加 diarizer，方法和父证据分别保留。长音频的跨窗 ID 对应等合同仍按 registry 的关系定义处理，本次不新增能力。

`d_speaker_text` 仅对已识别且已接受说话人归属的文字排序、拼接，不包含重新识别或决定说话人归属。逐说话人 ASR 识别出的文字仍计入 `t_text[speaker]`；不能用全文拼接替代逐说话人识别，也不能由此恢复全文 ASR 漏掉的重叠发言。上述拼接、轮次、具体重叠区间及其比例可按 4.8 重算；直接OSD/SCD等模型观察可以作为条件感知另取，不是这四类的确定性重放。v0.4 已将 v0.3 的 `T_core` 改称 `T_transcription`，明确其任务范围；此集合尚未经消融证明为全局最小集。

按任务启用的条件观察示例：

```text
T_conditional = {
  t_speech_activity, t_event, t_event_interval, t_phone_time,
  t_snr, t_mos_sig, t_mos_bak, t_mos_ovrl, t_mos_p808,
  t_rir, t_c50, t_f0, t_rms, t_loudness, t_voicing,
  t_emotion, t_gender, t_jitter, t_shimmer, t_hnr,
  t_speaker_count, t_overlap_interval, t_speaker_change, t_speech_rate_value
}
```

保持候选或等待标注：

```text
T_deferred = {
  t_code_switch_span, t_self_repair_candidate,
  t_interruption_candidate, t_backchannel_interval,
  t_event_source_candidate, t_arousal, t_valence,
  t_spectral_envelope, t_phonation, t_note_event, t_spatial_image,
  t_word_count, t_rt60
}
```

独立 VAD 是否调用属于取证选择；事件、音色、背景和空间等是否需要描述，取决于原音频中是否有相应声音特征，不能因为转写任务用不到就排除。只有类别观察时，仍不能输出强事件区间；已有说话人活动并集时，也不能声称取得了独立 VAD 复核。

`d_*` 路径不额外增加上述语义类型数，不能覆盖对应类型的模型观察；模型中间证据用 `e_*` 表示。

## 10. 新增声音标签与覆盖边界

v0.5将下面四类声音描述纳入研究侧标签目录；其语义定义与模型支持分开，完整语义支持仍标为 `[H]`，部分接口依据见对应类型与模型总表，尚未做音频重建或听辨对照验证。已有特征、事件和空间响应能表达的分量直接复用，不能因新名称重复计数。四个类型名称也不代表四个独立标量；频谱、声像等结构化值仍需明确实际分量与分辨率，尚未证明这是最小集合。v0.6恢复的直接感知类型另见第4节与审查总览。

### 10.1 `t_spectral_envelope`：局部频谱包络

- **声音语义**：描述某个声音流在局部时间内随频率变化的平滑谱形，约束共鸣、明暗和频带质感；适用于人声、音乐及环境声。整体混音的包络必须明确为混音观察，不能当成各声源的包络。
- **取值与粒度**：频率轴为 Hz，谱级为相对 dB；每帧去除整体增益，例如以该帧包络最大值为 0 dB。保留时间变化，并明确分析窗、频率网格和平滑尺度。整体强弱继续由 `t_rms` / `t_loudness` 表达，基频继续由 `t_f0` 表达。
- **可听增量**：同样 F0 与响度，人声仍可有不同共鸣形状；同类机器声也可在不同频带突出，产生不同音色。
- **去重边界**：eGeMAPS 等已有共振峰、谱倾斜和相关谱形分量通过引用复用，不作为新信息再计一次。少量分量或段级 functionals 不等于完整局部包络；只有分量相同、定义与时间分辨率一致时才是同一观察。若明亮度等只是对所保留包络的固定计算，则是派生描述。

下面只是取值形式示意，不是已运行模型的输出；频率网格已为简洁省略了大部分采样点：

```json
{
  "tag": "t_spectral_envelope",
  "scope": "frame",
  "sound_source_ids": ["S01"],
  "value": {
    "frequency_hz": [200, 1000, 3000],
    "normalization": "frame_max_0_db",
    "frames": [
      {"start_sec": 1.20, "end_sec": 1.24, "relative_level_db": [0, -4, -12]}
    ]
  }
}
```

### 10.2 `t_phonation`：可听发声状态

- **声音语义**：描述听得出的发声状态及转换。候选类别为 `modal`（普通发声）、`breathy`（气声）、`creaky`（喉化感）、`pressed`（紧压感）、`falsetto_like`（类假声听感）；这些名称不直接断言声带机制或疾病。
- **取值与粒度**：以 speaker 及连续区间描述状态；气声与喉化等特征允许共现，`modal` 不与其余状态并列。记录状态发生的位置，不能只用整段的状态占比替代；难以区分时保留未知。
- **可听增量**：即使保留 F0、能量和整段发声质量统计，前半气声、后半正常，与顺序相反仍可能有不同听感。频谱包络也不单独确定所有周期性、噪声成分与局部发声动态。
- **去重边界**：它不是新的通用 `voice_quality` 容器，也不重复保存 jitter/HNR 等数值。若同段细音标已明确表达同一发声状态，则直接引用或按固定规则派生，不重复计数。由已有声学量按固定阈值定义的状态只是 `d_*` 视图；独立观察的可听状态不能据这种阈值补造。已有耳语、喊叫等事件类别仍留在统一事件表，状态及事件的时序重合不额外计作新的声音维度。

取值示例：`S01: [1.2,2.0) → [breathy]；[2.0,3.0) → [modal]`。类别集合与边界标注仍需验证，不把这种示例当作现有模型已具备的能力。

### 10.3 `t_note_event`：实际音符与复调声部

- **声音语义**：描述实际听到的音符、各自音高和起止，以及它们所属的可辨声部/声音流。同一乐器或声音流允许同时出现多个音符；声部划分描述听觉组织，不等同真实乐器数量。
- **取值与粒度**：每个音符有可听起止、音高（Hz，或已有音高观察的引用）及可辨时的声源/声部归属。起止按可听音符的标注协议定义，不能把 MIDI 按键/松键直接等同可听起止。弯音、滑音、颤音等允许连续音高，已有音符内 `t_f0` 轨迹时直接引用。
- **可听增量**：相同钢琴类别、起止、近似能量及单条 F0 估计，不决定实际同时发出 C–E–G 还是 C–E♭–G。
- **去重边界**：音符强弱、音色、空间继续引用 `t_loudness`、`t_spectral_envelope`、`t_spatial_image`；单声部已保留的同一音高轨迹不重复保存。音符数、相交区间及按固定规则定义的节奏统计可以派生，节拍/和弦解释有歧义时不能声称仅凭一个类别名就已确定。非音乐中的多个有调声音流也可复用逐源 F0；适合按音符组织的声音使用此类型，无明确音高的打击与噪声仍用统一事件类型。

取值示例：同一钢琴声音流在 `[1.0,1.8)` 同时有约 `261.63 Hz`、`329.63 Hz`、`392.00 Hz` 三个音符；不能压成一条“钢琴存在”区间或一个 F0。

部分支持候选为 Basic Pitch / P28：官方接口输出复调音符的音高、模型起止与 pitch bends，最适合一次一个乐器；不提供逐乐器/声部归属，模型 offset 也未验证符合这里的可听结束协议。本地未运行，不能据此宣称完整类型已覆盖。来源及版本边界见 [模型能力调查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/model_capabilities.md)、[总表覆盖补查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/model_survey.md#6-总表覆盖补查v05)。

### 10.4 `t_spatial_image`：空间声像

- **声音语义**：描述每个可听声音流的位置、声像宽度与远近感随时间的变化。它是录音呈现的空间听感，不是真实物理坐标、米制距离或房间几何。
- **取值与粒度**：以声源及局部区间/轨迹表达；左右位置可用 `[-1,1]` 的相对声像轴，`-1` 为左、`0` 为居中、`1` 为右。宽度使用 `pointlike/narrow/wide/diffuse`，远近感使用 `near/mid/far` 并说明片内参照。没有足够线索的分量分别为未知；前后/上下等只在有相应可听线索和明确定义时扩展。
- **可听增量**：相同文字、活动区间和全局质量，A 左 B 右与 A 右 B 左具有不同空间听感；移动轨迹还能区分固定与运动的声音。
- **去重边界**：当前位置轨迹已保留时，移动方向/速度等固定规则结果属于派生视图。若完整、逐声源到各声道的响应已确定某个空间分量，则复用该信息。当前 clip 级 `t_rir` 不等于这类完整响应，通道同步/质量差异也不能替代空间声像；固定线性 RIR 更不自动描述所有非线性失真。

取值示例：`S01: [1.0,2.0) → 居左、窄、近；[2.0,3.0) → 逐渐移向右侧`。单声道里无法确定的左右位置仍为未知，不能按说话人顺序补造。

### 10.5 已有标签的扩充与仍待检查的细节

实际发音由 4.2 扩充 `t_phone_time`；可听声音流的区分、持续性和属性归属由 4.7 的 `t_event_source_candidate` 表达；各声源强弱及音高复用 4.5 的类型；失真细型与细小事件完善 4.6 的统一事件定义。声源数、状态占比、事件比例、具体重叠、渐强和移动方向等，仅在父观察及固定规则足够时按派生处理，不再重复建 tag。

这些类型补充了声音约束，但没有保证所有纹理、奏法、微观失真及细节都已充分表达。已有连续 F0、能量和时间结构时，升降调、渐强、语速变化先检查能否由它们推导；情绪也只描述声音表现，不能直接等同真实心理状态。每项新增信息仍需按 1.1 的可听差异标准检查覆盖与重复。

## 11. 版本调整范围

v0.3 移出了可重算的文字/人数/时间统计、重叠区间、类别过滤和规则映射，并合并重复容器与 scope 变体。v0.4 将标签设计目标明确为保留声音差异、改善感知还原，移出纯文字呈现维度，并把工程记录问题与音频描述缺口分开。

v0.5 新增 `t_spectral_envelope`、`t_phonation`、`t_note_event`、`t_spatial_image` 四类研究侧声音标签，泛化事件到可听声源的归属，并完善实际读音、逐声源声学观察及事件细型的定义。四类新增标签的完整语义支持均为 `[H]`；Basic Pitch 的部分音符输出另有接口依据。语义纳入目录不等于已有 producer 已完整覆盖，未新增模型调用、精度验证或公共字段发布。历史模型调查及能力状态继续按原证据解释。

v0.6 按“音频属性与生成路径分开”复查全部15个 `d_*`。恢复 `t_speaker_count`、`t_overlap_interval`、`t_speaker_change`、`t_speech_rate_value` 四类有来源的音频估计入口，并恢复 `t_word_count`、`t_rt60` 两类待核实候选；目录共51类，不代表51个独立数学维度或已验证能力。原有 `d_*` 仍保存重算路径，已由 `t_text`、`t_f0`、`t_c50`、事件类型等表达的直接感知继续复用。没有新增模型推理或公共输出发布；来源、候选缺口与比较合同见 [审查总览](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_direct_audit.md)。
