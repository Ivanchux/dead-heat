// Carga la simulación en Node y juega partidas con un bot
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync('src/01-sim.js','utf8') + '\n' + fs.readFileSync('src/02-step.js','utf8') +
 '\nthis.api={newGame,step,startLevel,bfs,bfsDist,reachable,passable,W,H,T,DIRS,DIR_LIST,OPP,levelDef,LEVELS};';
const ctx = {console, Math}; vm.createContext(ctx); vm.runInContext(code, ctx);
const A = ctx.api;

function botInput(G, prof){
  const p=G.player; const inp={dir:null,act:false};
  const W=A.W,H=A.H;
  let sx=p.x,sy=p.y; if(p.moving){sx=p.x+A.DIRS[p.dir][0];sy=p.y+A.DIRS[p.dir][1];}
  const scared=G.powerTimer>0;
  // distancia mínima (en tiempo) de cada enemigo vivo a cada casilla
  const et=new Float32Array(W*H).fill(1e9);
  for(const e of G.enemies){ if(e.state!=='live'||e.frozen>0||e.stun>0) continue;
    const dm=A.bfsDist(G,e.x,e.y); const sp=G.def.speed*(e.kind==='skater'?1.2:1);
    for(let i=0;i<W*H;i++) if(dm[i]>=0){ const t=dm[i]/sp; if(t<et[i]) et[i]=t; } }
  const SP=5.0;
  if(p.moving){ const tx=p.x+A.DIRS[p.dir][0],ty=p.y+A.DIRS[p.dir][1]; if((G.embers[ty]&&G.embers[ty][tx])||G.powers.some(pw=>pw.x===tx&&pw.y===ty)){ if(!(et[ty*W+tx]<(1-p.t)/SP+0.3)){ inp.dir=p.dir; return inp; } } }
  // impaciencia: si lleva 12 s sin comer, asume más riesgo
  const b=G._bot||(G._bot={left:-1,t:0}); if(G.emberLeft!==b.left){b.left=G.emberLeft;b.t=G.time;}
  const margin=(G.time-b.t>12)?-0.1:(prof.margin||0.35);
  // BFS restringido por seguridad (solo si no hay power activo)
  const dist=new Int16Array(W*H).fill(-1), first=new Array(W*H).fill(null);
  const q=[[sx,sy]]; dist[sy*W+sx]=0;
  let goal=null;
  const isTarget=(x,y)=>G.embers[y][x]||G.powers.some(pw=>pw.x===x&&pw.y===y);
  while(q.length){ const [x,y]=q.shift(); if(!(x===sx&&y===sy)&&isTarget(x,y)){goal=[x,y];break;}
    for(const d of A.DIR_LIST){ const nx=x+A.DIRS[d][0],ny=y+A.DIRS[d][1]; if(!A.passable(G,nx,ny))continue; const n=ny*W+nx; if(dist[n]!==-1)continue;
      const mt=(dist[y*W+x]+1)/SP; if(!scared && mt+margin>=et[n]) continue;
      dist[n]=dist[y*W+x]+1; first[n]=(x===sx&&y===sy)?d:first[y*W+x]; q.push([nx,ny]); } }
  if(goal){ inp.dir=first[goal[1]*W+goal[0]]; return inp; }
  // sin objetivo seguro: huir al vecino con mayor holgura; calor si hay un enemigo pegado delante
  const opts=A.DIR_LIST.filter(d=>A.passable(G,sx+A.DIRS[d][0],sy+A.DIRS[d][1]));
  let best=null,bs=-1e9;
  for(const d of opts){ const n=(sy+A.DIRS[d][1])*W+sx+A.DIRS[d][0]; const s=et[n]-1/SP; if(s>bs){bs=s;best=d;} }
  inp.dir=best;
  if(prof.useHeat && p.heat>=1){ for(const e of G.enemies){ if(e.state==='live'&&Math.abs(e.x-p.x)+Math.abs(e.y-p.y)<=2){inp.act=true;} } }
  return inp;
}
module.exports={A,botInput};

if(require.main===module){
  const prof={flee:3,useHeat:true};
  const results=[];
  for(let seed=1;seed<=(+process.env.SEEDS||4);seed++){
    for(let lvl=0;lvl<5;lvl++){
      const G=A.newGame({seed,level:lvl,lives:9});
      let ticks=0,maxStuck=0,trap=0,unreach=0,levelUp=false,deaths=0,freezes=0,melts=0; const dt=1/60;
      const lvl0=G.level; let prevLives=G.lives;
      while(ticks<60*240){
        const inp=botInput(G,prof); A.step(G,inp,dt); ticks++;
        for(const e of G.events){ if(e.type==='freeze')freezes++; if(e.type==='melt')melts++; }
        if(G.lives<prevLives){deaths+=prevLives-G.lives;prevLives=G.lives;}
        if(G.level!==lvl0){levelUp=true;break;}
        if(G.over)break;
        if(ticks%30===0){
          const p=G.player; const seen=A.reachable(G,p.x,p.y);
          for(let y=1;y<A.H-1;y++)for(let x=1;x<A.W-1;x++) if(G.grid[y][x]===A.T.FLOOR&&!seen[y*A.W+x]) unreach++;
          for(const e of G.enemies){ maxStuck=Math.max(maxStuck,e.stuck||0);
            if(e.state==='live'){ const n=A.DIR_LIST.filter(d=>A.passable(G,e.x+A.DIRS[d][0],e.y+A.DIRS[d][1])).length; if(n===0&&!e.moving)trap++; } }
        }
      }
      results.push({seed,lvl,levelUp,over:G.over,secs:(ticks/60).toFixed(0),deaths,maxStuck:+maxStuck.toFixed(1),trap,unreach,freezes,melts});
    }
  }
  const fail=results.filter(r=>!r.levelUp||r.trap||r.unreach||r.maxStuck>3);
  console.log('partidas',results.length,'completadas',results.filter(r=>r.levelUp).length,'con problemas',fail.length);
  console.log('muertes medias',(results.reduce((a,r)=>a+r.deaths,0)/results.length).toFixed(1),'freezes medios',(results.reduce((a,r)=>a+r.freezes,0)/results.length).toFixed(1),'melts medios',(results.reduce((a,r)=>a+r.melts,0)/results.length).toFixed(1));
  console.log(fail.slice(0,12));
}
