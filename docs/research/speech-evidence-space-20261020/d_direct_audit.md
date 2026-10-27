# `d_*` 的直接音频感知路径审查

日期：2026-10-20。逐项核对 v0.5 第4.8节的全部 **15个 `d_*`**，据此更新 v0.6 schema 与模型总表。本轮实际读取模型文档、任务/推理源码及已有缓存；没有下载权重或运行新模型。分项来源见[人数与时间结构](d_audit_speaker_temporal.md)、[声学量](d_audit_acoustics.md)、[内容与事件](d_audit_content_events.md)。

## 1. 修正后的判断

**能从其他标签推导，不代表不能直接感知。** `t_*` 定义一种声音属性，`d_*` 定义由已接受观察计算它的路径。直接音频模型得到的新观察与派生结果可以并存、比较和保留冲突。类型数不等于独立信息维数；不同来源也不自动意味着错误独立。

例如，活动区间求交得到 `d_overlap`，专用重叠检测模型得到 `t_overlap_interval`，两者都描述重叠。前者继承 diarizer 的错误，后者可以提供另一条观察；若所谓“OSD接口”只是读取同一份说话人后验再求人数，则仍为同源计算。

审查区分三种支持：有实际模型/算法源码支持；已有类型能够承接直接观察；只读到公开任务声明或尚缺关键源码的候选。最后一类明确保留 `[H]`，不写为可用 producer。`[C]` 音频组合路径也可引入新观察，但必须展开模型输出与固定后处理，不能冒称原生回归头。

## 2. 全部15项的结论

| `d_*` | 能否有音频感知路径；本轮证据 | `t_*` 处理 | 继续属于该 `d_*` 的内容 |
| --- | --- | --- | --- |
| `d_text_statistics` | **部分、候选**：BiGRU项目声明直接声学词数回归，代码/权重未核实；重复/填充语有声学标注与分类研究，精确次数未确认 | 恢复 `t_word_count` 候选 `[H]`；重复/填充语类别复用 `t_event`，新增专用producer仍待核。不能把SEP-28k人工票数当事件次数 | 指定原文的tokenizer计数、标点、重复/filler次数与比例 |
| `d_speaker_summary` | **有组合路径**：SpeechBrain声纹与自动谱聚类在最终timeline之前估簇数；不依赖当前已保存的活动区间 | 恢复 `t_speaker_count` `[C]`；CountNet窗口最大同时人数与整段不同人数不匹配，不能直接替代 | 同一时间轴的不同ID计数；从选定count计算present/multi |
| `d_speaker_text` | **有，已覆盖**：MOSS原生带说话人文字；目标说话人ASR是另一音频条件路径 | 复用 `t_text[speaker]` 和 `t_unit_speaker` | 已知文字按已接受归属排序、拼接 |
| `d_speech_activity` | **有，已覆盖**：FireRed/Silero/Brouhaha独立音频VAD | 复用 `t_speech_activity` | 对同一 `t_spk_activity` 求并集 |
| `d_overlap` | **有任务/解码源码**：pyannote专用OSD由音频预测逐帧non_overlap/overlap，不需已有diarization预测 | 恢复 `t_overlap_interval`；训练/推理路径有依据，具体checkpoint可取得性未核实 | 既有活动区间求交、参与者集合与比例 |
| `d_turn_structure` | **部分有**：pyannote专用SCD预测变化分数并提取边界；Smart Turn只判输入右端complete/incomplete | 恢复 `t_speaker_change`；不批量恢复完整turn/gap/duration | continuity/gap规则生成轮次、时长、切换次数与速率 |
| `d_response_latency` | **本轮未确认匹配接口**：VAP预测未来活动，Smart Turn判端点完成性，都不直接给已发生回应对应关系及其时延 | 不恢复已确认的 `t_response_latency` producer；保留未来核查空间 | 已知回应对应关系与实际时间点的差值 |
| `d_speech_rate` | **有组合路径**：SylNet从音频估音节数，再除窗口秒数；不是ASR后计数 | 恢复 `t_speech_rate_value[syllable/s]` `[C]`；不是原生word/s，也不是感知快慢 | 既有文字/时间/语音掩码下的率、词时长与停顿 |
| `d_contours` | **有，已覆盖**：torchcrepe给逐帧F0；直接能量/响度轨迹由既有类型表达 | 复用 `t_f0` / `t_rms` / `t_loudness`；不恢复contour别名 | 已有轨迹的归属筛选、裁剪、平滑、归一化 |
| `d_profile_bands` | **本轮未确认相同合同的直接模型**：声学F0/响度不自动等价于片内相对高低档位 | 不恢复 `t_pitch_band` / `t_volume_band` | 明确片内参照、clean mask和阈值的分档 |
| `d_nonspeech` | **有，已覆盖**：独立speech/non-speech模型已存在；同一二分类的负类不是第二条感知 | 复用 `t_speech_activity` 的完整二分类观察；非语音事件另用 `t_event` | 选定speech观察在已知范围内的补集与占比；不等于静音 |
| `d_room_metrics` | **部分已覆盖、部分待核**：Brouhaha直接C50；BERP盲估room parameters，但关键RT60输出链未读取成功 | 保留 `t_c50`，恢复 `t_rt60` 候选 `[H]`，不宣称已确认原生RT60头 | 同一已保存RIR按指定算法计算RT60/C50 |
| `d_event_summary` | **有，已覆盖**：PANNs/DASS clip分类、PANNs/FireRed强时间检测提供原生音频观察 | 复用 `t_event` / `t_event_interval`，用ontology区分音乐/笑哭等 | 同一事件时间轴的类别并集、过滤、时长占比；帧比需原帧分数 |
| `d_background_categories` | **类别判断有、背景地位未核实**：DASS/PANNs直接预测事件类别，不能由类名/top-k证明前景或背景 | 原生类别复用 `t_event`；本轮不恢复“背景组成”规则别名 | 排除表、类别映射、top-k、音乐门控 |
| `d_event_timing` | **本轮未确认相同合同的独立关系头**；另一SED可给新端点，但端点求交仍是规则 | 不恢复during/before/after别名；未来若有匹配直接模型再登记 | 指定event/turn区间的相交、先后、邻接 |

“未确认”只说明本次已读来源没有闭合相应能力证据，不是断言全网不存在。模型可接受音频或可以回答一个问题，也不等于其精确类别、单位、边界与当前标签合同已经成立。

## 3. 本轮恢复的六类属性

| 类型 | 音频估计路径 | 支持/未核实边界 |
| --- | --- | --- |
| `t_speaker_count` | P29 SpeechBrain：波形片段→embedding→非oracle自动谱聚类→估计簇数 | `[C]`；需明确分段来自独立VAD还是oracle，不能把oracle人数输入当模型预测；同一聚类的timeline不是第二份见证 |
| `t_overlap_interval` | P30 pyannote专用OSD：音频→二类帧分数→阈值区间 | task与pipeline源码已核实；具体权重/现代环境兼容未核实；无speaker pair身份 |
| `t_speaker_change` | P31 pyannote专用SCD：音频→变化分数→峰/边界 | task与pipeline源码已核实；具体权重未核实；不等于互动意图或完整发言权轮次 |
| `t_speech_rate_value` | P32 SylNet：音频→音节数→除窗口时长 | `[C]`；音节计数源码已读，归一化是本次建议；上限91音节，非逐人重叠计数或word/s保证 |
| `t_word_count` | BiGRU直接音频词数回归项目声明 | `[H]`；只读到README，代码、词定义、权重未核实；回归值不能直接当作精确整数或外推全语种 |
| `t_rt60` | BERP音频房间参数盲估候选 | `[H]`；不知道该配置的RT60来自直接头、预测参数公式还是合成RIR，不将文件名当接口证据 |

目录从45类变为 **51类**。其中新恢复4类有模型/组合源码依据，另2类为待核候选。P33 torchcrepe增加现有 `t_f0` 的音频producer，不增加同义类型。总表中的明确 `∅` 为6类：原4类加 `t_word_count` / `t_rt60`。有producer名字也不代表已核实完整权重、当地可运行或目标域准确。

## 4. 怎样进行多路核验

```text
audio ──独立diarizer──> t_spk_activity ──求交──> d_overlap
audio ──专用OSD──────> t_overlap_interval
```

以上两条观察在同一音频、同一范围和同一重叠定义下可以比较。保留各自原值；OSD没有参与者身份时，只比较全局重叠，不补造speaker pair。区间占比需要额外对齐分母、平滑、最短长度和有效覆盖范围。

```text
audio ──ASR/对齐─────> text/time ──固定分母──> d_speech_rate
audio ──SylNet──────> syllable count ──窗秒──> t_speech_rate_value
```

第二条提供另一音频估计路线，但词率不能与音节率直接比较；只有第一条也得到相同定义的音节数、窗口和分母后才可数值核验。无停顿掩码时，不能把完整窗口音节率称为去停顿发音速度。

## 5. 来源与验证范围

人数、OSD/SCD、CountNet、Smart Turn、VAP的固定revision、许可证正文及已读材料见[时间结构来源表](d_audit_speaker_temporal.md#5-revision许可证及实际读取范围)。SylNet、Sylber、torchcrepe、BERP的移动分支/版本未知和访问失败见[声学来源表](d_audit_acoustics.md#2-来源缓存与支持边界)。SEP-28k、声学词数、MOSS、PANNs/DASS见[内容来源表](d_audit_content_events.md#6-来源与核查状态)。本地已有VAD证据另见 FireRedVAD README（本地研究档案，未随页面发布：`sources/firevad__README.md`）、Silero README（本地研究档案，未随页面发布：`sources_supplement/silero__README.md`）、Brouhaha README（本地研究档案，未随页面发布：`sources/brouhaha__README.md`）；FireRed示例显式输出 `is_speech/raw_prob`，Brouhaha明确speech/non-speech。

新增来源缓存与逐请求结果位于 sources_direct_audit（本地研究档案，未随页面发布：`sources_direct_audit/`）。根审查的一次BERP镜像请求也失败，记于 root_berp_mirror_manifest.json（本地研究档案，未随页面发布：`sources_direct_audit/root_berp_mirror_manifest.json`），没有将未取得的源码记为已读。

本轮完成来源/合同核查、schema和总表覆盖更新及文档一致性检查；未进行模型推理。人数精度、OSD/SCD边界质量、音节计数/语速误差、RT60/词数候选可执行性，以及不同感知路线的错误相关性和实际补证收益均未测量。后续验证应固定音频与合同，分开报告直接观察与派生路径，不能把同源重算计作额外模型票数。
