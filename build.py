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
</style>
</head>
<body>
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
