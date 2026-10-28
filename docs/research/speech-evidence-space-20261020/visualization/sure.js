/* Frozen SURE-Tagger public fields; selection describes capability, never accuracy. */
(() => {
  'use strict';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const $ = (id) => document.getElementById(id);
  const labels = {
    'basic_acoustic.duration_sec':'音频时长', 'basic_acoustic.sample_rate_hz':'原始采样率', 'basic_acoustic.channels':'原始声道数',
    'basic_acoustic.silence_segments':'未检测到人声的区间', 'basic_acoustic.nonspeech_ratio':'非人声时长占比',
    'audio_quality.snr_db':'估计信噪比', 'audio_quality.dnsmos_sig':'语音质量评分', 'audio_quality.dnsmos_bak':'背景质量评分',
    'audio_quality.dnsmos_ovrl':'整体质量评分', 'audio_quality.dnsmos_p808':'P.808 整体评分',
    'room_acoustic.rt60_sec':'估计混响时间', 'room_acoustic.c50_db':'估计语音清晰度', 'room_acoustic.far_field':'远场属性 · 待确认',
    'sound_field_scene.speech_music_events':'语音 / 歌声 / 音乐类别', 'sound_field_scene.music_present':'是否含音乐',
    'sound_field_scene.external_noise_type':'外部噪声类别', 'sound_field_scene.noise_composition':'噪声成分',
    'speaker.speaker_count':'说话人数', 'speaker.speaker_present':'是否有人声', 'speaker.multi_speaker':'是否多人',
    'speaker.speaker_change_count':'说话人切换次数', 'speaker.speaker_change':'是否发生切换', 'speaker.overlap_ratio':'重叠语音占比',
    'speaker.speaker_overlap':'是否有重叠语音', 'speaker.profiles':'说话人画像', 'speaker.profiles[].speech_rate':'说话人语速摘要',
    'speaker.profiles[].pitch':'说话人音高摘要', 'speaker.profiles[].speaker_volume':'说话人音量摘要', 'speaker.profiles[].gender':'说话人性别字段',
    'speaker.asr_transcript':'整段语音转写', 'speaker.speaker_transcripts':'按说话人汇总转写',
    'language_content.language':'音频语言', 'language_content.word_count':'文本词数', 'language_content.punctuation':'文本标点',
    'language_content.repetition':'文本重复', 'language_content.filler':'文本填充词',
    'deterministic_derived.speaker_change_rate_per_min':'每分钟说话人切换率', 'deterministic_derived.filler_ratio':'填充词占比'
  };
  const roleNames = {public_replace:'公共 producer / 替代入口', public_derived:'公共字段派生', conditional_candidate:'条件候选', sidecar_only:'研究 sidecar', deferred:'未确认'};
  const evidenceNames = {observed:'已有运行产物',code_supported:'代码支持',not_run:'尚未运行',planned:'计划待验证'};
  const state = {selected:new Set(), query:'', detail:null, mode:'producers'};
  let rows = [], publicRows = [], sidecarRows = [], fields = [], checks = {producerChecks:[],crossChecks:[]};
  let initialized = false, drawFrame = 0, edges = [];
  const roles = (row) => Array.isArray(row.integration_role) ? row.integration_role : [row.integration_role].filter(Boolean);
  const unavailable = (row) => roles(row).includes('deferred') || String(row.status || '').includes('∅');
  const candidate = (row) => roles(row).includes('conditional_candidate') || String(row.status || '').includes('H') || (!String(row.evidence_state).includes('observed') && String(row.evidence_state).includes('planned'));
  const fieldName = (path) => labels[path] || path.split('.').pop();
  const checkKind = (item) => ({same_tag:'同 tag 比较',consistency_check:'跨 tag 约束',deterministic_check:'派生自检',diagnostic:'诊断线索'}[item.relation_type || item.role] || (state.mode==='producers'?'同 tag 比较':'跨 tag 约束'));
  const checkTitle = (item) => Object.keys(labels).sort((a,b) => b.length-a.length).reduce((title,path) => title.split(path).join(labels[path]),String(item.title || ''));
  const evidenceLabel = (value) => String(value || 'planned').split('/').map((part) => evidenceNames[part] || part).join(' / ');
  const fieldButtons = (paths) => (paths || []).map((path) => `<button class="sure-field-chip" data-sure-field="${esc(path)}" title="${esc(path)}">${esc(fieldName(path))}</button>`).join('');

  function initialize() {
    const host = $('sure-view');
    if (!host || !window.EVIDENCE_DATA?.sureCapability) return false;
    rows = (window.EVIDENCE_DATA.sureCapability.rows || []).map((row,index) => ({...row,id:row.id || `sure-row-${index}`,public_tags:row.public_tags || [],sidecar_tags:row.sidecar_tags || []}));
    publicRows = rows.filter((row) => row.public_tags.length);
    sidecarRows = rows.filter((row) => !row.public_tags.length);
    fields = [...new Set(publicRows.flatMap((row) => row.public_tags))];
    const source = window.EVIDENCE_DATA.sureChecks || {};
    checks = {producerChecks:source.producerChecks || [],crossChecks:source.crossChecks || []};
    host.innerHTML = `
      <div class="sure-intro"><div><div class="section-kicker">SURE-TAGGER / PUBLIC FIELD CAPABILITIES</div><h2>固定 tags，看清产出与互检。</h2><p>以 SURE-Tagger 公共字段为目标，选择模型或完整路径，查看对应字段与一致性检查。覆盖表示有产出依据，准确率与互检效果仍需评测。</p></div><a class="secondary-button" href="../SURE-Tagger模型能力对应表.md" target="_blank" rel="noopener">阅读对应表 ↗</a></div>
      <div class="sure-contract"><span><i></i>公共 tag-schema 保持原样</span><span>Tag-Bench 保持原样</span><span>细粒度研究证据存入 sidecar</span></div>
      <div class="sure-workspace"><aside class="sure-sidebar">
        <div class="sure-side-block"><div class="section-kicker">01 / SELECT PATHS</div><h3>组合与公共字段</h3><p class="sure-muted">点击左侧路径，可多选。含“+”的节点表示完整组合；“/”表示路由或备选。</p><div class="sure-selection-title"><span>已选 <b id="sure-selected-count">0</b> 条路径</span><button class="text-button" data-sure-clear>清空</button></div><div id="sure-selection-chips" class="selected-chips"></div><div class="sure-stats" aria-live="polite"><div><strong id="sure-supported">0</strong><span>有依据关联</span></div><div><strong id="sure-candidate">0</strong><span>仅候选关联</span></div><div><strong id="sure-remaining">0</strong><span>未关联</span></div></div><p class="sure-muted sure-count-note">按完整公共字段路径计数；候选单列，研究 sidecar 不计覆盖。</p></div>
        <div id="sure-detail" class="sure-side-block sure-detail"></div>
      </aside><div class="sure-graph-panel">
        <div class="sure-panel-heading"><div><h3>模型路径 → 公共字段</h3><p>选择后高亮关联；点击字段查看来源与两类互检。</p></div><span class="pill">固定公共 schema</span></div>
        <div class="sure-toolbar"><label class="search-box"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="m12 12 5 5"/></svg><input id="sure-search" type="search" placeholder="搜索模型、字段路径或中文含义…" aria-label="搜索 SURE-Tagger 模型路径与字段"></label><button class="secondary-button" data-sure-clear>清空选择</button></div>
        <div class="sure-column-headings"><span>模型 / 完整路径 <b id="sure-model-count"></b></span><span>公共字段 <b id="sure-field-count"></b></span></div>
        <p class="sure-scroll-hint">左右滑动图谱，查看完整的模型与公共字段连接 ↔</p><div class="sure-graph-scroll" id="sure-graph-scroll" tabindex="0" aria-label="SURE-Tagger 模型字段图，可左右及上下滚动"><div id="sure-canvas" class="sure-canvas"><svg id="sure-connections" aria-hidden="true"></svg><div id="sure-models" class="sure-node-column sure-model-column"></div><div id="sure-fields" class="sure-node-column sure-field-column"></div></div><p id="sure-empty" class="empty-state" hidden>没有匹配结果，试试其他关键词。</p></div>
        <div class="sure-legend"><span><i class="line"></i>有依据产出路径</span><span><i class="line dashed"></i>条件候选 / 待验证</span><span>∅ 未确认，不连支持线</span><span id="sure-graph-status" aria-live="polite"></span></div>
        <div class="sure-boundary">实线也不代表已经通过准确率评测。相同 route、父产物或模型内部输出不能直接计为独立证人。</div>
      </div></div>
      <section class="sure-checks-section"><div class="sure-checks-heading"><div><div class="section-kicker">02 / TRACE CONSISTENCY</div><h2>两种交叉检查，各自回答不同的问题。</h2><p>同 tag 比较产出路径的差异；跨 tag 检查语义约束。检查方案用于定位冲突与缺失，尚不代表验证通过。</p></div><div class="sure-check-tabs" role="group" aria-label="选择互检类型"><button data-sure-mode="producers" aria-pressed="true">同一 tag · 多路径 <b>${checks.producerChecks.length}</b></button><button data-sure-mode="tags" aria-pressed="false">不同 tag · 互相约束 <b>${checks.crossChecks.length}</b></button></div></div><div id="sure-check-list" class="sure-check-list"></div></section>
      <details class="sure-sidecars"><summary>研究 sidecar · ${sidecarRows.length} 条独立路径，不计公共覆盖 <span>展开能力与边界 ↓</span></summary><p>词 / 音素时间、情绪、声质、音乐结构和关系类证据按研究合同保存。不能仅因名称相关就映射到现有公共 tags。</p><div id="sure-sidecar-list" class="sure-sidecar-list"></div></details>`;
    host.addEventListener('click', onClick);
    $('sure-search').addEventListener('input',(event) => {state.query=event.target.value;renderGraph();});
    $('sure-sidecar-list').innerHTML = sidecarRows.map((row) => `<article class="sure-sidecar-card"><h3>${esc(row.producer)}</h3><div class="sure-code-list">${row.sidecar_tags.map((tag) => `<code>${esc(tag)}</code>`).join('')}</div><p>${esc(row.scope_zh || row.scope)}</p><p class="sure-caveat">${esc(row.limits_zh || row.limits)}</p><span class="sure-evidence">${esc(evidenceLabel(row.evidence_state))} · 非公共字段</span></article>`).join('');
    initialized = true;
    return true;
  }

  function coverage() {
    const chosen=publicRows.filter((row) => state.selected.has(row.id) && !unavailable(row));
    const supported=new Set(chosen.filter((row) => !candidate(row)).flatMap((row) => row.public_tags));
    const pending=new Set(chosen.filter(candidate).flatMap((row) => row.public_tags).filter((field) => !supported.has(field)));
    return {supported,pending,all:new Set([...supported,...pending])};
  }

  function render() {
    if (!initialized && !initialize()) return;
    const found = coverage();
    $('sure-selected-count').textContent=state.selected.size;
    $('sure-supported').textContent=found.supported.size;
    $('sure-candidate').textContent=found.pending.size;
    $('sure-remaining').textContent=fields.length-found.all.size;
    $('sure-selection-chips').innerHTML=state.selected.size ? publicRows.filter((row) => state.selected.has(row.id)).map((row) => `<button class="selected-chip" data-sure-row="${esc(row.id)}" aria-label="移除 ${esc(row.producer)}"><span>${esc(row.producer)}</span><b aria-hidden="true">×</b></button>`).join('') : '<p class="sure-muted">尚未选择。图中显示全部候选关联。</p>';
    renderGraph();renderDetail();renderChecks();
  }

  function renderGraph() {
    const q=state.query.trim().toLowerCase(), found=coverage(), selecting=state.selected.size>0;
    const directRows=new Set(publicRows.filter((row) => `${row.producer} ${row.scope_zh || row.scope} ${row.limits_zh || row.limits}`.toLowerCase().includes(q)).map((row) => row.id));
    const directFields=new Set(fields.filter((field) => `${field} ${fieldName(field)}`.toLowerCase().includes(q)));
    const shownRows=publicRows.filter((row) => !q || directRows.has(row.id) || row.public_tags.some((field) => directFields.has(field)));
    const shownFields=fields.filter((field) => !q || directFields.has(field) || publicRows.some((row) => directRows.has(row.id) && row.public_tags.includes(field)));
    shownRows.sort((a,b) => Number(state.selected.has(b.id))-Number(state.selected.has(a.id)));
    const rank=(field) => found.supported.has(field)?0:found.pending.has(field)?1:2;
    shownFields.sort((a,b) => rank(a)-rank(b));
    $('sure-model-count').textContent=shownRows.length;
    $('sure-field-count').textContent=shownFields.length;
    $('sure-models').innerHTML=shownRows.map((row) => {
      const selected=state.selected.has(row.id), blocked=unavailable(row), pending=candidate(row);
      return `<button class="sure-node sure-model ${selected?'is-selected':selecting?'is-dimmed':''} ${pending?'is-candidate':''} ${blocked?'is-unavailable':''}" data-sure-row="${esc(row.id)}" aria-pressed="${selected}" ${blocked?'disabled':''} title="${esc(row.scope_zh || row.scope)}"><span class="sure-checkbox" aria-hidden="true">${blocked?'∅':selected?'✓':''}</span><span class="sure-node-text"><strong>${esc(row.producer)}</strong><small>${esc(blocked?'未确认 · 不计支持':roles(row).filter((role) => role!=='sidecar_only').map((role) => roleNames[role] || role).join(' / '))}</small><span class="sure-evidence">${esc(evidenceLabel(row.evidence_state))}</span></span></button>`;
    }).join('');
    $('sure-fields').innerHTML=shownFields.map((field) => {
      const blocked=!publicRows.some((row) => row.public_tags.includes(field) && !unavailable(row));
      const active=found.supported.has(field), pending=found.pending.has(field);
      return `<button class="sure-node sure-field ${active?'is-active':pending?'is-candidate is-active':selecting?'is-dimmed':''} ${state.detail===field?'is-focused':''} ${blocked?'is-unavailable':''}" data-sure-field="${esc(field)}" aria-pressed="${state.detail===field}"><span class="sure-node-text"><strong>${esc(fieldName(field))}</strong><code>${esc(field)}</code></span><span class="sure-field-state">${blocked?'∅':active?'已关联':pending?'候选':''}</span></button>`;
    }).join('');
    const visibleFields=new Set(shownFields);
    edges=shownRows.filter((row) => !unavailable(row)).flatMap((row) => row.public_tags.filter((field) => visibleFields.has(field)).map((field) => ({row:row.id,field,active:state.selected.has(row.id),pending:candidate(row)}))).sort((a,b) => Number(a.active)-Number(b.active));
    $('sure-empty').hidden=Boolean(shownRows.length || shownFields.length);
    $('sure-canvas').hidden=!shownRows.length&&!shownFields.length;
    $('sure-graph-status').textContent=selecting ? `${state.selected.size} 条已选路径 · ${found.all.size} 个关联字段` : `${publicRows.length} 条路径 · ${fields.length} 个公共字段路径`;
    resize();
  }

  function renderDetail() {
    const host=$('sure-detail');
    if (!state.detail) {host.innerHTML='<div class="section-kicker">INSPECT / FIELD DETAILS</div><h3>查看字段与互检</h3><p class="sure-muted">点击右侧字段，查看产出路径、边界，以及与其他路径或 tags 的检查关系。</p>';return;}
    const paths=publicRows.filter((row) => row.public_tags.includes(state.detail));
    const same=checks.producerChecks.filter((item) => (item.public_tags || []).includes(state.detail));
    const cross=checks.crossChecks.filter((item) => (item.public_tags || []).includes(state.detail));
    const mini=(items) => items.length ? items.map((item) => `<article class="sure-mini-check"><strong>${esc(checkTitle(item))}</strong><span class="sure-evidence">${esc(checkKind(item))} · 待评测</span><p>${esc(item.rule)}</p><p class="sure-caveat">${esc(item.caveat)}</p></article>`).join('') : '<p class="sure-muted">当前未整理该字段的检查方案。</p>';
    host.innerHTML=`<button class="text-button sure-close" data-sure-close aria-label="关闭字段详情">×</button><div class="section-kicker">INSPECT / FIELD DETAILS</div><h3>${esc(fieldName(state.detail))}</h3><code class="sure-detail-path">${esc(state.detail)}</code><h4>产出路径与使用边界</h4>${paths.map((row) => `<article class="sure-detail-path-card"><strong>${esc(row.producer)}</strong><p>${esc(row.scope_zh || row.scope)}</p><p class="sure-caveat">${esc(row.limits_zh || row.limits)}</p><span class="sure-evidence">${esc(evidenceLabel(row.evidence_state))}</span>${row.sidecar_tags.length?`<p class="sure-muted">另存 sidecar：${row.sidecar_tags.map((tag) => `<code>${esc(tag)}</code>`).join('、')}</p>`:''}${unavailable(row)?'<p class="sure-caveat">暂无确认 producer，公共值保留 null。</p>':`<button class="text-button" data-sure-row="${esc(row.id)}">${state.selected.has(row.id)?'移除此路径 −':'加入此路径 +'}</button>`}</article>`).join('')}<h4>同 tag · 多路径比较 (${same.length})</h4>${mini(same)}<h4>跨 tag · 语义约束 (${cross.length})</h4>${mini(cross)}`;
  }

  function renderChecks() {
    const list=state.mode==='producers'?checks.producerChecks:checks.crossChecks;
    document.querySelectorAll('#sure-view [data-sure-mode]').forEach((button) => button.setAttribute('aria-pressed',String(button.dataset.sureMode===state.mode)));
    const found=coverage();
    $('sure-check-list').innerHTML=list.length?list.map((item) => {
      const relevant=(item.public_tags || []).some((field) => found.all.has(field));
      return `<article class="sure-check-card ${relevant?'is-relevant':''}"><div class="sure-check-card-heading"><h3>${esc(checkTitle(item))}</h3><span>${esc(checkKind(item))} · 待评测</span></div><div class="sure-check-branches">${(item.branches || []).map((branch,index) => `${index?'<i aria-hidden="true">⇄</i>':''}<span>${esc(branch)}</span>`).join('')}</div><div class="sure-check-fields">${fieldButtons(item.public_tags)}</div><p class="sure-check-rule">${esc(item.rule)}</p><p class="sure-caveat">${esc(item.caveat)}</p><div class="sure-check-card-foot"><span>${esc(evidenceLabel(item.evidence_state))}</span>${relevant?'<b>与所选组合有关</b>':''}</div></article>`;
    }).join(''):'<p class="sure-muted">尚无已整理的检查方案。</p>';
  }

  function onClick(event) {
    const button=event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-sure-clear')) {state.selected.clear();render();return;}
    if (button.hasAttribute('data-sure-close')) {state.detail=null;renderGraph();renderDetail();return;}
    if (button.dataset.sureMode) {state.mode=button.dataset.sureMode;renderChecks();return;}
    if (button.dataset.sureField) {
      const field=button.dataset.sureField;
      if (!fields.includes(field)) return;
      state.detail=field;renderGraph();renderDetail();
      if (button.classList.contains('sure-field')) [...$('sure-fields').querySelectorAll('[data-sure-field]')].find((node) => node.dataset.sureField===field)?.focus({preventScroll:true});
      if (button.classList.contains('sure-field-chip')) $('sure-detail').scrollIntoView({behavior:'smooth',block:'nearest'});
      return;
    }
    if (button.dataset.sureRow) {
      const row=publicRows.find((item) => item.id===button.dataset.sureRow);
      if (!row || unavailable(row)) return;
      if (state.selected.has(row.id)) state.selected.delete(row.id); else state.selected.add(row.id);
      render();
      $('sure-graph-scroll').scrollTop=0;
      const match=[...$('sure-models').querySelectorAll('[data-sure-row]')].find((node) => node.dataset.sureRow===row.id);
      match?.focus({preventScroll:true});
    }
  }

  function draw() {
    const canvas=$('sure-canvas');
    if (!canvas || canvas.hidden || $('sure-view').hidden) return;
    const rect=canvas.getBoundingClientRect();
    if (!rect.width) return;
    const positions=new Map();
    canvas.querySelectorAll('.sure-node').forEach((node) => {
      const box=node.getBoundingClientRect();
      const key=node.dataset.sureRow?`row:${node.dataset.sureRow}`:`field:${node.dataset.sureField}`;
      positions.set(key,{left:box.left-rect.left,right:box.right-rect.left,y:box.top-rect.top+box.height/2});
    });
    const svg=$('sure-connections');
    svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
    svg.innerHTML=edges.map((edge) => {
      const start=positions.get(`row:${edge.row}`),end=positions.get(`field:${edge.field}`);
      if (!start || !end) return '';
      const bend=Math.max(40,(end.left-start.right)*0.48);
      return `<path class="sure-edge ${edge.active?'is-active':state.selected.size?'is-dimmed':''} ${edge.pending?'is-candidate':''}" d="M ${start.right} ${start.y} C ${start.right+bend} ${start.y}, ${end.left-bend} ${end.y}, ${end.left} ${end.y}"/>`;
    }).join('');
  }

  function resize() {cancelAnimationFrame(drawFrame);drawFrame=requestAnimationFrame(draw);}
  window.SureView={render,resize};
  window.addEventListener('resize',resize);
  document.fonts?.ready.then(resize);
})();
