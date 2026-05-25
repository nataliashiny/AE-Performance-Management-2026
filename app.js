// ...existing code...
// Simple squad map renderer using D3 force simulation and plain SVG. Accessible and easy to modify.

const svg = d3.select('#viz');
const width = +svg.node().getBoundingClientRect().width;
const height = +svg.node().getBoundingClientRect().height;
const tooltip = d3.select('#tooltip');

let data;
let simulation;
let linkGroup, nodeGroup, squadGroup;

function loadData() {
  return fetch('data/squads.json').then(r => r.json()).then(d => { data = d; });
}

function initControls() {
  const filter = document.getElementById('filterSquad');
  const search = document.getElementById('searchMember');
  const toggleLinks = document.getElementById('toggleLinks');
  const exportBtn = document.getElementById('exportBtn');

  // populate squads
  data.squads.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id; opt.textContent = s.name; filter.appendChild(opt);
  });

  filter.addEventListener('change', () => render(filter.value, search.value, toggleLinks.checked));
  search.addEventListener('input', () => render(filter.value, search.value, toggleLinks.checked));
  toggleLinks.addEventListener('change', () => render(filter.value, search.value, toggleLinks.checked));
  exportBtn.addEventListener('click', exportPNG);
}

function buildGraph(filterSquad, searchText) {
  // nodes are members, squads are grouping boxes
  const nodes = data.members.map(m => Object.assign({}, m));
  const links = [];
  data.members.forEach(m => {
    (m.links||[]).forEach(targetId => {
      if (nodes.find(n=>n.id===targetId)) links.push({source: m.id, target: targetId});
    });
    if (m.managerId) links.push({source: m.id, target: m.managerId});
  });

  // filter members
  const filtered = nodes.filter(n => {
    if (filterSquad && n.squadId !== filterSquad) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      return n.name.toLowerCase().includes(s) || (n.role||'').toLowerCase().includes(s);
    }
    return true;
  });

  const visibleIds = new Set(filtered.map(d=>d.id));
  const visibleLinks = links.filter(l => visibleIds.has(l.source) && visibleIds.has(l.target));
  return {nodes: filtered, links: visibleLinks};
}

function render(filterSquad='', searchText='', showLinks=true) {
  const graph = buildGraph(filterSquad, searchText);

  svg.selectAll('*').remove();
  linkGroup = svg.append('g').attr('class','links');
  nodeGroup = svg.append('g').attr('class','nodes');

  if (showLinks) {
    linkGroup.selectAll('line')
      .data(graph.links)
      .enter().append('line')
      .attr('class','link')
      .attr('stroke-width',1.2);
  }

  const node = nodeGroup.selectAll('.node')
    .data(graph.nodes, d => d.id)
    .enter().append('g')
    .attr('class','node')
    .attr('tabindex',0)
    .on('mouseover', showTooltip)
    .on('mousemove', moveTooltip)
    .on('mouseout', hideTooltip)
    .on('click', d => pinNode(d))
    .on('keydown', (event,d) => { if (event.key === 'Enter') pinNode(d); });

  node.append('circle').attr('r', 18).attr('fill', d=>colorForSquad(d.squadId));
  node.append('text').attr('y',5).attr('x',22).text(d=>d.name);

  if (simulation) simulation.stop();

  simulation = d3.forceSimulation(graph.nodes)
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(width/2, height/2))
    .force('link', d3.forceLink(graph.links).id(d=>d.id).distance(90).strength(0.7))
    .force('collide', d3.forceCollide(30))
    .on('tick', ticked);

  function ticked() {
    if (showLinks) linkGroup.selectAll('line')
      .attr('x1', d=>d.source.x)
      .attr('y1', d=>d.source.y)
      .attr('x2', d=>d.target.x)
      .attr('y2', d=>d.target.y);

    node.attr('transform', d=>`translate(${d.x},${d.y})`);
  }
}

function colorForSquad(squadId){
  const palette = ['#60a5fa','#34d399','#f97316','#a78bfa','#f59e0b','#ef4444'];
  const idx = Math.abs(hashCode(squadId || '')) % palette.length;
  return palette[idx];
}

function hashCode(str){
  let h=0; for(let i=0;i<str.length;i++) h = ((h<<5)-h) + str.charCodeAt(i) | 0; return h;
}

function showTooltip(event,d){
  tooltip.style('display','block').attr('hidden',null).html(`<strong>${d.name}</strong><div>${d.role||''}</div><div>Squad: ${squadName(d.squadId)}</div>`);
}
function moveTooltip(event){
  tooltip.style('left', (event.pageX+12)+'px').style('top', (event.pageY+12)+'px');
}
function hideTooltip(){ tooltip.style('display','none').attr('hidden',true); }

let pinned = null;
function pinNode(d){
  pinned = pinned && pinned.id === d.id ? null : d;
  if (pinned) {
    d.fx = d.x; d.fy = d.y;
  } else {
    d.fx = null; d.fy = null;
  }
}

function squadName(id){
  const s = data.squads.find(x=>x.id===id); return s? s.name : '—';
}

function exportPNG(){
  const svgNode = document.querySelector('#viz');
  const serializer = new XMLSerializer();
  const src = serializer.serializeToString(svgNode);
  const img = new Image();
  const svgBlob = new Blob([src], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svgNode.clientWidth; canvas.height = svgNode.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0);
    URL.revokeObjectURL(url);
    const a = document.createElement('a');
    a.download = 'squad-map.png'; a.href = canvas.toDataURL('image/png'); a.click();
  };
  img.src = url;
}

// bootstrap
loadData().then(()=>{ initControls(); render(); }).catch(e=>console.error(e));

// ...existing code...
