# 内容与事件派生项的直接感知审查

审查日期：2026-10-20（Asia/Shanghai）。范围为 v0.5 的 `d_text_statistics`、`d_speaker_text`、`d_event_summary`、`d_background_categories`、`d_event_timing`。本轮未运行模型，未修改 schema 或模型总表；新缓存只使用 `sources_direct_audit/content_*`。

判定原则：从冻结父观察重算的结果继续记 `d_*`；另一个模型直接读取音频产生的观察可以保留，用 producer 和证据 ID 区分。直接感知路径能复用现有 `t_*` 时，优先复用，不为每个布尔值、计数或类别过滤新增别名。不同路径不等于统计独立，也不能未经比较就给两份结果相同的数值含义。

## 1. 结论与建议映射

| 派生项 | 已核查的直接音频路径与实际输出 | 推荐映射 | 仍保留规则项 |
| --- | --- | --- | --- |
| `d_text_statistics`：重复/填充词 | SEP-28k 官方源明确 `Word Repetition`、`Sound Repetition`、`Interjection`，但发布的是 3 秒 clip 的人工多标签票数；官方仓库没有模型。另读到第三方 StutterNet 的 BiLSTM 声学分类声明，未读到具体推理接口 | 语义上可复用 `t_event[class=disfluency.word_repetition / sound_repetition / interjection]`；本轮 producer 未完成代码核实，保持 `[H]`。不恢复新的 `t_has_repetition` 别名，也不把 clip 标签写成 `t_hesitation_span` | 从文本及固定词表计算的重复次数、filler 次数、比例仍为 `d_text_statistics`；没有直接计数输出的证据，不恢复 `t_repetition_count` / `t_filler_count` / `t_filler_ratio` |
| `d_text_statistics`：词数 | 找到 BiGRU 直接音频词数回归项目 README，声称 MFCC 输入、单值回归，非先 ASR 后计数；但代码及权重未核实。SylNet/Sylber 的可靠文档目标是音节数/音节片段，不是词数 | `t_word_count` 可保留为待核实候选 `[H]`，本轮不进入已确认可用 producer。不能用音节数顶替词数 | 同一转写按 tokenizer 计数仍为 `d_text_statistics.word_count`；标点计数保持文字规则项，不新增标点音频标签 |
| `d_speaker_text` | MOSS 原生读取音频，生成 `[start][Sxx]text[end]` 的 speaker-aware 文字，不依赖另一份已冻结 ASR 文本拼接 | 复用已有 `t_text[speaker/segment]` 与原生归属；已有文档支持 `[D/C]`，无需恢复 `t_speaker_text` 类型 | 按既有归属重排拼接文字继续为 `d_speaker_text` |
| `d_event_summary` | PANNs 有 clip 类别分数，部分 DecisionLevel 模型有逐帧事件检测；DASS 有 527 类音频分类输出 | 复用 `t_event`；逐帧分数经阈值与合并得到的区间复用 `t_event_interval`。音乐、笑声、哭声等使用相应 class，不恢复同义专用类型 | 对同一完整事件时间轴取类别并集、过滤 music、计算时长比/帧比继续为 `d_event_summary`；未发现独立直接事件占比回归接口 |
| `d_background_categories` | 既有 DASS/PANNs 的原生输出是音频事件类别，当前规则再排除、映射、top-k、门控。类别名本身不能证明某声音在听觉上位于前景/背景 | 原生类别继续复用 `t_event`。真正的相对凸显/背景地位是不同语义，本轮没有确认的直接 producer，不恢复旧 `t_external_noise_type` / `t_noise_composition` 为已支持标签 | 现有类别过滤与 top-k 合同继续为 `d_background_categories`，不能把这个名字解释成已经感知了声源的前背景关系 |
| `d_event_timing` | 已查 PANNs 的直接输出是类别/帧分数，MOSS 是带时间/说话人的文字与可选事件；未确认专门从波形直接输出 `event_before_speech / during / after` 的固定关系接口 | 本轮不恢复 `t_event_during_speech` / `t_event_before_turn` / `t_event_after_turn`；若未来找到这种模型，应保留独立预测并核实端点与关系定义，不能只凭通用音频问答能力宣称支持 | 指定 event/turn 端点和区间规则下，相交、先后、邻接全部继续为 `d_event_timing` |

## 2. 重复与 filled pause：能支持什么，不能支持什么

### SEP-28k 是真实声音现象的标注证据，不是本轮已获得的推理模型

已读 官方 README 缓存（本地研究档案，未随页面发布：`sources_direct_audit/content_sep28k_readme.txt:4`）：约 28,000 个 3 秒 clip；第 9 行明确每条记录是三位标注者选定标签的人数，允许多标签共现。具体声音定义见：

- 第 12–15 行：延长、阻塞、声音/音节重复、词或短语重复。
- 第 17 行：`Interjection` 包括 `um`、`uh` 及部分人反复用作填充的 `you know` 等。
- 第 23 行：`Natural Pause` 另列，不能将普通停顿都当填充/阻塞。

因此 `WordRep=2` 表示两位标注者认可 clip 内有该类现象，**不是两次重复事件**。clip 外边界也不是事件 onset/offset。不能从它产生原生重复次数、填充词次数、filler ratio 或精确 span。`Interjection` 的词组范围也不同于一个通用 filler 词表；在对比两条路径前需对齐定义。

已读取官方递归树 content_sep28k_tree.txt（本地研究档案，未随页面发布：`sources_direct_audit/content_sep28k_tree.txt`），固定 commit 为 `fe954e110c8cb2216a0a99eb2bf77e8e6b8208ea`。文件仅有 README/LICENSE、CSV 标注和媒体 URL、下载与裁剪脚本、requirements，**没有训练/推理模型或模型权重**。不能把数据集的标签定义写成一个已经可调用的 SEP-28k producer。

第三方 StutterNet README（本地研究档案，未随页面发布：`sources_direct_audit/content_stutternet_readme_decoded.md:2`） 声称使用 BiLSTM 从 LibriStutter 识别和分类口吃；但本轮代码树请求 403，未核实输出类别、时间分辨率、推理参数、权重和本地可运行性。另一个 StutterSense 的 GitHub 搜索摘要提到 WavLM 与 soft labels，但 README 请求同样 403；搜索摘要不能替代实际接口证据。它们只留下候选，不能据此宣称已有原生 `word_repetition` clip 概率输出。

推荐把直接重复/填充观察放入既有 `t_event` 的明确 disfluency ontology。只有未来 producer 确实提供局部边界，才使用 `t_event_interval` 或现有 `t_hesitation_span` 的对应语义；不使用滑窗预测结果冒充精确 onset/offset。声学模型识别的口吃式重复也不自动等于文本规则识别的所有修辞或强调性重复，更不直接构成人物临床诊断。

## 3. 声学词数：找到了项目声明，但不能混用音节输出

BiGRU 项目 README（本地研究档案，未随页面发布：`sources_direct_audit/content_wordcount_readme_decoded.md:5`） 明确声称：音频 MFCC 特征输入、直接预测词数；第 22–24 行明确区别于完整转写后计数，第 84–92 行列出 `(200,39)` 输入和 Dense(1) 归一化词数回归。第 30–35 行写 LibriTTS dev-clean，约 5,716 条样本；第 129–143 行自报 MAE 约 5.7 词并给出非整数预测。这表明其**公开声明的任务确实是声学词数估计，不能简单归入 ASR 文本计数**。

但本轮 `train.py` 请求超时、代码树请求 403，未核实标签如何定义、代码是否实现所述回归、训练/评测划分和现成模型文件是否存在。此处只能登记 `documented claim / code unavailable / not_run`，不能认证为成熟或准确的词数 producer。尤其不能把回归的 12.86 直接当作已确认的 13 个词，也不能外推为中文分词、混合语种、重叠语音支持。

两个更明确的相邻能力应分别登记：

- SylNet README（本地研究档案，未随页面发布：`sources_direct_audit/content_sylnet_readme_api_decoded.md:41`） 说明 `.wav` 与音节计数训练/运行文件；第 47 行说明运行得到 syllable counts，第 76–79 行规定每个输入一个整数估计；第 92 行说明当前最大 91 个音节，第 99 行说明旧 TensorFlow 版本约束。**这是音节数，不是词数。** 文档支持存在直接声学计数路径，但本轮未运行。
- Sylber README（本地研究档案，未随页面发布：`sources_direct_audit/content_sylber_readme_api_decoded.md:45`） 的真实示例输出是 `segments`（起止数组）、`segment_features`、`hidden_states`；第 5 行将粒度定义为 syllable。片段数量可按固定规则计算，但不等同词数，也不能把平均 token/sec 换算为 WPM。

本轮建议：`t_word_count` 保持候选 `[H]`，等待实际代码/权重与定义核查；不以已有音节模型宣称已补齐。音节计数如另有研究需要，可单独讨论 `t_syllable_count`；这不是原 `d_text_statistics.word_count` 的恢复。

## 4. 原生逐人文字与事件观察已经有类型可复用

MOSS README（本地研究档案，未随页面发布：`sources/moss__README.md:56`） 说明联合转写与 diarization，第 60–69 行给出原生 `[start_time][Sxx]transcribed speech[end_time]` 输出。这种观察可以与“普通 ASR 后接 diarizer 再拼接”的路径对照，保存为不同 producer 的 `t_text`。不需要为了保留证据恢复一个内容相同的 `t_speaker_text` 类型。双方即使在同一段音频上有一致结果，也不代表模型错误独立。

PANNs README（本地研究档案，未随页面发布：`sources/panns__README.md:11`） 给出音频 tagging 调用，第 24–36 行示例是 Speech/Music 等类分数与 embedding；第 57–68 行明确部分 DecisionLevel 模型提供 frame-wise sound event detection。这些直接观察已经对应 `t_event` / `e_event_scores`，以及帧分数经固定规则提取的 `t_event_interval`。整段类别预测不是从另一份强事件时间轴取集合，应该保留；但对已保留同一时间轴做 Music 过滤仍是规则结果。

DASS README（本地研究档案，未随页面发布：`sources/dass__README.md:81`） 的推理示例创建 `label_dim=527` 模型并返回 `audio_output`；第 16 行定义 AudioSet 分类训练目标。它不提供“这个声音是背景”的独立角色标签，也没有在该接口中输出每类事件时长比例、物理响度组成或 speech-relative 关系。

## 5. 前景/背景与时间关系的语义边界

`d_background_categories` 的类别排除、映射、top-k 是可复现规则，但“鸟叫/音乐/车辆”属于何类，与该声音在当前混音中是否凸显，是两件事。音乐可以明显在前景，语音也可以远处持续作为环境声。不能把分类器排序概率解释成感知响度或 foreground/background 地位。

若后续确需描述这种声音差异，可以研究相对混音的 `t_event_prominence` 候选，并明确“可听凸显程度/背景角色”而非用户指定目标；本轮没有确认 producer，因此不写为已经支持，也不从现有排除表补造该值。远近感已有 `t_spatial_image`，各声源强弱已有 `t_loudness`，但它们也不能单独证明感知凸显程度。

`d_event_timing` 本身没有发现应恢复为新稳定类型的已确认路径。已有事件/发言端点充足时，before/during/after 是固定区间关系；将 PANNs/MOSS 的原生时间观察作为第二条路径有助于发现边界差异，但关系重算仍是规则。若将来有直接音频关系分类器，需要核查它是否真实输出对应端点与类别、是否依赖文本或已有检测结果；一句“音频 LLM 可以问出来”不构成 producer 验证。

## 6. 来源与核查状态

新增网络请求、失败原因、缓存文件、API README 的 blob SHA 均记录在 content_manifest.json（本地研究档案，未随页面发布：`sources_direct_audit/content_manifest.json`）。每条请求使用 `curl --connect-timeout 5 --max-time 20`；Python 进程另设 22 秒外层上限。未下载模型、未运行推理。API 返回 README 时保留原 JSON，并将 base64 正文单独解码，便于逐行引用。

| 来源 | 实际读到的材料 | 精确版本与限制 |
| --- | --- | --- |
| [SEP-28k 官方仓库](https://github.com/apple/ml-stuttering-events-dataset) | README、固定 commit 的递归树 | commit `fe954e110c8cb2216a0a99eb2bf77e8e6b8208ea`；README 为 main 抓取，与本轮 commit 查询同批；数据集 CC BY-NC 4.0，代码许可独立见仓库 LICENSE；没有已核实 producer |
| [StutterNet 第三方项目](https://github.com/kostadubovskiy/stutternet) | README | blob `e4212c4bdba9fff7e77abe01095539f9769b1457`；代码树 403；未核实权重/推理/许可 |
| [BiGRU 词数项目](https://github.com/CodeWith-AR/Speech-Word-Count-Prediction-using-BiGRU-TensorFlow-TFLite-) | README | blob `555d475cb9bfa7b4d1d4510ea914e772adbb5c11`；代码未读、评测自报、权重/许可未核实，不登记可用 producer |
| [SylNet](https://github.com/shreyas253/SylNet) | README 的输入/输出及使用协议 | blob `8e95d6cb0299f92952157f9ea7d38a8de06712e1`；README 内有 MIT 式许可；checkpoint 许可/本地运行另未核实 |
| [Sylber](https://github.com/Berkeley-Speech-Group/sylber) | README 的 Segmenter 调用与输出键 | blob `d1b1700471fd428a3c4f5fd9238b9449ebe1e493`；模型代码/权重许可未另核实；不当词数模型 |
| [MOSS](https://github.com/OpenMOSS/MOSS-Transcribe-Diarize) | 已有缓存 README 与解析器索引 | code revision `e3bdd93f8ad58418e04659818efd5fd87a0bc486`；模型准确率未新验证 |
| [PANNs](https://github.com/qiuqiangkong/audioset_tagging_cnn) | 已有缓存 README 的 tagging/SED 接口 | code revision `d2f4b8c18eab44737fcc0de1248ae21eb43f6aa4`；实际 checkpoint 版本与准确率未新验证 |
| [DASS](https://github.com/Saurabhbhati/DASS) | 已有缓存 README 的 527 类推理示例 | 当时缓存 revision 为 `unknown`，不补造 commit |

本轮是有边界的 producer 审查，不声称穷尽全网直接词数、disfluency、声音凸显或时间关系模型。不可访问的材料没有作为已读源码或已验证能力使用。
