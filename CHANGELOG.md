# Registro de cambios

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
