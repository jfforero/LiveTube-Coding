var rand = Math.random;
var iter = setInterval;
var overallQuality = 'small';
var playbakQualityStrings = ['small','medium','large','hd720','hd1080','highres']
var DEBUG = false;
var markTimestamp = -1;
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var all = null;
var loopHandles = [];
var jumpTimestamp = 0;
var row = 4;
var col = 4;
var cellWidth = 50;
var cellHeight = 50;
var targetVideos = [];
var initialLoading = true;
var youtubeid = "";
var gridVideos = [];
var clickedVideos = [];
var playersPending = 0;
var codeEditor = null;

/** @type {Object.<string, string>} nombre en minúsculas → YouTube video ID */
var videoAliases = {
  'bolaño': 'iqtYrcE27hE',
  'bolano': 'iqtYrcE27hE'
};

function normalizeAliasKey(name) {
  return String(name).trim().toLowerCase();
}

/**
 * Resuelve una etiqueta al ID de YouTube, o devuelve el ID tal cual.
 * @param {string} idOrAlias
 * @returns {string}
 */
function resolveVideoId(idOrAlias) {
  if (idOrAlias == null || idOrAlias === '') return idOrAlias;
  var trimmed = String(idOrAlias).trim();
  var resolved = videoAliases[normalizeAliasKey(trimmed)];
  return resolved || trimmed;
}

/**
 * Define una etiqueta para un ID de YouTube.
 * @param {string} nombre - Nombre corto, p. ej. "Bolaño"
 * @param {string} id - ID de YouTube o otra etiqueta ya definida
 */
function etiqueta(nombre, id) {
  if (!nombre || !id) {
    alert('etiqueta(nombre, id) requiere ambos argumentos.');
    return;
  }
  videoAliases[normalizeAliasKey(nombre)] = resolveVideoId(id);
}

/** @alias etiqueta */
function alias(nombre, id) {
  return etiqueta(nombre, id);
}

/**
 * Lista todas las etiquetas definidas (también en consola).
 * @returns {Object.<string, string>}
 */
function listarEtiquetas() {
  var copy = {};
  Object.keys(videoAliases).forEach(function (key) {
    copy[key] = videoAliases[key];
  });
  if (typeof console !== 'undefined' && console.table) {
    console.table(copy);
  } else {
    console.log(copy);
  }
  return copy;
}

var YTSTATE_UNSTARTED = -1;
var YTSTATE_ENDED = 0;
var YTSTATE_PLAYING = 1;
var YTSTATE_PAUSED = 2;
var YTSTATE_BUFFERING = 3;
var YTSTATE_VIDEOCUED = 5;

function onYouTubeIframeAPIReady() {
  if(DEBUG)console.log("is ready");
}

function rebuildTargetVideos() {
  var flat = [];
  for (var i = 0; i < gridVideos.length; i++) {
    if (!gridVideos[i]) continue;
    for (var j = 0; j < gridVideos[i].length; j++) {
      if (gridVideos[i][j]) flat.push(gridVideos[i][j]);
    }
  }
  targetVideos = flat;
}

function onPlayerReady(event) {
  var player = event.target;
  var iframe = player.getIframe();
  var i = parseInt(iframe.getAttribute('row'), 10);
  var j = parseInt(iframe.getAttribute('col'), 10);

  if (!gridVideos[i]) gridVideos[i] = [];
  gridVideos[i][j] = player;
  player.lcy_i = i;
  player.lcy_j = j;
  player.lcy_stateEl = document.getElementById('state-div-' + i + '-' + j);
  player.initialized = true;

  player.mute();
  player.seekTo(0);
  player.setPlaybackQuality(overallQuality);

  rebuildTargetVideos();
  playersPending = Math.max(0, playersPending - 1);
}

function onPlayerPlaybackQualityChange(event) {
  if (DEBUG) {
    console.log('Quality changed to: ' + event.target.getPlaybackQuality());
  }
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;

function parseYTState(num){
  if( num == -1) return "unstarted";
  if( num == 0) return "ended";
  if( num == 1) return "playing";
  if( num == 2) return "paused";
  if( num == 3) return "buffering";
  if( num == 5) return "video cued";
  return "unknown";
}

function setMark(){
  markTimestamp = (new Date()).getTime();
}

function gridSelected(i,j){
  if (DEBUG) console.log('selected(' + i + ',' + j + ')');
  document.getElementById('state-div-' + i + '-' + j).classList.toggle('div_selected');
  clickedVideos[i * gridVideos[0].length + j] = !clickedVideos[i * gridVideos[0].length + j];
}

function indexToIJ(index){
  return [Math.floor(index /gridVideos.length), index % gridVideos.length];
}

// run the function when the document is ready
$(document).ready(function () {
  var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
        lineNumbers: false,
        styleActiveLine: true,
        matchBrackets: true,
        height: 'auto',
        mode:{name: "javascript", json: true}
    });
  codeEditor = editor;

    if ($('#resizable').length) {
      $('#resizable').resizable();
      $('#resizable').draggable();
    }

    var shouldSkipLine = function (line) {
      var trimmed = (line || '').trim();
      return !trimmed || trimmed.indexOf('//') === 0;
    };

    var livecode = function(cm){
      var doc = cm.getDoc();
      var code = doc.getSelection();
      if(code.length > 0){ // when there is any selected text
        if(DEBUG)console.log(code);
        if (shouldSkipLine(code)) return;
        try {
            if(code.includes("setInterval")){
              var sure;
              if(code.substring(0,10)== "setInterval"){
                sure = confirm("Are you sure you that want setInterval without a handle?");
                if(!sure)return;
              }
              if(!code.includes("clearInterval")){
                var sure = confirm("Are you sure? This does not have clearInterval. ");
                if(!sure) return;
              }
            }
            eval(code);
            var start = doc.getCursor('anchor');
            var end = doc.getCursor('head');
            if (start.line > end.line || (start.line === end.line && start.ch > end.ch)) {
              var temp = start;
              start = end;
              end = temp;
            }
            var obj = doc.markText(start, end, { className: 'ex-high' });
            setTimeout(function () { obj.clear(); }, 100);

        } catch (e) {
            alert(e.message);
            console.error(e);
        }
      }else{ // when there is no selectino, evaluate the line where the cursor is
        code = doc.getLine(cm.getDoc().getCursor().line);
        if(DEBUG)console.log(code);
        if (shouldSkipLine(code)) return;
        try {
            eval(code);
            var start = doc.getCursor();
            var obj = doc.markText({ line: start.line, ch: 0 }, { line: start.line, ch: code.length }, { className: 'ex-high' });
            setTimeout(function () { obj.clear(); }, 100);
        } catch (e) {
            alert(e.message);
            console.error(e);
        }
      }
    };

    var map = {"Shift-Enter": livecode};
    var showHelp = function(cm){
      var code = cm.getDoc().getSelection();
      if (code.length <= 0){ // when there is any selected text
        code = cm.getDoc().getLine(cm.getDoc().getCursor().line);
      }
      var index = code.indexOf('(');
      var fName = code.substring(0, index);
      console.log(fName);
      help(fName);
    };

    var showAyuda = function(cm){
      var code = cm.getDoc().getSelection();
      if (code.length <= 0){
        code = cm.getDoc().getLine(cm.getDoc().getCursor().line);
      }
      var index = code.indexOf('(');
      var fName = code.substring(0, index);
      ayuda(fName);
    };

    var map = {
      "Shift-Enter": livecode,
      "Alt-Enter": showHelp,
      "Alt-Shift-Enter": showAyuda
    };
    editor.addKeyMap(map);

	$(".youtube-result").hide();
	$(".help-panel").removeClass('is-open');

  $(window).keydown(function(ev){
    var keycode = ev.which;
      if (keycode == 93 || keycode == 18){ // need to get
        $(".div_selected").removeClass("div_selected");

        if($(".go-back-editor").is(':visible') ){
          $("#code-container").show();
          $(".go-back-editor").hide();
          $("#youtubegrid-state").show();
        }else{
          $("#code-container").hide();
          $(".go-back-editor").show();
          $("#youtubegrid-state").hide();
        }
        clickedVideos = [];

      }else if (keycode==27){
        var list =[];
        $(".div_selected").removeClass("div_selected");
        if($("#code-container").is(':visible') ){
          $("#code-container").hide();
          $(".go-back-editor").hide();
        }else{
          $("#code-container").show();
          $(".go-back-editor").hide();
        }

        if(clickedVideos.length>0){
          for (var i=0; i < clickedVideos.length; i++){
            if (clickedVideos[i]){
              list.push(i);
            }
          }
          if(list.length == 1){
            updateCodeMirror(JSON.stringify(list[0]));
          }else if (list.length >1){
            updateCodeMirror(JSON.stringify(list));
          }
        }

        clickedVideos = [];

      }
  });

  $(".go-back-button").click(function(){
    $("#code-container").toggle();
    $(".go-back-editor").toggle();
    $("#youtubegrid-state").show();
  });

  $(".search-result-close-button").click(function(){
    $(".youtube-result").hide();
  });

  $(".help-panel-close-button").click(function(){
    closeHelpPanel();
  });

  $('.search-result-filter').on('input', _.debounce(function () {
    filterSearchResults($(this).val());
  }, 120));

  $(window).on('resize', _.debounce(refreshGridCellSizes, 150));

  initApiKeyModal();
  promptYoutubeApiKeyIfNeeded();
});

/**
 * Add columns and rows to the grid
 * @param {integer} addRow - number of rows to add.
 * @param {integer} addCol - number of columns to add.
 * @param {string} id - YouTube identifier.
 */
function add(addRow,addCol,id){
  initialLoading = true;

  var row = gridVideos.length + addRow;
  var col = addCol;

  if(gridVideos[0])
    col +=  gridVideos[0].length;
  if(12%row!=0 || 12%col!=0){
    alert("we can only take a divisor of 12.");
    return;
  }
  if(id)
    youtubeid = resolveVideoId(id);

  if(row <0 || col < 0){
    alert("Row col value negatives.!");
    return;
  }

  var rowHeight = 12/row;
  var colWidth = 12/col;

  var divrowclass = 'row-xs-'+rowHeight;
  var divcolclass = 'col-sm-'+colWidth+' col-md-'+colWidth+' col-lg-'+colWidth+' col-xs-'+colWidth;

  var divrowhtml = '<div class="'+divrowclass+'">'
  var divcolhtml = '<div class = "'+divcolclass+'"></div>'
  var spanhtml = '<span class = "player_state">state</span>'

  // let's add the videos
  cellWidth = $(document).width() / col;
  cellHeight = $(document).height() / row;

  // let's resize the existing divs in gridstack.
  for (var i=0; i < gridVideos.length; i++){
    $(".row-"+i).removeClass().addClass(divrowclass).addClass("row-"+i);
    $(".row-state-"+i).removeClass().addClass(divrowclass).addClass("row-state-"+i);
    for (var j=0; j< gridVideos[0].length; j++){
      $(gridVideos[i][j].getIframe()).removeClass().addClass(divcolclass);
      gridVideos[i][j].setSize(cellWidth,cellHeight);
      $("#state-div-"+ i +"-"+ j).removeClass()
      .addClass(divcolclass)
      .addClass("div_state");
    }
  }

  // add cols first
  for (var i=0; i <gridVideos.length; i++){
    if(!gridVideos[0])
      gridVideos = [];
    var ddiv_state = $(".row-state-" + i);
    for (var j= gridVideos[0].length; j< col; j++){
      numLoadingVideo++;
      var dcol = $(divcolhtml);
      dcol.attr("id","cell-"+ i +"-"+ j);
      dcol.attr("row",i);
      dcol.attr("col",j);
      $(".row-"+i).append(dcol);
      var dcol_state = $(divcolhtml);
      dcol_state.addClass("div_state").attr("id","state-div-"+ i +"-"+ j);
      dcol_state.addClass("div_state").attr("onclick","gridSelected(" + i+ "," + j + ")");
      dcol_state.appendTo(ddiv_state);

      if(DEBUG){
        $(spanhtml).attr("id","state-cell-"+ i +"-"+ j).appendTo(dcol_state);
      }
      if(id)addVideo(i,j);
    }
  }

  // and then add rows
  for (var i=gridVideos.length; i <row; i++){
    var ddiv = $(divrowhtml).addClass("row-" + i);
    var ddiv_state = $(divrowhtml);
    ddiv_state.addClass("row-state-" + i);

    $("#youtubegrid").append(ddiv);
    $("#youtubegrid-state").append(ddiv_state);
    for (var j= 0; j< col; j++){
      numLoadingVideo++;
      var dcol = $(divcolhtml);
      dcol.attr("id","cell-"+ i +"-"+ j);
      dcol.attr("row",i);
      dcol.attr("col",j);
      ddiv.append(dcol)
      var dcol_state = $(divcolhtml).addClass("div_state").attr("id","state-div-"+ i +"-"+ j).appendTo(ddiv_state).attr("onclick","gridSelected(" + i+ "," + j + ")");

      if(DEBUG){
        $(spanhtml).attr("id","state-cell-"+ i +"-"+ j).appendTo(dcol_state);
      }
      if(id)addVideo(i,j);
    }
  }
}

function destroyAllPlayers() {
  for (var i = 0; i < gridVideos.length; i++) {
    if (!gridVideos[i]) continue;
    for (var j = 0; j < gridVideos[i].length; j++) {
      var player = gridVideos[i][j];
      if (player && typeof player.destroy === 'function') {
        try { player.destroy(); } catch (e) {}
      }
    }
  }
}

function refreshGridCellSizes() {
  if (!gridVideos.length || !gridVideos[0] || !gridVideos[0].length) return;
  var rows = gridVideos.length;
  var cols = gridVideos[0].length;
  cellWidth = $(document).width() / cols;
  cellHeight = $(document).height() / rows;
  for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
      if (gridVideos[i] && gridVideos[i][j]) {
        gridVideos[i][j].setSize(cellWidth, cellHeight);
      }
    }
  }
}

/**
 * Create a grid
 * @param {integer} row - number of rows to create.
 * @param {integer} col - number of columns to create.
 * @param {string} id - YouTube identifier.
 */
function create(row,col,id){
  if(12%row!=0 || 12%col!=0){
    alert("we can only take a divisor of 12.");
    return
  }
  youtubeid = resolveVideoId(id);
  initialLoading = true;
  destroyAllPlayers();
  gridVideos = [];
  unloop();
  $("#youtubegrid").empty();
  $("#youtubegrid-state").empty();
  targetVideos = [];

  numLoadingVideo = row * col;
  playersPending = row * col;

  var rowHeight = 12/row;
  var colWidth = 12/col;
  var divrowclass = 'row-xs-' + rowHeight;
  var divcolclass = 'col-sm-' + colWidth + ' col-md-' + colWidth + ' col-lg-' + colWidth + ' col-xs-' + colWidth;
  var gridFrag = document.createDocumentFragment();
  var stateFrag = document.createDocumentFragment();

  for (var i=0; i<row; i++){
    var ddiv = document.createElement('div');
    ddiv.className = divrowclass + ' row-' + i;
    var ddiv_state = document.createElement('div');
    ddiv_state.className = divrowclass + ' row-state-' + i;
    for (var j=0; j<col; j++){
      var dcol = document.createElement('div');
      dcol.className = divcolclass;
      dcol.id = 'cell-' + i + '-' + j;
      dcol.setAttribute('row', i);
      dcol.setAttribute('col', j);
      ddiv.appendChild(dcol);

      var dcol_state = document.createElement('div');
      dcol_state.className = divcolclass + ' div_state';
      dcol_state.id = 'state-div-' + i + '-' + j;
      dcol_state.setAttribute('onclick', 'gridSelected(' + i + ',' + j + ')');
      if (DEBUG) {
        var span = document.createElement('span');
        span.className = 'player_state';
        span.id = 'state-cell-' + i + '-' + j;
        span.textContent = 'state';
        dcol_state.appendChild(span);
      }
      ddiv_state.appendChild(dcol_state);
    }
    gridFrag.appendChild(ddiv);
    stateFrag.appendChild(ddiv_state);
  }

  document.getElementById('youtubegrid').appendChild(gridFrag);
  document.getElementById('youtubegrid-state').appendChild(stateFrag);

  cellWidth = $(document).width() / col;
  cellHeight = $(document).height() / row;

  for (var ri=0; ri< row; ri++){
    for (var cj=0 ; cj<col; cj++){
      addVideo(ri, cj);
    }
  }

  requestAnimationFrame(refreshGridCellSizes);
}

/** @alias create */
function createGrid(row, col, id) {
  return create(row, col, id);
}

function addVideo(i,j){
  new YT.Player('cell-' + i + '-' + j, {
     height: cellHeight,
     width: cellWidth,
     videoId: youtubeid,
     playerVars: {
       origin: window.location.origin,
       rel: 0,
       modestbranding: 1,
       playsinline: 1
     },
     events: {
       'onReady': onPlayerReady,
       'onStateChange': onPlayerStateChange
     }
  });
}
var searchResult = [];

var YOUTUBE_API_KEY_STORAGE = 'livetube.youtubeApiKey';

function isValidYoutubeApiKey(key) {
  key = String(key || '').trim();
  return key.length > 0 && key !== 'TU_CLAVE_YOUTUBE_DATA_API';
}

function getYoutubeApiKey() {
  var cfg = window.LIVETUBE_CONFIG;
  if (cfg && cfg.youtubeApiKey && isValidYoutubeApiKey(cfg.youtubeApiKey)) {
    return String(cfg.youtubeApiKey).trim();
  }
  try {
    var stored = localStorage.getItem(YOUTUBE_API_KEY_STORAGE);
    if (isValidYoutubeApiKey(stored)) return String(stored).trim();
  } catch (e) {}
  return '';
}

function setYoutubeApiKey(key) {
  if (!isValidYoutubeApiKey(key)) return false;
  key = String(key).trim();
  window.LIVETUBE_CONFIG = window.LIVETUBE_CONFIG || {};
  window.LIVETUBE_CONFIG.youtubeApiKey = key;
  try {
    localStorage.setItem(YOUTUBE_API_KEY_STORAGE, key);
  } catch (e) {}
  return true;
}

function showApiKeyModal() {
  var $modal = $('#api-key-modal');
  var $input = $('#api-key-input');
  var $error = $('#api-key-error');
  $error.prop('hidden', true).text('');
  $input.val(getYoutubeApiKey());
  $modal.removeAttr('hidden').addClass('is-open');
  setTimeout(function () { $input.trigger('focus'); }, 50);
}

function hideApiKeyModal() {
  $('#api-key-modal').removeClass('is-open').attr('hidden', true);
  $('#api-key-error').prop('hidden', true).text('');
}

function promptYoutubeApiKeyIfNeeded() {
  if (getYoutubeApiKey()) return;
  showApiKeyModal();
}

function initApiKeyModal() {
  $('#api-key-save').on('click', function () {
    var key = $('#api-key-input').val();
    if (!isValidYoutubeApiKey(key)) {
      $('#api-key-error').text('Introduce una clave válida.').prop('hidden', false);
      return;
    }
    setYoutubeApiKey(key);
    hideApiKeyModal();
  });

  $('#api-key-skip').on('click', hideApiKeyModal);

  $('#api-key-input').on('keydown', function (ev) {
    if (ev.which === 13) {
      ev.preventDefault();
      $('#api-key-save').trigger('click');
    } else if (ev.which === 27) {
      hideApiKeyModal();
    }
  });

  $('.api-key-modal-backdrop').on('click', hideApiKeyModal);
}

function escapeHtml(text) {
  return $('<div>').text(text || '').html();
}

function highlightQuery(text, query) {
  var safe = escapeHtml(text);
  if (!query) return safe;
  var parts = query.trim().split(/\s+/).filter(Boolean);
  parts.forEach(function (word) {
    var re = new RegExp('(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    safe = safe.replace(re, '<mark>$1</mark>');
  });
  return safe;
}

function formatSearchDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

function filterSearchResults(filterText) {
  var q = (filterText || '').toLowerCase().trim();
  var visible = 0;
  $('.youtube-result-list .thumb').each(function () {
    var haystack = ($(this).attr('data-search') || '').toLowerCase();
    var show = !q || haystack.indexOf(q) !== -1;
    $(this).toggleClass('thumb-hidden', !show);
    if (show) visible++;
  });
  var total = searchResult.length;
  if (total === 0) return;
  $('.youtube-result-meta .search-result-count').text(
    q ? visible + ' de ' + total + ' resultados visibles' : total + ' resultado(s)'
  );
}

function renderSearchResults(query, items) {
  var $list = $('.youtube-result-list');
  var $meta = $('.youtube-result-meta');
  $list.empty();

  if (!items.length) {
    $meta.html('<span class="search-empty">Sin resultados para «' + escapeHtml(query) + '».</span>');
    return;
  }

  $meta.html(
    '<span class="search-result-count">' + items.length + ' resultado(s)</span>' +
    ' · <span class="search-hint">Clic = insertar ID en el editor</span>'
  );

  items.forEach(function (entry, index) {
    var snippet = entry.snippet;
    var videoId = entry.id.videoId;
    var thumbs = snippet.thumbnails || {};
    var thumb = thumbs.medium || thumbs.high || thumbs.default || {};
    var title = snippet.title || '(sin título)';
    var channel = snippet.channelTitle || '';
    var published = formatSearchDate(snippet.publishedAt);
    var searchBlob = [title, channel, videoId, snippet.description].join(' ');

    var $card = $('<div class="thumb" tabindex="0" role="button"></div>');
    $card.attr({
      id: 'yt-r-' + videoId,
      'yt-id': videoId,
      'data-search': searchBlob,
      title: 'Insertar "' + videoId + '" en el editor'
    });

    $card.html(
      '<div class="thumb-row">' +
        '<img class="thumb-img" src="' + escapeHtml(thumb.url || '') + '" alt="">' +
        '<div class="thumb-body">' +
          '<div class="thumb-title">' + highlightQuery(title, query) + '</div>' +
          '<div class="thumb-channel">' + escapeHtml(channel) +
            (published ? ' · ' + escapeHtml(published) : '') + '</div>' +
          '<div class="thumb-id">' + escapeHtml(videoId) + '</div>' +
          '<div class="thumb-hint">#' + (index + 1) + ' · clic para copiar ID</div>' +
        '</div>' +
      '</div>'
    );

    $card.on('click keypress', function (ev) {
      if (ev.type === 'keypress' && ev.which !== 13 && ev.which !== 32) return;
      updateCodeMirror('"' + videoId + '"');
    });

    $list.append($card);
  });

  filterSearchResults($('.search-result-filter').val());
}

/**
 * Busca videos en YouTube y muestra resultados en el panel derecho.
 * @param {string} query - Texto de búsqueda.
 * @param {number|object} [options] - Número máximo de resultados o objeto de opciones.
 * @param {number} [options.maxResults=20] - Cantidad de resultados (1–50).
 * @param {string} [options.order=relevance] - relevance | date | viewCount | rating | title.
 */
function search(query, options) {
  var maxResults = 20;
  var order = 'relevance';
  if (typeof options === 'number') {
    maxResults = options;
  } else if (options && typeof options === 'object') {
    maxResults = options.maxResults || maxResults;
    order = options.order || order;
  }
  maxResults = Math.min(Math.max(parseInt(maxResults, 10) || 20, 1), 50);

  query = (query || '').trim();
  if (!query) {
    alert('Escribe un término de búsqueda.');
    return;
  }

  $(".youtube-result").show();
  closeHelpPanel();
  $('.youtube-result-meta').html('<span class="search-loading">Buscando «' + escapeHtml(query) + '»…</span>');
  $('.youtube-result-list').empty();
  $('.search-result-filter').val('');

  var apiKey = getYoutubeApiKey();
  if (!apiKey) {
    $('.youtube-result-meta').html(
      '<span class="search-error">Falta la clave de YouTube Data API.</span>'
    );
    $('.youtube-result-list').html(
      '<div class="search-error">' +
      'Configura tu clave para usar la búsqueda. ' +
      '<button type="button" class="btn-ui btn-ui-primary api-key-open-button">Configurar API key</button>' +
      '</div>'
    );
    $('.api-key-open-button').on('click', showApiKeyModal);
    return;
  }

  var url = 'https://www.googleapis.com/youtube/v3/search';
  var params = {
    part: 'snippet',
    key: apiKey,
    q: query,
    type: 'video',
    maxResults: maxResults,
    order: order,
    videoEmbeddable: 'true',
    safeSearch: 'none'
  };

  $.getJSON(url, params, function (data) {
    searchResult = data.items || [];
    renderSearchResults(query, searchResult);
  }).fail(function (jqXHR) {
    var message = 'Error en la búsqueda de YouTube.';
    try {
      var body = JSON.parse(jqXHR.responseText);
      if (body.error && body.error.message) {
        message = body.error.message;
      }
    } catch (e) {}
    console.error(message, jqXHR);
    $('.youtube-result-meta').html('<span class="search-error">' + escapeHtml(message) + '</span>');
    $('.youtube-result-list').html(
      '<div class="search-error">Verifica la clave en <code>js/config.local.js</code> y que YouTube Data API v3 esté habilitada en Google Cloud.</div>'
    );
  });
}

function updateCodeMirror(data){
    if (!codeEditor) return;
    var doc = codeEditor.getDoc();
    doc.replaceSelection(data);
    $(".youtube-result").hide();
    codeEditor.focus();
}


/* ----------------------------- */
/* Visual FX (CSS GPU + overlays) */
/* ----------------------------- */
/*
 * Best practice for YouTube iframes (cross-origin):
 * - CSS filter / transform / opacity → GPU compositing, fast (web.dev)
 * - blur is expensive → use sparingly on small grids
 * - True GLSL/WebGL shaders cannot read iframe pixels (CORS)
 * - Overlay divs simulate scanlines, vignette, noise, glitch
 */

function getVideoFxState(video) {
  if (!video.lcy_fx) {
    video.lcy_fx = {
      filter: 'none',
      transform: 'none',
      opacity: '',
      mixBlendMode: '',
      overlayStyle: '',
      overlayClass: '',
      cellClass: ''
    };
  }
  return video.lcy_fx;
}

function ensureFxOverlay(video) {
  var cell = document.getElementById('cell-' + video.lcy_i + '-' + video.lcy_j);
  if (!cell) return null;
  var overlay = cell.querySelector('.lcy-fx-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'lcy-fx-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    cell.appendChild(overlay);
  }
  return overlay;
}

function applyVideoFx(video) {
  var iframe = video.getIframe();
  var state = getVideoFxState(video);
  var cell = document.getElementById('cell-' + video.lcy_i + '-' + video.lcy_j);

  iframe.style.filter = state.filter || 'none';
  iframe.style.transform = state.transform || 'none';
  iframe.style.mixBlendMode = state.mixBlendMode || '';
  if (state.opacity !== '') {
    iframe.style.opacity = state.opacity;
  }

  if (cell) {
    cell.className = cell.className.replace(/\blcy-fx-\S+/g, '').trim();
    if (state.cellClass) cell.classList.add(state.cellClass);
  }

  var overlay = ensureFxOverlay(video);
  if (overlay) {
    overlay.className = 'lcy-fx-overlay' + (state.overlayClass ? ' ' + state.overlayClass : '');
    overlay.style.cssText = state.overlayStyle || '';
  }
}

function forEachVideo(list, fn) {
  selectVideos(list).forEach(fn);
}

function setVideoFilter(video, filterStr) {
  getVideoFxState(video).filter = filterStr || 'none';
  applyVideoFx(video);
}

function grayscale(list, enable) {
  forEachVideo(list, function (video) {
    setVideoFilter(video, enable ? 'grayscale(100%)' : 'none');
  });
}

function adjustLight(list, brightness, contrast) {
  if (brightness === undefined) brightness = 1;
  if (contrast === undefined) contrast = 1;
  forEachVideo(list, function (video) {
    setVideoFilter(video, 'brightness(' + brightness + ') contrast(' + contrast + ')');
  });
}

function hueRotate(list, degrees) {
  forEachVideo(list, function (video) {
    setVideoFilter(video, 'hue-rotate(' + degrees + 'deg)');
  });
}

function blurVideo(list, amount) {
  forEachVideo(list, function (video) {
    setVideoFilter(video, 'blur(' + amount + 'px)');
  });
}

function saturate(list, amount) {
  forEachVideo(list, function (video) {
    setVideoFilter(video, 'saturate(' + amount + ')');
  });
}

function sepia(list, amount) {
  if (amount === undefined) amount = 1;
  forEachVideo(list, function (video) {
    setVideoFilter(video, 'sepia(' + amount + ')');
  });
}

function invert(list, amount) {
  if (amount === undefined) amount = 1;
  forEachVideo(list, function (video) {
    setVideoFilter(video, 'invert(' + amount + ')');
  });
}

function duotone(list, hueDeg) {
  if (hueDeg === undefined) hueDeg = 200;
  forEachVideo(list, function (video) {
    setVideoFilter(video, 'grayscale(1) sepia(1) hue-rotate(' + hueDeg + 'deg) saturate(2.5)');
  });
}

function setFilter(list, filterString) {
  forEachVideo(list, function (video) {
    setVideoFilter(video, filterString);
  });
}

function mixBlend(list, mode) {
  forEachVideo(list, function (video) {
    getVideoFxState(video).mixBlendMode = mode || 'normal';
    applyVideoFx(video);
  });
}

function flip(list, horizontal, vertical) {
  forEachVideo(list, function (video) {
    var sx = horizontal ? -1 : 1;
    var sy = vertical ? -1 : 1;
    getVideoFxState(video).transform = 'scale(' + sx + ', ' + sy + ')';
    applyVideoFx(video);
  });
}

function mirror(list) {
  flip(list, true, false);
}

function tiltVideo(list, rotateX, rotateY, scale) {
  if (rotateX === undefined) rotateX = 0;
  if (rotateY === undefined) rotateY = 0;
  if (scale === undefined) scale = 1;
  forEachVideo(list, function (video) {
    var iframe = video.getIframe();
    iframe.style.transition = 'transform 1s ease';
    getVideoFxState(video).transform =
      'rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale(' + scale + ')';
    applyVideoFx(video);
  });
}

function opacity(list, alpha) {
  if (alpha === undefined) alpha = 1;
  forEachVideo(list, function (video) {
    getVideoFxState(video).opacity = String(alpha);
    applyVideoFx(video);
  });
}

function _setOverlayStyle(video, css) {
  getVideoFxState(video).overlayStyle = css;
  applyVideoFx(video);
}

function vignette(list, strength) {
  if (strength === undefined) strength = 0.75;
  var alpha = Math.min(Math.max(strength, 0), 1);
  forEachVideo(list, function (video) {
    _setOverlayStyle(video,
      'background: radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,' + alpha + ') 100%);');
  });
}

function scanlines(list, lineOpacity) {
  if (lineOpacity === undefined) lineOpacity = 0.25;
  forEachVideo(list, function (video) {
    _setOverlayStyle(video,
      'background: repeating-linear-gradient(' +
      'to bottom, transparent 0px, transparent 2px, rgba(0,0,0,' + lineOpacity + ') 2px, rgba(0,0,0,' + lineOpacity + ') 4px);');
  });
}

function filmGrain(list, grainOpacity) {
  if (grainOpacity === undefined) grainOpacity = 0.12;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
    '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/></filter>' +
    '<rect width="100%" height="100%" filter="url(#n)" opacity="0.55"/></svg>';
  forEachVideo(list, function (video) {
    _setOverlayStyle(video,
      'opacity:' + grainOpacity + ';background-image:url("data:image/svg+xml,' + encodeURIComponent(svg) + '");');
  });
}

function glitch(list, enable) {
  if (enable === undefined) enable = true;
  forEachVideo(list, function (video) {
    var s = getVideoFxState(video);
    s.overlayClass = enable ? 'lcy-fx-glitch' : '';
    if (enable) {
      s.filter = 'contrast(1.4) saturate(1.6) hue-rotate(8deg)';
    }
    applyVideoFx(video);
  });
}

function pulse(list, enable) {
  if (enable === undefined) enable = true;
  forEachVideo(list, function (video) {
    getVideoFxState(video).cellClass = enable ? 'lcy-fx-pulse-cell' : '';
    applyVideoFx(video);
  });
}

function pixelate(list, blocks) {
  if (!blocks) blocks = 6;
  forEachVideo(list, function (video) {
    var iframe = video.getIframe();
    var s = getVideoFxState(video);
    s.transform = 'scale(' + blocks + ')';
    iframe.style.transformOrigin = 'top left';
    iframe.style.imageRendering = 'pixelated';
    iframe.style.width = Math.round(cellWidth / blocks) + 'px';
    iframe.style.height = Math.round(cellHeight / blocks) + 'px';
    applyVideoFx(video);
  });
}

function animateFilter(list, filterString, duration) {
  if (duration === undefined) duration = 1.5;
  forEachVideo(list, function (video) {
    var iframe = video.getIframe();
    iframe.style.transition = 'filter ' + duration + 's ease';
    setVideoFilter(video, filterString);
  });
}

var VisualPresets = {
  calm: 'grayscale(50%) brightness(1.2)',
  tense: 'contrast(1.5) saturate(1.8)',
  dream: 'blur(2px) brightness(1.3) hue-rotate(30deg)',
  chaos: 'hue-rotate(180deg) saturate(2) blur(1px)',
  dark: 'brightness(0.5) contrast(1.3)',
  soft: 'blur(1px) brightness(1.1) saturate(0.8)',
  retro: 'sepia(80%) contrast(1.2) brightness(0.95)',
  neon: 'saturate(2.5) contrast(1.4) hue-rotate(280deg) brightness(1.1)',
  horror: 'grayscale(100%) contrast(1.8) brightness(0.4)',
  vhs: 'contrast(1.3) saturate(0.7) hue-rotate(-10deg)',
  noir: 'grayscale(100%) contrast(1.5) brightness(0.85)',
  cyberpunk: 'saturate(2) hue-rotate(200deg) contrast(1.3)',
  bolano: 'sepia(35%) contrast(1.15) brightness(0.92) saturate(0.9)'
};

var OverlayPresets = {
  vhs: function (list) {
    setFilter(list, VisualPresets.vhs);
    scanlines(list, 0.2);
    vignette(list, 0.55);
    filmGrain(list, 0.08);
  },
  crt: function (list) {
    scanlines(list, 0.35);
    vignette(list, 0.65);
  },
  glitch: function (list) {
    glitch(list, true);
  }
};

function applyPreset(list, name, animate) {
  if (animate === undefined) animate = true;
  var preset = VisualPresets[name];
  if (!preset) {
    console.warn('Unknown preset:', name);
    return;
  }
  if (animate) animateFilter(list, preset, 2);
  else setFilter(list, preset);
}

function applyOverlayPreset(list, name) {
  var overlayFn = OverlayPresets[name];
  if (!overlayFn) {
    console.warn('Unknown overlay preset:', name);
    return;
  }
  overlayFn(list);
}

function listarPresets() {
  console.log('VisualPresets:', Object.keys(VisualPresets));
  console.log('OverlayPresets:', Object.keys(OverlayPresets));
  return { filtros: Object.keys(VisualPresets), overlays: Object.keys(OverlayPresets) };
}

function resetFx(list) {
  forEachVideo(list, function (video) {
    var iframe = video.getIframe();
    video.lcy_fx = null;
    iframe.style.filter = 'none';
    iframe.style.transform = 'none';
    iframe.style.opacity = '';
    iframe.style.mixBlendMode = '';
    iframe.style.transition = '';
    iframe.style.imageRendering = '';
    iframe.style.width = '';
    iframe.style.height = '';
    iframe.style.transformOrigin = '';
    if (video.setSize) video.setSize(cellWidth, cellHeight);
    var cell = document.getElementById('cell-' + video.lcy_i + '-' + video.lcy_j);
    if (cell) {
      cell.className = cell.className.replace(/\blcy-fx-\S+/g, '').trim();
      var overlay = cell.querySelector('.lcy-fx-overlay');
      if (overlay) overlay.remove();
    }
  });
}

/**
 * Change playback speed of the selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {float} newSpeed - New speed.
 */
function speed(list, newSpeed) {
    var selectedVideos =  selectVideos(list);
    selectedVideos.forEach(function(video){
      video.setPlaybackRate(newSpeed)
    });
}

/**
 * mute/unMute the selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {bool} mute - true = mute / false = unMute.
 */
function mute(list, mute) {
    var selectedVideos =  selectVideos(list);
    selectedVideos.forEach(function(video){
      if (mute)
        video.mute()
      else
        video.unMute()
    });
}

/**
 * Set volume of the selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} vol - New volume. (0 ~ 100)
 */
function volume(list,vol) {
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
    //video.setVolume(vol);
    adjustVolume(video, vol);
  });
}

function adjustVolume(video, vol) {
  video.setVolume(vol);
}

function setFadeOverlay(video, vol) {
  var stateEl = video.lcy_stateEl || document.getElementById('state-div-' + video.lcy_i + '-' + video.lcy_j);
  if (stateEl) stateEl.style.opacity = 1 - vol / 100;
}

/**
 * Increase (or decrease) volume of the selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} diff - To decrease volume, pass negative number.
 */
function turnup(list, diff) {
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
    var newVolume = video.getVolume() + diff
    //video.setVolume(newVolume)
    adjustVolume(video, newVolume);
  });
}
//function alternate(list, )

/**
 * Replace the selected videos with id.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {string} id - YouTube identifier.
 * @param {bool} cancelloop - To cancel the loop that may have been set earlier.
 */
 function cue(list, id, cancelloop) {
   if(!cancelloop) cancelloop = true;
  var videoId = resolveVideoId(id);
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
    video.cueVideoById(videoId)
    video.initialized = true;
    video.mute();
    video.playVideo();
    video.setPlaybackRate(1);
    adjustVolume(video, 100);
    setFadeOverlay(video, 100);
    video.initialized = true;
    if(video.loopHandle && cancelloop){
      clearInterval(video.loopHandle);
    }
    if(video.here)video.here = null;
  });
}

function fadeInInner(video, diff) {
    video.lcy_fading = true;

    var currentVolume = video.getVolume();
    // console.log("cur: " + currentVolume + "/ diff: "+diff);
    if (currentVolume < 100) {
        var newVolume = currentVolume + diff;
        adjustVolume(video, newVolume);
        setFadeOverlay(video, newVolume);
        return setTimeout((function() {
            return fadeInInner(video, diff);
        }), 100);
    }
    video.lcy_fading = false;

}

/**
 * Start playing the selected videos with increasing volume.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} duration - Duration of time in seconds.
 */
function fadeIn(list,duration) {
    if(!duration) duration = 5;
    var diff = 10.0 / duration;
    var selectedVideos =  selectVideos(list);
    /*selectedVideos.forEach(function(v){
      v.setVolume(0);
    });
*/
    var fadeInCall = function(v){
      if(!v.lcy_fading){
        fadeInInner(v, diff);
      }else{
        setTimeout(function(){
          fadeInCall(v);
        },100);
      }
    };
    selectedVideos.forEach(fadeInCall);
    /*
    selectedVideos.forEach(function(v){
      fadeInInner(v, diff);
    });
*/
}

function fadeOutInner(video, diff) {
    video.lcy_fading = true;
    var currentVolume = video.getVolume();
    if (currentVolume > 0) {
        var newVolume = currentVolume - diff;
        adjustVolume(video, newVolume);
        setFadeOverlay(video, newVolume);
        return setTimeout((function() {
            return fadeOutInner(video, diff);
        }), 100);
    }
    video.lcy_fading = false;
}

/**
 * Fade out the volume of selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} duration - Duration of time in seconds.
 */
function fadeOut(list,duration) {
    if(!duration) duration = 5;
    var diff = 10.0 / duration;
    var selectedVideos =  selectVideos(list);
    var fadeOutCall = function(v){
      if(!v.lcy_fading){
        fadeOutInner(v, diff);
      }else{
        setTimeout(function(){
          fadeOutCall(v);
        },100);
      }
    };
    selectedVideos.forEach(fadeOutCall);
}

/**
 * Returns an array of video index that excludes the specified video index.
 * e.g. if the current grid is 3X3.
 * not(1) returns [0,2,3,4,5,6,7,8]
 * e.g. if the current grid is 4X4.
 * not(8,7) returns [0,1,2,3,4,5,6,9,10,11,12,13,14,15]
 * @param {integer[]} indices - Indices to exclude.
 */
 function not() {
 	var list = [...Array(targetVideos.length).keys()];
 	for (var i = 0; i < arguments.length; i++) {
 		target = arguments[i];
 		index = list.indexOf(target);
 		if (index > -1) {
 			list.splice(index, 1);
 		}
 	}
 	return list;
 }

function selectVideos(list){
  var selectedVideos = []

  if (typeof(list) == "string") {
  	var condition = list;
  	var selectedVideos = [];
	for (var i = 0; i < targetVideos.length; i++) {
   		if (eval(i + condition))
   			selectedVideos.push(targetVideos[i]);
	}
	return selectedVideos;
  }
  else if (list === parseInt(list, 10) ){
      selectedVideos.push(targetVideos[list])
  }
  else if (list == null) {
      selectedVideos = targetVideos
  }
  else if (list.length > 1) {
      for(var i=0; i< list.length; i++){
          var index = list[i];
          selectedVideos.push(targetVideos[index]);
      }
  }
  else{
    alert("ERROR: edge case found", list);
    return null;
  }
  return selectedVideos;
}

/**
 * Phase
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} interval - interval
 */
function phase(list,interval){ // interval and video id

  var selectedVideos =  selectVideos(list);
  if(interval>=0){
    for (var i=1; i<selectedVideos.length; i++){
      (function(vindex){
        if(DEBUG)console.log("vindex",vindex);
          setTimeout(function(){
          selectedVideos[vindex].seekTo(selectedVideos[vindex].getCurrentTime()- vindex*interval);
        },vindex*interval* 1000);
      })(i)
    }
    return ;
  }
 // interval < 0
  for (var i=selectedVideos.length-2; i>=0; i--){
    (function(vindex){
        if(DEBUG)console.log("vindex",vindex);
        setTimeout(function(){
          selectedVideos[vindex].seekTo(selectedVideos[vindex].getCurrentTime()- (selectedVideos.length - vindex-1)*-interval);
        },(selectedVideos.length - vindex-1)*-interval* 1000);
    })(i)
  }

}

/**
 * Delay
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} interval - interval
 */
function delay(list,interval){ // interval and video id

  var selectedVideos =  selectVideos(list);
  if(interval>=0){
    for (var i=1; i<selectedVideos.length; i++){
      (function(vindex){
        if(DEBUG)console.log("vindex",vindex);
          setTimeout(function(){
          selectedVideos[vindex].playVideo();
        },vindex*interval* 1000);
      })(i)
      selectedVideos[i].pauseVideo(); // do not need to
    }
    return ;
  }
 // interval < 0
  for (var i=selectedVideos.length-2; i>=0; i--){
    (function(vindex){
        if(DEBUG)console.log("vindex",vindex);
        setTimeout(function(){
          selectedVideos[vindex].playVideo();


        },(selectedVideos.length - vindex-1)*-interval* 1000);
    })(i)
    selectedVideos[i].pauseVideo();
  }

}

/**
 * Sync
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} index - index
 */
function sync(list, index){
    seek(list, targetVideos[index].getCurrentTime());
}

/**
 * Pause the selected videos
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 */
function pause(list){
  var selectedVideos =  selectVideos(list);

  selectedVideos.forEach(function(video){
      video.pauseVideo();
  });
}

/**
 * Set the quality of videos (any video that is retrieved after this code runs will be set with the specified quality
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {string} quality - small, medium, large, hd720, hd1080, highres, or default.
 */
function setQ(list, quality){
  if(playbakQualityStrings.includes(quality))
  {
    //overallQuality = quality;
    var selectedVideos =  selectVideos(list);
    selectedVideos.forEach(function(video){
      video.setPlaybackQuality(quality);
    });
  }
  else{
    alert(quality + ' is not a possible value.')
  }

}

/**
 * Set the quality of videos (any video that is retrieved after this code runs will be set with the specified quality
 * @param {string} quality - small, medium, large, hd720, hd1080, highres, or default.
 */
function setQoverall(quality){
  if(playbakQualityStrings.includes(quality))
  {
    overallQuality = quality;
  }
  else{
    alert(quality + ' is not a possible value.')
  }

}

/**
 * Play the selected videos
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 */
function play(list){
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
      video.playVideo();
  });
}

/**
 * Seek to specified time.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} seconds - time in seconds.
 */
function seek(list, seconds){
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
      video.seekTo(seconds,true);
  });
}

/**
 * Loop
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} back - back
 * @param {integer} interval - interval
 * @param {integer} phase - phase
 */
function loop(list,back,interval, phase){
  var selectedVideos =  selectVideos(list);
  if(!phase) phase = 0;
/*  for (var i=0; selectedVideos.length; i++){
    var video = selectedVideos[i];
    var atTime = video.getCurrentTime() - back;
    video.seekTo(atTime)
    if(video.loopHandle){
      clearInterval(video.loopHandle);
    }
    video.loopHandle = setInterval(function(){
      video.seekTo(atTime)
    },(interval + i * phase)* 1000);
  }*/
  selectedVideos.forEach(function(video, index){
    var atTime = video.getCurrentTime() - back;
    video.seekTo(atTime)
    if(video.loopHandle){
      clearInterval(video.loopHandle);
    }
    video.loopHandle = setInterval(function(){
      video.seekTo(atTime)
    },(interval + index * phase)* 1000);
  });
}
function here(list){
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video, index){
    if(!video.here){
      video.here = video.getCurrentTime();
      return;
    }
    // this is problematic
    loopAt(list,video.here,video.getCurrentTime() - video.here);
    video.here = null;
  });
}

/**
 * LoopAt
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} atTime - atTime
 * @param {integer} interval - interval
 * @param {integer} phase - phase
 */
function loopAt(list,atTime,interval, phase){
  var selectedVideos =  selectVideos(list);
  if(!phase) phase = 0;
/*  for (var i=0; selectedVideos.length; i++){
    var video = selectedVideos[i];
    video.seekTo(atTime)
    if(video.loopHandle){
      clearInterval(video.loopHandle);
    }
    (function(v){
      v.loopHandle = setInterval(function(){
        v.seekTo(atTime)
      },(interval + i * phase)* 1000);
    })(video);
  }*/
  selectedVideos.forEach(function(video, index){
    video.seekTo(atTime)
    if(video.loopHandle){
      clearInterval(video.loopHandle);
    }
    video.loopHandle = setInterval(function(){
      video.seekTo(atTime)
    },(interval + index * phase)* 1000);
  });
}

/**
 * Unloop
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 */
function unloop(list){
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
    if(video.loopHandle){
      clearInterval(video.loopHandle);
      video.loopHandle = null;
    }
  });
}

/**
 * Jump
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} num - num
 * @param {integer} phase - phase
 */
function jump(list,num,phase){
  var selectedVideos =  selectVideos(list);
  if(phase){
    selectedVideos.forEach(function(video){
        video.seekTo(video.getCurrentTime() + num,true);
    });
  }
  else{
    selectedVideos.forEach(function(video, index){
      setTimeout(function(){
        video.seekTo(video.getCurrentTime() + num,true);
      }, phase * index * 1000)
    });
  }
}

function onPlayerStateChange(event) {
  var player = event.target;

  if (DEBUG) {
    if (player.h && player.h.id) {
      $('#state-' + player.h.id).text(parseYTState(event.data));
    }
    if (event.data === YTSTATE_PLAYING) {
      console.log('now - jumpTimestamp:', (new Date()).getTime() - jumpTimestamp);
    }
  }

  if (player.initialized && event.data === YTSTATE_PLAYING) {
    player.initialized = false;
    player.pauseVideo();
    player.seekTo(0);
    player.unMute();
    player.setPlaybackQuality(overallQuality);
    initialLoading = false;
  }

  if (event.data === YTSTATE_ENDED) {
    player.seekTo(0);
    player.playVideo();
  }
}

var functionNameAliases = {
  crear: 'createGrid',
  crearrejilla: 'createGrid',
  agregar: 'add',
  buscar: 'search',
  cambiar: 'cue',
  reproducir: 'play',
  iniciar: 'play',
  pausar: 'pause',
  ira: 'seek',
  velocidad: 'speed',
  sincronizar: 'sync',
  calidad: 'setQ',
  calidadgeneral: 'setQoverall',
  silenciar: 'mute',
  volumen: 'volume',
  subirvolumen: 'turnup',
  fundirentrada: 'fadeIn',
  fundirsalida: 'fadeOut',
  bucle: 'loop',
  bucleen: 'loopAt',
  quitarbucle: 'unloop',
  aqui: 'here',
  desfase: 'phase',
  retraso: 'delay',
  saltar: 'jump',
  excepto: 'not',
  escalagrises: 'grayscale',
  ajustarluz: 'adjustLight',
  rotartono: 'hueRotate',
  desenfocar: 'blurVideo',
  saturar: 'saturate',
  sepia: 'sepia',
  invertir: 'invert',
  duotono: 'duotone',
  mezcla: 'mixBlend',
  espejo: 'mirror',
  voltear: 'flip',
  vigneta: 'vignette',
  lineas: 'scanlines',
  grano: 'filmGrain',
  glitch: 'glitch',
  pulso: 'pulse',
  pixelar: 'pixelate',
  filtro: 'setFilter',
  animarfiltro: 'animateFilter',
  inclinarvideo: 'tiltVideo',
  opacidad: 'opacity',
  aplicarpreset: 'applyPreset',
  presetoverlay: 'applyOverlayPreset',
  listarpresets: 'listarPresets',
  limpiarfx: 'resetFx',
  resetfx: 'resetFx',
  ayuda: 'ayuda',
  help: 'help',
  etiqueta: 'etiqueta',
  etiquetar: 'etiqueta',
  alias: 'alias',
  listaretiquetas: 'listarEtiquetas',
  etiquetas: 'etiquetas-video'
};

function resolveDocFunctionName(fName) {
  if (!fName) return fName;
  var normalized = String(fName).trim().toLowerCase();
  return functionNameAliases[normalized] || fName;
}

function getDocPath(fName, lang) {
  var relative = (lang === 'es') ? 'doc/es/global.html' : 'doc/global.html';
  var url = new URL(relative, window.location.href);
  url.searchParams.set('embed', '1');
  if (fName && fName !== 'es' && fName !== 'en') {
    url.hash = resolveDocFunctionName(fName);
  }
  return url.href;
}

function setHelpPanelStatus(message) {
  var $status = $('.help-panel-status');
  if (message) {
    $status.text(message).addClass('is-visible');
  } else {
    $status.text('').removeClass('is-visible');
  }
}

function openHelpPanel(fName, lang) {
  var path = getDocPath(fName, lang);
  var $frame = $('.help-panel-frame');

  $(".youtube-result").hide();
  $(".help-panel-title").text(lang === 'es' ? 'Ayuda' : 'Help');
  setHelpPanelStatus('');
  $(".help-panel").addClass('is-open');
  $("#code-container").addClass('panel-open-right');
  refreshEditorLayout();

  $frame.off('load.helpPanel error.helpPanel');
  $frame.on('load.helpPanel', function () {
    setHelpPanelStatus('');
  });
  $frame.on('error.helpPanel', function () {
    setHelpPanelStatus('No se pudo cargar la ayuda. Comprueba que exista doc/es/global.html');
  });

  $frame.attr('src', path);
}

function closeHelpPanel() {
  $('.help-panel-frame').off('load.helpPanel error.helpPanel').attr('src', 'about:blank');
  $(".help-panel").removeClass('is-open');
  $("#code-container").removeClass('panel-open-right');
  setHelpPanelStatus('');
  refreshEditorLayout();
}

function refreshEditorLayout() {
  if (codeEditor) {
    codeEditor.refresh();
  }
}

function help(fName, lang) {
  openHelpPanel(fName, lang);
}

/**
 * Abre la documentación en español.
 * @param {string} fName - Nombre de función (opcional).
 */
function ayuda(fName) {
  help(fName, 'es');
}

var todos = all;
var azar = rand;
var repetir = iter;

function crear(filas, columnas, id) {
  return createGrid(filas, columnas, id);
}

function agregar(filasExtra, columnasExtra, id) {
  return add(filasExtra, columnasExtra, id);
}

function buscar(consulta, opciones) {
  return search(consulta, opciones);
}

function cambiar(videos, id, cancelarBucle) {
  return cue(videos, id, cancelarBucle);
}

function reproducir(videos) {
  return play(videos);
}

function iniciar(videos) {
  return play(videos);
}

function pausar(videos) {
  return pause(videos);
}

function irA(videos, segundos) {
  return seek(videos, segundos);
}

function velocidad(videos, valor) {
  return speed(videos, valor);
}

function sincronizar(videos, indice) {
  return sync(videos, indice);
}

function calidad(videos, valor) {
  return setQ(videos, valor);
}

function calidadGeneral(valor) {
  return setQoverall(valor);
}

function silenciar(videos, activar) {
  return mute(videos, activar);
}

function volumen(videos, valor) {
  return volume(videos, valor);
}

function subirVolumen(videos, diferencia) {
  return turnup(videos, diferencia);
}

function fundirEntrada(videos, duracion) {
  return fadeIn(videos, duracion);
}

function fundirSalida(videos, duracion) {
  return fadeOut(videos, duracion);
}

function bucle(videos, atras, intervalo, fase) {
  return loop(videos, atras, intervalo, fase);
}

function bucleEn(videos, tiempo, intervalo, fase) {
  return loopAt(videos, tiempo, intervalo, fase);
}

function quitarBucle(videos) {
  return unloop(videos);
}

function aqui(videos) {
  return here(videos);
}

function desfase(videos, intervalo) {
  return phase(videos, intervalo);
}

function retraso(videos, intervalo) {
  return delay(videos, intervalo);
}

function saltar(videos, segundos, fase) {
  return jump(videos, segundos, fase);
}

function excepto() {
  return not.apply(null, arguments);
}

function escalaGrises(videos, activar) {
  return grayscale(videos, activar);
}

function ajustarLuz(videos, brillo, contraste) {
  return adjustLight(videos, brillo, contraste);
}

function rotarTono(videos, grados) {
  return hueRotate(videos, grados);
}

function desenfocar(videos, cantidad) {
  return blurVideo(videos, cantidad);
}

function saturar(videos, cantidad) {
  return saturate(videos, cantidad);
}

function filtro(videos, filtroCss) {
  return setFilter(videos, filtroCss);
}

function animarFiltro(videos, filtroCss, duracion) {
  return animateFilter(videos, filtroCss, duracion);
}

function inclinarVideo(videos, rotacionX, rotacionY, escala) {
  return tiltVideo(videos, rotacionX, rotacionY, escala);
}

function opacidad(videos, alpha) {
  return opacity(videos, alpha);
}

function aplicarPreset(videos, nombre, animar) {
  return applyPreset(videos, nombre, animar);
}

function presetOverlay(videos, nombre) {
  return applyOverlayPreset(videos, nombre);
}

function limpiarFx(videos) {
  return resetFx(videos);
}

function invertir(videos, cantidad) {
  return invert(videos, cantidad);
}

function duotono(videos, tono) {
  return duotone(videos, tono);
}

function mezcla(videos, modo) {
  return mixBlend(videos, modo);
}

function espejo(videos) {
  return mirror(videos);
}

function voltear(videos, horizontal, vertical) {
  return flip(videos, horizontal, vertical);
}

function vigneta(videos, fuerza) {
  return vignette(videos, fuerza);
}

function lineas(videos, opacidad) {
  return scanlines(videos, opacidad);
}

function grano(videos, opacidad) {
  return filmGrain(videos, opacidad);
}

function pulso(videos, activar) {
  return pulse(videos, activar);
}

function pixelar(videos, bloques) {
  return pixelate(videos, bloques);
}

function etiquetar(nombre, id) {
  return etiqueta(nombre, id);
}

/**
 * For the most of the methods below, you need to specify which videos to control.
 * There are various ways to select videos.
 * @param {integer} index - Single index of video
 * @param {null|all} all - All the videos
 * @param {integer[]} list - Indices of videos
 * @param {not(indices)} not - All except indices. See [not()]{@link not}
 * @param {string} expression - Condition text (e.g. ">3" or "%2==0")
 */
function _howToSelectVideos() {
}
