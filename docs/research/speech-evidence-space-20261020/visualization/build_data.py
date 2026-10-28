#!/usr/bin/env python3
"""Build the browser's local data bundle; run with Python 3, without dependencies.

The Markdown table is authoritative for producer combinations and status. Commas
mean AND, slashes mean OR. A row is satisfied only when at least one producer in
each requirements group is selected. Empty producer sets remain explicit gaps.
Display names only abbreviate documented names; they never infer capability.
"""

import hashlib
import json
import re
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
TABLE = HERE.parent / "模型与标签对应总表.md"
SCHEMA = HERE.parent / "tag_schema.md"
BASELINE = HERE / "baseline-tag-schema.md"
COMPARISON = HERE / "schema_comparison.json"
SURE_MATRIX = HERE.parent / "SURE-Tagger模型能力对应表.json"
SURE_DOCUMENT = HERE.parent / "SURE-Tagger模型能力对应表.md"

MODEL_LABELS = {
    "m_qwen_asr": "Qwen3-ASR",
    "m_qwen_aligner": "Qwen3-ForcedAligner",
    "m_diarizer": "说话人分离模型（泛称）",
    "m_moss": "MOSS-Transcribe-Diarize",
    "m_firered_aed_asr": "FireRedASR2-AED",
    "m_firered_lid": "FireRedLID",
    "m_firered_vad": "FireRed VAD",
    "m_firered_llm_asr": "FireRedASR2-LLM",
    "m_whisper_base": "Whisper base",
    "m_sensevoice": "SenseVoiceSmall",
    "m_dicow": "DiCoW",
    "m_se_dicow": "SE-DiCoW",
    "m_mfa": "Montreal Forced Aligner",
    "m_paraformer": "Paraformer",
    "m_paraformer_stream": "Paraformer（流式）",
    "m_fun_asr_nano": "Fun-ASR Nano",
    "m_fun_asr_mlt": "Fun-ASR Nano（多语）",
    "m_glm_asr_nano": "GLM-ASR Nano",
    "m_nemotron": "Nemotron diarizer",
    "m_sortformer": "Sortformer",
    "m_diarizen": "DiariZen",
    "m_pyannote": "pyannote diarization",
    "m_speechbrain_ecapa": "SpeechBrain ECAPA",
    "m_spectral_clustering": "谱聚类",
    "m_pyannote_osd_legacy": "pyannote OSD（旧版）",
    "m_pyannote_scd_legacy": "pyannote SCD（旧版）",
    "m_sylnet": "SylNet",
    "m_cam_zh": "CAM++（中文）",
    "m_cam_en": "CAM++（英文）",
    "m_ecapa": "ECAPA",
    "m_wespeaker": "WeSpeaker",
    "m_alice": "Alice 性别分类器",
    "m_afri_head": "AfriSpeech 性别分类头",
    "m_griko_svm": "Griko 性别分类 SVM",
    "m_firered_stream_vad": "FireRed VAD（流式）",
    "m_silero": "Silero VAD",
    "m_fsmn_vad": "FSMN-VAD",
    "m_brouhaha": "Brouhaha",
    "m_firered_event_aed": "FireRed 声音事件检测",
    "m_dass": "DASS",
    "m_panns_cnn14": "PANNs CNN14",
    "m_panns_wavegram": "PANNs Wavegram",
    "m_beats_classifier": "BEATs 分类器",
    "m_panns_sed": "PANNs SED",
    "m_dnsmos_835": "DNSMOS P.835",
    "m_dnsmos_808": "DNSMOS P.808",
    "m_rec_rir": "Rec-RIR",
    "m_opensmile": "openSMILE",
    "m_profile": "本地 profile 分析",
    "m_torchcrepe": "torchcrepe",
    "m_basic_pitch": "Basic Pitch",
    "m_emotion_plus": "emotion2vec+",
    "m_emotion_finetuned": "情绪分类微调模型",
    "m_emotion_base": "emotion2vec 基础表征",
    "m_wesep": "WeSep 目标语音提取",
    "m_asr": "语音识别模型（泛称）",
    "m_event": "声音事件模型（泛称）",
    "m_beats_encoder": "BEATs 编码器",
    "m_clap_audio": "CLAP 音频编码器",
    "m_redimnet_oasr": "RedimNet（旧 OASR）",
    "m_legacy_aligner_oasr": "对齐器（旧 OASR）",
    "m_legacy_diarizen_oasr": "DiariZen（旧 OASR）",
    "m_legacy_firered_aed_oasr": "FireRed AED（旧 OASR）",
}

# Concise Chinese names and meanings from the source table and schema §4.2–4.7.
TAG_DISPLAY = {
    "t_text": ("转写文字", "识别出的文字，可按片段、说话人或整段音频记录。"),
    "t_language": ("语言", "音频中使用的语言。"),
    "t_word_time": ("词 / 字时间", "词或字的起止时间。"),
    "t_phone_time": ("音素时间", "音素的起止时间；现有 MFA 路径为规范 / 词典音素对齐，不代表实际发音变体识别。"),
    "t_word_count": ("声学词数", "直接从声音估计的词数，需明确语言和词的定义；当前 producer 未确认。"),
    "t_code_switch_span": ("语言切换片段", "同一段发言中不同语言切换所在的片段。"),
    "t_self_repair_candidate": ("自我修正候选", "说话者对自己刚说内容的修正候选。"),
    "t_hesitation_span": ("犹豫区间", "犹豫或迟疑表达所在的时间区间。"),
    "t_spk_activity": ("说话人活动", "各匿名说话人在何时发声。"),
    "t_unit_speaker": ("文字说话人归属", "每个词或片段属于哪位匿名说话人。"),
    "t_speaker_count": ("不同说话人数", "指定范围内不同说话人的总数，不是最大同时说话人数。"),
    "t_same_speaker_candidate": ("同人匹配候选", "两段声音可能来自同一人的匹配候选。"),
    "t_gender": ("声音性别类别", "根据声音预测的模型定义的性别类别。"),
    "t_overlap_interval": ("重叠语音区间", "至少两人同时说话的区间；专用 OSD 路径不自动确定参与者。"),
    "t_speaker_change": ("说话人切换", "说话人发生变化的时间点；专用 SCD 路径不自动确定切换双方。"),
    "t_speech_rate_value": ("语速", "当前 SylNet 组合路径估计每秒音节数，分母含窗口内停顿；不是每秒词数。"),
    "t_f0": ("基频 F0", "周期振动的基本频率；逐帧轨迹与中位数摘要须区分。"),
    "t_rms": ("均方根幅度", "信号的均方根幅度，反映所分析声音的信号强弱；当前 profile 仅有摘要。"),
    "t_loudness": ("感知响度", "声音听起来有多响；与信号幅度的含义和单位不同。"),
    "t_voicing": ("有声状态", "是否存在声带周期振动，不等同于是否有语音；当前独立输出未确认。"),
    "t_jitter": ("周期微扰", "相邻声带振动周期的微小变化。"),
    "t_shimmer": ("幅度微扰", "相邻声带振动周期幅度的微小变化。"),
    "t_hnr": ("谐噪比 HNR", "谐波与噪声的能量比，描述发声中的周期性与噪声成分。"),
    "t_phonation": ("发声方式", "可听的发声方式及转换，如气声、喉化或耳语；当前 producer 未确认。"),
    "t_emotion": ("情绪类别", "声音所表达的情绪类别，如高兴、悲伤或愤怒，依模型类别集。"),
    "t_arousal": ("唤醒程度", "声音表现出的平静或激动程度。"),
    "t_valence": ("情绪正负倾向", "声音表现出的情绪正负倾向。"),
    "t_stress": ("压力程度候选", "声音中的压力或紧张程度候选。"),
    "t_engagement": ("投入程度候选", "声音中的参与或投入程度候选。"),
    "t_speech_activity": ("语音活动", "有语音的时间区间，不区分是谁；目标人观察须单独标明输入视图。"),
    "t_snr": ("信噪比 SNR", "语音信号与噪声的强弱比。"),
    "t_c50": ("清晰度 C50", "前 50 毫秒与后续声能之比的分贝值；Brouhaha 估计与 RIR 派生须区分。"),
    "t_mos_sig": ("语音听感质量", "语音本身的听感质量预测分。"),
    "t_mos_bak": ("背景听感质量", "背景噪声的听感质量预测分。"),
    "t_mos_ovrl": ("整体听感质量", "整体听感质量预测分。"),
    "t_mos_p808": ("P.808 听感评分", "按 P.808 标准预测的总体听感分。"),
    "t_rir": ("房间脉冲响应", "描述声音在房间中的传播、反射与衰减。"),
    "t_rt60": ("混响时间 RT60", "混响声能衰减 60 dB 所需的时间，单位为秒；当前直接盲估 producer 未确认。"),
    "t_spectral_envelope": ("频谱包络", "局部频谱的平滑形状，描述声音能量在各频率上的分布。"),
    "t_note_event": ("音符事件", "音符音高、开始时间、模型预测结束时间及弯音；Basic Pitch 未确认完整可听尾音或逐乐器归属。"),
    "t_spatial_image": ("空间声像", "可听声源的位置、宽度和远近感。"),
    "t_event": ("声音事件类别", "声音事件的类别，如音乐、笑声或咳嗽，依模型类别集。"),
    "t_event_interval": ("声音事件区间", "声音事件的类别及起止时间；不同 producer 支持的类别集不同。"),
    "t_channel_sync_offset": ("通道时间偏移", "通道之间的时间偏移。"),
    "t_channel_consistency": ("通道一致性", "不同通道内容或声学表现的一致程度。"),
    "t_channel_dropout_candidate": ("通道断音候选", "通道疑似断音或信号缺失的区间。"),
    "t_channel_quality_skew": ("通道音质差异", "通道之间的音质差异。"),
    "t_event_source_candidate": ("事件声源归属", "声音事件可能属于哪个可听声源；总表已有组合仅覆盖人声归属候选。"),
    "t_interruption_candidate": ("打断候选", "一方可能打断另一方的交互候选。"),
    "t_backchannel_interval": ("简短回应区间", "“嗯”“对”等简短回应的候选区间，不自动等于同意。"),
    "t_repair_sequence": ("对话修正序列", "对话中发起澄清、更正及后续回应的修正序列候选。"),
}

LAYER_LABELS = {
    "L1": "词汇内容",
    "L2": "说话人",
    "L3": "时间结构",
    "L4": "副语言",
    "L5": "声学场景与事件",
    "L6": "音频内关系",
}

# Cross-tag checks are semantic relations between outputs. They are deliberately
# kept separate from producer rows: a relation is a testable consistency rule,
# not an assertion that the linked tags are mutually independent evidence.
CROSS_CHECKS = [
    {
        "id": "cc_language_text", "category": "language", "strength": "strong",
        "title": "音频语言 ↔ 转写文字", "kind": "语义检查",
        "branches": ["音频 → 独立 LID", "音频 → ASR → 文本语言推断"],
        "nodes": [{"id": "t_language", "role": "source"}, {"id": "t_text", "role": "result"}],
        "summary": "用独立的音频语言识别结果检查转写文本的语言是否相符，并标出混语或疑似错误。",
        "rule": "语言标签与文本语言推断应一致；不一致时保留冲突并检查混语、短音频或识别失败。",
        "caveat": "ASR 自带 language 字段与文本来自同一模型时只能算内部一致性线索。",
    },
    {
        "id": "cc_text_alignment_activity", "category": "alignment", "strength": "strong",
        "title": "转写文字 ↔ 词时间 ↔ 语音活动", "kind": "结构 / 时间",
        "branches": ["音频 → ASR / 对齐器", "音频 → VAD"],
        "nodes": [{"id": "t_text", "role": "source"}, {"id": "t_word_time", "role": "constraint"}, {"id": "t_speech_activity", "role": "result"}],
        "summary": "检查每个词是否有有效时间边界，并且落在检测到语音的区间内。",
        "rule": "有效词时间应满足结束晚于开始并落在音频范围内；统计缺时词、退化零时长、范围越界及语音活动重叠。",
        "caveat": "原生时间、强制对齐、插值与缺失需分开；静音、重叠及端点阈值可能造成边界差异。",
    },
    {
        "id": "cc_word_speaker", "category": "alignment", "strength": "strong",
        "title": "词时间 ↔ 说话人活动 ↔ 文字归属", "kind": "时间 / 归属",
        "branches": ["ASR → 词或片段时间", "音频 → diarizer → 活动区间"],
        "nodes": [{"id": "t_word_time", "role": "source"}, {"id": "t_spk_activity", "role": "constraint"}, {"id": "t_unit_speaker", "role": "result"}],
        "summary": "把词的时间与说话人活动区间对齐，检查文字归属是否有对应的声学支持。",
        "rule": "检查被归属说话人在词区间内是否有活动支持；多人重叠保留歧义，不能凭最大交集确定身份。",
        "caveat": "匿名 speaker ID 需要先做跨模型映射；重叠语音不宜强行分配给单人。",
    },
    {
        "id": "cc_event_activity", "category": "event", "strength": "medium",
        "title": "声音事件区间 ↔ 语音活动", "kind": "语义 / 时间",
        "branches": ["音频 → 事件检测器", "音频 → VAD"],
        "nodes": [{"id": "t_event_interval", "role": "source"}, {"id": "t_speech_activity", "role": "constraint"}, {"id": "t_event", "role": "result"}],
        "summary": "检查事件类别和时间区间是否与语音活动相容，区分说话、歌唱与非人声事件。",
        "rule": "先统一“说话”等类别定义，再比较区间重叠；笑声、歌唱是否计入 VAD 取决于各接口约定。",
        "caveat": "音乐与说话可以同时存在，事件标签不构成互斥条件；类别集、阈值和时间粒度需统一。",
    },
    {
        "id": "cc_event_speaker", "category": "event", "strength": "medium",
        "title": "事件区间 ↔ 说话人活动", "kind": "声源候选",
        "branches": ["音频 → 人声事件检测", "音频 → diarizer"],
        "nodes": [{"id": "t_event_interval", "role": "source"}, {"id": "t_spk_activity", "role": "constraint"}, {"id": "t_event_source_candidate", "role": "result"}],
        "summary": "判断人声事件是否能归因到某个可听说话人，支持多人场景中的声源追踪。",
        "rule": "比较人声事件候选与说话人活动的时间关系；重叠只提供支持线索，多人同时活动保留不确定。",
        "caveat": "不支持非人声归属；diarizer 可能漏掉笑声等非言语人声，缺少活动不能直接排除某人。",
    },
    {
        "id": "cc_emotion_acoustics", "category": "acoustic", "strength": "weak",
        "title": "情绪类别 ↔ 基频 / 响度", "kind": "解释线索",
        "branches": ["音频 → 情绪分类器", "同说话人片段 → 声学特征"],
        "nodes": [{"id": "t_emotion", "role": "source"}, {"id": "t_f0", "role": "constraint"}, {"id": "t_loudness", "role": "result"}],
        "summary": "结合基频和感知响度观察情绪分类对应的声学表现，为人工复核提供线索。",
        "rule": "在统一窗口和说话人范围后分析声学分布；未经校准，不以高低音或响度直接判定情绪冲突。",
        "caveat": "F0/响度只能提供解释性支持，不能单独证明情绪标签正确。",
    },
    {
        "id": "cc_quality_text", "category": "quality", "strength": "weak",
        "title": "音质评分 ↔ 转写结果", "kind": "失败诊断",
        "branches": ["音频 → SNR / MOS 估计", "音频 → ASR / 对齐器"],
        "nodes": [{"id": "t_snr", "role": "source"}, {"id": "t_mos_ovrl", "role": "constraint"}, {"id": "t_text", "role": "result"}],
        "summary": "按音质分层观察转写空结果、缺失时间和对齐失败，为识别错误诊断提供线索。",
        "rule": "按片段对齐质量指标与空结果、缺时词；有参考转写或人工复核时，再分析漏词和错词的关联。",
        "caveat": "相关性不是因果关系；说话速度、口音和语言本身也会影响 ASR。",
    },
    {
        "id": "cc_code_switch", "category": "language", "strength": "medium",
        "title": "语言切换片段 ↔ 语言 ↔ 转写文字", "kind": "语义 / 时间",
        "branches": ["局部片段 → LID", "ASR 文字 + 对齐 → 切换候选"],
        "nodes": [{"id": "t_code_switch_span", "role": "source"}, {"id": "t_language", "role": "constraint"}, {"id": "t_text", "role": "result"}],
        "summary": "检查局部语言切换候选，能否在语种观察和转写文字中找到对应片段。",
        "rule": "将切换候选定位到统一时间轴，核对局部语言及文本；证据不足时保留不确定。",
        "caveat": "需要片段级标注；整段 LID 或强制语言参数不能替代语言切换真值。",
    },
]


def plain(text: str) -> str:
    """Keep human-readable source notes without Markdown links/backticks."""
    return re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text).replace("`", "").strip()


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def parse_schema(source: str) -> dict:
    tags = {}
    layer = None
    for line in source.splitlines():
        if line.startswith("### "):
            match = re.match(r"### 4\.[2-7] (L[1-6])", line)
            layer = match.group(1) if match else None
        if not layer or not line.startswith("| `t_"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) != 4:
            raise ValueError(f"Unexpected schema row: {line}")
        for tag_id in re.findall(r"\bt_[a-z0-9_]+", cells[0]):
            if tag_id in tags:
                raise ValueError(f"Duplicate schema tag: {tag_id}")
            if tag_id not in TAG_DISPLAY:
                raise ValueError(f"Add a reviewed Chinese display name for {tag_id}")
            label, description = TAG_DISPLAY[tag_id]
            tags[tag_id] = {
                "id": tag_id,
                "label": label,
                "description": description,
                "layer": layer,
                "path": plain(cells[1]),
                "scope": plain(cells[2]),
                "schemaStatus": plain(cells[3]),
            }
    if not tags or {tag["layer"] for tag in tags.values()} != set(LAYER_LABELS):
        raise ValueError("Expected the tag tables in schema sections 4.2–4.7")
    return tags


def parse_requirements(expression: str) -> list:
    if "∅" in expression:
        if re.search(r"\bm_[a-z0-9_]+", expression):
            raise ValueError(f"Empty producer set contains a model: {expression}")
        return []
    match = re.search(r"\{([^{}]+)\}", expression)
    if not match:
        raise ValueError(f"Missing producer set: {expression}")
    requirements = []
    for group in match.group(1).split(","):
        alternatives = [item.strip() for item in group.split("/")]
        if not all(re.fullmatch(r"m_[a-z0-9_]+", item) for item in alternatives):
            raise ValueError(f"Unexpected producer syntax: {expression}")
        requirements.append(alternatives)
    return requirements


def build() -> dict:
    table_source = TABLE.read_text(encoding="utf-8")
    schema_source = SCHEMA.read_text(encoding="utf-8")
    tags = parse_schema(schema_source)
    rows = []
    for line_number, line in enumerate(table_source.splitlines(), start=1):
        if not line.startswith("| `["):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) != 4:
            raise ValueError(f"Expected four table columns on line {line_number}")
        expression, model_description, tag_expression, tag_description = cells
        status_match = re.match(r"`\[([^\]]+)\]`", expression)
        if status_match is None:
            raise ValueError(f"Missing status on line {line_number}")
        status = status_match.group(1)
        requirements = parse_requirements(expression)
        qualified_tags = re.findall(r"t_[a-z0-9_]+(?:\[[^\]]+\])?", tag_expression)
        row_tags = list(dict.fromkeys(tag.split("[", 1)[0] for tag in qualified_tags))
        if not row_tags or set(row_tags) - tags.keys():
            raise ValueError(f"Unknown or empty tag set on line {line_number}")
        rows.append({
            "id": f"r{len(rows) + 1:02d}",
            "status": status,
            "modelExpression": plain(expression),
            "modelDescription": plain(model_description),
            "tagDescription": plain(tag_description),
            "requirements": requirements,
            "tags": row_tags,
            "qualifiedTags": qualified_tags,
            "unconfirmed": not requirements,
            "unavailable": "不可调用" in status,
            "candidate": "H" in status or "候选" in status,
            "partial": "部分支持" in status,
            "sourceLine": line_number,
        })
    observed_tags = {tag_id for row in rows for tag_id in row["tags"]}
    if observed_tags != tags.keys():
        raise ValueError(f"Table/schema mismatch: {observed_tags ^ tags.keys()}")
    model_ids = list(dict.fromkeys(
        model_id for row in rows for group in row["requirements"] for model_id in group
    ))
    if set(model_ids) - MODEL_LABELS.keys():
        raise ValueError(f"Add model names for {set(model_ids) - MODEL_LABELS.keys()}")
    models = []
    for model_id in model_ids:
        related = [row for row in rows if any(model_id in group for group in row["requirements"])]
        # Prefer a dedicated model row over a large combination for the tooltip.
        nearest = min(related, key=lambda row: sum(map(len, row["requirements"])))
        models.append({
            "id": model_id,
            "label": MODEL_LABELS[model_id],
            "description": nearest["modelDescription"],
            "rows": [row["id"] for row in related],
            "generic": model_id in {"m_asr", "m_diarizer", "m_event"},
            "unavailable": all(row["unavailable"] for row in related),
        })
    for tag in tags.values():
        related = [row for row in rows if tag["id"] in row["tags"]]
        tag["rows"] = [row["id"] for row in related]
        tag["unconfirmed"] = all(row["unconfirmed"] for row in related)
    comparison = json.loads(COMPARISON.read_text(encoding="utf-8")) if COMPARISON.exists() else None
    if comparison is not None:
        comparison_tags = {
            tag_id for item in comparison["items"] for tag_id in item["new_tags"]
            if tag_id.startswith("t_")
        }
        if comparison_tags != tags.keys():
            raise ValueError("Comparison/schema mismatch: {}".format(comparison_tags ^ tags.keys()))
    unknown_check_tags = {node["id"] for check in CROSS_CHECKS for node in check["nodes"]} - tags.keys()
    if unknown_check_tags:
        raise ValueError("Unknown cross-check tags: {}".format(unknown_check_tags))
    sure_matrix = json.loads(SURE_MATRIX.read_text(encoding="utf-8"))
    sure_checks = parse_sure_checks(SURE_DOCUMENT.read_text(encoding="utf-8"), sure_matrix)
    return {
        "meta": {
            "title": "模型与音频标签 · 证据关系图",
            "version": "speech-evidence-space-20261020.v0.6",
            "tablePath": "../模型与标签对应总表.md",
            "schemaPath": "../tag_schema.md",
            "baselinePath": "baseline-tag-schema.md",
            "rows": len(rows),
            "tagCount": len(tags),
            "modelCount": len(models),
            "unconfirmedTagCount": sum(tag["unconfirmed"] for tag in tags.values()),
            "unavailableModelCount": sum(model["unavailable"] for model in models),
            "layerCounts": dict(Counter(tag["layer"] for tag in tags.values())),
            "layerLabels": LAYER_LABELS,
            "sourceSha256": {
                "table": sha256(TABLE),
                "schema": sha256(SCHEMA),
                "baseline": sha256(BASELINE),
                "comparison": sha256(COMPARISON),
                "sureMatrix": sha256(SURE_MATRIX),
                "sureDocument": sha256(SURE_DOCUMENT),
            },
            "selectionSemantics": "每行 requirements 的各组须共同满足；每组选择至少一个替代模型。∅ 不可满足；含 H 的关系仍为待验证候选，模型选择不代表已验证能力。",
            "coverageNote": "51 类是标签名称列举完整；组合满足、候选路径和实际可用能力必须区分。",
            "crossValidationNote": "同一标签的多 producer 是覆盖冗余；不同标签间是约束互检。两者都不自动等于真值验证。",
        },
        "models": models,
        "tags": list(tags.values()),
        "rows": rows,
        "comparison": comparison,
        "crossChecks": CROSS_CHECKS,
        "sureCapability": sure_matrix,
        "sureChecks": sure_checks,
    }


def parse_sure_checks(source: str, matrix: dict) -> dict:
    """Read the reviewed public-field tables, keeping planned checks unevaluated."""
    public_fields = {tag for row in matrix["rows"] for tag in row["public_tags"]}
    checks = {"producerChecks": [], "crossChecks": []}
    for line in source.splitlines():
        if not re.match(r"\| [MX]\d{2} ·", line):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) != 5:
            raise ValueError(f"Expected five columns in SURE check: {line}")
        check_id = cells[0].split(" ·", 1)[0]
        raw_paths = re.findall(r"`([^`]+)`", cells[0])
        tags = list(dict.fromkeys("speaker.profiles" if p.startswith("speaker.profiles[") else p for p in raw_paths))
        if check_id == "X08":
            tags += ["speaker.speaker_change_count", "basic_acoustic.duration_sec", "language_content.filler", "language_content.word_count"]
        if set(tags) - public_fields:
            raise ValueError(f"Unknown public fields in {check_id}: {set(tags) - public_fields}")
        if plain(cells[4]) != "planned":
            raise ValueError(f"A planned comparison cannot be marked evaluated: {check_id}")
        entry = {
            "id": check_id, "title": plain(cells[0]), "public_tags": tags,
            "field_paths": raw_paths, "branches": [plain(cells[1])],
            "rule": plain(cells[2]), "caveat": plain(cells[3]),
            "evidence_state": "planned", "check_result": None,
            "relation_type": "same_tag" if check_id.startswith("M") else "deterministic_check" if check_id == "X08" else "diagnostic" if check_id in {"X06", "X07"} else "consistency_check",
            "sources": [{"label": "能力对应表 §5", "href": "../SURE-Tagger模型能力对应表.md#5-链路交叉验证"}],
        }
        checks["producerChecks" if check_id.startswith("M") else "crossChecks"].append(entry)
    ids = [entry["id"] for group in checks.values() for entry in group]
    if not ids or len(ids) != len(set(ids)):
        raise ValueError("SURE checks must be nonempty with unique IDs")
    return {"profile": matrix["profile"], "result_states": ["agree", "conflict", "insufficient", "unsupported"],
            "public_schema_unchanged": True, "tag_bench_unchanged": True, **checks}


def main() -> None:
    data = build()
    # Escape HTML-significant characters and JS line separators even though the
    # bundle is an external script. No eval, template literals, or runtime fetch.
    payload = json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False)
    for char, escape in (("<", "\\u003c"), (">", "\\u003e"), ("&", "\\u0026"),
                         ("\u2028", "\\u2028"), ("\u2029", "\\u2029")):
        payload = payload.replace(char, escape)
    output = HERE / "data.js"
    output.write_text(
        "// Generated by build_data.py from the reviewed Markdown sources.\n"
        "window.EVIDENCE_DATA = " + payload + ";\n",
        encoding="utf-8",
    )
    (HERE / "sure_cross_checks.json").write_text(json.dumps(data["sureChecks"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    meta = data["meta"]
    print(f"Wrote {output.name}: {meta['rows']} rows, {meta['modelCount']} producers, "
          f"{meta['tagCount']} tags; comparison={'yes' if data['comparison'] is not None else 'no'}")


if __name__ == "__main__":
    main()
