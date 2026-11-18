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

## Feito (Etapa 2 ✅)
- js/songs.js: 3 músicas de demonstração ORIGINAIS geradas por código (Amanhecer Elétrico, Estrada de Neon, Silêncio Quebrado) + gerador de mapas por dificuldade (Fácil 3 pistas, Médio 4, Difícil 5, Expert 5 com acordes; notas longas)
- js/audio-engine.js: Web Audio (bateria, baixo, guitarra base e solo sintetizados), relógio = audioContext.currentTime, pausa via suspend/resume, guitarra "abafa" ao errar
- js/gameplay.js: canvas 5 pistas em perspectiva, notas longas/acordes, combo, multiplicador (até x4), energia, Perfeito(50ms)/Ótimo(95ms)/Bom(150ms)/Perdeu, toque fora de hora penaliza, pausa, toque multitouch + teclado (A S D F G), latência de Configurações (positivo = som chega atrasado)
- js/play-screens.js: seleção de música/dificuldade com recordes e tela de resultados (estrelas, precisão, XP, moedas); progresso e recordes salvos em storage.js
- css/game.css; sw.js VERSION=ch-v2; app.js registra rotas jogar/play/resultado
- Testado em Chromium headless com jogador automático (151/151 notas, 100%, recorde salvo). Ainda NÃO testado em Android real (ajustar latência se precisar)

## Feito (Etapa 3 ✅)
- js/db.js: IndexedDB (stores "songs" = metadados+mapas, "audio" = arquivo original); js/mp3-analyzer.js: decodifica MP3/M4A/WAV/OGG, FFT 512/hop 256 em áudio decimado, fluxo espectral em 3 faixas + energia + centroide, em partes com barra de progresso; erros tratados (arquivo inválido, <10s, >12min, >60MB, silêncio, sem espaço)
- js/beat-detector.js: picos de fluxo, BPM (autocorrelação + grade de pente), fase e confiança (alta/média/baixa)
- js/note-generator.js: 4 dificuldades (gap mínimo, % de picos, 3/4/5 pistas pelo centroide, grade do BPM se confiança>=35%, notas longas por energia sustentada, acordes no Expert)
- js/library.js: telas Importar MP3 (revisão: nome, BPM, confiança, nº de notas; salvar/salvar e jogar/descartar) e Minha biblioteca (dificuldade, jogar, apagar, recordes)
- audio-engine.startTrack (toca AudioBuffer com o mesmo relógio); gameplay carrega música importada ("u-...") do IndexedDB; "Jogar" também lista as importadas; recordes por música+dificuldade; sw.js VERSION=ch-v3
- Testado em Chromium headless: WAV/MP3 sintético 120 BPM => BPM 120, fase 0,29s (real 0,30), notas alinhadas à grade (erro <10ms), jogador automático 105/105 no Médio, arquivo falso => mensagem de erro. NÃO testado com música real nem em Android

## Falta
- Etapa 4: editor de mapas (criar música do zero, editor de notas) sobre os mapas salvos no IndexedDB
- Etapas 5 a 8 conforme plano

## Convenções
Ao entregar: zip só com arquivos novos/modificados; pastas de upload com menos de 100 arquivos (parte-1, parte-2…).
