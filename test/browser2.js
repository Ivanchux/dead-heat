const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch(); const pg = await b.newPage({viewport:{width:1008,height:810}});
  const errs=[]; pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); }); pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  await pg.goto('file://'+process.cwd()+'/index.html'); await pg.waitForTimeout(300);
  // Escenario: jugador con calor delante de un bloque de hielo, un enemigo cerca
  await pg.evaluate(()=>{ DH.start({seed:11,level:1,lives:3}); DH.advance(100); });
  const info = await pg.evaluate(()=>{
    const G=DH.G; const p=G.player; p.heat=3;
    const V={right:[1,0],left:[-1,0],up:[0,-1],down:[0,1]};
    for(let y=3;y<G.grid.length-3;y++)for(let x=3;x<G.grid[0].length-3;x++){
      if(G.grid[y][x]!==0) continue;
      for(const d in V){ const nx=x+V[d][0],ny=y+V[d][1]; const ox=x-V[d][0],oy=y-V[d][1];
        if(G.grid[ny][nx]===1 && G.grid[ny+V[d][1]][nx+V[d][0]]===0 && G.grid[oy][ox]===0){
          p.x=x;p.y=y;p.fx=x;p.fy=y;p.moving=false;p.t=0;p.dir=d;p.want=d; G.ready=0;
          // un enemigo a 2 casillas detrás del hielo para ver la evaporación/aturdimiento
          return {x,y,d,ice:[nx,ny]}; } } }
    return null; });
  console.log('objetivo',JSON.stringify(info));
  await pg.evaluate(()=>DH.advance(1,{inp:{dir:null,act:true}}));
  await pg.evaluate(()=>DH.advance(8)); await pg.screenshot({path:'shots/04-release.png'});
  await pg.evaluate(()=>DH.advance(50)); await pg.screenshot({path:'shots/05-agua.png'});
  const s = await pg.evaluate(()=>{const G=DH.G;let w=0;for(const r of G.water)for(const v of r)if(v>0.05)w++;return {aguaCasillas:w,score:G.score};});
  console.log(JSON.stringify(s),'errores:',errs.length?errs:'ninguno');
  await b.close();
})();
