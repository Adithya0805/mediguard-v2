'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Atom, Download, FileUp, Pause, Play, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

type Point3 = [number, number, number];
type DataSet = { positions: Point3[][]; boxNm: number; energies?: number[]; name: string; preview: boolean };

function previewData(): DataSet {
  const points: Point3[] = [];
  for (let i = 0; i < 48; i++) points.push([(((i*37)%97)/97)*3.7+.15, (((i*61+13)%89)/89)*3.7+.15, (((i*29+7)%83)/83)*3.7+.15]);
  return { positions:[points], boxNm:4, name:'Illustrative preview (not simulated)', preview:true };
}
function validate(value: unknown): Point3[][] {
  if (!Array.isArray(value) || !value.length || !Array.isArray(value[0]) || !value[0].length) throw new Error('Trajectory must contain frames and particles.');
  const count=value[0].length;
  if (value.length*count>2000000) throw new Error('Import exceeds the 2,000,000 particle-frame limit.');
  return value.map((frame: unknown, fi: number) => {
    if (!Array.isArray(frame) || frame.length!==count) throw new Error('Particle count differs at frame '+fi+'.');
    return frame.map((p: unknown) => {
      if (!Array.isArray(p) || p.length!==3 || !p.every(n=>typeof n==='number' && Number.isFinite(n))) throw new Error('Coordinates must be finite [x,y,z] triples.');
      return p as Point3;
    });
  });
}
function parseCsv(text: string): Point3[][] {
  const lines=text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length<2) throw new Error('CSV needs a header and data rows.');
  const h=lines[0].split(',').map(s=>s.trim().toLowerCase()), ix=h.indexOf('x'), iy=h.indexOf('y'), iz=h.indexOf('z'), fi=h.indexOf('frame'), pi=h.indexOf('particle_index');
  if (ix<0||iy<0||iz<0) throw new Error('CSV requires x,y,z columns.');
  const rows=lines.slice(1).map((line,i)=>{const c=line.split(',').map(s=>s.trim()), xyz=[Number(c[ix]),Number(c[iy]),Number(c[iz])]; if(!xyz.every(Number.isFinite)) throw new Error('Invalid coordinate at row '+(i+2)); return {f:fi<0?0:Number(c[fi]),p:pi<0?i:Number(c[pi]),xyz:xyz as Point3};});
  return Array.from(new Set(rows.map(r=>r.f))).sort((a,b)=>a-b).map(f=>{const g=rows.filter(r=>r.f===f).sort((a,b)=>a.p-b.p); if(new Set(g.map(r=>r.p)).size!==g.length) throw new Error('Duplicate particle index in frame '+f); return g.map(r=>r.xyz);});
}

export default function SimulationStudio() {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [data,setData]=useState<DataSet>(()=>previewData());
  const [frame,setFrame]=useState(0), [playing,setPlaying]=useState(false), [speed,setSpeed]=useState(350), [size,setSize]=useState(5), [colour,setColour]=useState('height');
  const [rotation,setRotation]=useState({x:-.42,y:.62}), [notice,setNotice]=useState('Illustrative preview loaded. Import your saved trajectory.'), [failed,setFailed]=useState(false);
  const drag=useRef<{x:number;y:number;rx:number;ry:number}|null>(null);
  const points=data.positions[Math.min(frame,data.positions.length-1)]||[];
  const draw=useCallback(()=>{
    const canvas=canvasRef.current,ctx=canvas?.getContext('2d'); if(!canvas||!ctx)return;
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.floor(rect.width*dpr));canvas.height=Math.max(1,Math.floor(rect.height*dpr));ctx.scale(dpr,dpr);ctx.fillStyle='#080f1d';ctx.fillRect(0,0,rect.width,rect.height);
    const cx=rect.width/2,cy=rect.height/2,scale=Math.min(rect.width,rect.height)*.32,b=data.boxNm;
    const proj=(p:Point3)=>{const x=(p[0]/b-.5)*2,y=(p[1]/b-.5)*2,z=(p[2]/b-.5)*2,x1=x*Math.cos(rotation.y)-y*Math.sin(rotation.y),y1=x*Math.sin(rotation.y)+y*Math.cos(rotation.y),y2=y1*Math.cos(rotation.x)-z*Math.sin(rotation.x),z2=y1*Math.sin(rotation.x)+z*Math.cos(rotation.x);return{x:cx+(x1-y2*.42)*scale,y:cy+(z2*.86+y2*.5)*scale,d:x1+y2+z2};};
    const c:Point3[]=[[0,0,0],[b,0,0],[b,b,0],[0,b,0],[0,0,b],[b,0,b],[b,b,b],[0,b,b]],edges:[number,number][]=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    ctx.strokeStyle='#49617e';edges.forEach(([a,d])=>{const p=proj(c[a]),q=proj(c[d]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();});
    points.map((p,i)=>({p,i,q:proj(p)})).sort((a,b2)=>a.q.d-b2.q.d).forEach(({p,i,q})=>{const v=colour==='height'?p[2]/b:i/Math.max(1,points.length-1);ctx.beginPath();ctx.fillStyle='hsl('+(270-Math.max(0,Math.min(1,v))*235)+',75%,58%)';ctx.arc(q.x,q.y,size*(.78+(q.d+3)*.04),0,Math.PI*2);ctx.fill();});
    ctx.fillStyle='#8fa6c3';ctx.font='12px sans-serif';ctx.fillText('Drag to rotate · '+b.toFixed(2)+' nm box',16,rect.height-16);
  },[data.boxNm,points,rotation,size,colour]);
  useEffect(()=>{draw();},[draw]);
  useEffect(()=>{if(!playing)return;const t=window.setInterval(()=>setFrame(f=>{if(f>=data.positions.length-1){setPlaying(false);return 0;}return f+1;}),speed);return()=>window.clearInterval(t);},[playing,speed,data.positions.length]);

  async function importFile(file?:File){
    if(!file)return;
    try{
      const text=await file.text();let positions:Point3[][],boxNm=data.boxNm,energies:number[]|undefined;
      if(file.name.toLowerCase().endsWith('.json')){const obj=JSON.parse(text) as {positions?:unknown;box_nm?:number;energies?:unknown};positions=validate(obj.positions);if(typeof obj.box_nm==='number'&&Number.isFinite(obj.box_nm)&&obj.box_nm>0)boxNm=obj.box_nm;if(Array.isArray(obj.energies)&&obj.energies.every(n=>typeof n==='number'&&Number.isFinite(n)))energies=obj.energies as number[];}
      else if(file.name.toLowerCase().endsWith('.csv'))positions=validate(parseCsv(text));else throw new Error('Use JSON or CSV. Convert .npy files in Colab first.');
      setPlaying(false);setData({positions,boxNm,energies,name:file.name,preview:false});setFrame(0);setNotice('Imported '+file.name+': '+positions.length+' frames, '+positions[0].length+' particles per frame.');setFailed(false);
    }catch(e){setNotice(e instanceof Error?e.message:'Import failed.');setFailed(true);}
  }
  function exportFrame(){const rows=['particle_index,x_nm,y_nm,z_nm'];points.forEach((p,i)=>rows.push([i,...p].join(',')));const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='mediguard-simulation-frame-'+(frame+1)+'.csv';a.click();URL.revokeObjectURL(url);}
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><Atom className="h-4 w-4"/>Scientific tools</div><h1 className="text-3xl font-bold text-white">Simulation Studio</h1><p className="mt-2 text-sm text-slate-400">Explore saved particle trajectories independently of clinical records.</p></div><div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200"><Activity className="h-4 w-4"/>Saved-data mode</div></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[['Particles / frame',String(points.length)],['Current frame',(frame+1)+' / '+data.positions.length],['Step label',data.preview?'Preview':String(frame)],['Potential energy',data.energies?.length?data.energies[Math.min(frame,data.energies.length-1)].toFixed(4)+' kJ/mol':'Not provided']].map(([l,v])=><div key={l} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs text-slate-400">{l}</div><div className="mt-3 break-words text-xl font-bold text-slate-100">{v}</div></div>)}</div>
    <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-100"><Activity className="h-4 w-4 text-cyan-300"/>Viewer controls</div>
        <label className="block text-xs text-slate-400">Import trajectory (JSON / CSV)<span className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-3"><FileUp className="h-4 w-4 text-cyan-300"/><input className="min-w-0 w-full text-xs" type="file" accept=".json,.csv" onChange={e=>void importFile(e.target.files?.[0])}/></span></label>
        <div><label htmlFor="sim-speed" className="mb-2 block text-xs text-slate-400">Playback speed</label><select id="sim-speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"><option value="700">0.5×</option><option value="350">1×</option><option value="175">2×</option><option value="90">4×</option></select></div>
        <div><label htmlFor="sim-size" className="mb-2 block text-xs text-slate-400">Particle size: {size}</label><input id="sim-size" type="range" min="2" max="12" value={size} onChange={e=>setSize(Number(e.target.value))} className="w-full accent-cyan-400"/></div>
        <div><label htmlFor="sim-colour" className="mb-2 block text-xs text-slate-400">Colour by</label><select id="sim-colour" value={colour} onChange={e=>setColour(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"><option value="height">Z height</option><option value="index">Particle index</option></select></div>
        <div className="grid grid-cols-2 gap-2"><button onClick={()=>setPlaying(v=>!v)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">{playing?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{playing?'Pause':'Play'}</button><button onClick={()=>setRotation({x:-.42,y:.62})} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"><RotateCcw className="h-4 w-4"/>Reset view</button></div>
        <button onClick={exportFrame} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"><Download className="h-4 w-4"/>Export frame CSV</button>
        <div className={'rounded-xl border p-3 text-xs leading-relaxed '+(failed?'border-rose-500/30 bg-rose-500/10 text-rose-200':'border-emerald-500/20 bg-emerald-500/5 text-emerald-200')}><div className="mb-1 flex items-center gap-2 font-semibold">{failed?<AlertCircle className="h-4 w-4"/>:<CheckCircle2 className="h-4 w-4"/>}{failed?'Import not applied':'Dataset status'}</div>{notice}</div>
      </aside>
      <div className="min-w-0 space-y-4"><section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#080f1d]"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3"><div className="text-sm font-semibold text-slate-100">3D particle viewport</div><div className="text-xs text-slate-400">{data.name} · {data.boxNm.toFixed(2)} nm box</div></div><canvas ref={canvasRef} className="h-[430px] w-full touch-none cursor-grab active:cursor-grabbing" onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,rx:rotation.x,ry:rotation.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!drag.current)return;setRotation({x:drag.current.rx+(e.clientY-drag.current.y)*.008,y:drag.current.ry+(e.clientX-drag.current.x)*.008});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} aria-label="Projected 3D particle view; drag to rotate."/><div className="flex items-center gap-2 border-t border-slate-800 px-4 py-3"><button aria-label="Previous frame" onClick={()=>{setPlaying(false);setFrame(f=>Math.max(0,f-1));}} className="rounded-lg border border-slate-700 p-2">←</button><input aria-label="Trajectory frame" type="range" min="0" max={data.positions.length-1} value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}} className="min-w-24 flex-1 accent-cyan-400"/><button aria-label="Next frame" onClick={()=>{setPlaying(false);setFrame(f=>Math.min(data.positions.length-1,f+1));}} className="rounded-lg border border-slate-700 p-2">→</button><span className="text-xs text-slate-400">{frame+1} / {data.positions.length}</span></div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-100">Potential energy history</h2><span className="text-xs text-slate-500">{data.energies?.length?'Imported energy series':'No energy series provided'}</span></div>{data.energies&&data.energies.length>1?<svg viewBox="0 0 800 180" role="img" aria-label="Potential energy chart" className="h-44 w-full"><line x1="40" y1="12" x2="40" y2="145" stroke="#334155"/><line x1="40" y1="145" x2="780" y2="145" stroke="#334155"/>{(()=>{const a=data.energies as number[],min=Math.min(...a),max=Math.max(...a),span=max-min||1;return <polyline points={a.map((v,i)=>(40+i*740/Math.max(1,a.length-1))+','+(135-(v-min)/span*110)).join(' ')} fill="none" stroke="#22D3EE" strokeWidth="2.5"/>;})()}</svg>:<div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-800 text-center text-sm text-slate-500">Import JSON with an energies array to plot energy values.</div>}<p className="mt-2 text-xs leading-relaxed text-slate-500">Saved-data viewer only. It does not run OpenMM, calculate forces, or provide clinical recommendations.</p></section></div>
    </div>
  </div>;
}
