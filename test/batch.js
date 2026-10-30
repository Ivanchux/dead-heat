// Tanda larga: 5 niveles x N semillas con el bot; mide completado, muertes, enemigos atascados y zonas aisladas
const {A,botInput}=require('./headless.js');
const N=+process.env.SEEDS||6; const rows=[]; let stuckMax=0, unreach=0, trapped=0, melts=0, freezes=0;
for(let seed=1;seed<=N;seed++)for(let lvl=0;lvl<5;lvl++){
  const G=A.newGame({seed:seed*37,level:lvl,lives:9});let t=0,d=0,pl=G.lives;const l0=G.level;
  while(t<60*150){A.step(G,botInput(G,{useHeat:true}),1/60);t++;
    for(const e of G.events){if(e.type==='melt')melts++;if(e.type==='freeze')freezes++;}
    if(G.lives<pl){d+=pl-G.lives;pl=G.lives;}
    if(t%30===0){const p=G.player,seen=A.reachable(G,p.x,p.y);
      for(let y=1;y<A.H-1;y++)for(let x=1;x<A.W-1;x++)if(G.grid[y][x]===0&&!seen[y*A.W+x])unreach++;
      for(const e of G.enemies){stuckMax=Math.max(stuckMax,e.stuck||0);
        if(e.state==='live'&&!e.moving&&A.DIR_LIST.every(k=>!A.passable(G,e.x+A.DIRS[k][0],e.y+A.DIRS[k][1])))trapped++;}}
    if(G.level!==l0||G.over)break;}
  rows.push({seed:seed*37,lvl,res:G.level!==l0?'OK':(G.over?'GAMEOVER':'TIMEOUT'),secs:Math.round(t/60),muertes:d,brasas:G.emberLeft});
}
const ok=rows.filter(r=>r.res==='OK').length;
console.log(JSON.stringify({partidas:rows.length,completadas:ok,porNivel:[0,1,2,3,4].map(l=>rows.filter(r=>r.lvl===l&&r.res==='OK').length+'/'+rows.filter(r=>r.lvl===l).length),maxSegundosEnemigoQuieto:+stuckMax.toFixed(1),muestrasConSueloAislado:unreach,enemigosEncerrados:trapped,derretidos:melts,recongelados:freezes}));
console.log(rows.filter(r=>r.res==='TIMEOUT').map(r=>JSON.stringify(r)).join('\n'));
