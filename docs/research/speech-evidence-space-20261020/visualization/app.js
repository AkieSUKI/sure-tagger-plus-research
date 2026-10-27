/* The table's AND/OR requirements are evaluated before any tag is highlighted. */
(() => {
  'use strict';
  const data = window.EVIDENCE_DATA;
  const $ = (id) => document.getElementById(id);
  if (!data) {
    $('graph-empty').hidden = false;
    $('graph-empty').textContent = '未能读取图谱数据。请将 index.html、data.js、app.js 和 styles.css 保存在同一目录。';
    return;
  }
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const modelMap = new Map(data.models.map((item) => [item.id, item]));
  const tagMap = new Map(data.tags.map((item) => [item.id, item]));
  const rowMap = new Map(data.rows.map((item) => [item.id, item]));
  const layerColors = {L1:'#519a7a', L2:'#7185b7', L3:'#b39763', L4:'#a782a8', L5:'#77a3ac', L6:'#c18c77'};
  const categories = {all:'全部变化',added:'新增语义',refined:'细化 / 新路径',retained:'保留映射',omitted:'未列为音频标签',derived:'转为派生',metadata:'转为元数据',descriptive:'描述性输出',deferred:'继续暂缓'};
  const checkCategories = {all:'全部关系',language:'语言 × 转写',alignment:'时间与归属',event:'事件与活动',acoustic:'声学解释',quality:'质量与结果'};
  const state = {selected:new Set(),query:'',layer:'all',focusOnly:false,detailTag:null,category:'all',comparisonQuery:'',checkCategory:'all',checksQuery:'',view:'graph'};
  let coverage;
  let drawnEdges = [];
  let drawFrame = 0;
  let toastTimer;
  const isCandidate = (row) => row.candidate || row.status.includes('H');
  const isUnavailable = (row) => row.unavailable || row.status.includes('不可调用');
  const members = (row) => row.requirements.flat();
  const satisfies = (row, selected) => !row.unconfirmed && !isUnavailable(row) && row.requirements.length > 0 && row.requirements.every((group) => group.some((id) => selected.has(id)));

  function evaluate(selected) {
    const complete = data.rows.filter((row) => satisfies(row, selected));
    const supported = new Set(complete.filter((row) => !isCandidate(row)).flatMap((row) => row.tags));
    const candidate = new Set(complete.filter(isCandidate).flatMap((row) => row.tags).filter((id) => !supported.has(id)));
    return {complete, supported, candidate, all:new Set([...supported, ...candidate])};
  }

  function labelForRow(row) {
    const groups = row.requirements.map((group) => group.map((id) => modelMap.get(id).label).join(' / '));
    return `${groups.join(' + ') || '∅ 尚无确认模型'} [${row.status}]`;
  }

  function selectRow(rowId, add = false) {
    const row = rowMap.get(rowId);
    if (!row || row.unconfirmed || isUnavailable(row)) return;
    if (!add) state.selected.clear();
    for (const group of row.requirements) {
      if (!group.some((id) => state.selected.has(id))) state.selected.add(group[0]);
    }
    $('preset').value = rowId;
    // A preset should be visible even after an unrelated search or layer filter.
    state.query = ''; state.layer = 'all';
    $('graph-search').value = ''; $('layer').value = 'all';
    renderSelection();
    $('graph-scroll').scrollTop = 0;
  }

  function toggleModel(id) {
    if (!modelMap.has(id) || modelMap.get(id).unavailable) return;
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    $('preset').value = '';
    renderSelection();
    $(`node-${id}`)?.focus({preventScroll:true});
  }

  function renderSelection() {
    coverage = evaluate(state.selected);
    $('selected-count').textContent = state.selected.size;
    $('selected-chips').innerHTML = state.selected.size ? [...state.selected].map((id) => `<button class="selected-chip" data-remove="${esc(id)}" aria-label="移除 ${esc(modelMap.get(id).label)}"><span>${esc(modelMap.get(id).label)}</span><b aria-hidden="true">×</b></button>`).join('') : '<p class="small-note">尚未选择。点击左侧模型节点开始组合。</p>';
    $('supported-count').textContent = coverage.supported.size;
    $('candidate-count').textContent = coverage.candidate.size;
    $('remaining-count').textContent = data.tags.length - coverage.all.size;
    $('supported-bar').style.width = `${100 * coverage.supported.size / data.tags.length}%`;
    $('candidate-bar').style.width = `${100 * coverage.candidate.size / data.tags.length}%`;
    renderGraph();
    renderDetail();
  }

  function visibleItems() {
    const query = state.query.trim().toLowerCase();
    const matches = (item) => `${item.id} ${item.label} ${item.description}`.toLowerCase().includes(query);
    const matchedModels = new Set(data.models.filter(matches).map((item) => item.id));
    const matchedTags = new Set(data.tags.filter(matches).map((item) => item.id));
    const relatedTags = new Set(data.rows.filter((row) => members(row).some((id) => matchedModels.has(id))).flatMap((row) => row.tags));
    const relatedModels = new Set(data.rows.filter((row) => row.tags.some((id) => matchedTags.has(id))).flatMap(members));
    let tags = data.tags.filter((item) => state.layer === 'all' || item.layer === state.layer);
    if (query) tags = tags.filter((item) => matchedTags.has(item.id) || relatedTags.has(item.id));
    if (state.focusOnly) tags = tags.filter((item) => coverage.all.has(item.id));
    const shownTagIds = new Set(tags.map((item) => item.id));
    const inLayerModels = new Set(data.rows.filter((row) => row.tags.some((id) => shownTagIds.has(id))).flatMap(members));
    let models = data.models.filter((item) => state.layer === 'all' || inLayerModels.has(item.id));
    if (query) models = models.filter((item) => matchedModels.has(item.id) || relatedModels.has(item.id));
    if (state.focusOnly) models = models.filter((item) => state.selected.has(item.id));
    // Keep selected nodes and their covered tags at the top, with original order as tie-breaker.
    models.sort((a,b) => Number(state.selected.has(b.id)) - Number(state.selected.has(a.id)));
    const rank = (tag) => coverage.supported.has(tag.id) ? 0 : coverage.candidate.has(tag.id) ? 1 : 2;
    tags.sort((a,b) => rank(a) - rank(b));
    return {models,tags};
  }

  function renderGraph() {
    const {models,tags} = visibleItems();
    const selecting = state.selected.size > 0;
    $('visible-model-count').textContent = models.length;
    $('visible-tag-count').textContent = tags.length;
    $('model-nodes').innerHTML = models.map((model) => {
      const selected = state.selected.has(model.id);
      const classes = ['node',selected?'selected':selecting?'dimmed':'',model.unavailable?'unavailable':''].join(' ');
      return `<button class="${classes}" data-model="${esc(model.id)}" id="node-${esc(model.id)}" aria-pressed="${selected}" ${model.unavailable?'disabled':''} title="${esc(model.description)}${model.generic?'（泛称节点，具体实现需另选）':''}"><span class="checkmark" aria-hidden="true">✓</span><span class="node-text"><strong>${esc(model.label)}</strong><code>${esc(model.id)}</code></span>${model.unavailable?'<span class="node-status">不可调用</span>':''}</button>`;
    }).join('');
    $('tag-nodes').innerHTML = tags.map((tag) => {
      const supported = coverage.supported.has(tag.id), candidate = coverage.candidate.has(tag.id);
      const classes = ['node',supported?'active':candidate?'candidate':selecting?'dimmed':'',state.detailTag === tag.id?'focused':''].join(' ');
      const status = tag.unconfirmed?'∅ 待确认':supported?'已关联':candidate?'候选':tag.layer;
      return `<button class="${classes}" data-tag="${esc(tag.id)}" id="node-${esc(tag.id)}" style="--layer-color:${layerColors[tag.layer]}" aria-pressed="${state.detailTag === tag.id}" title="${esc(tag.description)}"><span class="layer-dot" aria-hidden="true"></span><span class="node-text"><strong>${esc(tag.label)}</strong><code>${esc(tag.id)}</code></span><span class="node-status ${tag.unconfirmed?'gap-status':''}">${status}</span></button>`;
    }).join('');
    const modelIds = new Set(models.map((item) => item.id));
    const tagIds = new Set(tags.map((item) => item.id));
    const completeIds = new Set(coverage.complete.map((row) => row.id));
    const pairs = new Map();
    for (const row of data.rows) {
      for (const model of members(row)) {
        if (!modelIds.has(model)) continue;
        for (const tag of row.tags) {
          if (!tagIds.has(tag)) continue;
          const key = `${model}:${tag}`;
          const level = completeIds.has(row.id) && state.selected.has(model) ? (isCandidate(row)?1:2) : 0;
          const existing = pairs.get(key);
          if (!existing) pairs.set(key,{model,tag,level,onlyCandidate:isCandidate(row) || isUnavailable(row)});
          else { existing.level = Math.max(existing.level,level); existing.onlyCandidate &&= isCandidate(row) || isUnavailable(row); }
        }
      }
    }
    drawnEdges = [...pairs.values()].sort((a,b) => a.level - b.level);
    $('graph-empty').hidden = models.length + tags.length > 0;
    $('graph-empty').textContent = state.focusOnly && !state.selected.size ? '先选择一个模型或预设组合，再查看关联。' : '没有匹配的模型或标签。试试其他关键词或标签层。';
    $('graph-canvas').hidden = models.length + tags.length === 0;
    $('graph-status').textContent = selecting ? `${coverage.complete.length} 条完整路径 · ${coverage.all.size} 类标签` : '总览模式 · 选择模型以突出关系';
    scheduleDraw();
  }

  function scheduleDraw() {
    cancelAnimationFrame(drawFrame);
    drawFrame = requestAnimationFrame(drawConnections);
  }

  function drawConnections() {
    if (state.view !== 'graph' || $('graph-canvas').hidden) return;
    const canvas = $('graph-canvas');
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const positions = new Map();
    canvas.querySelectorAll('.node').forEach((node) => {
      const box = node.getBoundingClientRect();
      positions.set(node.id.slice(5),{left:box.left-rect.left,right:box.right-rect.left,y:box.top-rect.top+box.height/2});
    });
    $('connections').setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
    $('connections').innerHTML = drawnEdges.map((edge) => {
      const from = positions.get(edge.model), to = positions.get(edge.tag);
      if (!from || !to) return '';
      const bend = Math.max(35,(to.left-from.right)*.48);
      const classes = edge.level === 2?'active':edge.level === 1?'candidate':state.selected.size?'dimmed':edge.onlyCandidate?'idle-candidate':'';
      return `<path class="connection ${classes}" data-from="${esc(edge.model)}" data-to="${esc(edge.tag)}" d="M ${from.right} ${from.y} C ${from.right+bend} ${from.y}, ${to.left-bend} ${to.y}, ${to.left} ${to.y}"/>`;
    }).join('');
  }

  function renderDetail() {
    const tag = tagMap.get(state.detailTag);
    if (!tag) {
      $('detail-panel').innerHTML = '<div class="section-kicker">03 / INSPECT THE EVIDENCE</div><h2>查看标签详情</h2><p class="muted">点击右侧标签，查看含义、模型路径与旧版字段的对应关系。</p>';
      return;
    }
    const rows = data.rows.filter((row) => row.tags.includes(tag.id));
    rows.sort((a,b) => Number(satisfies(b,state.selected))-Number(satisfies(a,state.selected)));
    const changes = (data.comparison?.items || []).filter((item) => item.new_tags.includes(tag.id));
    $('detail-panel').innerHTML = `<button class="text-button tag-detail-close" data-close-detail aria-label="关闭标签详情">×</button><div class="section-kicker">03 / INSPECT THE EVIDENCE</div><h2>${esc(tag.label)}</h2><code class="detail-id">${esc(tag.id)}</code><p class="detail-description">${esc(tag.description)}</p><p class="small-note">${esc(tag.layer)} · ${esc(data.meta.layerLabels[tag.layer])} ${tag.unconfirmed?'· 尚无确认模型':''}</p><h3 class="detail-subtitle">${rows.length} 条对应路径</h3>${rows.map((row) => {
      const complete = satisfies(row,state.selected);
      const missing = row.requirements.filter((group) => !group.some((id) => state.selected.has(id)));
      const absent = missing.map((group) => group.map((id) => modelMap.get(id).label).join(' / ')).join(' + ');
      const qualifier = row.qualifiedTags.filter((id) => id === tag.id || id.startsWith(`${tag.id}[`)).join(' / ');
      return `<div class="path-card"><span class="status-badge ${isCandidate(row)?'hypothesis':''}">${esc(row.status)}</span> <span>${row.unconfirmed?'尚无确认模型':isUnavailable(row)?'不可调用':complete?'组合已满足':'组合未满足'}</span><p>${esc(row.modelDescription)}</p><code>${esc(qualifier)}</code><p>${esc(row.tagDescription)}</p>${!complete && !row.unconfirmed && !isUnavailable(row)?`<p>还需：${esc(absent)}</p>`:''}${!row.unconfirmed && !isUnavailable(row)?`<button class="text-button" data-add-row="${esc(row.id)}">${complete?'使用此组合':'补齐此组合'} →</button>`:''}</div>`;
    }).join('')}${changes.length?'<h3 class="detail-subtitle">相对旧版的变化</h3>'+changes.map((item) => `<p class="detail-description">${esc(item.title)}：${esc(item.reason)}</p>`).join(''):''}<p class="small-note" style="margin-top:15px"><a href="../模型与标签对应总表.md" target="_blank" rel="noopener">查看原始关系与限制 ↗</a></p>`;
  }

  function categoryMatch(item) {
    if (state.category === 'all') return true;
    if (state.category === 'omitted') return ['derived','metadata','descriptive','deferred'].includes(item.category);
    return item.category === state.category;
  }

  function sourceLink(source) {
    const href = String(source.href || '');
    if (!href || /^(javascript|data|vbscript):/i.test(href)) return '';
    return `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(source.label)} ↗</a>`;
  }

  function renderComparison() {
    const comparison = data.comparison;
    if (!comparison) {
      $('comparison-summary').textContent = '对比数据尚未生成。请运行 build_data.py 更新数据。';
      $('comparison-list').innerHTML = '<p class="empty-state">缺少 schema_comparison.json 的数据快照。</p>';
      return;
    }
    $('comparison-summary').textContent = comparison.summary;
    const omitted = (item) => ['derived','metadata','descriptive','deferred'].includes(item.category);
    $('comparison-filters').innerHTML = Object.entries(categories).map(([key,label]) => {
      const count = comparison.items.filter((item) => key==='all' || (key==='omitted'?omitted(item):item.category===key)).length;
      return `<button class="${state.category===key?'active':''}" data-category="${key}" aria-pressed="${state.category===key}">${label}<span>${count}</span></button>`;
    }).join('');
    const query = state.comparisonQuery.trim().toLowerCase();
    const order = ['added','refined','retained','derived','metadata','descriptive','deferred'];
    const items = comparison.items.filter((item) => categoryMatch(item) && `${item.title} ${item.old_fields.join(' ')} ${item.new_tags.join(' ')} ${item.reason} ${item.boundary}`.toLowerCase().includes(query)).sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category));
    $('comparison-result-count').textContent = `显示 ${items.length} / ${comparison.items.length} 项分组对比 · 分组数不等于标签类型数`;
    $('comparison-list').innerHTML = items.length?items.map((item) => `<article class="change-card" data-change="${esc(item.id)}"><div class="change-card-header"><h3>${esc(item.title)}</h3><span class="category-badge ${esc(item.category)}">${esc(categories[item.category] || item.category)}</span></div><div class="field-mapping"><div><small>旧版字段</small>${item.old_fields.length?item.old_fields.map((field) => `<code>${esc(field)}</code>`).join(''):'<code>未显式定义</code>'}</div><span class="mapping-arrow">→</span><div><small>当前表达 / 去向</small>${item.new_tags.length?item.new_tags.map((field) => tagMap.has(field)?`<button data-jump-tag="${esc(field)}" title="在图中查看 ${esc(field)}">${esc(field)} ↗</button>`:`<code>${esc(field)}</code>`).join(''):'<code>不新增独立音频标签</code>'}</div></div><p>${esc(item.reason)}</p>${item.boundary?`<p class="boundary">${esc(item.boundary)}</p>`:''}<div class="source-links">${(item.sources || []).map(sourceLink).join('')}</div></article>`).join(''):'<div class="empty-state">没有匹配的字段或变化说明。</div>';
  }

  function renderChecks() {
    const checks = data.crossChecks || [];
    const matchCategory = (item) => state.checkCategory === 'all' || item.category === state.checkCategory;
    const query = state.checksQuery.trim().toLowerCase();
    const matches = (item) => `${item.title} ${item.summary} ${item.rule} ${item.caveat} ${item.nodes.map((node) => `${node.id} ${tagMap.get(node.id)?.label || ''}`).join(' ')}`.toLowerCase().includes(query);
    $('checks-filters').innerHTML = Object.entries(checkCategories).map(([key,label]) => {
      const count = checks.filter((item) => key === 'all' || item.category === key).length;
      return `<button class="${state.checkCategory===key?'active':''}" data-check-category="${key}" aria-pressed="${state.checkCategory===key}">${label}<span>${count}</span></button>`;
    }).join('');
    const items = checks.filter((item) => matchCategory(item) && matches(item));
    $('checks-result-count').textContent = `显示 ${items.length} / ${checks.length} 项跨标签检查 · 用于发现冲突和缺失`;
    $('checks-list').innerHTML = items.length ? items.map((item) => {
      const nodes = item.nodes.map((node) => {
        const tag = tagMap.get(node.id);
        return `<div class="check-flow-node" style="--check-color:${layerColors[tag?.layer] || '#519a7a'}"><button data-jump-tag="${esc(node.id)}" title="在关系图中查看 ${esc(node.id)}"><i class="flow-dot" aria-hidden="true"></i><span class="flow-label">${esc(tag?.label || node.id)}<code>${esc(node.id)}</code></span></button></div>`;
      }).join('<span class="flow-arrow" aria-hidden="true"><svg viewBox="0 0 36 30"><path d="M3 18C12 18 18 8 32 8m-5-4 5 4-5 4M33 12C24 12 18 22 4 22m5-4-5 4 5 4"/></svg></span>');
      const kind = item.kind || '语义检查';
      const branches = (item.branches || []).map((branch) => `<span>${esc(branch)}</span>`).join('');
      return `<article class="check-card"><div class="check-card-header"><h3>${esc(item.title)}</h3><span class="check-kind ${esc(item.strength || '')}">${esc(kind)} · 待评测</span></div><div class="check-flow">${nodes}</div><div class="check-branches">${branches}</div><p>${esc(item.summary)}</p><p class="check-rule"><b>检查思路：</b>${esc(item.rule)}</p><p class="check-caveat"><b>边界：</b>${esc(item.caveat)}</p></article>`;
    }).join('') : '<div class="empty-state">没有匹配的跨标签关系。试试搜索标签 ID 或含义。</div>';
  }

  function setView(view) {
    state.view = view === 'comparison' ? 'comparison' : view === 'checks' ? 'checks' : 'graph';
    $('graph-view').hidden = state.view !== 'graph';
    $('checks-view').hidden = state.view !== 'checks';
    $('comparison-view').hidden = state.view !== 'comparison';
    document.querySelectorAll('[data-view]').forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active));
    });
    if (state.view === 'comparison') renderComparison(); else if (state.view === 'checks') renderChecks(); else scheduleDraw();
  }

  function jumpToTag(id) {
    state.detailTag = id;
    state.query = id; state.layer='all'; state.focusOnly=false;
    $('graph-search').value = id; $('layer').value='all'; $('focus-only').checked=false;
    location.hash='graph'; setView('graph'); renderGraph(); renderDetail();
    $('graph-scroll').scrollTop=0;
    $('graph-view').scrollIntoView({behavior:'auto',block:'start'});
  }

  function exportSelection() {
    const payload = {
      schema:data.meta.version,
      selected_models:[...state.selected],
      supported_tags:[...coverage.supported],
      candidate_only_tags:[...coverage.candidate],
      matched_paths:coverage.complete.map((row) => ({id:row.id,status:row.status,requirements:row.requirements,tags:row.qualifiedTags})),
      source_sha256:data.meta.sourceSha256,
      note:'组合关系与标签覆盖，不代表模型已部署或经过精度验证。限定范围以 matched_paths 为准。'
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json;charset=utf-8'}));
    const anchor = document.createElement('a'); anchor.href=url; anchor.download='speech-evidence-combination.json';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    $('toast').textContent='已导出当前模型组合与覆盖路径'; $('toast').hidden=false;
    clearTimeout(toastTimer); toastTimer=setTimeout(() => {$('toast').hidden=true;},2500);
  }

  $('overview').innerHTML = [[data.models.length,'模型 / 工具'],[data.tags.length,'音频标签'],[data.rows.length,'对应路径'],[data.tags.filter((tag)=>tag.unconfirmed).length,'待补齐类型']].map(([count,label])=>`<div><strong>${count}</strong><span>${label}</span></div>`).join('');
  $('preset').insertAdjacentHTML('beforeend',data.rows.filter((row)=>!row.unconfirmed && !isUnavailable(row)).map((row)=>`<option value="${esc(row.id)}">${esc(labelForRow(row))}</option>`).join(''));
  const quick = [['r03','转写 + 对齐'],['r04','逐人转写'],['r26','语音 + 音质'],['r30','听感评估']];
  $('quick-presets').innerHTML = quick.filter(([id])=>rowMap.has(id)).map(([id,label])=>`<button data-preset="${id}">${label}</button>`).join('');
  document.addEventListener('click',(event) => {
    const target=event.target.closest('button'); if (!target) return;
    if (target.dataset.view) {location.hash=target.dataset.view;setView(target.dataset.view);}
    else if (target.dataset.model) toggleModel(target.dataset.model);
    else if (target.dataset.remove) toggleModel(target.dataset.remove);
    else if (target.dataset.preset) selectRow(target.dataset.preset);
    else if (target.dataset.tag) {state.detailTag=target.dataset.tag;renderGraph();renderDetail();$(`node-${state.detailTag}`)?.focus({preventScroll:true});}
    else if (target.dataset.addRow) {
      const row=rowMap.get(target.dataset.addRow); selectRow(row.id,!satisfies(row,state.selected));
    }
    else if (target.hasAttribute('data-close-detail')) {state.detailTag=null;renderGraph();renderDetail();}
    else if (target.dataset.category) {state.category=target.dataset.category;renderComparison();}
    else if (target.dataset.checkCategory) {state.checkCategory=target.dataset.checkCategory;renderChecks();}
    else if (target.dataset.jumpTag) jumpToTag(target.dataset.jumpTag);
  });
  $('preset').addEventListener('change',(event)=>{if(event.target.value)selectRow(event.target.value);});
  $('clear').addEventListener('click',()=>{state.selected.clear();$('preset').value='';renderSelection();});
  $('export').addEventListener('click',exportSelection);
  $('graph-search').addEventListener('input',(event)=>{state.query=event.target.value;renderGraph();$('graph-scroll').scrollTop=0;});
  $('layer').addEventListener('change',(event)=>{state.layer=event.target.value;renderGraph();$('graph-scroll').scrollTop=0;});
  $('focus-only').addEventListener('change',(event)=>{state.focusOnly=event.target.checked;renderGraph();$('graph-scroll').scrollTop=0;});
  $('comparison-search').addEventListener('input',(event)=>{state.comparisonQuery=event.target.value;renderComparison();});
  $('checks-search').addEventListener('input',(event)=>{state.checksQuery=event.target.value;renderChecks();});
  window.addEventListener('hashchange',()=>setView(location.hash.slice(1)));
  new ResizeObserver(scheduleDraw).observe($('graph-canvas'));
  document.fonts.ready.then(scheduleDraw);
  selectRow('r04');
  setView(location.hash.slice(1));
})();
