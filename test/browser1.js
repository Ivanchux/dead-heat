const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch(); const pg = await b.newPage({viewport:{width:1008,height:804}});
  const errs=[]; pg.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text()); }); pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  await pg.goto('file://'+process.cwd()+'/index.html'); await pg.waitForTimeout(600);
  await pg.evaluate(()=>DH.advance(120)); await pg.screenshot({path:'shots/01-title.png'});
  await pg.evaluate(()=>{DH.start({seed:7,level:0,lives:3}); DH.advance(120);}); await pg.screenshot({path:'shots/02-play-start.png'});
  // jugar con piloto automático 20 s y capturar
  await pg.evaluate(()=>{DH.setBot(true); DH.advance(60*20);}); await pg.screenshot({path:'shots/03-play-20s.png'});
  const st = await pg.evaluate(()=>({scene:DH.scene,score:DH.G.score,lives:DH.G.lives,left:DH.G.emberLeft,level:DH.G.level}));
  console.log(JSON.stringify(st)); console.log('errores:',errs.length?errs:'ninguno');
  await b.close();
})();
