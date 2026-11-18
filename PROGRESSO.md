# PROGRESSO — CLAUDE HERÓI
(Arquivo para continuar em outra IA se os tokens acabarem.)

## Contexto
Jogo de ritmo estilo Guitar Hero, original, 100% HTML/CSS/JS (módulos ES), Canvas, Web Audio, IndexedDB, PWA, GitHub Pages. Dono trabalha só pelo celular Android. Plano completo em 8 etapas:
1 estrutura/menu/identidade · 2 motor musical+gameplay · 3 importação MP3+gerador de notas · 4 editor de mapas · 5 CLAUDE GUITAR (afinador, controle, Supabase Realtime sem chaves secretas) · 6 modo história (5 capítulos, SILÊNCIO) · 7 personagens/progressão/loja/treino · 8 otimizar/publicar.
Regras: nada fingido, botões sempre funcionais, tratar erros de MP3, mensagens de carregamento, não copiar Guitar Hero.
Identidade: mascote laranja pixel-art com guitarra (referência em Referência.zip), palco roxo com refletores. Cores das pistas: verde, vermelho, amarelo, azul, laranja.

## Feito (Etapa 1 ✅)
- index.html, manifest.json, sw.js (cache offline, VERSION=ch-v1), ícones PWA
- css/style.css, menu.css, mobile.css
- js/app.js (menu de 12 itens), router.js (hash), storage.js (localStorage: settings/progress/records), settings.js (volume, latência, dificuldade, fundo, vibração, apagar progresso), mascot.js (SVG), background.js (palco animado)
- Telas reais: Menu, Estatísticas, Configurações. Demais itens mostram "Chega na Etapa N" (honesto, sem simulação)
- Sintaxe dos JS verificada com node; ainda NÃO testado em navegador real

## Falta
- Etapa 2: audio-engine.js, gameplay.js (canvas 5 pistas em perspectiva, notas longas/acordes, combo, multiplicador, energia, Perfect/Great/Good/Miss, pausa, toque+teclado, sync pelo audioContext.currentTime, latência), seleção de música com músicas de demonstração originais
- Etapa 3: mp3-analyzer.js, beat-detector.js, note-generator.js (transientes, BPM, espectro, confiança, dificuldades), IndexedDB, tela de resultados, recordes
- Etapas 4 a 8 conforme plano

## Convenções
Ao entregar: zip só com arquivos novos/modificados; pastas de upload com menos de 100 arquivos (parte-1, parte-2…).
