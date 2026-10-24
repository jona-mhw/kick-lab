# KICK LAB

Curso interactivo de diseño de sonido: del seno puro al kick y rumble de hard techno, en 15 niveles acumulativos. Un solo sonido que crece: cada nivel suma un módulo a la misma cadena de señal.

**Abrir:** https://jona-mhw.github.io/kick-lab/ (mejor con audífonos)

## Qué trae
- Síntesis en vivo con Web Audio, sin samples. El kick se sintetiza muestra a muestra (fase acumulada, PolyBLEP, biquads RBJ); la reverb del rumble es convolución real (`ConvolverNode` en `OfflineAudioContext`) con una respuesta al impulso generada.
- Cadena del kick: OSC → PITCH ENV → AMP ENV → CLICK → DRIVE → FILTER → EQ, con WAVE y TUNE.
- Rumble por envío: SEND → DELAY → REVERB → R-DRIVE → LPF → R-TUNE → HPF/MONO → DUCK.
- Master: MIX → HAT / ARP → GLUE (compresor + clipper) → limitador de protección (ningún pico sobre −1 dBFS).
- Cada nivel: concepto de raíz, por qué lo hacen los productores, perillas con rango sugerido, A/B y un reto que se valida solo.
- Osciloscopio del golpe, espectro con eje en Hz y notas, espectrograma en cascada, medidores de pico, LUFS, nota y cola.
- Reto de oído (desde el nivel 5): un kick secreto, lo recreas y un juez puntúa espectro, ataque y envolvente.
- Glosario que se llena por nivel, presets en el navegador y exportación WAV de 24 bit (kick, rumble y loop).

## Uso
Un `index.html` sin build ni dependencias. Barra espaciadora = play/stop; las perillas se arrastran hacia arriba o abajo, aceptan rueda y vuelven a su valor inicial con doble clic.
