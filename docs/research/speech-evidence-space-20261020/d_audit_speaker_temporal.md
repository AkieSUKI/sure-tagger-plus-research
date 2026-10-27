# 人数、重叠、说话人变化与回应时延：直接感知路径审计

审计日期：2026-10-20。范围为 `d_speaker_summary`、`d_overlap`、`d_turn_structure`、`d_response_latency`；只读取官方仓库的文档、任务定义和推理代码，不运行模型。新 producer ID 由主调查统一分配，本文不另行编号。

结论：可恢复 `t_speaker_count`、`t_overlap_interval`、`t_speaker_change` 这三个声音属性类型，分别容纳下述有来源的估计路径，并保留已有 `d_*` 重算路径。三者不是全部单模型原生头：指定范围内不同人数的已核验路径是 embedding + 自动聚类的组合 `[C]`；专用 OSD/SCD 的帧输出有任务级直接依据，区间化/峰提取另属 `[C]`。没有测量这些路径与当前 diarizer 的错误独立性，也没有新增本地准确率结论。

| 现有视图 | 实际读到的不同取证路径 | 对应标签与限制 | 本轮支持状态 |
| --- | --- | --- | --- |
| `d_speaker_summary` | SpeechBrain AMI recipe：音频片段 → ECAPA/x-vector embedding → 非 oracle 自动谱聚类估计人数 | `t_speaker_count`，表示指定录音/范围内的不同说话人数；不是统计一条已经得到的 speaker activity 时间线 | 组合路径 `[C]`；未本地运行，仍有 VAD/分段、embedding、聚类假设 |
| `d_overlap` | pyannote 1.1 专用 `OverlapDetection` 训练任务直接预测 `non_overlap/overlap`，再阈值化为重叠区间 | `t_overlap_interval`；输出“至少两人同时活动”的无归人区间，不提供 speaker pair 或精确并发人数 | 直接帧观察 + 后处理 `[D/C]`；老版本环境、权重可用性和质量待复核 |
| `d_turn_structure` 的变化部分 | pyannote 1.1 专用 `SpeakerChangeDetection`：`non_change/change` 或变化回归序列 → 峰提取 | `t_speaker_change`；有声学变化边界依据，不自动获得带 speaker 的完整 turns、gaps、durations | 直接帧观察 + 后处理 `[D/C]`；任务定义不等同现有 continuity/gap 规则 |
| `d_turn_structure` 的完整轮次部分 | Smart Turn 对给定当前语音片段的右端作 `complete/incomplete` 判断 | 有直接端点完成性能力，但不能直接充当整条 `t_turn_interval` 的完整区间、speaker 与边界合同 | 相关、部分语义，不能据此声称完整旧视图已有直接头 |
| `d_response_latency` | 本次读取的 Smart Turn、VAP 不直接返回已经发生的回应配对和实际时差 | 继续由已确认的回应关系和两个实际时间点计算；未来投射概率不替代已发生的时延 | 本轮未确认匹配的直接数值输出；不是“不可能存在”的结论 |

## 1. `d_speaker_summary`：不同人总数和同时人数必须分开

### 1.1 SpeechBrain：不同人数的独立组合路径 `[C]`

[官方 AMI recipe](https://github.com/speechbrain/speechbrain/blob/c0241278f93ef02cd5191f03caf4e5f8e1292bf6/recipes/AMI/Diarization/experiment.py) 已实际读取。`compute_embeddings` 从波形计算特征并调用 embedding model；`diarize_dataset` 按 recording 整理片段和向量。当 `oracle_n_spkrs=False` 且使用 cosine affinity 时，代码将 `num_spkrs=None`，明确说明后端用最大 eigengap 估计人数，再调用 `do_spec_clustering`。因此这里有一条在最终 speaker activity 时间线产生前估计不同人数的可复现算法路径，而不是对既有 timeline 的 speaker ID 计数。

精确输入是同一 recording 的波形子段及其声学 embedding 集，配合分段元信息、cosine affinity、剪枝/聚类超参数；输出是该集合的估计簇数及聚类赋值，recipe 随后写 RTTM。它不是单独训练的“总人数分类头”，原 recipe 也不是只返回一个人数的轻量 API。若提取为人数观察，需要适配器保留估计簇数、所覆盖录音范围与参数。

这里的“独立”只指无需复用当前已保留的逐人活动区间。原始语音片段可能来自 oracle speech segmentation 或独立 VAD，实际接入必须明确，不能假定本次已验证了一条无需分段、无需任何前置条件的整音频人数服务。不能使用 `oracle_n_spkrs=True` 的输出来证明自动人数能力；NN affinity 分支用开发集调 `n_lambdas` 的行为，也不能冒充逐样本 cosine eigengap 路径。

输出可映射到 `t_speaker_count` 的“指定范围内不同人总数”语义，但仍会因短片段、重叠、同一人声学变化、相似声纹、漏语音、聚类阈值而分裂/合并。没有发现仅靠该人数就能恢复每人活动区间的保证。`present=count>0`、`multi=count≥2` 仍可由这个观察按固定规则派生。

同源边界：若当前 diarizer 正是这组 embedding 和同一聚类结果，人数与其 timeline 同源，不能计成额外独立见证。另跑不同 embedding 或不同取证音频的路径，也只能先记录为不同来源；错误相关性仍为 unknown。

来源：代码快照（本地研究档案，未随页面发布：`sources_direct_audit/speaker_speechbrain_recipes__AMI__Diarization__experiment.py`）、官方 recipe 说明快照（本地研究档案，未随页面发布：`sources_direct_audit/speaker_speechbrain_recipes__AMI__Diarization__README.md`）。README 给出 ECAPA-TDNN + spectral clustering 的 oracle/estimated 两列结果，并说明其 DER 评估忽略 overlap；这些结果不等同本地人数精度，也不能迁移为自然重叠条件的人数保证。

### 1.2 CountNet：专用直接头，但语义不等同旧人数

[CountNet 官方 README](https://github.com/faroit/CountNet/blob/ae15e1ac096862667a7bfdedf0b67a70a7543edd/README.md) 和 [推理代码](https://github.com/faroit/CountNet/blob/ae15e1ac096862667a7bfdedf0b67a70a7543edd/predict.py) 已实际读取。输入是 16 kHz、单声道、5 秒混合语音；代码计算 STFT、标准化和归一化，执行已训练的 Keras 模型，`argmax` 返回人数类别。仓库提供 `.h5` 模型；本轮未下载权重。

关键限制：官方 LibriCount10 说明把标签定义为 **5 秒录音内最大的同时说话人数**，类别为 0–10。它不是每帧人数，也不是整段音频里先后出现过的不同人总数。例如 A、B、C 顺次说话时，不同人总数为 3，最大同时人数可能只有 1；不能直接用 CountNet 替换旧 `speaker_count`。

因此 CountNet 作为 `d_speaker_summary` 的相关直接估计路径记录，暂不映射为本次恢复的不同人总数 `t_speaker_count`。将来若纳入并发人数，建议另定 `t_active_speaker_count` 并明确其 `window_max` 聚合；或在统一人数类型中严格区分 `count_kind=distinct_in_scope/concurrent/window_max_concurrent`。不得把一个 5 秒分类值复制到每帧，也不能取多个窗口的最大值当作全音频不同人总数。

同源边界：CountNet 不消耗当前 diarizer 输出，取证路径不同；训练数据同为 LibriSpeech/相同音频条件的相关性及实际错误独立性仍未测。README 还说明模型来自旧版 Keras 1.2.2/Theano，转换为现代 TensorFlow 后作者未复现相同结果，不能把权重在仓库里等同当前环境可直接运行。

来源：README 快照（本地研究档案，未随页面发布：`sources_direct_audit/speaker_countnet_README.md`）、predict.py 快照（本地研究档案，未随页面发布：`sources_direct_audit/speaker_countnet_predict.py`）、predict_audio.py 快照（本地研究档案，未随页面发布：`sources_direct_audit/speaker_countnet_predict_audio.py`）。论文仅通过官方 README 确认题名与链接，本文未把论文正文记作已读。

## 2. `d_overlap`：专用重叠检测可提供另一条观察

pyannote 1.1 的 [官方训练教程](https://github.com/pyannote/pyannote-audio/blob/ffe9b0b5d3b1f505acbcdfb47995f197aa10ce8b/tutorials/models/overlap_detection/README.md) 配置 `OverlapDetection`，使用 16 kHz `RawAudio`、2 秒训练块和 PyanNet。实际读取的 task 源码（本地研究档案，未随页面发布：`sources_direct_audit/speaker_pyannote_legacy_pyannote__audio__labeling__tasks__overlap_detection.py`） 将训练目标设为 `speaker_count>1`，明确 `classes=[non_overlap,overlap]`。这里用标注生成训练目标，不意味着推理时还需要已有 diarization timeline。

pipeline 源码（本地研究档案，未随页面发布：`sources_direct_audit/speaker_pyannote_legacy_pyannote__audio__pipeline__overlap_detection.py`） 接收专用 `ovl_scores`；处理 log scale，读取 overlap 概率，再经 `onset/offset/min_duration_on/min_duration_off/pad_*` 生成 `pyannote.core.Annotation` 重叠区间。因此可以记录模型帧证据，以及由这份专用帧证据生成的 `t_overlap_interval` 观察；它与由 `t_spk_activity` 求交得到的 `d_overlap` 并存。

范围限制：专用二类输出不提供参与者 ID、speaker pair，也不区分两人和三人同时讲话。若 `d_overlap` 要求原子区间上的参与者集合，仍必须另有可审计归属；不能给 OSD 区间补造 A/B。由这些区间计算 overlap 比例还需要兼容的 speech-union 分母；单独二类 OSD 不能自动给出该分母。

现行仓库的官方 OSD 教程（本地研究档案，未随页面发布：`sources_direct_audit/speaker_pyannote_tutorials__overlapped_speech_detection.ipynb`） 也已读取：它内部固定安装 `pyannote.audio==3.1.1`，把 `pyannote/segmentation-3.0` 赋予 `OverlappedSpeechDetection` task 并 finetune，然后取 `osd_probability`、调阈值产生区间。这是另一条“需要训练/适配”的依据，不等于原 segmentation checkpoint 未改动时就已包含独立 OSD 头。教程中还存在 `OracleOverlappedSpeechDetection`：这是从参考标注生成 GT，不是音频模型。

同源边界：专门训练的 OSD 模型与一个独立 diarizer 的观测可分别保留；共享初始化、训练集和前端造成的相关性未知。若某个现代 OSD 包装器直接从**同一份** speaker segmentation posterior 求第二大值或累计活动概率，它仍是同源派生，不能因接口名称为 OSD 就算成另一次独立感知。本轮未成功取得额外 3.1.1 pipeline 源文件，不把这一类实现推断写成已经核实的该文件行为。

## 3. `d_turn_structure`：直接变化检测不等于完整交互轮次

### 3.1 pyannote 专用 speaker-change 模型

[官方训练教程](https://github.com/pyannote/pyannote-audio/blob/ffe9b0b5d3b1f505acbcdfb47995f197aa10ce8b/tutorials/models/speaker_change_detection/README.md) 使用 RawAudio/PyanNet 训练 speaker-change task。实际读取的 task 源码（本地研究档案，未随页面发布：`sources_direct_audit/speaker_pyannote_legacy_pyannote__audio__labeling__tasks__speaker_change_detection.py`） 定义分类 `non_change/change`，也支持以实际变化点为中心的三角形回归；正例 collar 和 `non_speech` 开关可配置。默认 `non_speech=False`，不把纯语音/非语音边界一概当作说话人变化。

pipeline 源码（本地研究档案，未随页面发布：`sources_direct_audit/speaker_pyannote_legacy_pyannote__audio__pipeline__speaker_change_detection.py`） 从 `scd_scores` 最后一维取变化分数，经 `Peak(alpha,min_duration)` 提取变化边界并返回分段 Annotation。推理无需先获得每人活动区间，也不返回具体发生转换的两个 speaker 身份。

建议恢复 `t_speaker_change`，以明确时间范围内的变化分数/边界观察承载这条路径。变化存在、边界数和每分钟速率可由该观察进一步派生；原来的 activity → continuity → change 规则仍保留为 `d_turn_structure` 的另一条路径。两者的 collar、容忍时间、静默处理、overlap 和“切换”的操作定义必须对齐后才能比较，不能默认它们与旧公开布尔/计数的 GT 完全等价。

这条证据只覆盖 turn structure 的**变化部分**。它不直接给出有 speaker 归属、语义轮次定义和相邻回应关系的完整 turn/gap/duration 对象；不能用它给 `t_turn_interval`、`t_gap_interval` 或 `t_response_latency` 批量背书。

### 3.2 Smart Turn：判断输入右端是否说完

[Smart Turn 官方 README](https://github.com/pipecat-ai/smart-turn/blob/4786657e242dfe77dd138699ac564ee074a2a543/README.md) 与 inference.py（本地研究档案，未随页面发布：`sources_direct_audit/speaker_smartturn_inference.py`） 已实际读取。模型是 Whisper Tiny audio backbone 加分类器；输入为 16 kHz mono PCM，保留最后 8 秒或前置 padding；官方建议在轻量 VAD 检测到静默后，将当前用户轮次音频送入。

`predict_endpoint(audio_array)` 精确返回 `{prediction,probability}`：`1=complete`、`0=incomplete`，代码用 sigmoid 输出与 0.5 阈值作分类。它判断**给定输入右端的完成性**；没有直接返回整条音频的轮次起止数组、说话人 ID 或一个被证明已经发生的相邻说话人转换。

所以这是原生音频端点完成性能力，不能简单说“turn detection 都只是 diarization 规则”；但它也不能作为已有完整 `t_turn_interval` 合同的直接 producer。若以后新增“右端完成性”类型，应与已发生的声学终点、实际说话人交接和预测未来何时开口分别定义。本次仅记录相关排除，不新增类型。

版本差异保留：所读 README 标题是 v3.2，而同一代码 revision 的 `inference.py` 指向 `smart-turn-v3.1.onnx`。本文只核验该文件的接口，不将两者默认为同一精确 checkpoint；外部权重 revision 和本地兼容性仍未知。

## 4. `d_response_latency`：实际回应时差与未来投射分开

VAP 的 [官方 README](https://github.com/ErikEkstedt/VoiceActivityProjection/blob/f39a78b23a6dccdbedd106e00b48c410b8739f5d/README.md) 与 模型源码（本地研究档案，未随页面发布：`sources_direct_audit/speaker_vap_vap__model.py`） 已实际读取。Stereo 模型要求两个说话人分别占据两个声道，推理输入可只有波形；默认 16 kHz、50 Hz 输出，未来投射窗口在 README 例子中为 2 秒。单声道示例会假定只含一人并补静音声道，不能把任意混合双人音频直接当作已经分开的两人。

模型同时有当前 VAD head 和 VAP projection head。`probs` 返回 `probs/vad/p_now/p_future/H`；`p_now` 和 `p_future` 均由未来投射类别聚合得到。“now”这个名称不代表它测量了已经发生的实际回应时差。

本轮未找到在上述已读取接口中直接输出“B 对 A 的哪一轮构成回应，并已延迟多少秒”的音频头。VAP 的预测、Smart Turn 的完成性及 speaker-change 的边界都不自动建立回应语义。已有可审计回应对应关系和实际时间点之后，`latency=start(response)-end(reference_turn)` 仍是固定计算；负值可能表示重叠，应按任务定义处理。若只有紧邻轮次，最多计算有明确定义的相邻间隔，不能擅自将其升级为回应时延。

这是对本次有界来源集合的结论，不是对所有模型的穷尽否定。`d_response_latency` 保留；将来独立学得的回应关系/时延模型需要自己的输出合同和同域验证，不能把现有模型的通用表征或未来预测命名成已经存在的时延测量。

## 5. Revision、许可证及实际读取范围

| 来源 | 本次固定 revision | 已读许可证 | 权重/运行边界 |
| --- | --- | --- | --- |
| CountNet | `ae15e1ac096862667a7bfdedf0b67a70a7543edd` | MIT 正文（本地研究档案，未随页面发布：`sources_direct_audit/speaker_countnet_LICENSE`） | 仓库提供 `.h5`；没有下载/哈希权重，独立权重条款未另核验；旧 Keras/Theano 兼容问题见 README |
| pyannote 1.1 | `ffe9b0b5d3b1f505acbcdfb47995f197aa10ce8b` | MIT 正文（本地研究档案，未随页面发布：`sources_direct_audit/speaker_pyannote_legacy_LICENSE`） | 已读 task/pipeline/training recipe；hubconf 定义 `ovl_`/`scd_` 加载分支，但未取得具体 hub 清单/权重；不保证现存可调用 checkpoint |
| pyannote 现行仓库中的 OSD 教程 | `b749285c5cdd4636b2edc7f766f1352c8dde9369` | 本轮该 revision LICENSE 请求失败；旧版 MIT 不能替代新权重许可 | notebook 自身安装 3.1.1，使用 gated segmentation-3.0 再 finetune；代码库 revision 不等同权重 revision |
| SpeechBrain | `c0241278f93ef02cd5191f03caf4e5f8e1292bf6` | Apache-2.0 正文（本地研究档案，未随页面发布：`sources_direct_audit/speaker_speechbrain_LICENSE`） | 已读 AMI recipe 和说明；本轮未下载 embedding 权重，具体 checkpoint revision/权重条款 unknown |
| Smart Turn | `4786657e242dfe77dd138699ac564ee074a2a543` | BSD-2-Clause 正文（本地研究档案，未随页面发布：`sources_direct_audit/speaker_smartturn_LICENSE`） | README 声明模型开放，外部 HF checkpoint 精确 revision/单独条款未另核验；README v3.2 与推理文件 v3.1 名称不一致 |
| VAP | `f39a78b23a6dccdbedd106e00b48c410b8739f5d` | MIT 正文（本地研究档案，未随页面发布：`sources_direct_audit/speaker_vap_LICENSE`） | 示例 state dict 未下载，具体权重哈希/独立条款 unknown；训练语料与私有数据准备依赖按 README 保留 |

已读取来源及内容哈希见 speaker_sources_batch1.json（本地研究档案，未随页面发布：`sources_direct_audit/speaker_sources_batch1.json`）、speaker_sources_batch2.json（本地研究档案，未随页面发布：`sources_direct_audit/speaker_sources_batch2.json`）。GitHub contents API 的追加请求遇到 rate limit，失败逐项见 speaker_sources_batch3.json（本地研究档案，未随页面发布：`sources_direct_audit/speaker_sources_batch3.json`）；部分 raw URL 先前在单次 18 秒 timeout 内未取得内容，成功项通过固定 revision 的 contents API 解码缓存。未成功读取的底层文件或权重不作为已核验来源。

复核原则：模型直接观察、对模型新证据的固定解码、对已有标签的重算可以形成同一声音属性的不同观察路径；“类型可推导”不等于“所有观察都应删除”。反过来，来源路径不同不等于统计独立，且属性名一致还必须检查人数语义、时间范围、speaker 归属、阈值和标注协议。
