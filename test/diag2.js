const {A,botInput}=require('./headless.js');
const G=A.newGame({seed:1,level:0,lives:9});
const dt=1/60;
for(let i=0;i<60*96;i++){
  const inp=botInput(G,{useHeat:true}); A.step(G,inp,dt);
  if(i>=60*86 && i%20===0){const p=G.player;console.log((i/60).toFixed(1),'p',p.fx.toFixed(2),p.fy.toFixed(2),p.moving,p.dir,'want',p.want,'in',inp.dir,'dead',p.dead.toFixed(1),'ready',G.ready.toFixed(1),'e',G.enemies.map(e=>e.x+','+e.y+' '+e.state+' st'+e.stun.toFixed(1)+' fr'+e.frozen.toFixed(1)).join('|'));}
}
