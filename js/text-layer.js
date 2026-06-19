/* LiveTube text overlay — style, interaction, effects (optional @chenglou/pretext layout) */
(function (global) {
  var blocks = {};
  var editorBlock = null;
  var editorStyleState = {};
  var pretextPromise = null;

  function initPretext() {
    if (pretextPromise) return pretextPromise;
    pretextPromise = new Promise(function (resolve) {
      if (global.LcyPretext) {
        resolve(global.LcyPretext);
        return;
      }
      var done = false;
      function finish(value) {
        if (done) return;
        done = true;
        resolve(value);
      }
      global.addEventListener('lcypretextready', function () {
        finish(global.LcyPretext || null);
      }, { once: true });
      var script = document.createElement('script');
      script.type = 'module';
      script.textContent =
        "import { prepareWithSegments, layoutWithLines } from 'https://esm.sh/@chenglou/pretext';\n" +
        'window.LcyPretext = { prepareWithSegments, layoutWithLines };\n' +
        "window.dispatchEvent(new Event('lcypretextready'));";
      script.onerror = function () { finish(null); };
      document.head.appendChild(script);
      setTimeout(function () { finish(global.LcyPretext || null); }, 10000);
    });
    return pretextPromise;
  }

  function ensureLayer() {
    var layer = document.getElementById('lcy-text-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'lcy-text-layer';
      layer.className = 'container-fixed lcy-text-layer';
      document.body.appendChild(layer);
    }
    return layer;
  }

  function blockKey(i, j) {
    return i + '-' + j;
  }

  function cellsFromList(list) {
    var result = [];
    if (!global.gridVideos || !global.gridVideos.length || !global.gridVideos[0]) return result;
    if (list === null || list === global.all) {
      for (var i = 0; i < global.gridVideos.length; i++) {
        for (var j = 0; j < global.gridVideos[0].length; j++) {
          result.push({ i: i, j: j });
        }
      }
      return result;
    }
    if (Array.isArray(list)) {
      list.forEach(function (idx) {
        var ij = global.indexToIJ(idx);
        result.push({ i: ij[0], j: ij[1] });
      });
      return result;
    }
    if (typeof list === 'number') {
      var pair = global.indexToIJ(list);
      return [{ i: pair[0], j: pair[1] }];
    }
    return result;
  }

  function defaultOpts() {
    return {
      font: 'Inter, system-ui, sans-serif',
      size: 42,
      weight: 600,
      color: '#f0f0f2',
      align: 'center',
      x: 0.5,
      y: 0.5
    };
  }

  function canvasFont(opts) {
    return (opts.weight || 600) + ' ' + (opts.size || 42) + 'px ' + (opts.font || 'Inter, system-ui, sans-serif');
  }

  function hasInlineMarkup(raw) {
    return /\[\[[^\]]+\]\][\s\S]*?\[\[\/\]\]/.test(String(raw));
  }

  function parseTagAttrs(attrStr) {
    var attrs = {};
    attrStr.split('|').forEach(function (pair) {
      var idx = pair.indexOf(':');
      if (idx < 0) return;
      var key = pair.slice(0, idx).trim().toLowerCase();
      var val = pair.slice(idx + 1).trim();
      if (key === 'color') attrs.color = val;
      else if (key === 'size' || key === 'tamano' || key === 'tamaño') attrs.size = parseFloat(val);
      else if (key === 'font' || key === 'fuente') attrs.font = val;
      else if (key === 'weight' || key === 'peso') attrs.weight = val;
    });
    return attrs;
  }

  function normalizeTextOptions(optA, optB, optC) {
    var options = {};
    if (typeof optA === 'object' && optA !== null) {
      return Object.assign(options, optA);
    }
    if (typeof optA === 'number') options.size = optA;
    if (typeof optB === 'string') {
      if (optB.charAt(0) === '#') options.color = optB;
      else options.font = optB;
    }
    if (typeof optC === 'string') options.font = optC;
    return options;
  }

  function applyRunStyles(el, opts) {
    el.style.color = opts.color;
    el.style.fontSize = opts.size + 'px';
    el.style.fontFamily = opts.font;
    el.style.fontWeight = String(opts.weight);
  }

  function appendTextRuns(container, text, opts) {
    var parts = String(text).split('\n');
    parts.forEach(function (line, i) {
      if (i > 0) container.appendChild(document.createElement('br'));
      var span = document.createElement('span');
      span.className = 'lcy-text-run';
      applyRunStyles(span, opts);
      span.textContent = line;
      container.appendChild(span);
    });
  }

  function renderInlineMarkup(container, raw, baseOpts) {
    container.innerHTML = '';
    container.classList.remove('lcy-text-chars');
    container.classList.add('lcy-text-rich');
    var src = String(raw);
    var lastIndex = 0;
    var re = /\[\[([^\]]+)\]\]([\s\S]*?)\[\[\/\]\]/g;
    var match;
    while ((match = re.exec(src)) !== null) {
      if (match.index > lastIndex) {
        appendTextRuns(container, src.slice(lastIndex, match.index), baseOpts);
      }
      var segOpts = Object.assign({}, baseOpts, parseTagAttrs(match[1]));
      appendTextRuns(container, match[2], segOpts);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < src.length) {
      appendTextRuns(container, src.slice(lastIndex), baseOpts);
    }
  }

  function applyTextStyles(el, opts) {
    el.style.fontFamily = opts.font;
    el.style.fontSize = opts.size + 'px';
    el.style.fontWeight = String(opts.weight);
    el.style.color = opts.color;
    el.style.textAlign = opts.align;
  }

  function positionBlock(block) {
    var cell = document.getElementById('cell-' + block.i + '-' + block.j);
    if (!cell) return;
    var rect = cell.getBoundingClientRect();
    block.el.style.left = rect.left + 'px';
    block.el.style.top = rect.top + 'px';
    block.el.style.width = rect.width + 'px';
    block.el.style.height = rect.height + 'px';
  }

  function positionInner(block) {
    var x = block.opts.x != null ? block.opts.x : 0.5;
    var y = block.opts.y != null ? block.opts.y : 0.5;
    block.contentEl.style.left = (x * 100) + '%';
    block.contentEl.style.top = (y * 100) + '%';
    block.contentEl.style.transform = 'translate(-50%, -50%)';
  }

  function renderPlainLines(block, lines) {
    var el = block.contentEl;
    el.classList.remove('lcy-text-chars');
    el.innerHTML = '';
    lines.forEach(function (lineText) {
      var line = document.createElement('div');
      line.className = 'lcy-text-line';
      line.textContent = lineText;
      el.appendChild(line);
    });
    positionInner(block);
  }

  function renderTextContent(block) {
    var text = block.text;
    var opts = block.opts;
    var el = block.contentEl;

    if (hasInlineMarkup(text)) {
      renderInlineMarkup(el, text, opts);
      positionInner(block);
      return;
    }

    layoutPlainText(block);
  }

  function layoutPlainText(block) {
    var text = block.text;
    var opts = block.opts;
    var maxWidth = Math.max(40, block.el.clientWidth * 0.88);
    var lineHeight = Math.round((opts.size || 42) * 1.25);

    initPretext().then(function (pt) {
      if (pt && pt.prepareWithSegments && pt.layoutWithLines) {
        try {
          var prepared = pt.prepareWithSegments(text, canvasFont(opts), { whiteSpace: 'pre-wrap' });
          var layout = pt.layoutWithLines(prepared, maxWidth, lineHeight);
          renderPlainLines(block, layout.lines.map(function (line) { return line.text; }));
          return;
        } catch (e) {
          console.warn('Pretext layout failed, using fallback:', e);
        }
      }
      renderPlainLines(block, text.split('\n'));
    });
  }

  function stopEffect(block) {
    if (block.effectRaf) {
      cancelAnimationFrame(block.effectRaf);
      block.effectRaf = null;
    }
    if (block.effectTimer) {
      clearInterval(block.effectTimer);
      block.effectTimer = null;
    }
    block.el.classList.remove('lcy-text-fx-collapse', 'lcy-text-fx-obfuscate');
    block.contentEl.style.transition = '';
    block.contentEl.style.transformOrigin = '';
    if (!block.chars.length) {
      block.contentEl.style.transform = 'translate(-50%, -50%)';
    }
  }

  function resetTextVisual(block) {
    stopEffect(block);
    block.chars = [];
    block.contentEl.classList.remove('lcy-text-chars', 'lcy-text-rich');
    renderTextContent(block);
  }

  function getBlockForCell(i, j) {
    return blocks[blockKey(i, j)] || null;
  }

  function createOrUpdateBlock(cell, text, options) {
    var key = blockKey(cell.i, cell.j);
    var block = blocks[key];
    if (!block) {
      ensureLayer();
      var el = document.createElement('div');
      el.className = 'lcy-text-block';
      el.dataset.cell = key;
      var content = document.createElement('div');
      content.className = 'lcy-text-content';
      el.appendChild(content);
      document.getElementById('lcy-text-layer').appendChild(el);
      block = {
        i: cell.i,
        j: cell.j,
        el: el,
        contentEl: content,
        opts: defaultOpts(),
        text: '',
        chars: [],
        effectRaf: null,
        effectTimer: null,
        onClick: null
      };
      blocks[key] = block;
    }

    block.text = String(text);
    block.opts = Object.assign({}, block.opts, options || {});
    stopEffect(block);
    block.chars = [];
    applyTextStyles(block.contentEl, block.opts);
    positionBlock(block);
    renderTextContent(block);

    if (options && options.onClick) {
      block.onClick = options.onClick;
    }
    block.el.classList.toggle('lcy-text-interactive', !!block.onClick);
    block.el.onclick = block.onClick ? function (ev) {
      ev.stopPropagation();
      block.onClick(ev, block);
    } : null;

    return block;
  }

  function plainTextFromBlock(block) {
    return block.contentEl.textContent || block.text;
  }

  function splitToChars(block) {
    var container = block.contentEl;
    var source = plainTextFromBlock(block);
    container.innerHTML = '';
    container.classList.remove('lcy-text-rich');
    container.classList.add('lcy-text-chars');
    container.style.transform = 'none';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';

    var chars = [];
    source.split('').forEach(function (ch) {
      var span = document.createElement('span');
      span.className = 'lcy-text-char';
      span.textContent = ch === ' ' ? '\u00a0' : ch;
      if (ch === '\n') span.classList.add('lcy-text-char-break');
      container.appendChild(span);
      chars.push(span);
    });

    var parentRect = container.getBoundingClientRect();
    block.chars = chars.map(function (span) {
      var r = span.getBoundingClientRect();
      return {
        el: span,
        baseX: r.left - parentRect.left,
        baseY: r.top - parentRect.top,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        vr: 0
      };
    });

    block.chars.forEach(function (c) {
      c.el.style.position = 'absolute';
      c.el.style.left = c.baseX + 'px';
      c.el.style.top = c.baseY + 'px';
    });
  }

  function effectDrop(block, duration) {
    stopEffect(block);
    splitToChars(block);
    var chars = block.chars;
    var floor = block.el.clientHeight - 8;
    var gravity = 0.55;
    var start = performance.now();
    var maxTime = (duration || 2.5) * 1000;

    chars.forEach(function (c) {
      c.vx = (Math.random() - 0.5) * 5;
      c.vy = Math.random() * -3 - 1;
      c.vr = (Math.random() - 0.5) * 10;
    });

    function tick(now) {
      var alive = false;
      chars.forEach(function (c) {
        var y = c.baseY + c.y;
        if (y < floor) {
          c.vy += gravity;
          c.vx *= 0.985;
          c.x += c.vx;
          c.y += c.vy;
          c.rot += c.vr;
          if (c.baseY + c.y >= floor) {
            c.y = floor - c.baseY;
            c.vy *= -0.25;
            c.vx *= 0.6;
            c.vr *= 0.5;
          }
          c.el.style.transform = 'translate(' + c.x + 'px,' + c.y + 'px) rotate(' + c.rot + 'deg)';
          alive = true;
        }
      });
      if (alive && now - start < maxTime * 2) {
        block.effectRaf = requestAnimationFrame(tick);
      }
    }

    block.effectRaf = requestAnimationFrame(tick);
  }

  function effectCollapse(block, duration) {
    stopEffect(block);
    block.el.classList.add('lcy-text-fx-collapse');
    positionInner(block);
    block.contentEl.style.transition = 'transform ' + (duration || 0.8) + 's cubic-bezier(0.4, 0, 0.8, 0.2)';
    block.contentEl.style.transformOrigin = 'center bottom';
    requestAnimationFrame(function () {
      block.contentEl.style.transform = 'translate(-50%, -50%) scaleY(0)';
    });
  }

  function effectObfuscate(block, duration) {
    stopEffect(block);
    var original = plainTextFromBlock(block);
    var charset = '!@#$%&*?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var endAt = Date.now() + (duration || 2) * 1000;
    block.el.classList.add('lcy-text-fx-obfuscate');

    block.effectTimer = setInterval(function () {
      if (Date.now() >= endAt) {
        clearInterval(block.effectTimer);
        block.effectTimer = null;
        block.contentEl.textContent = original.split('').map(function (ch) {
          if (ch === ' ' || ch === '\n') return ch;
          return Math.random() > 0.5 ? '\u2588' : '\u2591';
        }).join('');
        return;
      }
      block.contentEl.textContent = original.split('').map(function (ch) {
        if (ch === ' ' || ch === '\n') return ch;
        return charset[Math.floor(Math.random() * charset.length)];
      }).join('');
    }, 55);
  }

  function normalizeEffect(name) {
    var n = String(name || '').toLowerCase();
    if (n === 'caer' || n === 'suelo' || n === 'botar') return 'drop';
    if (n === 'colapsar') return 'collapse';
    if (n === 'ofuscar') return 'obfuscate';
    if (n === 'normal' || n === 'reset' || n === 'ninguno') return 'none';
    return n;
  }

  function text(list, content, optA, optB, optC) {
    if (content === undefined) return;
    var options = normalizeTextOptions(optA, optB, optC);
    cellsFromList(list).forEach(function (cell) {
      createOrUpdateBlock(cell, content, options);
    });
  }

  function updateStyle(list, patch) {
    cellsFromList(list).forEach(function (cell) {
      var block = getBlockForCell(cell.i, cell.j);
      if (!block) return;
      Object.assign(block.opts, patch);
      applyTextStyles(block.contentEl, block.opts);
      renderTextContent(block);
    });
  }

  function ensureEditorBlock() {
    if (!editorBlock) {
      ensureLayer();
      var el = document.createElement('div');
      el.className = 'lcy-text-block lcy-editor-command-block';
      var content = document.createElement('div');
      content.className = 'lcy-text-content';
      el.appendChild(content);
      document.getElementById('lcy-text-layer').appendChild(el);
      editorBlock = {
        el: el,
        contentEl: content,
        hintEl: null,
        opts: Object.assign(defaultOpts(), {
          font: 'JetBrains Mono, Consolas, monospace',
          size: 20,
          align: 'left',
          x: 0.04,
          y: 0.12
        }),
        text: '',
        chars: [],
        effectRaf: null,
        effectTimer: null,
        onClick: null,
        mirrorEditor: false
      };
      var hint = document.createElement('div');
      hint.className = 'lcy-editor-restore-hint';
      hint.textContent = 'Esc · clic · Ctrl+Shift+E → restaurar editor';
      hint.setAttribute('aria-hidden', 'true');
      el.appendChild(hint);
      editorBlock.hintEl = hint;
      el.addEventListener('click', function () {
        if (editorBlock && editorBlock.mirrorEditor) restoreEditor();
      });
    }
    positionEditorBlock();
    return editorBlock;
  }

  function positionEditorBlock() {
    if (!editorBlock) return;
    var cm = global.codeEditor;
    var target = cm ? cm.getWrapperElement() : document.getElementById('code-container');
    if (!target) return;
    var rect = target.getBoundingClientRect();
    editorBlock.el.style.left = rect.left + 'px';
    editorBlock.el.style.top = rect.top + 'px';
    editorBlock.el.style.width = rect.width + 'px';
    editorBlock.el.style.height = rect.height + 'px';
  }

  function setEditorMirrorVisible(visible) {
    var cm = global.codeEditor;
    if (!cm) return;
    cm.getWrapperElement().style.visibility = visible ? '' : 'hidden';
    if (editorBlock) {
      editorBlock.el.classList.toggle('lcy-editor-mirror-active', !visible);
    }
  }

  function isEditorEffectActive() {
    return !!(editorBlock && editorBlock.mirrorEditor && editorBlock.el.style.display !== 'none');
  }

  function restoreEditor() {
    if (editorBlock) {
      stopEffect(editorBlock);
      editorBlock.text = '';
      editorBlock.mirrorEditor = false;
      editorBlock.el.style.display = 'none';
      editorBlock.el.classList.remove('lcy-editor-mirror-active');
    }
    setEditorMirrorVisible(true);
    if (global.codeEditor) {
      global.codeEditor.focus();
    }
  }

  function updateEditorBlock(content, options, mirrorEditor) {
    var block = ensureEditorBlock();
    if (content !== undefined) block.text = String(content);
    if (options) Object.assign(block.opts, options);
    block.mirrorEditor = !!mirrorEditor;
    stopEffect(block);
    block.chars = [];
    applyTextStyles(block.contentEl, block.opts);
    positionEditorBlock();
    renderTextContent(block);
    block.el.style.display = block.text ? 'block' : 'none';
    if (block.mirrorEditor && block.text) setEditorMirrorVisible(false);
    else setEditorMirrorVisible(true);
    return block;
  }

  function commandText(content, optA, optB, optC) {
    if (content === undefined) return;
    var options = normalizeTextOptions(optA, optB, optC);
    updateEditorBlock(content, options, false);
  }

  function commandStyle(patch) {
    if (!patch) return;
    if (!editorBlock && !global.codeEditor) return;
    if (editorBlock) {
      Object.assign(editorBlock.opts, patch);
      applyTextStyles(editorBlock.contentEl, editorBlock.opts);
      renderTextContent(editorBlock);
    }
    editorStyle(patch);
  }

  function commandEffect(effect, duration) {
    var block = editorBlock;
    if (!block) return;
    var name = normalizeEffect(effect);
    if (name === 'none') {
      resetTextVisual(block);
      return;
    }
    if (name === 'drop') effectDrop(block, duration);
    else if (name === 'collapse') effectCollapse(block, duration);
    else if (name === 'obfuscate') effectObfuscate(block, duration);
  }

  function clearCommand() {
    restoreEditor();
  }

  function editorStyle(opts) {
    if (!opts) return;
    Object.assign(editorStyleState, opts);
    var cm = global.codeEditor;
    if (!cm) return;
    var wrapper = cm.getWrapperElement();
    var scroll = cm.getScrollerElement();
    if (opts.font) {
      wrapper.style.fontFamily = opts.font;
      scroll.style.fontFamily = opts.font;
    }
    if (opts.size) {
      wrapper.style.fontSize = opts.size + 'px';
      scroll.style.fontSize = opts.size + 'px';
    }
    if (opts.color) {
      wrapper.style.color = opts.color;
    }
    if (opts.weight) {
      wrapper.style.fontWeight = String(opts.weight);
    }
    cm.refresh();
  }

  function editorEffect(effect, duration) {
    var cm = global.codeEditor;
    if (!cm) return;
    var name = normalizeEffect(effect);
    if (name === 'none') {
      restoreEditor();
      return;
    }
    var block = updateEditorBlock(cm.getValue(), editorStyleState, true);
    if (name === 'drop') effectDrop(block, duration);
    else if (name === 'collapse') effectCollapse(block, duration);
    else if (name === 'obfuscate') effectObfuscate(block, duration);
  }

  function setTextFont(list, font) {
    updateStyle(list, { font: font });
  }

  function setTextSize(list, size) {
    updateStyle(list, { size: size });
  }

  function setTextColor(list, color) {
    updateStyle(list, { color: color });
  }

  function textStyle(list, options) {
    if (!options) return;
    updateStyle(list, options);
  }

  function textEffect(list, effect, duration) {
    var name = normalizeEffect(effect);
    cellsFromList(list).forEach(function (cell) {
      var block = getBlockForCell(cell.i, cell.j);
      if (!block) return;
      if (name === 'none') {
        resetTextVisual(block);
        return;
      }
      if (name === 'drop') effectDrop(block, duration);
      else if (name === 'collapse') effectCollapse(block, duration);
      else if (name === 'obfuscate') effectObfuscate(block, duration);
      else console.warn('Unknown text effect:', effect);
    });
  }

  function textInteractive(list, handler) {
    cellsFromList(list).forEach(function (cell) {
      var block = getBlockForCell(cell.i, cell.j);
      if (!block) return;
      if (typeof handler === 'function') {
        block.onClick = handler;
        block.el.classList.add('lcy-text-interactive');
        block.el.onclick = function (ev) {
          ev.stopPropagation();
          handler(ev, block);
        };
      } else {
        block.onClick = null;
        block.el.classList.remove('lcy-text-interactive');
        block.el.onclick = null;
      }
    });
  }

  function clearText(list) {
    cellsFromList(list).forEach(function (cell) {
      var key = blockKey(cell.i, cell.j);
      var block = blocks[key];
      if (!block) return;
      stopEffect(block);
      block.el.remove();
      delete blocks[key];
    });
  }

  function refreshTextPositions() {
    Object.keys(blocks).forEach(function (key) {
      positionBlock(blocks[key]);
    });
    positionEditorBlock();
  }

  global.text = text;
  global.setTextFont = setTextFont;
  global.setTextSize = setTextSize;
  global.setTextColor = setTextColor;
  global.textStyle = textStyle;
  global.textEffect = textEffect;
  global.textInteractive = textInteractive;
  global.clearText = clearText;
  global.refreshTextPositions = refreshTextPositions;
  global.commandText = commandText;
  global.commandStyle = commandStyle;
  global.commandEffect = commandEffect;
  global.clearCommand = clearCommand;
  global.editorStyle = editorStyle;
  global.editorEffect = editorEffect;
  global.restoreEditor = restoreEditor;
  global.isEditorEffectActive = isEditorEffectActive;
  global.LcyText = {
    text: text,
    setTextFont: setTextFont,
    setTextSize: setTextSize,
    setTextColor: setTextColor,
    textStyle: textStyle,
    textEffect: textEffect,
    textInteractive: textInteractive,
    clearText: clearText,
    refreshTextPositions: refreshTextPositions,
    commandText: commandText,
    commandStyle: commandStyle,
    commandEffect: commandEffect,
    clearCommand: clearCommand,
    editorStyle: editorStyle,
    editorEffect: editorEffect,
    restoreEditor: restoreEditor,
    isEditorEffectActive: isEditorEffectActive
  };
}(window));
