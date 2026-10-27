# 上游模型、工具与来源调查

核验日期：2026-10-20。这里“已读”指实际取得的官方原文/代码/许可证或明确标注的本地模型卡快照；不以搜索摘要代替。新增模型均未在本轮推理。完整扩展调查见 [upstream_supplement.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/upstream_supplement.md)，本地代码/配置与历史实测见 [local_audit.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/local_audit.md)。

## 1. 调查方法与搜索边界

按任务缺口检索：`Qwen3-ASR / ForcedAligner / MOSS Transcribe Diarize / DiariZen / Nemotron diarization / FireRedASR2S / FireRedVAD / WhisperX / target speaker ASR / DiCoW / TS-ASR / WeSep / SenseVoice / emotion2vec / openSMILE / CLAP / DASS / BEATs / Brouhaha / Rec-RIR / MeetEval / dscore / DESED / PSDS`。先确认官方组织或论文作者仓库，再读 README、接口实现和 LICENSE；模型卡独立登记。覆盖内容/语言、活动/归属、定位、非言语/情绪、质量/混响、检索、评测，不声称穷尽所有开源模型或完成最新性能排名。

GitHub API 初期可用，随后 rate-limit 403；对已获得的 commit 使用固定 SHA 的 raw 文件。部分其它仓库 HEAD 查询超时，保留 `code_revision=unknown` 和本次原文 SHA-256，不把 snapshot hash当作checkpoint hash。HF 直连多次超时；部分模型卡使用本地缓存，SenseVoice/emotion2vec/CLAP 的三份 card 由补充调查经第三方镜像读取，分别标注。arXiv/OpenSLR/AMI等页面访问未完成的项不算论文全文/数据许可已核验。

源文件清单：main manifest（本地研究档案，未随页面发布：`sources/manifest.json`）、local cards（本地研究档案，未随页面发布：`sources/local_cards_manifest.json`）、supplement manifest（本地研究档案，未随页面发布：`sources_supplement/manifest.json`）。这些 JSON 分别保存 URL/path、访问日期、revision或unknown、获取状态和文件hash。`retrieved` 仅表示下载成功；正文每项 capability只依靠已审阅的对应段落。无权重文件下载。

## 2. 核心来源 ledger

下表 S-* 与 [capabilities](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/model_capabilities.md) 的 claims 对应。checkpoint列指上游/本地模型身份，不与代码revision混用。release_date仅列文档明示值，其余unknown；API updated_at不是模型发布时间。

| source_id / producer | 官方入口与本轮读取 | code revision；checkpoint/release | 代码许可 / 权重许可；核验级别 |
| --- | --- | --- | --- |
| S-Qwen / P01,P02 | [QwenLM/Qwen3-ASR](https://github.com/QwenLM/Qwen3-ASR)；README（本地研究档案，未随页面发布：`sources/qwen__README.md`）、wrapper（本地研究档案，未随页面发布：`sources/qwen__qwen_asr__inference__qwen3_asr.py`）、aligner（本地研究档案，未随页面发布：`sources/qwen__qwen_asr__inference__qwen3_forced_aligner.py`）、LICENSE（本地研究档案，未随页面发布：`sources/qwen__LICENSE`） | code `7c6daf77a2421100f5fb066495372c00129d39ff`；本地ASR smoke记录ModelScope `3b885f72b1733a6a50dc17a597fb4135c3d656a0`；aligner checkpoint revision unknown；release unknown | Apache-2.0 / ASR本地card（本地研究档案，未随页面发布：`sources/qwen_weights__README.md`）、aligner本地card（本地研究档案，未随页面发布：`sources/aligner_weights__README.md`）均声明Apache-2.0；card下载日期unknown，未在线核对HF最新版本 |
| S-MOSS / P03 | [OpenMOSS](https://github.com/OpenMOSS/MOSS-Transcribe-Diarize)；README（本地研究档案，未随页面发布：`sources/moss__README.md`）、input（本地研究档案，未随页面发布：`sources/moss__moss_transcribe_diarize__inference_utils.py`）、parser（本地研究档案，未随页面发布：`sources/moss__moss_transcribe_diarize__transcript_parser.py`）、LICENSE（本地研究档案，未随页面发布：`sources/moss__LICENSE`） | code `e3bdd93f8ad58418e04659818efd5fd87a0bc486`；weights revision unknown；README release 2026-07-09 | Apache-2.0 / 本地0.9B card（本地研究档案，未随页面发布：`sources/moss_weights__README.md`） Apache-2.0；Pro服务不在权重调查承诺内 |
| S-FireRed / P04,P08 | [FireRedTeam/FireRedASR2S](https://github.com/FireRedTeam/FireRedASR2S)；README（本地研究档案，未随页面发布：`sources/firered__README.md`）、LICENSE（本地研究档案，未随页面发布：`sources/firered__LICENSE`）；timestamp内部路径另见LA-02/03 | code unknown（HEAD读取失败）；release 2026-02-12；ASR checkpoint revision unknown；LID本地checkpoint hash见LA-03 | Apache-2.0代码；各权重独立license正文未取到，unknown；README提供模型下载不等于许可证核验 |
| S-FireVAD / P09 | [FireRedTeam/FireRedVAD](https://github.com/FireRedTeam/FireRedVAD)；README（本地研究档案，未随页面发布：`sources/firevad__README.md`）、LICENSE（本地研究档案，未随页面发布：`sources/firevad__LICENSE`）；本地AED源码LA-07 | code/checkpoint revision unknown；release unknown | Apache-2.0代码 / 权重独立条款unknown |
| S-Nemotron / P05 | [官方HF入口](https://huggingface.co/nvidia/Nemotron-3-Diarization) 本轮网络不可达；实际读 本地模型卡（本地研究档案，未随页面发布：`sources/nemotron_weights__README.md`）、config（本地研究档案，未随页面发布：`sources/nemotron_weights__config.json`）、smoke runtime | 模型card快照下载日期unknown；run记录checkpoint `f667ed73aee57d40cc39428eb768b4fd87a0a29e`、权重hash见V03；卡内release 2026-09-23；当前在线revision unknown | NeMo框架Apache-2.0（框架README声明）；**模型卡OpenMDW-1.1**；协议外链正文未取得，适用文件范围待核验 |
| S-DiariZen / P06 | [BUTSpeechFIT/DiariZen](https://github.com/BUTSpeechFIT/DiariZen)；README（本地研究档案，未随页面发布：`sources/diarizen__README.md`）、LICENSE（本地研究档案，未随页面发布：`sources/diarizen__LICENSE`）、MODEL_LICENSE（本地研究档案，未随页面发布：`sources/diarizen__MODEL_LICENSE`） | code `844f5555b0a98acd0931511fc641a8c5b8ba92c7`；本地v2 checkpoint `f27b9ffbedcf422856d104ecee9b94be37ea578e`；README更新v2 benchmark 2025-12-09（非证明checkpoint首次release日） | MIT代码 / **CC BY-NC 4.0权重**；两正文已读，不可将MIT覆盖整条pipeline |
| S-WhisperX / P07 | [m-bain/whisperX](https://github.com/m-bain/whisperX)；README（本地研究档案，未随页面发布：`sources/whisperx__README.md`）、alignment（本地研究档案，未随页面发布：`sources/whisperx__whisperx__alignment.py`）、diarize（本地研究档案，未随页面发布：`sources/whisperx__whisperx__diarize.py`）、LICENSE（本地研究档案，未随页面发布：`sources/whisperx__LICENSE`） | code `db8fde4d31a3e7f49fe5835938685a76f5ba5477`；各依赖权重revision/release unknown | BSD-2-Clause wrapper；Whisper/语言aligner/pyannote权重分别核验，不能给组合单一许可 |
| S-Pyannote / P18 | [pyannote.audio](https://github.com/pyannote/pyannote-audio) README在线已读；本地community-1卡（本地研究档案，未随页面发布：`sources/pyannote_weights__README.md`） | 在线README/本地card版本关系unknown；checkpoint/release unknown；本轮曾读取不同ref，未把它们当同一个固定checkout | code MIT；本地card CC-BY-4.0，需接受模型条件；online最新card未复核 |
| S-DASS / P10 | [Saurabhbhati/DASS](https://github.com/Saurabhbhati/DASS)；README（本地研究档案，未随页面发布：`sources/dass__README.md`）、LICENSE（本地研究档案，未随页面发布：`sources/dass__LICENSE`）、本地medium卡（本地研究档案，未随页面发布：`sources/dass_weights__README.md`） | code/checkpoint/release unknown；本地checkpoint文件在inventory，但未扫描hash | BSD-3-Clause及第三方MIT说明；本地weight card BSD-3-Clause；精确checkpoint对应性待核验 |
| S-PANNs / P11 | [audioset_tagging_cnn](https://github.com/qiuqiangkong/audioset_tagging_cnn)；README（本地研究档案，未随页面发布：`sources/panns__README.md`）、LICENSE（本地研究档案，未随页面发布：`sources/panns__LICENSE.MIT`）；models.py请求超时未计已读 | code `d2f4b8c18eab44737fcc0de1248ae21eb43f6aa4`；checkpoint/release unknown | MIT代码；权重独立许可unknown |
| S-DNSMOS / P12 | [DNS-Challenge/DNSMOS](https://github.com/microsoft/DNS-Challenge/tree/master/DNSMOS)；README（本地研究档案，未随页面发布：`sources/dnsmos__DNSMOS__README.md`）、local script（本地研究档案，未随页面发布：`sources/dnsmos__DNSMOS__dnsmos_local.py`）、root LICENSE（本地研究档案，未随页面发布：`sources/dnsmos__LICENSE`） | master快照；code/checkpoint/release unknown | root LICENSE为CC-BY-4.0；具体脚本/ONNX独立适用声明unknown，不能称MIT。DNSMOS Pro是另一个项目 |
| S-Brouhaha / P13 | [marianne-m/brouhaha-vad](https://github.com/marianne-m/brouhaha-vad)；README（本地研究档案，未随页面发布：`sources/brouhaha__README.md`）、LICENSE（本地研究档案，未随页面发布：`sources/brouhaha__LICENSE`）、本地部署说明（本地研究档案，未随页面发布：`sources/brouhaha_weights__README.md`） | code/checkpoint/release unknown | MIT代码；本地README仅为部署说明，并无上游模型卡许可；checkpoint独立条款unknown |
| S-RecRIR / P14 | [Audio-WestlakeU/Rec-RIR](https://github.com/Audio-WestlakeU/Rec-RIR)；README（本地研究档案，未随页面发布：`sources/recrir__README.md`）、LICENSE（本地研究档案，未随页面发布：`sources/recrir__LICENSE`） | code/checkpoint/release unknown；paper索引2509.15628未读全文 | MIT代码；README有ckpt命令，完整可下载权重/许可未核验 |
| S-Local / P15–P17 | [local_audit](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/local_audit.md)、inventory与smoke提取（本地研究档案，未随页面发布：`local_artifact_check.json`） | code文件hash在audit；rule/route version分别存；不凭文件名推断训练版本 | 自有/共享适配器及依赖分别核验；本轮不判断未知权重商用许可 |
| S-Supp / P19–P27 | [扩展调查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/upstream_supplement.md) 与其27项source ledger | 各repo commit/card revision逐项列；不能继承主表任一版本 | SenseVoice、emotion2vec、openSMILE、CLAP、DiCoW、WeSep、BEATs、Silero、MFA分别登记 |

## 3. 实际发现与选型比较

| 缺口 | 候选与已核验能力 | 纳入理由、资源与排除/保留条件 |
| --- | --- | --- |
| 多语文本+语言 | Qwen0.6B/1.7B：30语言+22中文方言；FireRed ASR：中英/方言，LID独立模块100+语言；SenseVoiceSmall：5语ASR/LID+事件/情绪 | Qwen0.6B已本地部署，优先做路径/coverage审计。不能将FireRed LID语言数转给ASR，不能将SenseVoice家族50+语转给Small；不同任务须共同语言集比较 |
| 单位时间 | Qwen Aligner0.6B：11语≤5min；WhisperX：语言专用aligner；MFA：Kaldi路径；SenseVoice最新实现：同源CTC alignment | 首选复用已部署aligner，MFA/WhisperX作方法替代；正常alignment、fallback插值、零时长、缺字符要分开。额外模型成本计入，非ASR免费原生词时间 |
| speaker timeline | Nemotron3卡：100M、最多8人、[T,8]帧概率→区间；DiariZen：SSL+embedding/聚类pipeline；pyannote community-1：regular与exclusive diarization | 本地MOSS/Nemotron已有运行；DiariZen为方法/规则对照。community-1 exclusive便于单speaker转写对齐，但会移除同时多人表示，不可用它计算真实overlap（本地card对应小节） |
| 重叠中的文字 | MOSS joint；DiCoW STNO+FDDT；SE-DiCoW enrollment；WeSep目标分离训练框架 | “知道谁在说话”不等于恢复双方词。DiCoW是最值得有界试验的替代路径；WeSep当前README checkpoint/CLI coming soon，暂不列为即插即用producer。固定预测timeline避免混入oracle |
| speech/music 与其它事件 | FireRed AED只有speech/singing/music；DASS/BEATs/PANNs类别分数；PANNs另有frame-wise SED checkpoint；SenseVoice非言语tag；DCASE strong SED完整路径 | FireRed填三类区间，不能检测所有笑/咳嗽；AudioSet分类头不直接给精确onset；PANNs决策级SED候选需另设阈值/后处理并验证。DASS本地max聚合会丢失窗口信息，若任务定位需保留逐窗/逐帧或换producer |
| 情绪/韵律 | emotion2vec+九类分数，base仅表征；SenseVoice raw emotion；openSMILE声学特征 | 条件研究，不进入当前稳定公开情绪字段；openSMILE不是可随意商用的MIT工具，特征值也不等于心理事实 |
| 质量/房间 | DNSMOS SIG/BAK/OVRL/P808；Brouhaha VAD+SNR+C50；Rec-RIR估计RIR | Q05目标先决定MOS还是SNR。混响参数不等于“会议室”；Rec-RIR成本/权重未核验，deferred，不能为凑齐场景层常驻调用 |
| 声音检索 | CLAP audio/text共同空间、BEATs audio-only representation | CLAP用于召回窗，后接可审计复核；BEATs原始表征没有因此获得配对text encoder；相似度未校准，不能直接映射事件true/false |
| 评测协议 | MeetEval cpWER/tcpWER/ORC/MIMO；dscore DER/JER；PSDS事件操作点；AudioSet ontology | 最低成本的优先项是用已有sidecar交叉核验评分器。任务评测与标签宏平均并列，不能互替 |

模型大小（0.6B/0.9B/100M/49M等）仅用来描述上游结构，不是本机显存/RTF预测。本轮没有统一环境的延迟排名。smoke推理/加载/elapsed各时间含义不同；历史GPU监控是离散采样，不是连续profiler。

## 4. 特别影响结论的协议差异

**Nemotron的DER不能直接和DiariZen/pyannote的表格横排。** 本地官方card明确其AMI/AliMeeting/NOTSOFAR使用forced-alignment reference RTTM，并警告换标签即换协议；CALLHOME collar为0.25s，另外列出的域为0s，均含overlap。DiariZen README说明无collar，pyannote card给自有benchmark协议。数据名称相同不等于相同GT、通道、split、collar，只有重评分同输出或在同GT跑才可比较。

**上游版本改进不是所有域都提升。** DiariZen表中v1→v2：AMI-SDM14.0→13.9、AliMeeting far12.5→10.8，但AISHELL-4 9.8→10.1、MSDWild15.6→15.8（均是其上游DER）。因此保留替代候选，用项目任务分布测边际收益。

**不同名字可能共享观察。** FireRed-ASR wrapper和standalone LID实际同checkpoint；WhisperX speaker来自pyannote；FunASR speaker来自FSMN-VAD/CAM++/聚类；DiCoW demo依赖DiariZen；DASS蒸馏AST/HTS-AT。这些都是已知依赖，不能按工具数量计算独立见证；跨架构训练数据/条件错误相关性仍unknown。

**事件标注不全时，missing不等于negative。** DCASE Task4训练明确对不同数据源未标注类别mask；这个事实直接影响Q06评测分母和empty-event解释。AudioSet ontology的abstract/blacklist也不能当普通可预测类别。

## 5. 有用的暂缓/排除与剩余搜索缺口

- 暂缓情绪、年龄、角色、实体身份、主观意图成为稳定公共字段：当前F无足够GT或必要性，现有F0/语言/句子不足以推出。
- 暂缓把目标说话人分离/ASR直接当已部署工具：DiCoW/SE-DiCoW版本与enrollment路径不同；WeSep可训练不等于checkpoint可用。
- 不将MOSS-Pro、pyannote precision-2或商业API列为本地开放权重替代；不将同checkpoint C++/Python wrapper列为独立producer家族。
- EEND/TS-VAD/LS-EEND作为历史训练路线参考已见本地20261010材料，本轮没有重新完成所有官方权重/license核验；不在当前优先可部署名单中。
- speaker embedding只核对现有用途与补充FunASR/CAM++说明；本轮未完成所有CAM++/ECAPA/checkpoint的许可、跨域阈值及EER调查，保留unknown。
- ASR ITN/标点/disfluency、逐词code-switch、非言语speaker归属、长音频跨窗身份仍需专门GT。公开仓库有接口不能填补这些验证。
- DNSMOS Pro官方README已读到MOS分布/10s16k建议，但它与本地DNSMOS不是同一个模型；未作为核心替代排名。VoxLingua107/FLEURS等仅用于下一轮数据候选，不声称下载/标注已完成。

已完成的是有出处的能力/合同调查与候选筛选；验证步骤、资源上限、停止条件见 [validation_plan](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/validation_plan.md)。

## 6. 总表覆盖补查（v0.5）

核验日期：2026-10-20。本次只读下列官方 README、代码或固定版本配置，补查新增声音标签的 producer 对应关系；未下载模型权重、未运行推理。Basic Pitch 登记为 P28；DCASE SELD 仅作为相关但不匹配完整空间声像语义的排除记录，不新增 producer ID。下列未缓存的在线来源不能视作已有 sources manifest 快照。

| source_id / producer | 实际读取的官方来源 | revision / release / 许可核验 | 覆盖判断与本地验证 |
| --- | --- | --- | --- |
| S-BasicPitch / P28 Basic Pitch | [官方 README](https://github.com/spotify/basic-pitch/blob/main/README.md)；[inference.py](https://github.com/spotify/basic-pitch/blob/main/basic_pitch/inference.py#L409) 的 `predict()`、`save_note_events()` | 读取移动分支；code revision / checkpoint revision / release均unknown。README声明Apache-2.0，但代码LICENSE正文及权重独立适用条款未核验，代码/权重许可核验状态均unknown | documented + code_supported，`t_note_event` 部分支持；local_validation=not_run；混音逐源归属与完整可听起止语义仍未覆盖 |
| S-SELD2023 / 相关排除记录 | [DCASE2023 SELD baseline 官方 README](https://github.com/sharathadavanne/seld-dcase2023/blob/master/README.md)，已读 Multi-ACCDOA 输出、输入格式与限制 | code revision / checkpoint revision / release均unknown；README声明MIT，LICENSE正文与权重条款未核验，许可核验状态unknown | documented 的事件类别/DOA轨迹候选，不等同完整 `t_spatial_image`；local_validation=not_run，不计新P |
| S-openSMILE-v05 / P21 配置补查 | [固定版本 eGeMAPSv02_core.lld.conf.inc](https://github.com/audeering/opensmile/blob/055dda577c82383f8239663e5ac6c58d25b504db/config/egemaps/v02/eGeMAPSv02_core.lld.conf.inc)；104–116行选择loudness/F0，133–154行门控，180–196行平滑 | code revision=`055dda577c82383f8239663e5ac6c58d25b504db`；配置无checkpoint；release unknown；本条不新增许可证核验，沿用 S-Supp/P21 的既有许可记录 | config/code_supported 的部分谱分量；不是完整频谱包络或发声状态分类；默认输出接口未验证，未新增本地推理 |

**Basic Pitch 的部分支持边界。** README明确支持复调音符转写与pitch bends，建议每次输入一种乐器；推理会将立体声下混为mono。`save_note_events()` 将音符写为 `start_time_s/end_time_s/pitch_midi/velocity/pitch_bend`，`predict()` 可直接返回 `note_events`；因此总表可登记音高、模型onset/offset和pitch bend候选。模型offset尚未对齐本schema的可听音符起止协议，不能直接解释为可听尾音终点；`velocity`也不直接当作逐源 `t_loudness`。未见该接口输出可辨声部/逐乐器的归属，所以不能声称已覆盖 `t_note_event` 的全部语义。

**DCASE SELD 的排除理由。** 已读baseline针对四通道FOA或指定四面体麦克风阵列，逐帧输出事件类别与DOA轨迹。Multi-ACCDOA 的Cartesian `x/y/z` 表示到达方向，向量模还参与活动判断，不能当作米制距离。它没有据此提供声像宽度、可听远近感，也没有验证普通立体声成品录音上的适用性；因此保留为方向分量的相关候选，不把它列成完整 `t_spatial_image` producer。

**openSMILE 的配置与输出边界。** 固定配置中的loudness/F0选择、门控和平滑描述内部处理，不能证明默认接口已直接输出native `t_voicing`。已有eGeMAPS谱分量可约束部分频谱形状，但不能等同完整局部频谱包络，更不能自动转换为 `t_phonation` 的气声、喉化、紧压等状态。当前仅登记部分支持，完整声音语义与默认接口的输出合同仍待验证。

## 7. d_*直接感知补查（v0.6）

核验日期：2026-10-20。目标是检查全部15个 `d_*` 是否存在另一音频感知路线，避免把属性可推导误写成只能派生。总览见 [d_direct_audit.md](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_direct_audit.md)，逐请求缓存、hash、失败原因见 sources_direct_audit（本地研究档案，未随页面发布：`sources_direct_audit/`）。本次没有下载权重或运行推理。

| 来源 / producer与claim | 实际读取的官方来源 | revision / 许可 / 支持与边界 |
| --- | --- | --- |
| S-DA-SpeechBrain / P29 / DA-C01 | [AMI recipe](https://github.com/speechbrain/speechbrain/blob/c0241278f93ef02cd5191f03caf4e5f8e1292bf6/recipes/AMI/Diarization/experiment.py) 与README；[审查及缓存索引](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_audit_speaker_temporal.md) | code `c0241278f93ef02cd5191f03caf4e5f8e1292bf6`；Apache-2.0正文已读，具体encoder权重条款/revision unknown；非oracle cosine eigengap估人数是组合路径，不是单独人数head，分段可能oracle/VAD须明示 |
| S-DA-Pyannote-OSD/SCD / P30–P31 / DA-C02–03 | 官方pyannote1.1任务定义、pipeline与训练教程；[OSD task](https://github.com/pyannote/pyannote-audio/blob/ffe9b0b5d3b1f505acbcdfb47995f197aa10ce8b/pyannote/audio/labeling/tasks/overlap_detection.py)；[SCD pipeline](https://github.com/pyannote/pyannote-audio/blob/ffe9b0b5d3b1f505acbcdfb47995f197aa10ce8b/pyannote/audio/pipeline/speaker_change_detection.py)；现行仓库OSD finetune notebook另读 | code `ffe9b0b5d3b1f505acbcdfb47995f197aa10ce8b`；旧版MIT正文已读；checkpoint、权重条款和现代环境兼容未核实。现行教程code `b749285c5cdd4636b2edc7f766f1352c8dde9369` 但内部固定安装3.1.1，需要finetune，不与旧权重混同 |
| S-DA-SylNet / P32 / DA-C04 | [作者README](https://github.com/shreyas253/SylNet/blob/master/README.md)、[run_SylNet.py](https://github.com/shreyas253/SylNet/blob/master/run_SylNet.py)；[精确输入/输出审查](../../../../../../../mnt/cloudstorfs/sjtu_home/huifei.wang/sure-tagger-plus-research/docs/research/speech-evidence-space-20261020/d_audit_acoustics.md) | 移动分支、code/checkpoint revision unknown；README有MIT式许可与引用要求，权重独立适用范围unknown。音频→整数音节数有源码依据；除窗秒数为本次建议 `[C]`，不是官方native rate |
| S-DA-torchcrepe / P33 / DA-C05 | [官方README](https://github.com/maxrmorrison/torchcrepe/blob/master/README.md) 的predict、periodicity、filter与silence例子；缓存（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_torchcrepe_README.md`） | code/checkpoint revision unknown；README MIT徽标及权重转换说明已读，LICENSE正文/权重条款未另核验；音频F0轨迹 documented，本地not_run；不自动推出独立voicing |
| S-DA-candidates / 无确认P | [BiGRU声学词数项目README](https://github.com/CodeWith-AR/Speech-Word-Count-Prediction-using-BiGRU-TensorFlow-TFLite-)；[BERP README](https://github.com/Alizeded/BERP/blob/main/README.md)、推理入口/默认配置 | 词数README blob `555d475cb9bfa7b4d1d4510ea914e772adbb5c11`，非完整code revision；代码/权重/词定义未核实。BERP code/checkpoint unknown，关键e2e/hybrid实现读取失败，无法确认RT60直接头/公式关系；README声明GPL-3.0，许可正文/权重独立条款未核实。两者均 `[H]` |
| S-DA-related / 相关与排除 | CountNet README/predict；Smart Turn README/inference；VAP README/model；SEP-28k README/树；Sylber README | CountNet最大同时人数≠整段不同人数；Smart Turn右端complete≠全段轮次；VAP未来投射≠已发生回应时延；SEP-28k三人票数≠事件次数，仓库无模型；Sylber类音节segments≠词界。固定revision和许可逐项见三个分报告 |

新增恢复的类型共6类：人数、重叠区间、说话人切换、语速值有模型/组合路径依据；词数和RT60是待核候选。原生逐人文字、VAD、C50、F0、事件类别/区间继续复用现有类型。直接观察可与派生结果核验，但同源后验、同一聚类或相同计数的再归一化不增加独立见证；单位、分母、范围和边界合同须先一致。本次有界调查未声称全网穷尽，也未证明这些路线已带来准确率提升。
