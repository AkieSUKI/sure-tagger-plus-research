# 声学派生项与独立音频估计路径复查

核验日期：2026-10-20。范围仅限 `d_room_metrics`、`d_contours` / `d_profile_bands`、`d_speech_rate`。本报告只提出 schema / producer 映射建议，未修改主 schema、总表及其他共享文档，未下载权重或运行推理。来源缓存位于 sources_direct_audit（本地研究档案，未随页面发布：`sources_direct_audit/`），本分支文件统一以 `acoustic_` 开头。

## 1. 判断规则与结论

“已有标签可计算某个量”只证明存在一条派生路径，不能据此排除从音频重新估计同一量的路径。两条路径可以采用同一声音属性类型，但其误差不同；不能把新模型的音频估计伪装成既有标签的确定性计算，也不能仅换一个名称就计算为新增声音维度。

| 复查项 | 从已接受标签计算 | 从音频取得的新观察 | 建议 |
| --- | --- | --- | --- |
| `d_room_metrics` | 已保存 `t_rir` + 固定算法 → RT60 / C50 | Brouhaha 已有直接C50估计；BERP为房间参数盲估候选，具体RT60路径尚需源码确认 | 保留 `d_room_metrics`；保留现有 `t_c50`；`t_rt60` 的音频估计路径可以恢复为候选，不能宣称本轮已确认native head |
| `d_contours` | 已有F0 / RMS / loudness轨迹 + mask / 裁剪 / 平滑 → 轮廓视图 | torchcrepe直接音频 → 时间序列F0与periodicity | 直接轨迹已经属于 `t_f0` / `t_rms` / `t_loudness`；不恢复重复的 `t_pitch_contour` / `t_intensity_contour` 容器 |
| `d_profile_bands` | 指定片内参照与阈值 → 相对音高 / 音量档位 | 本轮未核验独立的音频→感知高低 / 强弱档位模型 | 片内相对bands仍为派生视图；不因存在音频F0模型就恢复另一套档位tag |
| `d_speech_rate` | 已有文字 / 单位时间 / mask → 字、词等固定单位每秒 | SylNet音频 → 音节数；音节数 ÷ 已知窗口秒数 → 音节率；Sylber给类音节分段候选 | 可恢复 `t_speech_rate_value[syllable/s]` 的条件组合路径 `[C]`；原生head仅计数，不能称native rate或word/s；原有基于文字的计算仍为 `d_speech_rate` |

本轮最明确可恢复的独立观察入口是 **`t_speech_rate_value[syllable/s]`**。`t_f0` / `t_loudness` 与 `t_c50` 已在当前目录内，不需要改名恢复。`t_rt60` 可保留盲估候选，但本报告不把尚未读到的实现细节写成已核验事实。

## 2. 来源、缓存与支持边界

本节所列在线来源均在2026-10-20读取；移动分支不冒充固定commit。下载快照的SHA-256仅标识本文所读文件，不能当作checkpoint版本。除明确列出的README许可证文本外，独立权重许可未核验。

| 来源 | 官方入口 / 已读缓存 | revision / release / license | 实际支持 |
| --- | --- | --- | --- |
| A01 Brouhaha | [官方仓库](https://github.com/marianne-m/brouhaha-vad)；README缓存（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_brouhaha_README.md`）（复制既有研究快照，本次未重新联网取得） | code / checkpoint / release unknown；代码MIT沿用既有调查；权重独立许可unknown | README明确VAD、SNR、C50多任务输出；本轮无新增推理 |
| A02 BERP | [官方README](https://github.com/Alizeded/BERP/blob/main/README.md)、缓存（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_berp_README.md`）；推理入口缓存（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_berp_inference_jointRegressor.py`）；默认推理配置缓存（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_berp_inference_config_curl.yaml`） | code / checkpoint revision、release unknown；README声明GPL-3.0，LICENSE正文及权重独立适用条款未核验，许可核验状态unknown | documented单通道带噪语音盲估room parameters；入口调用Lightning predict并保存结果，默认配置选择network_e2e。关键forward / predict_step未成功读取，RT60具体head / 公式关系unknown |
| A03 torchcrepe | [官方README](https://github.com/maxrmorrison/torchcrepe/blob/master/README.md)；缓存（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_torchcrepe_README.md`） | code / checkpoint revision、release unknown；README MIT徽标及转换自CREPE tiny/full权重说明已读，LICENSE正文 / 权重独立条款未核验 | documented音频→逐帧F0，可选periodicity；阈值 / 中值 / 均值 / silence mask均有显式示例；local_validation=not_run |
| A04 SylNet | [作者官方README](https://github.com/shreyas253/SylNet/blob/master/README.md)、缓存（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_sylnet_README.md`）；[run_SylNet.py](https://github.com/shreyas253/SylNet/blob/master/run_SylNet.py)、缓存（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_sylnet_run_SylNet.py`） | code / checkpoint revision、release unknown；README包含MIT式授权文本及发表引用要求，权重独立适用范围unknown | documented + code_supported：音频→整段整数音节数；除窗口秒数得到syllable/s为本报告建议的组合路径，不是官方native rate；local_validation=not_run |
| A05 Sylber | [作者官方README](https://github.com/Berkeley-Speech-Group/sylber/blob/main/README.md)；缓存（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_sylber_README.md`） | code / checkpoint revision unknown；README列2024-12-25 checkpoint release / 2025-03-02 inference package；具体权重身份及代码 / 权重许可unknown | documented原始音频→类音节 `[start,end]` 分段；支持秒 / 帧坐标；边界未对人工音节或停顿GT验证；local_validation=not_run |
| A06 openSMILE既有配置 | [固定版本配置](https://github.com/audeering/opensmile/blob/055dda577c82383f8239663e5ac6c58d25b504db/config/egemaps/v02/eGeMAPSv02.conf)；既有缓存副本（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_opensmile_eGeMAPSv02.conf`） | 固定code=`055dda577c82383f8239663e5ac6c58d25b504db`；无checkpoint；Research License沿用既有调查 | 当前顶层配置包含LLD / functional路径，并默认接no_lld输出配置；不能把内部逐帧计算直接写成默认接口已暴露逐帧轨迹 |

获取记录与文件hash见 合并manifest（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_manifest.json`）、首次来源manifest（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_manifest_initial.json`）、后续来源manifest（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_manifest_followup.json`）、既有快照复制manifest（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_manifest_local.json`）。BERP未成功请求分别见 原始请求（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_manifest_berp_code.json`）、blob请求（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_manifest_berp_blobs.json`）、限时raw请求（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_manifest_berp_raw_curl.json`）、镜像请求（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_manifest_berp_mirror.json`）、最终官方请求（本地研究档案，未随页面发布：`sources_direct_audit/acoustic_manifest_berp_final.json`）。失败请求不作为对应源码已读证据。

## 3. `d_room_metrics`：指标可派生，不等于只能派生

当前schema已经正确区分两条C50路径：

```text
已保存的 t_rir ──固定C50算法──> d_room_metrics[C50, metric_source=RIR]
音频 ──Brouhaha多任务模型──> t_c50[metric_source=Brouhaha]
```

A01 README第3、9–11行确认C50是Brouhaha预测任务之一；它不是从本次已经保存的 `t_rir` 再计算。此前关于“RIR的RT60/C50可以删除独立标签”的结论只适用于第一条路径。Brouhaha已有 `t_c50` 应保留，不能因为数值名称相同再删除。

A02 BERP README明确其输入是single-channel noisy speech，并提供房间参数训练 / 推理入口与权重下载链接。已读入口仅证明加载配置模型、调用 `trainer.predict` 并保存预测，默认配置选择 `network_e2e`。仓库tree可见TR、C50回归与e2e / hybrid实现，但文件名不能替代源码中的RT60定义。

因此，**本轮没有确认BERP的RT60究竟来自直接回归head、Th/Tt公式、合成RIR后计算还是其他路径**，也未确认其每项输出单位。应把 `t_rt60` 标为待核验音频估计候选，而非已经完成的native RT60支持。

若后续读到“音频→新模型预测参数→固定公式 / 模拟响应→RT60”，它仍可作为 `t_rt60` 的条件组合估计 `[C]`：新模型引入了未包含在既有已接受标签中的音频信息。需要明确其内部原生变量与后处理，不能写成native RT60 head。只有再次读取同一份已接受 `t_rir` 求数值，才完全属于原有 `d_room_metrics`。

RT60 / C50描述混响衰减与早晚能量关系，不能单独推断房间名称、实际距离或完整空间声像。模型分数与从估计RIR算得的值都不是测量真值；本次无统一GT验证。

## 4. `d_contours` / `d_profile_bands`：独立轨迹与派生视图分开

A03 README的 `torchcrepe.predict(audio, sr, hop_length, ...)` 直接返回F0序列，示例hop为5ms；`return_periodicity=True` 可另取周期性指标。该模型读取音频，输出应记录为 **`t_f0[frame]` 的新观察**，不需要先有另一个F0摘要，也不能把轨迹整体误归入“只能从既有标签计算”。

同一README明确展示以下后处理：periodicity中值滤波、阈值掩码、pitch均值平滑；默认Viterbi解码也不同于原CREPE的weighted-argmax解码。这些选择改变最终轨迹，必须定义实际输出合同。对已经接受的那份轨迹做相同平滑、裁剪或按speaker mask选择时，仍是 `d_contours`，不能视作额外独立模型证据。

periodicity是模型周期性 / 可靠性指标，不自动等于校准的voicing概率。README特别警告CREPE未用静音训练，静音区仍可给高confidence，需另加silence mask；不能把它当可靠独立VAD。

同理，直接音频能量 / 感知响度轨迹使用现有 `t_rms` / `t_loudness`；不同算法与单位不能混为一个强度真值。已有轨迹后，片内中位数参照、相对分位数、固定高低档与平滑轮廓属于 `d_profile_bands` / `d_contours`。本轮没有核验独立的感知音高 / 强弱档位模型，因此不建议恢复 `t_pitch_band` / `t_volume_band`。`t_pitch_contour` / `t_intensity_contour` 也不作为 `t_f0` / `t_loudness` 的重复容器恢复。

## 5. `d_speech_rate`：存在不依赖ASR的音频计数路径

A04 SylNet README第76–79行将结果定义为每段音频的整数音节数；第92行明确当前实现上限为91个音节。脚本第86、96–99行按16k mono载入并构造log-mel特征；第159、185–190行对模型输出阈值化后求和，写整数计数。输入没有ASR文本或word_time，也没有逐词 / 逐音节边界输出。

建议允许以下明确的条件组合路径：

```text
原始音频窗口
   └─SylNet──> estimated_syllable_count（模型原生任务，含阈值解码）
                  └─÷ 窗口时长（秒）──> t_speech_rate_value[unit=syllable/s]
```

这条路线可以标 **`[C]`：documented + code_supported计数，条件组合得到音节率，local_validation=not_run**。它不依赖当前已接受的文字、词时间或说话人活动，所以不应仅因“语速能够计算”而把入口全部删除。为本轮映射复核不必额外增加一组音节tag；模型计数可作为该观察的原生分量及证据保留。

它和原有 `d_speech_rate` 的关系应如下定义：

| 数值 | 分子 / 分母 | 本次支持边界 |
| --- | --- | --- |
| syllable/s | 音频模型估计音节数 / 完整窗口秒数 | SylNet + 固定归一化可提供候选；窗口包含停顿则计入停顿时间 |
| articulation rate | 音节数 / 按明确协议排除停顿的时长 | SylNet自身没有pause边界；另需明确且实际取得的有效发音时长，不能宣称已native支持 |
| word/s、character/s | 对应词 / 字数 / 固定时间分母 | 不能由音节数冒充；沿用文字与时间标签的原派生路径，或另找直接该单位的音频模型 |
| 感知“快 / 慢” | 听感判别，可能受语言、发音清晰度、停顿与韵律共同影响 | SylNet的整数计数及syllable/s不等于此类感知标签；本轮未核验直接感知快慢分类器 |

短窗会降低91音节上限造成的饱和风险，但会带来边界截断与计数误差；不能用“约18秒”当通用安全上限。不得推断已支持多说话人重叠计数、逐人归属或所有语言。对不同窗口重新读取音频的计数观察可以保留；从同一计数按固定窗口分母做算术变化不计作多个独立证人。

A05 Sylber提供另一个音频分段候选：README第45–49行的 `Segmenter(..., in_second=True)` 返回类音节 `segments=[start,end]` 及特征。模型token数可形成另一音节率代理，但“平均4.27 tokens/sec”是模型描述中的统计，不是任意音频的固定语速，也不证明每个token严格对应人工音节。这里只登记其相关能力，不把token interval当精确词界，更不能直接把所有token间隙标作语言学停顿。

停顿如被定义成已有语音活动的固定补集 / gap，仍为派生视图；若要求语流中的语言学停顿，需要独立定义及标注证据。本次未读到满足该定义的专用模型，不恢复无证据的native `t_pause_interval`。

## 6. 建议恢复 / 保留清单

- **恢复 `t_speech_rate_value` 的音频估计入口**：本轮明确到 `syllable/s`，producer为SylNet + 固定时长归一化 `[C]`，不是native word rate；不删除已有 `d_speech_rate`。
- **`t_rt60` 先登记音频盲估候选**：BERP可作为待核验来源 `[H]`；本轮未确定原生变量、公式与单位，不能在总表写已确认的native RT60 producer。以后证据补齐可升为documented / code_supported的直接或组合路径。
- **保留 `t_c50`，复用 `t_f0` / `t_rms` / `t_loudness`**：这些已经能承接独立音频估计；派生C50和已接受轨迹的再处理继续使用对应 `d_*`。
- **不恢复重复轮廓 / 档位容器，也不补造停顿模型支持**：是否读取新的音频信息与是否增加新声音属性分别判断。
