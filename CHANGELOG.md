# Registro de cambios

## 1.2 · Dificultad
- **Fácil, Normal y Difícil**, que se eligen en la pantalla *Elige modo* con izquierda y derecha (o tocando las flechas del selector). Fácil da 5 vidas y enemigos un 12 % más lentos; Difícil, 2 vidas y enemigos un 10 % más rápidos; Normal es como siempre.
- La dificultad se guarda en el navegador y se mantiene al pasar de nivel. **El récord es de cada modo y dificultad**; los récords que ya tenías (en Normal) se conservan.
- Una dificultad guardada que no existe cae en Normal en lugar de romper la partida.
- `test/modes.js` comprueba que las vidas y la velocidad escalan en los tres modos y que la dificultad no se pierde al cambiar de nivel.

## 1.1.1 · Pantalla de modos
- El selector de modo deja de ser una opción escondida en el título (izquierda y derecha): Espacio, Enter o un toque abren la pantalla **Elige modo**, con los tres modos, su descripción y su récord, y se elige con el teclado, el mando o tocando.

## 1.1 · Tres modos
- **Modo clásico** (estilo Pac-Man): laberinto de muros sin hielo ni calor, cuatro brasas grandes y fantasmas con personalidad, de dos a cinco por ronda (perseguidor, emboscador, tímido y errante).
- **Modo bombas** (estilo Bomberman): bloques de hielo, bombas de calor con mecha y explosión en cruz y en cadena, objetos de alcance, bombas y velocidad, y cinco zonas.
- Selector de modo en el título (teclado, mando y deslizar) y un récord por modo.
- Botones de sonido y pantalla completa (tecla `F`), reducción de movimiento si el sistema lo pide y aviso de girar el móvil en vertical.
- `tools/build-dist.mjs` (genera `dist/` y el `.zip`) y carpeta `itch/` con el kit de itch.io.
- `src/02b-bot.js` (piloto automático, ahora también para bombas), `test/modes.js` y `test/browser4.js`.

## Presentación
- Banner propio de cada juego, hecho con su arte (no una captura con panel).
- README con banner, badges, índice, capturas de PC y móvil, GIFs, estructura y licencia.
- Iconos PNG de la página (favicon, 512 px y pantalla de inicio) sacados del icono SVG del propio juego, y metaetiquetas para compartir el enlace.

## 1.0 · Fase 1
- Núcleo jugable: brasas, calor, hielo, agua y brasa grande.
- Cinco niveles diseñados y último nivel repetido con velocidad creciente.
- Tres enemigos: Gélido, Patinador y Grieta.
- Música y efectos con Web Audio.
- Controles de teclado, mando y táctiles. Récord guardado en el navegador.
