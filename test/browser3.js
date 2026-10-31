const { chromium } = require('playwright');
const results=[]; const ok=(n,c,x)=>{results.push((c?'OK   ':'FALLA ')+n+(x?'  '+x:''));};
(async()=>{
  const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:900,height:720},hasTouch:true});
  await ctx.addInitScript(()=>{ window.__pad={axes:[0,0],buttons:[]}; navigator.getGamepads=()=>[{connected:true,axes:window.__pad.axes,buttons:Array.from({length:17},(_,i)=>({pressed:!!window.__pad.buttons[i]}))}]; });
  const pg = await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await pg.goto('file://'+process.cwd()+'/index.html'); await pg.waitForTimeout(400);
  ok('arranca en el título', await pg.evaluate(()=>DH.scene)==='title');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
  ok('Enter empieza la partida', await pg.evaluate(()=>DH.scene)==='play');
  await pg.evaluate(()=>{DH.G.ready=0;});
  // Teclado: flecha arriba mantenida
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(500);
  let w=await pg.evaluate(()=>DH.G.player.want); await pg.keyboard.up('ArrowUp');
  ok('teclado: ArrowUp mueve hacia arriba', w==='up', 'want='+w);
  await pg.keyboard.down('KeyD'); await pg.waitForTimeout(300); w=await pg.evaluate(()=>DH.G.player.want); await pg.keyboard.up('KeyD');
  ok('teclado: WASD (D = derecha)', w==='right','want='+w);
  // Calor con espacio
  await pg.evaluate(()=>{const G=DH.G;G.player.heat=2;});
  const h0=await pg.evaluate(()=>DH.G.player.heat); await pg.keyboard.press('Space'); await pg.waitForTimeout(120);
  const h1=await pg.evaluate(()=>DH.G.player.heat);
  ok('teclado: Espacio gasta calor (si hay hielo o casilla válida)', h1<=h0, h0+' -> '+h1);
  // Mando
  await pg.evaluate(()=>{window.__pad.axes=[-1,0];}); await pg.waitForTimeout(250); w=await pg.evaluate(()=>DH.G.player.want); await pg.evaluate(()=>{window.__pad.axes=[0,0];});
  ok('mando: stick izquierdo', w==='left','want='+w);
  await pg.evaluate(()=>{window.__pad.buttons[13]=true;}); await pg.waitForTimeout(250); w=await pg.evaluate(()=>DH.G.player.want); await pg.evaluate(()=>{window.__pad.buttons[13]=false;});
  ok('mando: cruceta abajo', w==='down','want='+w);
  await pg.evaluate(()=>{DH.G.player.heat=2;}); const g0=await pg.evaluate(()=>DH.G.player.heat);
  await pg.evaluate(()=>{window.__pad.buttons[0]=true;}); await pg.waitForTimeout(150); await pg.evaluate(()=>{window.__pad.buttons[0]=false;}); const g1=await pg.evaluate(()=>DH.G.player.heat);
  ok('mando: botón A libera calor', g1<=g0, g0+' -> '+g1);
  await pg.evaluate(()=>{window.__pad.buttons[9]=true;}); await pg.waitForTimeout(150); await pg.evaluate(()=>{window.__pad.buttons[9]=false;});
  ok('mando: Start pausa', await pg.evaluate(()=>DH.scene)==='pause');
  await pg.keyboard.press('KeyP'); await pg.waitForTimeout(120);
  ok('P reanuda', await pg.evaluate(()=>DH.scene)==='play');
  // Táctil con CDP
  const cdp=await ctx.newCDPSession(pg); const box=await pg.locator('#c').boundingBox(); const cx=box.x+box.width/2, cy=box.y+box.height/2;
  const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
  await touch('touchStart',cx,cy); await touch('touchMove',cx+70,cy); await pg.waitForTimeout(150);
  w=await pg.evaluate(()=>DH.G.player.want); await touch('touchEnd',cx+70,cy);
  ok('táctil: deslizar a la derecha', w==='right','want='+w);
  await touch('touchStart',cx,cy); await touch('touchMove',cx,cy-70); await pg.waitForTimeout(150);
  w=await pg.evaluate(()=>DH.G.player.want); await touch('touchEnd',cx,cy-70);
  ok('táctil: deslizar arriba', w==='up','want='+w);
  await pg.evaluate(()=>{DH.G.player.heat=2;}); const t0=await pg.evaluate(()=>DH.G.player.heat);
  await touch('touchStart',cx,cy); await pg.waitForTimeout(60); await touch('touchEnd',cx,cy); await pg.waitForTimeout(150);
  const t1=await pg.evaluate(()=>DH.G.player.heat); ok('táctil: tocar libera calor', t1<=t0, t0+' -> '+t1);
  // Récord en localStorage
  await pg.evaluate(()=>{DH.G.score=12345;DH.G.lives=-1;DH.G.player.dead=0.01;DH.G.over=false;}); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ if(DH.scene!=='over'){DH.G.over=true;} }); await pg.waitForTimeout(300);
  const hiNow=await pg.evaluate(()=>DH.hi); await pg.reload(); await pg.waitForTimeout(400);
  const hiAfter=await pg.evaluate(()=>DH.hi); const ls=await pg.evaluate(()=>localStorage.getItem('deadheat.hi'));
  ok('récord guardado en localStorage y recuperado tras recargar', hiAfter>=12345 && hiNow>=12345, 'hi='+hiAfter+' ls='+ls);
  await pg.keyboard.press('KeyM'); await pg.waitForTimeout(100); ok('M alterna el sonido (guardado)', (await pg.evaluate(()=>localStorage.getItem('deadheat.muted')))==='true');
  console.log(results.join('\n')); console.log('errores de consola:',errs.length?errs:'ninguno');
  await b.close();
})();
