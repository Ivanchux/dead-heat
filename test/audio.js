const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const pg = await b.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await pg.goto('file://'+process.cwd()+'/index.html'); await pg.waitForTimeout(300);
  const r = await pg.evaluate(async()=>{
    window.__audioDebug=true; Audio_.init(); Audio_.startMusic();
    const names=['ember','heat','power','release','melt','nope','evap','stun','eat','freeze','chill','crack','die','levelclear','gameover','respawn','start','menu','powerend'];
    let thrown=[];
    for(const n of names){ try{ Audio_.play(n,1,1,{pts:400}); }catch(e){ thrown.push(n+': '+e.message); } }
    Audio_.setIntensity(1); for(let i=0;i<40;i++) Audio_.setIntensity(1);
    await new Promise(r=>setTimeout(r,2500));
    return {ready:Audio_.ready, thrown, muted:Audio_.muted};
  });
  console.log(JSON.stringify(r),'errores:',errs.length?errs:'ninguno');
  await b.close();
})();
