const {A,botInput}=require('./headless.js');
const G=A.newGame({seed:1,level:0,lives:9});
const dt=1/60;
for(let i=0;i<60*120;i++){
  const inp=botInput(G,{useHeat:true}); A.step(G,inp,dt);
  if(i%(60*10)===0){const p=G.player;console.log((i/60).toFixed(0)+'s','p',p.x,p.y,p.dir,'left',G.emberLeft,'lives',G.lives,'heat',p.heat,'e',G.enemies.map(e=>e.x+','+e.y).join(' '));}
}
// ¿embers inalcanzables?
const p=G.player; const seen=A.reachable(G,p.x,p.y); let un=[];
for(let y=0;y<A.H;y++)for(let x=0;x<A.W;x++) if(G.embers[y][x]&&!seen[y*A.W+x]) un.push(x+','+y);
console.log('brasas inalcanzables',un.length,un.slice(0,10));
console.log(G.grid.map((r,y)=>r.map((c,x)=>G.embers[y][x]?'.':(c===0?' ':c===1?'#':'X')).join('')).join('\n'));
