# 语音证据空间：公开来源补充调查

调查日期：2026-10-20。本文补充目标说话人转写/分离、非言语发声、情绪、韵律、音频检索、数据集和指标。主要本地生产者、公开 schema 冲突与历史实验由本目录其余研究文档负责。本文未修改公开 schema，未下载权重，未运行模型。

`SUP-C*` 是能力声明 ID，`SUP-T*` 是建议的研究语义类型，均属于本补充文档的局部命名空间；不是新增公共 JSON 字段。下列性能数值均为来源所报告，不能当作本地测量。`documented` 表示文档支持，`code_supported` 表示读取代码支持接口/路径；二者都不意味着目标数据准确率已验证。全部新增候选的 `local_validation=not_run`。

## 1. 对当前设计最有用的结论

1. **针对重叠语音，可以比较不同证据路径。** 现有 ASR + diarization + 时间交集归属之外，DiCoW 将 diarization 概率直接条件化 ASR；SE-DiCoW 再用自选 enrollment 解决 overlap 歧义。它们有望改变原始文字候选，而不只是重分已有文本，但仍依赖 diarizer，不能当作第二条独立 speaker timeline。见 `SUP-C01–03`。
2. **非言语、情绪、韵律应分别存储。** SenseVoice 的 laughter/coughing 等事件 tag、emotion2vec+ 的情绪类别分数、openSMILE 的声学量具有不同语义。事件不等于情绪，F0/响度也不能确定推出情绪。它们适合作为条件性扩展，先保留窗口、speaker、缺失和校准含义，不能由整段标签补造精确 onset/offset。见 `SUP-C04–08`。
3. **“某模型有没有时间戳”必须绑定版本和路径。** 当前 SenseVoice 仓库已有 `output_timestamp=True`；实际代码用同一次编码得到的 CTC 分数，对已解码 token 做 forced alignment，再投影为 `words` 对齐的毫秒边界。这是同源条件对齐，不是独立识别见证，也没有因此得到事件时间戳。见 `SUP-C05`。
4. **检索相似度应保留为检索证据。** CLAP 给音频/文本 embedding，示例以点积排序；它不直接给经过校准的事件存在概率，更不直接给时间位置。可用于召回候选窗口，再由专用模型复核。见 `SUP-C09`。
5. **评测要同时保留内容、身份和定位。** MeetEval 提供 cpWER/tcpWER 等，dscore 提供 DER/JER 与 UEM。当前 chronological WER 只评价排序后的文本，不能替代时间约束 WER 或绝对边界误差。事件分类亦不能替代事件定位评测。见 `SUP-C10–12`。

## 2. 新增候选与能力边界

| 声明 | producer → 建议语义 | 原生/派生路径、约束与来源 | 上游支持 / 本地状态 | 选择与理由 |
|---|---|---|---|---|
| SUP-C01 | DiCoW → SUP-T01 `target_speaker_transcript` | 官方 TS-ASR README：输入 frame-level diarization probabilities，转换为 Silence–Target–Non-Target–Overlap（STNO）mask，经 FDDT 注入 encoder layers；目标身份由条件给定，不是无条件识别人名。ts_asr README（本地研究档案，未随页面发布：`sources_supplement/ts_asr__README.md`） | documented / not_run | conditional：针对现有 overlap 错词和错误归属，提供替代文字生产路径；需固定相同 timeline 比较。 |
| SUP-C02 | SE-DiCoW → SUP-T01 + SUP-T02 `target_enrollment` | 官方 README：从 diarizer 预测目标最活跃区间自动选择 enrollment，通过 encoder cross-attention 条件化。enrollment 依赖预测 timeline，错误目标/污染属于需检验风险；README 的 robustness 表述只是上游声明。ts_asr README（本地研究档案，未随页面发布：`sources_supplement/ts_asr__README.md`） | documented / not_run | conditional：为 overlap 提供互补的目标声纹/声学线索。不能从自身选择 enrollment 推出已知人物身份。 |
| SUP-C03 | DiCoW demo → SUP-T01 | 当前 `inference.py` 默认 `BUT-FIT/DiCoW_v3_2` + `BUT-FIT/diarizen-wavlm-large-s80-md`，加载两模型并组合 `DiCoWPipeline`；代码存在不证明本地 runtime 兼容。不能把训练仓库默认 se_dicow 分支的全部能力自动归给 demo 默认 checkpoint。inference.py（本地研究档案，未随页面发布：`sources_supplement/dicow__inference.py`） | code_supported / not_run | conditional：适合低量相同样本替代实验；checkpoint 权重 hash 尚 unknown。 |
| SUP-C04 | SenseVoiceSmall → SUP-T03 `nonverbal_event_candidate`、SUP-T04 `affect_distribution_or_tag` | 发布 checkpoint 覆盖 zh/yue/en/ja/ko ASR/LID，加 emotion/event tags；README 列 bgm、applause、laughter、crying、coughing、sneezing。不要把 broader SenseVoice 的 50+ language 声明转移给 Small；speaker diarization 由独立 FSMN-VAD/CAM++ 等组成。README（本地研究档案，未随页面发布：`sources_supplement/sensevoice__README.md`） | documented / not_run | conditional：填非言语发声/情绪初步候选；本次未证实精确 event onset/offset、多 speaker event 归属或 overlap 稳健性。 |
| SUP-C05 | SenseVoice `model.py` → SUP-T05 `aligned_lexical_units` | `inference` 先 CTC argmax/去 blank 解码；`output_timestamp` 分支把解码文本重编码，使用同一 encoder 的 CTC logits 做 `ctc_forced_align`；`post` 转为与 words 一一对应的 `[start_ms,end_ms]`。长音频分窗 offset 是窗口边界，不是自动词时间。代码（本地研究档案，未随页面发布：`sources_supplement/sensevoice__model.py`） | code_supported / not_run | conditional 替代 aligner：必须绑定代码 SHA 与 output_timestamp 配置。对齐继承识别错误，不算第二票 ASR 正确性证据。 |
| SUP-C06 | emotion2vec+ seed/base/large → SUP-T04 | 官方示例返回 `labels/scores`，可选 `feats`；9 类 angry/disgusted/fearful/happy/neutral/other/sad/surprised/unknown。base 约 90M、large 约 300M 是 README 声明。默认示例 `granularity=utterance`；分数校准本次 unknown。README（本地研究档案，未随页面发布：`sources_supplement/emotion2vec__README.md`） | documented / not_run | conditional：情绪任务才调用；保留全类别分数和 ontology，`other/unknown` 类别不能直接等同工具失败。 |
| SUP-C07 | emotion2vec base representation → SUP-T06 `affect_embedding` | 原始 emotion2vec 与 emotion2vec+ 分类 checkpoint 不同：base 例子给 utterance `[768]` 或 frame `[T,768]` features；README 的已抽取帧特征为 50 Hz，utterance 特征为帧均值。不能把每帧 representation 当每帧情绪标签。README（本地研究档案，未随页面发布：`sources_supplement/emotion2vec__README.md`） | documented / not_run | deferred：当前解释型 evidence 接口优先有语义标签；embedding 仅为明确下游训练/检索需求而保留。 |
| SUP-C08 | openSMILE eGeMAPSv02 → SUP-T07 `prosodic_acoustic_series` | 已读 eGeMAPSv02 配置组合 low-level descriptors 与 functionals，含 F0/loudness、voiced/unvoiced、temporal sets。信号特征 extraction 与声学估计规则有确定实现，情绪/重音/交互解释需要另行学习或推断。配置（本地研究档案，未随页面发布：`sources_supplement/opensmile__config__egemaps__v02__eGeMAPSv02.conf`） | code_supported / not_run | conditional：用于韵律/表达方式任务；需记录 voicing mask、Hz/dB 等单位、窗口和 speaker crop，避免整段画像掩盖局部变化。 |
| SUP-C09 | LAION CLAP → SUP-T08 `audio_text_similarity` | `get_audio_embedding*`、`get_text_embedding`；文件加载重采样 48 kHz，hook 构造 480000-sample 输入。README 区分非 fusion 短音频和 fusion variable-length checkpoint；示例以 audio/text embedding 点积排名，不能当校准概率。README（本地研究档案，未随页面发布：`sources_supplement/clap__README.md`）、hook.py（本地研究档案，未随页面发布：`sources_supplement/clap__src__laion_clap__hook.py`） | code_supported / not_run | conditional：音频文本检索、候选窗口召回；窗口扫描得到的定位是外部策略，非 checkpoint 原生事件边界。 |
| SUP-C10 | MeetEval → 对 SUP-T01/SUP-T05 的独立 scorer | 支持 cpWER/tcpWER、ORC/tcORC、MIMO/tcMIMO、DI-cpWER、DER wrapper；SegLST 要求的字段按 metric 而定：session_id/words，加 speaker 与 start/end。支持 alignment HTML。README（本地研究档案，未随页面发布：`sources_supplement/meeteval__README.md`） | documented / not_run | core validation：将现有 sidecar 投影为 SegLST，可核查自有 scorer；不改既有 public schema。 |
| SUP-C11 | dscore → speaker activity 评测 | RTTM + 可选 UEM；默认 DER 0 ms collar、包含 overlap；JER 按参考 speaker 平均，有些额外未匹配输出的惩罚与 DER 不同。参数改变应另报告。README（本地研究档案，未随页面发布：`sources_supplement/dscore__README.md`） | documented / not_run | core validation：DER 的 confusion/miss/false alarm 与 JER 单列；count/ratio 的正确不能证明 timeline 正确。 |
| SUP-C12 | PSDS → SUP-T03 时间定位评测 | 输入 `filename,onset,offset,event_label` 与 duration；多 operating points，DTC/GTC/CTTC、cross-trigger 和跨类权重。已读缓存来自作者 fork `turpaultn/psds_eval`，README 指向旧 `audioanalytic/psds_eval`，本次后者 404。README（本地研究档案，未随页面发布：`sources_supplement/psds__README.md`） | documented / not_run | conditional validation：只有强时间标签才评分；需保留 threshold 前分数，不能用整段 Top-K 类别直接计算 PSDS。 |
| SUP-C13 | WeSep v0.1 → 目标说话人 waveform extraction | 当前 README 定义 speaker/spatial/visual/textual cue TSE，包含训练和数据 recipe；明确 official pretrained models、local-model CLI 尚 under validation/coming soon，生产部署不支持。README（本地研究档案，未随页面发布：`sources_supplement/wesep__README.md`） | documented / not_run | deferred：是训练研究路线，不能作为随时可接入的已验证 checkpoint。未来输出应登记新 audio view/transform，不能把分离音频冒充原始音频。 |

所有 `SUP-T*` 的观察都至少需要 sample hash、原音频时间坐标、window、speaker scope、producer revision、父 evidence、status 和 confidence meaning。情绪分数、CLAP similarity、ASR token probability 的数值不可直接平均；跨模型误差相关性本次没有测量，统一为 unknown。

## 3. schema 建议、删减论证与替代实验

**保留时间关系作为核心。** 一个 speaker activity interval set 可投影为人数、重叠区间、比例、change count 等视图。反过来仅保存人数与比例无法回答“谁和谁在什么时候重叠”；因此删去 timeline 会损失明确任务覆盖。是否把所有投影都持久化，应由公共查询合同决定，不把确定性别名计为新的独立感知类型。

**按任务调用条件性标签。** 针对字幕与逐人转写，情绪、CLAP 与 eGeMAPS 可以先删除，不影响任务所需的文字/归属语义；这是待测的覆盖假设，需在固定下游任务上消融验证。针对“查找笑声位置”，则需要 `SUP-T03` 的时间范围和有效负样本，只有整段 ASR 与情绪 tag 不足。针对“谁表现得犹豫”，还需要填充词/停顿/韵律及任务定义，不能用 emotion 的 unknown/neutral 类替代。

**替代路径 A：** 固定同一 diarizer 输出与同一音频，比较当前 ASR + alignment + assignment 和 DiCoW 条件 ASR；衡量 overlap cpWER/cpCER、非 overlap 内容退化、漏词/串人、固定目标 WER。DiCoW 的目标和 timeline 必须来自预测 evidence，不能用 GT enrollment 混入端到端主结果。

**替代路径 B：** 对同一 ASR 文本比较已有 forced aligner 和 SenseVoice 自源 CTC 对齐的词边界，须注意两者文本一般不同，若不同文本则必须先区分“文字质量变化”与“共同正确词的边界变化”。一个模型顺带产生多 tag 的成本按同次调用计，不按 tag 数重复加总。

**互补路径 C：** CLAP 召回短窗 → SenseVoice/AED 或强 SED 定向复核 → 对 speaker 已知的单人干净 crop 补 emotion2vec/openSMILE。该链条只是研究候选；检索召回失败、crop 污染、时间映射错误均可能丢失证据，应保留父窗口与失败原因。感知链越长并不自动更可靠。

尚未覆盖：目标不存在/错误 enrollment 的可靠拒绝、真实多人 overlap 的非言语归属、逐词 code-switch LID、speaker-specific 连续情绪 GT、具有明确任务标签的 interruption/backchannel、开放世界事件的可靠负结论。需要单独任务合同和数据，不能由本次文献调查声称解决。

## 4. 数据集与评测选择

| 数据/来源 | 实际读取的依据与边界 | 本项目用途与指标 |
|---|---|---|
| AMI 本地冻结数据 | 已读本项目 `docs/evaluation/ASR评分标准_逐说话人与时间顺序.md` 与 302 条 timeline replay 报告；本次 AMI 官网连接超时。该本地证据不等于已复现新模型。 | 优先已有逐人/词时间 GT，保留 cpWER/cpCER、DER/JER、boundary error、时间覆盖率、失败率。固定评分 mask，不能因预测缺失缩分母。 |
| VoxConverse v0.3 | 官方 README 明示修复部分 test RTTM；多 speaker YouTube，包含辩论/新闻以提供 overlap。数据声明 CC BY 4.0，原视频权利保留。README（本地研究档案，未随页面发布：`sources_supplement/voxconverse__README.md`） | 会议外 diarization/overlap track；冻结 v0.3 与注释 hash。RTTM 不提供逐词 transcript，不可直接用于 ASR GT。 |
| AliMeeting | 官方 baseline 有独立 ASR/CER 与 diarization/DER track；代码许可不等于 OpenSLR 数据许可。OpenSLR 本次访问失败。README（本地研究档案，未随页面发布：`sources_supplement/alimeeting__README.md`） | 中文会议扩展，分别报 CER、DER；需先核验数据/划分许可和本地可用性，不在本次下载。 |
| DIHARD III | 已读官方 baseline README：Track 1 reference SAD，Track 2 system SAD，RTTM + dscore，数据经 LDC 获取；此项 README 曾实际读取，固定 commit 与成功缓存本次未完成。 | 用 reference SAD 作分离 VAD/聚类的诊断；主结果采用端到端 track，不能把 oracle 条件结果并入同一排名。 |
| DESED + MAESTRO | DCASE 2024 Task 4 README：strong/weak/unlabeled 与 soft strong labels 混合，不同类别标注不全；对缺标类别做 masking。README（本地研究档案，未随页面发布：`sources_supplement/dcase__recipes__dcase2024_task4_baseline__README.md`） | 支持 schema 的 missingness 合同：未标注≠negative。强标样本用于 PSDS/事件边界，弱标样本仅支持 clip presence；必须独立 mask。 |
| AudioSet ontology | 稳定 id/name/description/child_ids/restrictions；abstract 类没有直接标注例子，blacklist 表示排除/难标。README（本地研究档案，未随页面发布：`sources_supplement/audioset__README.md`）、ontology（本地研究档案，未随页面发布：`sources_supplement/audioset__ontology.json`） | 用 ontology ID + version 对齐事件名；祖先传播为规则派生，不能充当新的独立票。 |
| EmoBox | 官方 README 汇总 32 dataset、14 languages，含 intra-corpus/cross-corpus；有些数据需许可/注册；label_map 需要冻结；提供 WA、UA、micro/macro F1、confusion。README（本地研究档案，未随页面发布：`sources_supplement/emobox__source.md`） | 情绪验证应分语言与语料域；先选四类公共映射并保留 unknown/other，WA + UA + macro F1，不能只选表演性语料宣称真实对话可用。EmoBox 代码 badge MIT 不代表全部音频同许可。 |
| CASIA/RAVDESS 的 SenseVoice evaluator | 官方 SER contract 使用 raw emotion tag，WA 为 accuracy，UA 为 manifest 中存在标签的平均 recall；缺 tag/非法 manifest 不静默跳过。说明（本地研究档案，未随页面发布：`sources_supplement/sensevoice_ser_eval__source.md`） | raw tag 与格式化文本分别保存；复现时冻结标签映射、manifest、版本。70.0 UA/WA 是官方 CASIA 六类协议的上游报告，不是本次测量。 |
| AudioCaps/Clotho（CLAP README 所述） | CLAP checkpoint 选择指标为两个数据集的 A→T/T→A mAP@10 四项均值；本次未打开两数据集原始许可/协议。 | 检索只作候选：Recall@K/mAP/任务答复命中率分开。不能把检索指标转换为 AED F1 或真实事件概率。 |

## 5. 有界验证计划

以下均为 `planned`；没有模型运行或能力 pass 结论。先复用本地短样本与冻结 reference，不启动全 GPU benchmark。

| Probe | 固定输入与比较 | 指标/停止条件 | 资源与未解决问题 |
|---|---|---|---|
| SUP-V01 scorer 交叉核验 | 从现有 AMI sidecar 选 10–20 条，含 overlap、漏人、未归属与缺时间，投影 SegLST/RTTM；本地 scorer vs MeetEval/dscore | 相同规范化和 mask 时 cp errors/N 应一致；DER 明报 collar/UEM/overlap；不一致先定位协议差异再扩大 | CPU；工具版本、空预测和 unassigned 口径需锁定。 |
| SUP-V02 diarization-conditioned ASR | 20 条 overlap + 20 条 matched non-overlap，固定预测 timeline，现有组合 vs pinned DiCoW；独立保留目标条件 | cpWER/cpCER、固定目标 WER、串人词率、非 overlap 退化；不以平均增益遮盖关键子集失效 | GPU 资源估计 unknown，先 2 条 smoke 决定可执行性；不得从 README 推断显存。 |
| SUP-V03 非言语事件 | 有现成合法 GT 时选 laughter/cough/applause/crying + 相似负例；对齐等长窗口；SenseVoice vs 当前 AED | class-wise precision/recall/F1、unknown、短事件漏检；只有强标 GT 才评 onset/offset | 不自动下载新语料；当前缺少本地核验过的 speaker 归属 GT。 |
| SUP-V04 affect/prosody | 单说话人短窗，跨两种语言/两种语料域；SenseVoice raw tags vs emotion2vec+，openSMILE 仅作解释变量 | WA/UA/macro F1、置信校准/拒答、标签映射冲突；共同 checkpoint/training 依赖未知，不称独立投票 | 无现成 GT 则需人工标注协议；“声学情绪类别”不等于人物心理状态事实。 |
| SUP-V05 检索候选价值 | 固定 20 个 query 与有 GT 的短音频库；CLAP 窗口召回 vs 现有事件标签筛选 | Recall@K、mAP、下游复核后正确率、窗口数量/延迟；冻结 prompt 和候选负例 | checkpoint/tokenizer/window/文本 prompt 决定结果；相似度未校准。 |
| SUP-V06 最小集消融 | 当前核心集；删除 affect/prosody/retrieval；删除 timeline；用 DiCoW 替换 ASR+assignment | 分任务 coverage/任务答案与成本；记录对组合删除的变化，不能只按单 tag 贪心 | 必须先冻结任务权重/指标；得到候选紧凑集，不声称全局最小。 |

## 6. 许可证与可用性

| 组件 | 代码许可：读取到的证据 | 权重/数据许可：已知与 unknown |
|---|---|---|
| SenseVoice | LICENSE：MIT | 镜像模型卡 `license: other`，指向 FunASR MODEL_LICENSE；已读官方 pinned v1.1。官方 README 转述维护者澄清允许依约商用/私有微调，澄清 issue 本次未单独打开。不能把 code MIT 当权重 MIT。 |
| emotion2vec | README badge MIT；LICENSE/LICENSE.md/LICENSE.txt 均未取得正文 | 镜像 emotion2vec_plus_base card：`license: other/model-license`，链接只到 FunASR 仓库，权重具体适用文本仍 unknown。不能直接沿用 SenseVoice 的澄清。 |
| openSMILE | LICENSE：audEERING Research License；允许非商业及限定研究，商业产品及相关 feature/model use 需另许可 | 本调查使用特征工具，无新增 checkpoint；第三方组件另有 terms。 |
| CLAP | LICENSE 正文 CC0 1.0 | 镜像 `lukewys/laion_clap` card 标 CC0 1.0；checkpoint revision/hash 未核验。训练音频不随模型/代码许可开放，README 明说因版权不直接分发全部训练集。 |
| DiCoW/TS-ASR | Apache 2.0 | DiCoW README 明示自身模型 CC BY 4.0，DiariZen 权重 CC BY-NC 4.0。整条默认 pipeline 必须分别记录两者；本次未核验 HF checkpoint-specific card/hash。 |
| WeSep | Apache 2.0，third-party notices 另列 | 当前官方可下载预训练包 coming soon，不能以公开代码推断权重可用。 |
| DiariZen | MIT | MODEL_LICENSE / README：CC BY-NC 4.0；本地部署同 code SHA 不代表本次验证了运行。 |
| MeetEval / PSDS / DCASE / BEATs / FunASR / Silero / MFA | 已缓存 LICENSE：MIT | BEATs checkpoint 独立许可、Silero bundled weights 独立适用范围、MFA acoustic models 未另核验；DCASE dataset 许可分别查。 |
| dscore / WhisperX | LICENSE：BSD-2-Clause | 各调用模型/数据许可不由 wrapper 许可覆盖。 |
| VoxConverse / AudioSet ontology / AliMeeting | VoxConverse README 数据 CC BY 4.0；ontology README CC BY-SA 4.0；AliMeeting README code Apache 2.0 | 原视频权利、AudioSet 音频和 AliMeeting 数据许可不能从以上文本推断。AliMeeting 独立 LICENSE URL 本次 404，保留 README 声明级别。 |

## 7. 访问限制与检索边界

检索词覆盖 `SenseVoice`、`emotion2vec`、`DiCoW`、`TS-ASR`、`target speaker extraction`、`voxconverse`、`DESED`、`psds_eval`、`DIHARD3` 等；先用 GitHub repository search 发现，再读取官方 README、相关代码和许可。不是穷尽调查。未展开所有情绪模型、全部 separator 或所有 2026 新模型。

- GitHub API 初期可用，后出现 HTTP 403 rate limit。对前阶段已取得 SHA 的仓库，改用相同 SHA 的 raw 文件缓存；manifest 保存失败和补取来源，不使用猜测 SHA。
- GitHub HTML、HF 直连、arXiv/OpenSLR/AMI 官网多次超时；可用 GitHub raw 内容才计为实际读取。相关论文链接/DOI 是官方仓库提供的索引，**未把论文全文记为已读**。
- HF 三份 card 通过 **第三方 `hf-mirror.com`** 取得。canonical model URL 与实际 mirror URL 都在 manifest，revision 为 unknown；缓存 SHA-256 只说明本次文本字节，不能冒充模型 revision/checkpoint hash。
- `audioanalytic/psds_eval` 官方旧 URL 本次 404；使用先前实际读取、可访问的作者 fork `turpaultn/psds_eval`，声明来源级别，未把 fork 说成仍存在的 canonical repo。
- 有些 raw URL 首次超时后补取成功（例如 SenseVoice SER README）；manifest 分别保存尝试结果。下载成功的 README 不等于运行成功，README 链接的模型也没有被下载。

缓存清单、URL、revision、访问状态和 SHA-256 见 sources_supplement/manifest.json（本地研究档案，未随页面发布：`sources_supplement/manifest.json`）。以下 ledger 自动从本次缓存元数据列出；正文能力只引用实际读取的对应段落。

<!-- SOURCE_LEDGER -->

| source_id | canonical / 实际读取入口 | code/checkpoint revision | 缓存与状态 |
|---|---|---|---|
| sensevoice | [https://github.com/QwenAudio/SenseVoice](https://github.com/QwenAudio/SenseVoice) | `586bbdb2b052f4fe19322581825228b6810a9fb3` | sensevoice__README.md（本地研究档案，未随页面发布：`sources_supplement/sensevoice__README.md`）、sensevoice__LICENSE（本地研究档案，未随页面发布：`sources_supplement/sensevoice__LICENSE`）、sensevoice__model.py（本地研究档案，未随页面发布：`sources_supplement/sensevoice__model.py`）；另有 1 次 unavailable，见 manifest |
| emotion2vec | [https://github.com/ddlBoJack/emotion2vec](https://github.com/ddlBoJack/emotion2vec) | `a0e606c668227ab0c01527e196a4acc42b1efad9` | emotion2vec__README.md（本地研究档案，未随页面发布：`sources_supplement/emotion2vec__README.md`）；另有 3 次 unavailable，见 manifest |
| opensmile | [https://github.com/audeering/opensmile](https://github.com/audeering/opensmile) | `055dda577c82383f8239663e5ac6c58d25b504db` | opensmile__README.md（本地研究档案，未随页面发布：`sources_supplement/opensmile__README.md`）、opensmile__LICENSE（本地研究档案，未随页面发布：`sources_supplement/opensmile__LICENSE`）、opensmile__config__egemaps__v02__eGeMAPSv02.conf（本地研究档案，未随页面发布：`sources_supplement/opensmile__config__egemaps__v02__eGeMAPSv02.conf`） |
| clap | [https://github.com/LAION-AI/CLAP](https://github.com/LAION-AI/CLAP) | `1fd4c37df5ffbfcfbad5415c170bc66cf94c9994` | clap__README.md（本地研究档案，未随页面发布：`sources_supplement/clap__README.md`）、clap__LICENSE（本地研究档案，未随页面发布：`sources_supplement/clap__LICENSE`）、clap__src__laion_clap__hook.py（本地研究档案，未随页面发布：`sources_supplement/clap__src__laion_clap__hook.py`） |
| dicow | [https://github.com/BUTSpeechFIT/DiCoW](https://github.com/BUTSpeechFIT/DiCoW) | `801e2130d00142a7da5845754f87b97550053a75` | dicow__README.md（本地研究档案，未随页面发布：`sources_supplement/dicow__README.md`）、dicow__LICENSE（本地研究档案，未随页面发布：`sources_supplement/dicow__LICENSE`）、dicow__inference.py（本地研究档案，未随页面发布：`sources_supplement/dicow__inference.py`） |
| ts_asr | [https://github.com/BUTSpeechFIT/TS-ASR-Whisper](https://github.com/BUTSpeechFIT/TS-ASR-Whisper) | `4f100c039dd14e4a329afb9e5159eba70bd634aa` | ts_asr__README.md（本地研究档案，未随页面发布：`sources_supplement/ts_asr__README.md`）、ts_asr__LICENSE（本地研究档案，未随页面发布：`sources_supplement/ts_asr__LICENSE`） |
| wesep | [https://github.com/wenet-e2e/wesep](https://github.com/wenet-e2e/wesep) | `dc11cb18ee8636064a7851f38b9348143c343cdc` | wesep__README.md（本地研究档案，未随页面发布：`sources_supplement/wesep__README.md`）、wesep__LICENSE（本地研究档案，未随页面发布：`sources_supplement/wesep__LICENSE`） |
| meeteval | [https://github.com/fgnt/meeteval](https://github.com/fgnt/meeteval) | `bd4e1a878dcd40ead241e0e55466315405f85bde` | meeteval__README.md（本地研究档案，未随页面发布：`sources_supplement/meeteval__README.md`）、meeteval__LICENSE（本地研究档案，未随页面发布：`sources_supplement/meeteval__LICENSE`） |
| dscore | [https://github.com/nryant/dscore](https://github.com/nryant/dscore) | `e02f949ac6592279300a2c33d03daf9e0c12fd27` | dscore__README.md（本地研究档案，未随页面发布：`sources_supplement/dscore__README.md`）、dscore__LICENSE（本地研究档案，未随页面发布：`sources_supplement/dscore__LICENSE`） |
| diarizen | [https://github.com/BUTSpeechFIT/DiariZen](https://github.com/BUTSpeechFIT/DiariZen) | `844f5555b0a98acd0931511fc641a8c5b8ba92c7` | diarizen__README.md（本地研究档案，未随页面发布：`sources_supplement/diarizen__README.md`）、diarizen__LICENSE（本地研究档案，未随页面发布：`sources_supplement/diarizen__LICENSE`）、diarizen__MODEL_LICENSE（本地研究档案，未随页面发布：`sources_supplement/diarizen__MODEL_LICENSE`） |
| voxconverse | [https://github.com/joonson/voxconverse](https://github.com/joonson/voxconverse) | `24bf60be297701cd7e4ef18550c6d390c1b87365` | voxconverse__README.md（本地研究档案，未随页面发布：`sources_supplement/voxconverse__README.md`）；另有 1 次 unavailable，见 manifest |
| dcase | [https://github.com/DCASE-REPO/DESED_task](https://github.com/DCASE-REPO/DESED_task) | `c6bcb45b8b986ccde5c56bb86eefaf9d19b2320c` | dcase__recipes__dcase2024_task4_baseline__README.md（本地研究档案，未随页面发布：`sources_supplement/dcase__recipes__dcase2024_task4_baseline__README.md`）、dcase__LICENSE（本地研究档案，未随页面发布：`sources_supplement/dcase__LICENSE`） |
| psds | [https://github.com/turpaultn/psds_eval](https://github.com/turpaultn/psds_eval) | `f1b970d4ed965e90e0ac17028790b413e474373f` | psds__README.md（本地研究档案，未随页面发布：`sources_supplement/psds__README.md`）、psds__LICENSE（本地研究档案，未随页面发布：`sources_supplement/psds__LICENSE`） |
| audioset | [https://github.com/audioset/ontology](https://github.com/audioset/ontology) | `d417d32bf59c711abb5910fd2f76a0eb44697991` | audioset__README.md（本地研究档案，未随页面发布：`sources_supplement/audioset__README.md`）、audioset__ontology.json（本地研究档案，未随页面发布：`sources_supplement/audioset__ontology.json`） |
| beats | [https://github.com/microsoft/unilm](https://github.com/microsoft/unilm) | `31c5b904ca1bf2afb4c234a6675c683a4e5fc7cd` | beats__beats__README.md（本地研究档案，未随页面发布：`sources_supplement/beats__beats__README.md`）、beats__LICENSE（本地研究档案，未随页面发布：`sources_supplement/beats__LICENSE`） |
| funasr | [https://github.com/modelscope/FunASR](https://github.com/modelscope/FunASR) | `879a219c717123fdec6024e8e56c734a7aace2ff` | funasr__README.md（本地研究档案，未随页面发布：`sources_supplement/funasr__README.md`）、funasr__LICENSE（本地研究档案，未随页面发布：`sources_supplement/funasr__LICENSE`） |
| whisperx | [https://github.com/m-bain/whisperX](https://github.com/m-bain/whisperX) | `db8fde4d31a3e7f49fe5835938685a76f5ba5477` | whisperx__README.md（本地研究档案，未随页面发布：`sources_supplement/whisperx__README.md`）、whisperx__LICENSE（本地研究档案，未随页面发布：`sources_supplement/whisperx__LICENSE`） |
| silero | [https://github.com/snakers4/silero-vad](https://github.com/snakers4/silero-vad) | `1e261b036686cd0017d500ee96acd1c4ba572a9d` | silero__README.md（本地研究档案，未随页面发布：`sources_supplement/silero__README.md`）、silero__LICENSE（本地研究档案，未随页面发布：`sources_supplement/silero__LICENSE`） |
| mfa | [https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner](https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner) | `93411fc0df3bc770dfd34c4282dc136fdf6e8dcb` | mfa__README.md（本地研究档案，未随页面发布：`sources_supplement/mfa__README.md`）、mfa__LICENSE（本地研究档案，未随页面发布：`sources_supplement/mfa__LICENSE`） |
| alimeeting | [https://github.com/yufan-aslp/AliMeeting](https://github.com/yufan-aslp/AliMeeting) | `692a034fd510f1720f547c2c91e0fbadc9c24bf2` | alimeeting__README.md（本地研究档案，未随页面发布：`sources_supplement/alimeeting__README.md`）；另有 1 次 unavailable，见 manifest |
| dihard3 | [https://github.com/dihardchallenge/dihard3_baseline](https://github.com/dihardchallenge/dihard3_baseline) | `unknown` | unavailable（此前 DIHARD README 在会话中读到，但未冻结缓存） |
| sensevoice_hf_mirror | [https://huggingface.co/FunAudioLLM/SenseVoiceSmall](https://huggingface.co/FunAudioLLM/SenseVoiceSmall) | `unknown` | sensevoice_hf_mirror__README.md（本地研究档案，未随页面发布：`sources_supplement/sensevoice_hf_mirror__README.md`）；第三方镜像 |
| emotion2vec_hf_mirror | [https://huggingface.co/emotion2vec/emotion2vec_plus_base](https://huggingface.co/emotion2vec/emotion2vec_plus_base) | `unknown` | emotion2vec_hf_mirror__README.md（本地研究档案，未随页面发布：`sources_supplement/emotion2vec_hf_mirror__README.md`）；第三方镜像 |
| clap_hf_mirror | [https://huggingface.co/lukewys/laion_clap](https://huggingface.co/lukewys/laion_clap) | `unknown` | clap_hf_mirror__README.md（本地研究档案，未随页面发布：`sources_supplement/clap_hf_mirror__README.md`）；第三方镜像 |
| sensevoice_ser_eval | [https://raw.githubusercontent.com/QwenAudio/SenseVoice/586bbdb2b052f4fe19322581825228b6810a9fb3/benchmarks/ser/README.md](https://raw.githubusercontent.com/QwenAudio/SenseVoice/586bbdb2b052f4fe19322581825228b6810a9fb3/benchmarks/ser/README.md) | `586bbdb2b052f4fe19322581825228b6810a9fb3` | sensevoice_ser_eval__source.md（本地研究档案，未随页面发布：`sources_supplement/sensevoice_ser_eval__source.md`） |
| emobox | [https://raw.githubusercontent.com/emo-box/EmoBox/main/README.md](https://raw.githubusercontent.com/emo-box/EmoBox/main/README.md) | `unknown` | emobox__source.md（本地研究档案，未随页面发布：`sources_supplement/emobox__source.md`） |
| sensevoice_model_license | [https://raw.githubusercontent.com/modelscope/FunASR/58830eca4012644aac0c3218c3ccc7d98f003fda/MODEL_LICENSE](https://raw.githubusercontent.com/modelscope/FunASR/58830eca4012644aac0c3218c3ccc7d98f003fda/MODEL_LICENSE) | `58830eca4012644aac0c3218c3ccc7d98f003fda` | sensevoice_model_license__source.md（本地研究档案，未随页面发布：`sources_supplement/sensevoice_model_license__source.md`） |
