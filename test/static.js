// Prueba estática: generar muchas semillas y comprobar conexión total y ausencia de huecos sin salida
const {A}=require('./headless.js');
let bad=0,total=0,deadEnds=0,floors=0;
for(let seed=1;seed<=600;seed++)for(let lvl=0;lvl<7;lvl++){
  const G=A.newGame({seed,level:lvl}); total++;
  const p=G.player; const seen=A.reachable(G,p.x,p.y);
  let lost=0,eLost=0;
  for(let y=1;y<A.H-1;y++)for(let x=1;x<A.W-1;x++){ if(G.grid[y][x]===A.T.FLOOR){ floors++; if(!seen[y*A.W+x])lost++; else {const n=A.DIR_LIST.filter(d=>A.passable(G,x+A.DIRS[d][0],y+A.DIRS[d][1])).length; if(n===0)deadEnds++;} } }
  for(const e of G.enemies){ if(!seen[e.y*A.W+e.x])eLost++; }
  for(const pw of G.powers){ if(!seen[pw.y*A.W+pw.x])eLost++; }
  if(lost||eLost){bad++; if(bad<6)console.log('MAL',seed,lvl,'suelo aislado',lost,'enemigos/power aislados',eLost);}
}
console.log('niveles generados',total,'con problemas',bad,'casillas sin ninguna salida',deadEnds);
