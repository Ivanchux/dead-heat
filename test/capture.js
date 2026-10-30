// Capturas para el README: pantallas clave y fotogramas para un GIF de una partida real (piloto automático)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs');
(async()=>{
  const b = await chromium.launch(); const pg = await b.newPage({viewport:{width:700,height:560}});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await pg.goto('file://'+process.cwd()+'/index.html'); await pg.waitForTimeout(300);
  const shot=async n=>pg.locator('#c').screenshot({path:'docs/'+n+'.png'});
  await pg.evaluate(()=>DH.advance(90)); await shot('01-titulo');
  // Partida real con piloto automático, nivel 1 -> fotogramas del GIF
  await pg.evaluate(()=>{DH.start({seed:21,level:0,lives:3}); DH.setBot(true); DH.advance(90);});
  await shot('02-partida');
  let f=0;
  // buscar un momento con calor: avanzar hasta que haya calor y lanzarlo manualmente en un bloque
  await pg.evaluate(()=>DH.advance(60*6));
  const pos = await pg.evaluate(()=>{
    DH.setBot(false); const G=DH.G, p=G.player; p.heat=3; const V={right:[1,0],left:[-1,0],up:[0,-1],down:[0,1]};
    for(let y=3;y<G.grid.length-3;y++)for(let x=3;x<G.grid[0].length-3;x++){ if(G.grid[y][x]!==0) continue;
      for(const d in V){ const nx=x+V[d][0],ny=y+V[d][1],ox=x-V[d][0],oy=y-V[d][1];
        if(G.grid[ny][nx]===1&&G.grid[ny+V[d][1]][nx+V[d][0]]===0&&G.grid[oy][ox]===0&&G.embers[y][x]){ p.x=x;p.y=y;p.fx=x;p.fy=y;p.moving=false;p.t=0;p.dir=d;p.want=d;return {x,y,d}; } } }
    return null; });
  // fotogramas: 12 de juego normal, melt, agua
  for(let i=0;i<10;i++){ await pg.evaluate(()=>DH.advance(4)); await pg.locator('#c').screenshot({path:`docs/frames/f${String(f++).padStart(3,'0')}.png`}); }
  await pg.evaluate(()=>DH.advance(1,{inp:{dir:null,act:true}}));
  for(let i=0;i<14;i++){ await pg.evaluate(()=>DH.advance(3)); await pg.locator('#c').screenshot({path:`docs/frames/f${String(f++).padStart(3,'0')}.png`}); if(i===3) await shot('03-derretir'); }
  for(let i=0;i<14;i++){ await pg.evaluate(()=>DH.advance(5)); await pg.locator('#c').screenshot({path:`docs/frames/f${String(f++).padStart(3,'0')}.png`}); }
  await shot('04-agua');
  // power-up: poner al jugador junto a una brasa grande y comerla
  await pg.evaluate(()=>{DH.setBot(false); const G=DH.G,p=G.player,pw=G.powers[0]; if(pw){ G.powerTimer=7; for(const e of G.enemies){e.stun=0;} }});
  for(let i=0;i<8;i++){ await pg.evaluate(()=>DH.advance(4)); }
  await shot('05-poder');
  // nivel 3 con grietas
  await pg.evaluate(()=>{DH.start({seed:5,level:2,lives:3}); DH.setBot(true); DH.advance(60*14);}); await shot('06-grietas');
  // fin del juego
  await pg.evaluate(()=>{DH.setBot(false); const G=DH.G; G.lives=-1; G.player.dead=0.02; G.player.inv=0; DH.advance(10);}); await pg.evaluate(()=>{ if(DH.scene!=='over'){ DH.G.over=true; DH.finish(); } DH.advance(2); }); await shot('07-fin');
  console.log('fotogramas',f,'errores:',errs.length?errs:'ninguno'); await b.close();
})();
