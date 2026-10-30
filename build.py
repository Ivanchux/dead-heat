import glob
parts=sorted(glob.glob('src/0*.js'))
js='\n\n'.join(open(p,encoding='utf8').read() for p in parts)
html='''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#070d18">
<title>Dead Heat · el laberinto se derrite</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%23070d18'/%3E%3Cpath d='M8 1l3 4 2 4-1 4-4 2-4-2-1-4 2-4z' fill='%23ff6a12'/%3E%3Cpath d='M8 6l2 3-1 3H7L6 9z' fill='%23ffe49a'/%3E%3C/svg%3E">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="description" content="Dead Heat: juego de laberinto donde las brasas que recoges derriten el hielo y cambian el mapa.">
<meta property="og:type" content="website">
<meta property="og:title" content="Dead Heat">
<meta property="og:description" content="Pac-Man donde el laberinto lo cambias tú.">
<meta property="og:image" content="https://ivanchux.github.io/dead-heat/docs/banner.png">
<meta name="twitter:card" content="summary_large_image">
<style>
  html,body{margin:0;height:100%;background:#070d18;overflow:hidden;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
  body{display:flex;align-items:center;justify-content:center}
  canvas{image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;display:block;box-shadow:0 0 60px rgba(60,140,220,.18)}
  #tools{position:fixed;top:max(6px,env(safe-area-inset-top));right:max(6px,env(safe-area-inset-right));display:flex;gap:6px;z-index:2}
  #tools button{width:34px;height:34px;border:2px solid #3b7db5;background:rgba(7,13,24,.72);color:#cfe9ff;font:700 15px/1 monospace;cursor:pointer;padding:0}
  #tools button:hover{background:#17304f}
  #tools button:focus-visible{outline:2px solid #ffb02e;outline-offset:2px}
  #tools button[hidden]{display:none}
  #rot{position:fixed;left:0;right:0;bottom:10px;text-align:center;font:700 12px/1.3 monospace;color:#ffb02e;text-shadow:0 1px 0 #000;pointer-events:none;display:none;z-index:2}
  @media (orientation:portrait) and (max-width:700px){#rot{display:block}}
</style>
</head>
<body>
<div id="tools"><button id="btn-mute" type="button" aria-label="Silenciar o activar el sonido (M)" title="Sonido (M)">&#9835;</button><button id="btn-fs" type="button" aria-label="Pantalla completa (F)" title="Pantalla completa (F)" hidden>&#9974;</button></div>
<div id="rot">GIRA EL MÓVIL PARA VER EL JUEGO MÁS GRANDE</div>
<canvas id="c" width="336" height="270" aria-label="Dead Heat"></canvas>
<script>
"use strict";
'''+js+'''
</script>
</body>
</html>
'''
open('index.html','w',encoding='utf8').write(html)
print('index.html',len(html),'bytes')
