# SURE-Tagger 模型能力对应表

日期：2026-10-28 · `SURE-Tagger Evidence Profile v0.1`

本文是研究侧的适配表，不修改 SURE-Tagger 公共 `tag-schema`，也不修改 Tag-Bench。它把当前 SURE-Tagger 的公开字段作为稳定 tags，再记录哪些模型可以生产、替代或补充这些 tags。研究侧新增的词时间、事件时间、情绪等信息放在 sidecar 中。

## 1. 读取规则

### 状态

| 状态 | 含义 |
| --- | --- |
| `public_replace` | 现有公共字段的生产路径或同合同替代入口；替换新模型前须确认语义、单位、粒度、缺失语义和来源一致，并沿原 Tag-Bench 轴验证，不代表本轮已准许上线。 |
| `public_derived` | 由当前公共字段按固定规则计算，或由模型输出经过已冻结的适配器形成公共字段。 |
| `conditional_candidate` | 有代码、模型卡或历史产物依据，但本地未完成同域验证，不能直接进入默认主链路。 |
| `sidecar_only` | 公共 schema 没有等价字段，或候选输出包含更细时间、关系、声源或表征信息，只能单独保存。 |
| `deferred` | 尚无确认 producer，或语义和 GT 尚未闭合。 |

`D` 表示 producer 的直接输出，`C` 表示组合、适配或确定性派生，`H` 表示候选待验证，`∅` 表示没有确认 producer。`observed`、`code_supported`、`not_run`、`planned` 是证据状态，不是准确率等级。

“能覆盖”不等于“已经准确”。模型替代公共 tag 必须同时满足：同语义、同单位、同时间/说话人范围、同缺失语义，并在冻结的 Tag-Bench 原轴上重新评测。

## 2. 模型 → SURE-Tagger 公共 tags

前端按 34 个结构父字段计数（当前 main 的 33 个字段，加 compare 已有的 `speaker.speaker_transcripts`）；`profiles`、`punctuation`、`repetition` 的子字段不重复计数。研究 sidecar 不计入公共覆盖，`far_field` 保留未确认状态。

| producer / 模型路径 | 可生产的公共 tags | 状态 | 输入与范围 | 主要限制与验证 |
| --- | --- | --- | --- | --- |
| `audio_probe` / WAV header / `ffprobe` | `basic_acoustic.duration_sec`、`sample_rate_hz`、`channels` | `public_replace` · D · `code_supported` | 原始音频流元数据 | 不是模型推理值；不能用重采样后的 16 kHz 或降混声道替代原始元数据。检查类型、单位和缺失处理即可。 |
| native metadata / FireRed VAD | `basic_acoustic.silence_segments`、`nonspeech_ratio` | `public_derived` · C · `observed` | speech/VAD/utterance/word 区间；无 metadata 时运行 VAD，再取补集 | `silence_segments` 实际表示“未检出人类语音”，不是物理静音；音乐和噪声可能在其中。验证区间边界、覆盖率和失败时的 `null`。 |
| Brouhaha | `audio_quality.snr_db` | `public_replace` · D/C · `code_supported` | 逐帧 SNR 聚合为整段 dB | 估计值，不是人工 SNR 真值；需报告帧聚合、噪声域和同域误差。Brouhaha C50 只作内部 evidence。 |
| DNSMOS P.835 / P.808 | `audio_quality.dnsmos_sig`、`dnsmos_bak`、`dnsmos_ovrl`、`dnsmos_p808` | `public_replace` · D/C · `code_supported` | 16 kHz 单声道；9.01 秒窗口、1 秒 hop，短音频循环补足 | 四个分数来自同一次或相关 ONNX 路径，不是四个独立模型证人；需按 MOS 协议评估校准、域外稳定性和短音频偏差。 |
| Rec-RIR + 确定性后处理 | `room_acoustic.rt60_sec`、`room_acoustic.c50_db` | `conditional_candidate` · C · `code_supported` / `not_run` | 音频 → 估计 RIR → T20/Schroeder 或直达后 50 ms 能量比 | 是估计 RIR 的指标，不是房间真值。Brouhaha 内部 C50 不能静默替代公开 C50；需固定 RIR、拟合、失败和参考测量合同。 |
| FireRed AED | `sound_field_scene.speech_music_events`、`music_present` | `public_replace` / `public_derived` · D/C · `code_supported` / `not_run` | 只公开 `speech`、`singing`、`music`；`music_present` 从事件数组派生 | 公共数组没有起止时间；`singing`/`music` 受默认占比门控。FireRed AED 的事件区间和帧比例只作内部 evidence，事件时间需另存 sidecar。 |
| DASS medium + ontology / AED 门控 | `sound_field_scene.external_noise_type`、`noise_composition` | `public_replace` · D/C · `code_supported` | 527 类分窗分数 → 六类归组；默认阈值 0.25、每桶 top-3，音乐桶受 AED 门控 | 只有类别/细类和窗口级分数，没有强事件起止；工具返回的固定 confidence 不是校准概率。验证类别宏 F1、误报和门控冲突。 |
| MOSS / Nemotron / DiariZen 的语言路由时间线 | `speaker.speaker_count`、`speaker_present`、`multi_speaker`、`speaker_change_count`、`speaker_change`、`overlap_ratio`、`speaker_overlap` | `public_derived` · C · `observed` / `code_supported` | 选定 timeline 的匿名 speaker 活动、切换和重叠；`present`、`multi_speaker` 等按规则派生 | `speaker_id` 是样本内匿名 ID，不是真实身份；不同 route 不能混成一个 producer。按 DER/JER、人数 MAE、overlap F1、change 边界误差分层验证。 |
| speaker profile 规则 + 性别模型 | `speaker.profiles` 及其 `speech_rate`、`pitch`、`speaker_volume`、`gender` | `public_derived` · C · `code_supported` / `not_run` | 复用 decision timeline；速率、F0 和相对音量为确定性摘要，性别走语言路由模型 | 相对 pitch/volume 不能推出情绪、年龄或身份；速率的语言单位和最短时长门槛需版本化。gender lineage 要单独记录，不能由 pitch 代替。 |
| FireRedASR2-AED / MOSS / Qwen3-ASR 路由 | `speaker.asr_transcript` | `public_replace` · D/C · `observed` | 语言和人数条件选择 ASR；整段文本，不含时间和 speaker ID | route、文本来源和失败原因必须保留；强制 language 是输入条件，不是独立 LID 证据。按语言、重叠、噪声和短音频分别报告 WER/CER。 |
| FireRed LID | `language_content.language` | `public_replace` · D · `observed` | 整段或满足条件的 speaker clean spans | 不从 ASR 文本猜语言；需与混语、短片段、无语音分开评估。FireRed ASR wrapper 附带语言若调用同一 FireRed LID checkpoint，不能与独立调用重复计票。 |
| transcript / routed ASR + 确定性规则 | `language_content.word_count`、`punctuation`、`repetition`、`filler` | `public_derived` · C · `code_supported` | 冻结 `text_origin`、文本 hash、tokenizer 和规则版本 | 统计的是已有文本，不等于音频中真实词数，也不能恢复 ASR 删除的重复和犹豫。按语言和 text origin 分层复核。 |
| 固定公式 | `deterministic_derived.speaker_change_rate_per_min`、`filler_ratio` | `public_derived` · C · `code_supported` | 分别依赖 change count/duration、filler/word count | 不能由新模型直接覆盖后绕过公式；校验 parent IDs、分母和四舍五入规则。 |
| `sure-tagger-plus` 的逐人文本 view | `speaker.speaker_transcripts` | `conditional_candidate` · C · `observed` / `not_run` | ASR + 对齐 + diarization + unit-speaker 归属后按人汇总 | 它是汇总 view，不提供完整 `who-spoke-when`。词时间、归属候选和拒答原因仍放 sidecar，单独评估归属覆盖率和错误。 |
| `room_acoustic.far_field` | 无当前 producer | `deferred` · ∅ | 当前公共字段保留 `null` | 不从 RT60、C50、DNSMOS 或混响猜近远场；需要 capture metadata 或独立标注协议。 |

> **字段 lineage 提醒。** 当前 speaker-v2 适配器/历史 profile 代码可能把 `gender` 放在
> `speaker.profiles[].gender`；compare 公共 schema 的描述性评测轴则记录为
> `descriptive.speaker_descriptions[].gender`。两者不能静默视为同一字段，发布前应以实际
> JSON、schema 校验和版本号确认路径；本表不替换公共 schema。

## 3. 研究侧标签 → 模型与公共 tags 的关系

这些标签不写入 SURE-Tagger 公共输出；它们用于诊断、检索、实验选窗或未来独立 profile。

| 研究标签 | 候选 producer | 与公共 tags 的关系 | 状态 / 验证重点 |
| --- | --- | --- | --- |
| `t_word_time` | Qwen3-ForcedAligner、FireRed 内部对齐、WhisperX、MFA | 公共 `speaker.asr_transcript` 没有词时间；不能把整段文本字段当作对齐覆盖 | `sidecar_only` · C/H · `observed` 接口，边界准确率 `planned`；词边界 MAE、命中率、缺失率。 |
| `t_phone_time` | MFA | 公共 schema 没有音素粒度；MFA 对齐规范/词典音素，不判断实际误读 | `sidecar_only` · H；需文本、词典、声学模型和语言范围。 |
| `t_code_switch_span` | ASR + FireRed LID + aligner | 公共 `language_content.language` 是样本级语言，不能表达片段切换 | `sidecar_only` · H；需要片段级 code-switch GT，不能用强制 language 回显替代。 |
| `t_self_repair_candidate`、`t_hesitation_span` | ASR 文本、词时间、停顿和 prosody 组合 | 公共 repetition/filler 只有计数，不保存修正结构和时间 | `sidecar_only` · H；需要保留原文本、规范文本和人工区间，重叠/停顿不直接等于修正/犹豫。 |
| `t_same_speaker_candidate` | CAM++、ECAPA、WeSpeaker + enrollment/阈值 | 不改写匿名 `speaker_id`，也不表示真实身份；与 `speaker.speaker_count` 不是同一任务 | `sidecar_only` · H · `not_run`；按同域 EER、误认/误拒、短片段/远场/重叠分层。 |
| `t_loudness` | openSMILE、profile 音量摘要 | 与 `speaker_volume` 相关但不等价：前者可逐帧，后者是相对片内摘要 | `sidecar_only` 或条件 profile producer · C/H；固定单位、增益处理、有声 mask 和聚合规则。 |
| `t_voicing`、`t_jitter`、`t_shimmer`、`t_hnr`、`t_phonation` | openSMILE eGeMAPSv02、声学分析工具 | jitter/shimmer/HNR 可作为测量；公共 profiles 没有这些叶字段，发声方式分类也没有字段 | `sidecar_only` · C/H；测量重复性与人工发声标注分开评估；不能把 F0 门控当作独立 voicing。 |
| `t_emotion` | emotion2vec+、SenseVoiceSmall | 公共 schema 没有 emotion；不能由 pitch/volume 描述推断 | `sidecar_only` · H；统一类别集后评估 macro-F1/UA、校准和中文域表现。 |
| `t_arousal`、`t_valence`、`t_stress`、`t_engagement` | audEERING 连续情绪模型、额外任务 head | 不写入 `speaker.profiles`；连续情绪与离散 emotion 也不互相替代 | `sidecar_only` · H；audEERING 的英语 arousal/valence/dominance 路径可补查，中文和 stress/engagement 仍待验证。 |
| `t_spectral_envelope` | openSMILE 局部谱分量、librosa 统计 | 公共 `noise_composition` 和事件类别不等于谱包络 | `sidecar_only` · H；完整频谱包络 producer 尚未确认，保留频率坐标、窗口和声源 scope。 |
| `t_note_event` | Basic Pitch | 公共 `music_present` 只有事件存在；音符 pitch/onset/offset/bend 不能投影回布尔音乐字段 | `sidecar_only` · C/H；单乐器条件、音符边界、逐乐器归属和尾音需分开验证。 |
| 和弦/节奏/速度扩展 | Audio-Mind 的 autochord、lv-chordia、Tempo-CNN、librosa | 公共 schema 无和弦、节拍、BPM 字段；不替代 `t_note_event` 或完整频谱包络 | `sidecar_only` · H；当前 wrapper 的输出范围和半速/倍速歧义需固定后评估。 |
| `t_channel_sync_offset`、`t_channel_consistency`、`t_channel_dropout_candidate`、`t_channel_quality_skew` | 多通道波形规则 + Brouhaha/DNSMOS | 公共 `basic_acoustic.channels` 只有声道数，不能表达声道关系 | `sidecar_only` · C/H；用注入已知延迟、断音、噪声的通道副本构造 GT，再测误差和误报。 |
| `t_event_interval` | FireRed AED 内部区间、PANNs SED、BEATs/其他帧级后处理 | 公共 `speech_music_events` 只保存类别数组，时间区间不能丢失 | `sidecar_only` · C/H；事件 F1、onset/offset 误差；clip 分数不能反推起止。 |
| `t_event_source_candidate` | 事件模型 + diarization / source timeline | 公共 speaker 汇总和事件数组都没有事件—声源关系 | `sidecar_only` · H；需要独立来源标注；时间重合不等于“某人发出事件”。 |
| `t_interruption_candidate`、`t_backchannel_interval`、`t_repair_sequence` | ASR + word time + speaker timeline + prosody/标注 | 公共 speaker change/overlap 不能直接表示打断、附和或修正 | `sidecar_only` · H；需对话行为 GT，不能把 overlap 当 interruption。 |
| `t_spatial_image`、声学词数、直接 RT60 盲估 | 目前无确认 producer 或仅有弱候选 | 公共 `far_field`、word_count、rt60 不能被不等价输出静默覆盖 | `deferred`；先闭合定义、输入 scope、GT 和 runtime，再考虑独立 profile。 |

## 4. 优先级与验证入口

| 优先级 | 工作 | 验证方式 | 对公共 SURE-Tagger 的影响 |
| --- | --- | --- | --- |
| P0 | 固定现有字段的 producer、route、parent IDs、`null/0/false/[]` 语义；记录模型和规则版本 | schema 检查、lineage 检查、原有 Tag-Bench 29 轴回归 | 不改字段路径，不改 Tag-Bench |
| P1 | 比较可替换的 ASR、LID、speaker timeline、VAD、事件和质量 producer | 沿原 29 轴按语言、噪声、重叠、时长分层；分别报告 WER/CER、DER/JER、事件 F1、MOS/SNR 误差 | 只有同合同 producer 才可替换主链路 |
| P1-sidecar | 先做 `t_word_time`、`t_event_interval`、多通道关系和事件来源候选 | 词/事件区间 GT、时间容差、来源归属和拒答率 | 只生成 sidecar，不改变公共 tags |
| P2-sidecar | 情绪、声质、音乐结构、声像和对话交互 | 需要同域人工标注、独立模型版本和校准；分别报告覆盖率与质量 | 不进入 Tag-Bench 总分 |

建议保留三份产物：

1. `sure_tags.jsonl`：原始 SURE-Tagger 输出，字节级或字段级保持兼容；
2. `research_evidence.jsonl`：研究标签、候选关系、区间、producer、置信含义和失败原因；
3. [`SURE-Tagger模型能力对应表.json`](SURE-Tagger模型能力对应表.json)：本表的机器可读版本，记录模型→公共 tags / sidecar tags 的映射。

## 5. 链路交叉验证

下面整理两类关系：**不同 producer 对同一公共字段的候选比较**，以及**不同公共字段之间的一致性检查**。词时间、speaker 活动区间等只作为研究 sidecar 辅助证据，不新增公共 tag。全部条目的互证效果均为 **`planned`（待评测）**；历史运行支持接口存在，不表示这些组合已经提高准确率。前端见 [SURE-Tagger 对应版](visualization/index.html#sure)。

### 5.1 同一字段的多条 producer 链路

| ID / 公共字段 | producer 链路 | 比较什么 | 边界与依赖 | 验证状态 |
| --- | --- | --- | --- | --- |
| M01 · `speaker.asr_transcript` | FireRedASR2-AED ↔ MOSS ↔ Qwen3-ASR；WhisperX 作候选对照 | 在共同语言范围内对齐文本，定位增删替换；有参考转写时另算 WER/CER | 固定文本规范化、输入音频和语言条件；路由只选中一路不等于已经运行多路。文本一致也可能共同漏词。 | `planned` |
| M02 · `language_content.language` | FireRed LID ↔ Qwen3-ASR 原生语言输出（`language=None`）↔ SenseVoiceSmall 语言输出候选 | 统一语言码后比较；混语、短句、无语音单列 | FireRed ASR wrapper 附带的 FireRed LID 与单独 LID 共用 checkpoint，不能算两票；强制 language 回显不参与比较。 | `planned` |
| M03 · `speaker.speaker_count`、`speaker.speaker_change_count`、`speaker.overlap_ratio` | MOSS 段活动 ↔ Nemotron 帧活动 ↔ DiariZen / pyannote regular timeline → 同一派生规则 | 对齐匿名 ID、活动区间后比较人数、切换边界、重叠比例；保留时间线分歧 | 活动区间只在 sidecar；固定 gap、collar、overlap 分母。MOSS 活动来自联合转写段；pyannote exclusive 视图不能测 overlap；同一时间线派生的布尔字段不增加证人。 | `planned` |
| M04 · `basic_acoustic.silence_segments`、`basic_acoustic.nonspeech_ratio` | FireRed VAD ↔ Silero VAD → 语音并集的补集；Brouhaha 活动头为待暴露候选 | 比较非语音区间交并比、边界和占比 | 未检出语音不等于物理静音；统一阈值、最短时长和时间坐标。当前 Brouhaha adapter 未确认保留活动区间，不能按现有 SNR/C50 输出算已覆盖。 | `planned` |
| M05 · `sound_field_scene.speech_music_events`、`sound_field_scene.external_noise_type`、`sound_field_scene.noise_composition` | FireRed AED / DASS ↔ PANNs / BEATs 分类头候选 → 冻结类别映射 | 分别在三类事件和六类背景声合同内比较类别、漏报和误报 | 仅比较共有 ontology；公共字段无事件时间。DASS 音乐桶受 AED 门控，需保留门控前分数；PANNs 已退出公共主链路，只作研究对照。 | `planned` |
| M06 · `room_acoustic.c50_db` | Rec-RIR → RIR 后处理 ↔ Brouhaha 直接估计 | 同音频、同 dB 定义下比较 C50 偏差；以参考 RIR/实测值判定误差 | Brouhaha C50 仅为内部候选，不自动替换 Rec-RIR 公共值；统计窗口和直达声起点未对齐时不比较。 | `planned` |
| M07 · `speaker.profiles[].pitch` | 现有 profile F0 估计 ↔ torchcrepe / openSMILE → 冻结 profile 聚合 | 同一 speaker clean spans 内比较 F0、倍频/半频错误，再比较公开档位 | F0 是辅助量，不直接等于公共 pitch 枚举；旧 shared 与 Plus 的档位、参照和规则不同，须选定版本；不能推出性别或情绪。 | `planned` |
| M08 · `speaker.speaker_transcripts` | MOSS 联合段归属 ↔ Qwen3-ASR + ForcedAligner + Nemotron/DiariZen + 归属规则；WhisperX 作候选 | 对齐样本内 speaker ID 和文字单位，比较归属分歧、错误率与拒答覆盖率 | 共享 transcript、aligner 或 diarizer 时记录依赖；最大交集、最近邻与 overlap 拒答合同不同。跨录音声纹“是否同一人”不是本项，不拿 `t_same_speaker_candidate` 当归属验证。 | `planned` |

### 5.2 不同字段之间的相互检查

这里既有跨模型的约束，也有同源字段的规则自检；后者只能发现投影或实现不一致。检查关系通常有方向，不能把“没有发现冲突”解释为两边都正确。

| ID / 关联公共字段 | producer 链路与辅助证据 | 检查规则 | 边界与依赖 | 验证状态 |
| --- | --- | --- | --- | --- |
| X01 · `language_content.language` ↔ `speaker.asr_transcript` | FireRed 音频 LID ↔ ASR 文本 → 文本语言判断 | 比较可判定文本语言与音频语言；不一致时标出候选错路由、混语或转写异常 | 文本语言继承 ASR 错误；LID 若参与 ASR 路由，两者已有条件依赖。短文本、专名和混语不能强行判冲突。 | `planned` |
| X02 · `speaker.asr_transcript` ↔ `basic_acoustic.silence_segments` | ASR + aligner 的词/段时间 sidecar ↔ FireRed/Silero VAD | 检查有正时长的文字单位是否大量落入非语音区间；按冻结时间容差定位异常 | 强制对齐依赖给定文本，不能证明词真的被说过；插值时间、零时长和缺失时间不能算有效定位；冲突可能来自任一路。 | `planned` |
| X03 · `speaker.speaker_present`、`speaker.speaker_count` ↔ `basic_acoustic.nonspeech_ratio` | diarizer 活动并集 sidecar ↔ 另一路 VAD 语音并集 | 比较语音覆盖差异，定位“VAD 有语音但 diarizer 无活动”等窗口 | 若非语音占比本来由同一 timeline 补集生成，只是自检；单个短词、歌声和最短段规则可造成合理差异。 | `planned` |
| X04 · `speaker.overlap_ratio`、`speaker.speaker_overlap` ↔ `speaker.speaker_count`、`speaker.multi_speaker` | diarizer → 人数/重叠派生；专用 OSD 可作条件候选 | 同一范围且字段已知时，有真实重叠应至少有两人；多人不要求发生重叠。另比较 OSD 与活动求交区间 | 同 timeline 的 count/overlap 是确定性自检；专用 OSD 的 checkpoint/runtime 尚未核实，不能当成现成第二证人。分母为有效语音并集。 | `planned` |
| X05 · `sound_field_scene.speech_music_events` ↔ `sound_field_scene.music_present`、`sound_field_scene.external_noise_type`、`sound_field_scene.noise_composition` | FireRed AED → 音乐布尔值；DASS / PANNs / BEATs → 音乐类别候选 | 当前 SURE 派生路径检查 `music_present` 与事件数组是否含 `music` 一致；门控前不同分类器的音乐判断另作互检 | AED 与其布尔派生是自检；DASS 门控后与 AED 一致可能是规则造成。`singing` 不必伴随 `music`，不能据此报冲突。 | `planned` |
| X06 · `room_acoustic.c50_db` ↔ `room_acoustic.rt60_sec` | Rec-RIR → 同一 RIR 的早晚能量比和衰减拟合 | 先检查各自公式、有效值与拟合条件；有参考 RIR 时再核查两指标的联合异常 | 两值同源且单位不同；“C50 低、RT60 长”只有条件性趋势，不是通用等式或硬冲突规则，也不能推出 `room_acoustic.far_field`。 | `planned` |
| X07 · `audio_quality.snr_db`、`audio_quality.dnsmos_sig`、`audio_quality.dnsmos_ovrl` ↔ `speaker.asr_transcript` | Brouhaha / DNSMOS ↔ 多 ASR 的文本分歧；参考转写仅供评测 | 检查噪声或质量较差的窗口是否集中出现转写分歧；用分层 WER/CER 评价诊断价值 | 低质量不必识别错，高质量不保证识别对；没有同域阈值/GT 时只给复核线索，不能裁决文本。DNSMOS 多分数不是独立证人。 | `planned` |
| X08 · `deterministic_derived.speaker_change_rate_per_min`、`deterministic_derived.filler_ratio` ↔ 各自父字段 | `speaker.speaker_change_count` + `basic_acoustic.duration_sec`；`language_content.filler` + `language_content.word_count` → 固定公式 | 父字段有效时分别重算 `round(count × 60 / duration, 6)` 和 `round(filler / word_count, 6)`，检查分母和缺失语义 | **确定性派生自检**，不是多模型互证；filler/word count 还须共享文本 hash、tokenizer 和规则版本。零分母或缺失按冻结合同处理，不补造数值。 | `planned` |

### 5.3 结果如何记录

只在**同一样本、同一时间范围、同一单位与字段合同、已对齐的 speaker ID** 上比较。记录原观察 ID、`parent_ids`、checkpoint/adapter/规则版本、预处理、route、阈值和比较范围；`parent_ids` 用于追溯依赖，**不是独立性的保证**。共享训练数据或同音频难点造成的错误相关性仍需实测。

单次检查结果使用 `agree`（在指定规则和容差内一致）、`conflict`（可比较但违反规则）、`insufficient`（缺值、范围不足或阈值未定）、`unsupported`（输出/合同不支持该检查）。未执行时保存 `validation_state=planned`、`check_result=null`，不能预填 `agree`。冲突保留两边原值，作为复核或补充感知的入口，不自动改写公共字段，也不进入 Tag-Bench 新评分轴。

## 6. 依据

发布说明：以下跨仓库文档是本表核对时的来源，未随本展示仓库发布。网页中的 `baseline-tag-schema.md` 是 2026-10-09 的独立对照快照，不替代这里的当前公共 schema，也不表示两者版本相同。

- SURE-Tagger 当前标签与方法（本地研究档案，未随页面发布：`../../../../sure-tagger-pigeondan1/sure-tagger-main/docs/tags-and-methods.md`）
- SURE-Tagger pipeline 架构（本地研究档案，未随页面发布：`../../../../sure-tagger-pigeondan1/sure-tagger-main/docs/pipeline-architecture.md`）
- SURE-Tagger 公共 schema（本地研究档案，未随页面发布：`../../../../sure-tagger-pigeondan1/compare/docs/tag-schema.md`）
- Tag-Bench 29 轴评测（本地研究档案，未随页面发布：`../../../../sure-tagger-pigeondan1/compare/docs/benchmark-v1-29-metrics.md`）
- [研究侧 producer 能力调查](model_capabilities.md)
- [研究侧公共字段映射与合同差异](schema_mapping.md)
- [本地源码、历史输出与依赖审计](local_audit.md)
- [验证计划：语言、替代 producer 与互证价值](validation_plan.md)

本表是能力和接入边界的静态核对，不是新的模型准确率报告。所有 `not_run`、`planned` 和 `conditional_candidate` 项目都必须保留未知状态。
