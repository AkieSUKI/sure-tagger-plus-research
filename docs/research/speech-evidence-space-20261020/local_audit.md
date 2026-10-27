# 本地实现与历史产物审计

审计日期：2026-10-20。范围：当前 Plus 配置、observer/backend、resolver、timeline、profile；specialist gateway 与共享模型适配器；既有 smoke、302 条 AMI 全量 run 和时间轴 replay。只读取源码、日志和 JSON，并执行三个无模型的纯函数重放；未下载权重、未调用模型/API、未改动生产代码。本文件中的 `code_supported` 只证明接口/实现路径，`observed` 只覆盖明确链接的历史样本；不是新增声学准确率验证。

## 1. 关键发现

| ID | 发现 | 来源支持 | 本地验证状态 | 对证据空间的影响 |
| --- | --- | --- | --- | --- |
| LA-01 | 当前 Plus 将 **zh 和 en** 都路由到 MOSS decision timeline；other/mixed/unknown 为 Nemotron。旧公开 schema 的“仅中文 MOSS、其余 DiariZen”不是本次 active 路由。 | 当前配置、resolver、真实 run_config | code_supported + observed config | 以 route version 和实际 observer 标记 provenance；不能把 Nemotron 记为 DiariZen。 |
| LA-02 | specialist smoke 中 FireRed 的 32 个词时间来自 **CTC 对齐失败后的均匀 token 时长插值**，再合并 SentencePiece token。 | 上游实现 + worker traceback + 原始结果 | observed failure path | 此样本时间戳应标 `deterministic_derived/fallback_interpolation`，不能当声学词定位。不能外推成 FireRed 所有配置都只有插值。 |
| LA-03 | FireRed ASR 返回的语言是 wrapper 额外调用 FireRed LID，不是 AED 自身的语言头。 | `_attach_language_observation` + smoke runtime | code_supported + observed | standalone FireRed LID 与 FireRed ASR 内附 LID 共享模型来源；不是两份独立语言证据。 |
| LA-04 | Plus FireRed 时间字段适配不兼容：共享 client 输出 `token/start_s/end_s`，Plus `_spans` 不读取这些键。 | 两层源码 + 纯函数重放 + run 错误记录 | reproduced without model | 时间适配失败会让已有整段 ASR 观察失败；与“ASR 模型没听懂”应分开统计。 |
| LA-05 | Qwen 的词时间来自另一个 ForcedAligner；gateway v2 保留零时长单位，shared Qwen client 则丢弃，Plus standalone aligner 的验证会拒绝零时长。 | shared Qwen、两套 worker、smoke v1/v2 | code_supported + observed + reproduced | “同一 Qwen”不同 wrapper 的 lexical coverage 不同，不能合并能力声明。 |
| LA-06 | 当前时间轴规则是 `speaker_timeline_derivation_v2.0-shadow.2`；与原 302 条正式 run 的 resolver 不同。 | current hashes、run config、replay summary | observed artifact | 时间规则变化能改变标签分数，不能归因给模型或 Planner。 |
| LA-07 | DASS 是分窗 527 类 sigmoid、跨窗最大值和确定性类别映射；AED 有三类事件区间，但 ratio 是阈值以上原始帧占比。 | shared DASS/AED 源码 | code_supported；本审计未跑模型 | DASS 不提供精确事件时间；AED ratio 不应冒充后处理区间并集占比。 |
| LA-08 | Plus profile 和旧 shared profile 的 pitch/volume 单位与规则不同。 | 两套 profile 源码 | code_supported | 同字段名不保证同语义，须绑定 profile rule version。 |

## 2. 路由、时间轴与逐人文字

当前配置为 PipelineConfig（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/config.py:9`）：`route_version=speaker_v2.claim_policy.20261008.1`，`public_decision_timeline=zh/en:moss;other/mixed/unknown:nemotron`。同文件的 ASR route 是 `zh/en:firered_if_count_consensus_le_1_else_moss;other/mixed/unknown:qwen3`。

resolver.resolve（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/resolver.py:306`） 实际以规范化语言是否属于 `{zh,en}` 选择 MOSS；其它语言选择 Nemotron，并拒绝未实现的 decision timeline 声明。language.normalize_language（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/language.py:40`） 会规整别名、`zh-*` 的主语言码；含 `,`、`+`、`/` 的语言字符串归为 mixed。旧 [tag-schema](visualization/baseline-tag-schema.md)（原文第150行） 仍记载 `speaker_v2.claim_policy.20260906.1` 的中文/非中文 MOSS/DiariZen 路由，须并列保留。

pipeline._complete_language_route（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/pipeline.py:141`） 只有在 zh/en、MOSS 与 Nemotron 都成功、人数一致且 ≤1 时请求 FireRed；resolver 还要求无冲突且 FireRed 有完整文本才选其整段 ASR。**即使 FireRed 含 timestamp，当前逐人 lexical_record 仍是 zh/en 的 MOSS 或其它语言的 Qwen**（resolver.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/resolver.py:384`））。不能写成“FireRed 词时间已经用于当前逐人归属”。

MOSS 使用自身 joint segments 的 speaker 身份；核验来源与活动交集 ≥0.6 后可保留含重叠的句段。独立 Qwen/aligner 单元若与 overlap 相交则 unassigned，非重叠区按最大活动交集比例 ≥0.6、领先第二名 ≥0.2 才归属（resolver.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/resolver.py:394`））。这两条路径不是同样的归属算法，也不是同样的误差来源。

当前 timeline.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/timeline.py:13`） 定义：活动段最短 100 ms；activity 仅合并同人重叠/相接；continuity 合并同人 ≤300 ms 间隔；相邻 continuity 片段异人且间隔 ≤1 s 生成 change point；overlap 对事件扫描得到的每个原子区间使用 100 ms floor（不是先把所有连续 overlap 片段合并再阈值化）。`change_points` 只是版本化相邻片段算子，不等价于经过独立标注的“发言权转移/打断”。

## 3. FireRed：真实词时间路径与语言来源

共享 firered_asr._DirectFireRedAsrRuntime（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/speaker_v2/firered_asr.py:238`） 传 `return_timestamp=True`。上游 fireredasr_aed.get_token_timestamp_torchaudio（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/models/FireRedASR2S/fireredasr2s/fireredasr2/models/fireredasr_aed.py:49`） 尝试对 decoder 文本做 CTC forced alignment；发生异常时捕获并设 `hyp['timestamp']=None`。随后 asr._get_and_fix_timestamp（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/models/FireRedASR2S/fireredasr2s/fireredasr2/asr.py:188`） 在缺失 timestamp 时计算 `avg_dur=dur/len(hyp_ids)`，令 token i 对应 `[i*avg_dur,(i+1)*avg_dur]`，四舍五入并 `merge_spm_timestamp`。正常有 CTC alignment 时则使用另一分支，并施加 60 ms shift。因此 `timestamps` 数组存在不足以证明发生声学对齐。

历史 worker_firered_asr.log（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/worker_firered_asr.log:1`） 明确记录 `RuntimeError: log_probs must be float64, float32 or float16 (half) type`。对应 firered_asr.result.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/firered_asr.result.json`） 的 runtime 为 `bfloat16`，返回 32 个词时间，例如 `should:0.000–0.414`、`be:0.414–0.829`、`straightforward:1.243–3.730`，覆盖整段约19.066秒，符合失败插值路径。结果没有显式 fallback 标记。gateway 的 normalize（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools.py:339`） 直接将它们映射为 `words`，因此消费者必须结合 provenance/log 才能辨别。

配置差异：specialist gateway audio_tools._config（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools.py:246`） 使用 `use_half=True`；当前 Plus local_models.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/configs/local_models.json`） 及 302 run 冻结 backend config 使用 `use_half=False`。**不能把 smoke 的 bfloat16 对齐失败外推为 Plus 同类调用全部失败原因。**

FireRed 语言是 FireRedAsrClient._attach_language_observation（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/speaker_v2/firered_asr.py:579`） 额外执行 `runtime.detect_language(audio_path)` 并合并 `lang/language/confidence`；模型加载位置见同文件 262–279、382–475 行。LID 失败保留 ASR 并记录 `language_error`。smoke 的附带 LID 为 `sn/0.512`，checkpoint SHA 为 `7dee2a280e9b11d5241a0e3d4fa60ee1520a036a2e8385f17960371cfea10093`；独立 firered_lid.result.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/firered_lid.result.json`） 对同一音频也为 `sn/0.512`。它们共享 FireRed LID 来源，不能互算独立确认；该样本是 AMI 英文文本，亦说明“两个 wrapper 一致”不保证语言正确。

另外，上游 firered_asr._normalize_timestamps（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/speaker_v2/firered_asr.py:894`） 输出 `{token,start_s,end_s}`；Plus backend_worker._spans（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/backend_worker.py:117`） 只查 `start_sec/start_time/start`、`end_sec/end_time/end`，lexical 字段只查 `text`。纯函数重放 smoke 原始 timestamps 到 `_spans(...,lexical=True)` 得到 `TypeError: float() argument must be a string or a number, not 'NoneType'`。全量 planner_summary.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/analysis/planner_summary.json`） 的 `runtime.observer_error_records` 中 `bfull_0041`、`bfull_0277` 两次 FireRed 错误均为同类 `float(None)`。这建立了可重现的适配器缺口；本审计未改动实现。

## 4. Qwen：对齐器依赖、零时长与 wrapper 差异

shared qwen3_asr._DirectQwen3AsrRuntime（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/speaker_v2/qwen3_asr.py:138`） 在 `return_time_stamps=True` 时把独立 `forced_aligner_model_dir` 传给 `Qwen3ASRModel.from_pretrained`。调用 `transcribe` 使用 `language=None`（同文件166–185行），输出语言来自 Qwen 返回对象；此 shared path 没有把 Plus route 强制传成模型语言。specialist audio_tools_worker.qwen（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools_worker.py:22`） 则直接调用底层 `runtime.model.transcribe`，可以传 `context` 和 `language`。支持 context 的 gateway 与不传 context 的 Plus worker 应分开登记。

| 路径 | 零时长单元处理 | 证据 |
| --- | --- | --- |
| shared Qwen client（Plus qwen3 使用） | `_normalize_timestamps` 在 `end<=start` 时 `continue`，静默删除该时间单元，整段 text 仍保留。 | qwen3_asr.py:430（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/speaker_v2/qwen3_asr.py:430`） |
| specialist gateway v2 | `native_timestamps` 保留零宽度；词数与空格文本分块数相同时投影原始拼写；gateway `_span` 仅拒绝 `end<start`。 | audio_tools_worker.py:75（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools_worker.py:75`）、audio_tools.py:435（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools.py:435`） |
| Plus standalone forced_aligner | 直接调用 aligner，`_spans` 对 `end<=start` 报错；`validate_payload` 也拒绝。 | backend_worker.py:203（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/backend_worker.py:203`）、backends.py:79（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/backends.py:79`） |

同音频 qwen_asr.result.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/qwen_asr.result.json`）（gateway v1）有29个词时间；qwen_asr_v2.result.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/qwen_asr_v2.result.json`）（v2）有32个，包含 `to:[6.8,6.8]`、`you.:[8.16,8.16]`、`a:[9.92,9.92]` 三个零宽度单元。整段文本一致。将 v2 的原始32个 timestamps 纯函数重放到 shared normalizer，得到29个且正好删去这三个；直接传 Plus `_spans` 则得到 `ValueError: invalid native timestamp`。

零时长表示缺少可用持续区间；保留文字不等于已得到可靠边界。当前 pipeline._lexical_baseline（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/pipeline.py:202`） 仅在 Qwen 有文本但 **所有 words 为空** 时另跑 aligner，部分时间单元丢失不会触发这一补齐。多窗 fusion 保留来源、用 core 中点裁分，无法重建完整模型全文时明确 `text=None`，避免拼接上下文文本冒充原全文。

## 5. DASS、AED 与 profile 的实际语义

**DASS。** DassNoiseTypeClient.estimate（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/sound_field_scene/dass_noise_type_detector.py:200`） 将音频转16 kHz mono，按 feature extractor 的窗口长度切不重叠块，末块补零；每块取527类 sigmoid，逐类跨块 `np.maximum`。返回 max vector、chunk_count 和排名，没有每块时间输出。run（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/sound_field_scene/dass_noise_type_detector.py:374`） 默认0.25阈值映射六个公共类别，composition 每类 top3。`external_noise_type` 的排除策略去掉主要语音、静音、声学场景/混响/echo 等；composition 使用完整向量，`human/other` 只在内部分类证据，不进入公共六类。`music_present is False` 才清空 composition 的 music 桶，`None` 不门控（dass_categories.py:213（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/sound_field_scene/dass_categories.py:213`））。适配器 `ToolResult.confidence=1.0` 是固定常数，不是校准事件概率；事件 sigmoid 也未在本审计验证校准。specialist gateway 只保留 summary 子集，完整 vector 留在 raw payload，不能把 summary 当精确事件时间线。

**FireRed AED。** 上游 aed.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/models/FireRedVAD/fireredvad/aed.py:91`） 对 speech/singing/music 分别后处理成区间；`event2ratio` 是 `count(frame_prob>=threshold)/frame_count`，保留3位小数，和区间后处理是两条计算路径。共享 run（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/sound_field_scene/firered_aed_detector.py:218`） 以区间非空形成事件候选，再对 singing/music 应用默认0.10 ratio floor；原始区间保留，`music_present` 是门控后 `music in speech_music_events` 的确定性投影。gateway audio_tools.py:393（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools.py:393`） 保留三类原始 event_segments/event_ratios 并投影原坐标，未等同调用公共标签门控。

**Plus profile。** calculate_profiles（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/profiles.py:139`） 以 speaker activities 减 overlap；coverage 有值时再取交集，coverage 缺失则直接使用减 overlap 后区间。只有整段完全落入 clean 区间的 attributed text 才贡献语速；≥3秒且≥8单位才发布。中文是 `char_per_sec`；只给 `{en,fr,de,es,it,pt,nl,af,sw}` 定义 word/min；其它语言返回 unknown。音高是40ms帧/20ms步长、自相关F0的中位数，相对本片有效 speaker F0 的上中位数：<0.85为low、>1.15为high、否则medium。音量是 clean PCM RMS dB，相对本片有效 speaker **均值**，<-3 quiet、>3 loud、否则normal；声学最短默认0.8秒。它不调用性别模型、不推断身份/年龄/情绪。

旧 shared speaker_profile.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/speaker_v2/speaker_profile.py:327`） 使用 `zh_char_per_sec`，按文本字符判断单位、过滤 filler，支持 variable rate；pitch 是绝对140/220Hz阈值的 low/mid/high，volume 参照片内 **中位数** 并支持variable（同文件452–477行）。因此不能把旧 schema 描述直接套在 Plus `sure-tagger-plus.profile.v0.0` 上。

## 6. 历史运行核验与适用范围

真实全量 run 的顶层是 `experiment_config.json`，不存在顶层 `plus/run_config.json`；每样本各有 run_config。抽查 bfull_0001/run_config.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/samples/bfull_0001/run_config.json`） 与 experiment_config.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/experiment_config.json`） 一致：ObservedBackend、route 20261008.1、上述zh/en路由、memory=false、max_probe_calls=3、max_parallel_observers=3、300秒窗口、5秒上下文。其 source_snapshot/backend_config.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/source_snapshot/backend_config.json`） 记录 MOSS max_new_tokens=65536、FireRed use_half=false、Qwen return_time_stamps=true/max_new_tokens=4096。

完整 input/validation.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/input/validation.json`） 记载302条、2/3/4人为84/120/98、总7590.414375秒、最长94.5225秒。因此这次 run 未验证>300秒长音频 fusion，也未验证多语/混语普适性。

summary.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/summary.json`） 确认302/302完成、最终样本1912次神经观察、7个样本保留9次失败；全部会话1998次观察。单个 summary 的451.72秒是最后恢复会话，不能当完整run墙钟；planner_summary（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/analysis/planner_summary.json`） 汇总两会话4357秒、23次观察错误、340次probe/292样本、最终新probe证据引用0、结构改变0，语言复核59条。与报告（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/report.md:20`）一致：probe收益和首轮语言复核必须分开。

当前 config/backend_worker/backends/profiles SHA 与正式run记录一致；pipeline/resolver已变化，timeline模块不在原run指纹清单。当前 resolver/timeline/profiles SHA 与 replay_summary.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019_timeline_replay_v2/replay_summary.json`） 一致。replay 记录302条、model_calls=api_calls=0、reference_files_read=false，162条change_count和92条overlap_ratio变化；replay报告（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019_timeline_replay_v2/report.md:19`） 宏分76.50→80.76%、speaker_change52.85→95.92%、cpWER保持18.099%。这只验证确定性重放，不是当前代码重新跑声学模型的成绩。

对照 synthetic_smoke_1019/run_config.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/synthetic_smoke_1019/run_config.json`） 为 FixtureBackend/RulePlanner/max_probe_calls=0，不能拿它证明神经observer成功或Planner质量。

## 7. 待解决事项

1. 在 registry 中将 native alignment、forced alignment、interpolated fallback 与 unknown 时间来源分开；审计 FireRed其它样本是否进入插值路径，当前没有全库发生率。
2. 修复评审应单独处理 FireRed时间字段适配，确保时间失败不必摧毁独立有效的整段文本；本调研不做修复。
3. 定义零时长 lexical unit 的状态和计分：保留原文/不伪造区间/不能直接以持续时间交集归属；分别测文本覆盖与边界质量，避免静默删词。
4. 给 profile 版本显式映射旧/public枚举和单位，避免 low/mid/medium、low/quiet、zh_char_per_sec/char_per_sec 混用。
5. DASS/AED先测事件/时间GT；profile先测F0/语速/相对音量定义与域偏移。固定 `confidence=1.0` 不作为校准依据。
6. 当前 evidence 累积日志可审计成功/失败，却不能单靠字段非空/healthcheck 推出目标任务增益。后续要做同样本 tag消融、producer替换、条件错误相关性及overlap分层cpWER。

## 8. 读取文件的 SHA-256

以下为本次读取时的文件内容 SHA-256；指纹不是权重许可或模型精度证明。共享模型目录含软链，链接使用用户可见入口路径，hash按实际内容计算。运行内记录的 checkpoint hash 未在本次重新扫描大权重验证。

| 文件 | SHA-256 |
| --- | --- |
| sure-tagger-plus-v0.0/configs/local_models.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/configs/local_models.json`） | `e3b7057e355c253de1fd0ed858b66184efba3cd4635b6151e32af42ffb8cdc82` |
| sure-tagger-plus-v0.0/sure_tagger_plus/config.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/config.py`） | `6b243ab0209940ea93ca18876b84b553fd7a874d9cf65d4db57f526891135f9d` |
| sure-tagger-plus-v0.0/sure_tagger_plus/pipeline.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/pipeline.py`） | `4481e77c3e8ad855f1e7b7be0cade345067c30a5090f1707152fd2dfb5eff45a` |
| sure-tagger-plus-v0.0/sure_tagger_plus/backend_worker.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/backend_worker.py`） | `877bf89edcab01019f1918f236acb3cf1653b7e5cc88a2608aeac80e1f06fe46` |
| sure-tagger-plus-v0.0/sure_tagger_plus/backends.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/backends.py`） | `0b6486ec376664e459d4c8123f328b37b087ea9a239cd46a0169dea80522b94a` |
| sure-tagger-plus-v0.0/sure_tagger_plus/resolver.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/resolver.py`） | `e5e6ef8d2dae12b983d492becd62626b98e965738420ac7d4a9f6c358104b4fe` |
| sure-tagger-plus-v0.0/sure_tagger_plus/timeline.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/timeline.py`） | `9652095b539248d4347f492ded28c4b90438dfafbf2403c590ac44734d33342e` |
| sure-tagger-plus-v0.0/sure_tagger_plus/profiles.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/profiles.py`） | `cb1f8ec9db446434c49c6068ee582805929fb4eb1763a4e21bc5254c0204ab15` |
| sure-tagger-plus-v0.0/sure_tagger_plus/language.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/sure-tagger-plus-v0.0/sure_tagger_plus/language.py`） | `203875e69fb1feab64f781878771940c1bcf58d6db0961eb0057226cecab214d` |
| scripts/audio_tools.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools.py`） | `fc6b8022deeee6d17da91a7215b48d8bd60b9297716eb88fd33087c27c095008` |
| scripts/audio_tools_worker.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/scripts/audio_tools_worker.py`） | `c64f8ea5bf29cdc8cc278790b4640f1a108cf2df7899bf76a25b5f15bdae444f` |
| runs/specialist_smoke/worker_firered_asr.log（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/worker_firered_asr.log`） | `f1a0427b8d5d5361f59b7e58a28c3d608e0348238398528073cdf5f785c216e9` |
| runs/specialist_smoke/firered_asr.result.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/firered_asr.result.json`） | `0ea7a4289dd3f48e1e55260c0d73e2889462013701a8e3e51bca2c8c7cdfa011` |
| runs/specialist_smoke/firered_lid.result.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/firered_lid.result.json`） | `8dd8bf07afd091669e8a43f03fe77dc5513475e4807b312fe83709291be049b7` |
| runs/specialist_smoke/qwen_asr.result.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/qwen_asr.result.json`） | `16d0feb7ccafbf4d98d844e3e2058789b61d7402f71917a9631be242cbc90b79` |
| runs/specialist_smoke/qwen_asr_v2.result.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/specialist_smoke/qwen_asr_v2.result.json`） | `7108eb0506f5b9e1ddef0ca6b5dd82dd50524e78575fe3f918296e7d6923eb51` |
| runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/experiment_config.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/experiment_config.json`） | `377a4c87df0163e233b82d56656bf4120b8047f2419245cd02e7f02d1b4dcbc5` |
| runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/source_snapshot/backend_config.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/source_snapshot/backend_config.json`） | `e3b7057e355c253de1fd0ed858b66184efba3cd4635b6151e32af42ffb8cdc82` |
| runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/samples/bfull_0001/run_config.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/samples/bfull_0001/run_config.json`） | `4cae08271fc89110d1f3d0294093d88e8ae2f0b94cfe329246205446bbf59136` |
| runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/summary.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/plus/summary.json`） | `8b4aeb7ed4d1d9a020867d6849d307b19cfa6abe595892204f288b90191949fd` |
| runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/analysis/planner_summary.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/analysis/planner_summary.json`） | `6a7071e6eb12e7c5faff2e217a19c2c91507c2c81189da9a8c62f43411f9bd79` |
| runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/input/validation.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019/input/validation.json`） | `285cb3ca6358c28d1bf5211b012acfd456f1b78466ff894dfca5b3421dec3911` |
| runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019_timeline_replay_v2/replay_summary.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/benchmark_multispeaker_full_1019_timeline_replay_v2/replay_summary.json`） | `eeade89bea589ea45b616f6347a71fe0ec24d7c794c582cfcca5524335d36d28` |
| runs/sure-tagger-plus-v0.0/synthetic_smoke_1019/run_config.json（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/huifei.wang/小模型智能体化/runs/sure-tagger-plus-v0.0/synthetic_smoke_1019/run_config.json`） | `e9c2792fdbf8aa2b6f7c069034fa9d265d34aab075fb5855063e6a0401e4f2d4` |
| shared/tagger/tools/speaker_v2/firered_asr.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/speaker_v2/firered_asr.py`） | `80bbbfcaedf04d64a91f48d1b2c218f81be48462db034f5fd2bab061d9965cc6` |
| shared/tagger/tools/speaker_v2/qwen3_asr.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/speaker_v2/qwen3_asr.py`） | `be8aec260e6e15e2f59f46aad5581cc76ef4e248901ae6062cbec44244623d28` |
| shared/tagger/tools/speaker_v2/speaker_profile.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/speaker_v2/speaker_profile.py`） | `ffae0012b59c57b02d67a0a11427db314cfcb6d997bf5b72e09c06282e2d9adc` |
| shared/tagger/tools/sound_field_scene/dass_noise_type_detector.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/sound_field_scene/dass_noise_type_detector.py`） | `780a1122cd583a1e68bd7955693a944cfadfa7b3888342d91a0217f6f0d7fa88` |
| shared/tagger/tools/sound_field_scene/dass_categories.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/sound_field_scene/dass_categories.py`） | `92ddd7a925c5897c1e552a3aaa4805d07840bddf8d7323045b1d0e90bf341174` |
| shared/tagger/tools/sound_field_scene/firered_aed_detector.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/tagger/tools/sound_field_scene/firered_aed_detector.py`） | `3aa5a9c4029fac6c258e4ff6ac38af54fcac292352f5ae88e4bc0c31adf1a7d2` |
| shared/models/FireRedASR2S/fireredasr2s/fireredasr2/asr.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/models/FireRedASR2S/fireredasr2s/fireredasr2/asr.py`） | `bf567f297360d2afd1e611f2886b1bcaef0f7a640f22a49efd1eb87d9a959c4e` |
| shared/models/FireRedASR2S/fireredasr2s/fireredasr2/models/fireredasr_aed.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/models/FireRedASR2S/fireredasr2s/fireredasr2/models/fireredasr_aed.py`） | `ab57b9ec5ff971e191372684d52493895a70099f9e8b2db8cd788782fd051c8c` |
| shared/models/FireRedVAD/fireredvad/aed.py（本地研究档案，未随页面发布：`/hpc_stor03/sjtu_home/weihan.chen/share/sure-tagger-main/models/FireRedVAD/fireredvad/aed.py`） | `5cb5036d7c06194935e8f2ad2d86081c166e56171cdbda57307354832f02325f` |
