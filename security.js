/* MS ZODIAC SILENT SECURITY LAYER
   Defensive client-side monitoring only.
   It never displays security events to visitors and never rewrites production code.
*/
(function(){
  'use strict';

  var KEY = 'msZodiacSecurityStateV1';
  var MAX_EVENTS = 40;
  var bootAt = Date.now();
  var security = window.MSSecurity = window.MSSecurity || {};

  function safeRead(){
    try{
      var raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {events:[], integrity:null, bootCount:0};
    }catch(e){
      return {events:[], integrity:null, bootCount:0};
    }
  }

  function safeWrite(state){
    try{ sessionStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
  }

  function digest(value){
    try{
      if(window.crypto && crypto.subtle && window.TextEncoder){
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
          .then(function(buf){
            var a = new Uint8Array(buf), s = '';
            for(var i=0;i<a.length;i++) s += ('00'+a[i].toString(16)).slice(-2);
            return s;
          });
      }
    }catch(e){}
    return Promise.resolve(String(value.length));
  }

  function record(type, detail){
    var state = safeRead();
    state.events = Array.isArray(state.events) ? state.events : [];
    state.events.push({
      t: Date.now(),
      type: String(type).slice(0,60),
      detail: String(detail || '').slice(0,180)
    });
    if(state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);
    safeWrite(state);
  }

  function criticalSnapshot(){
    var ids = [
      'landingAudio','musicBtn','musicControlWrap','musicControlMenu',
      'musicPlayPause','musicVolume','musicTrackOption0','musicTrackOption1'
    ];
    var result = [];
    for(var i=0;i<ids.length;i++){
      var el = document.getElementById(ids[i]);
      result.push(ids[i] + ':' + (el ? el.tagName : 'missing'));
    }
    var scripts = [];
    document.querySelectorAll('script[src]').forEach(function(s){
      scripts.push(s.src);
    });
    return JSON.stringify({
      ids: result,
      externalScripts: scripts,
      audioCount: document.querySelectorAll('audio').length,
      boot: document.querySelectorAll('script').length
    });
  }

  function allowedScript(src){
    try{
      var u = new URL(src, location.href);
      return u.origin === location.origin;
    }catch(e){
      return false;
    }
  }

  function scanScripts(){
    document.querySelectorAll('script[src]').forEach(function(s){
      if(!allowedScript(s.src)) record('external-script', s.src);
    });
  }

  function enforceSingleAudio(){
    var audios = document.querySelectorAll('audio');
    var active = [];
    for(var i=0;i<audios.length;i++){
      if(!audios[i].paused && !audios[i].ended) active.push(audios[i]);
    }
    if(active.length > 1){
      record('multiple-audio', 'active=' + active.length);
      /* Keep the visible site player authoritative. */
      var preferred = document.getElementById('landingAudio') || active[0];
      for(var j=0;j<active.length;j++){
        if(active[j] !== preferred){
          try{ active[j].pause(); }catch(e){}
        }
      }
    }
  }

  function installAudioGuard(){
    document.addEventListener('play', function(e){
      if(e.target && e.target.tagName === 'AUDIO'){
        setTimeout(enforceSingleAudio, 0);
      }
    }, true);
    setInterval(enforceSingleAudio, 1800);
  }

  function installErrorMonitor(){
    window.addEventListener('error', function(e){
      var target = e.target;
      if(target && target.tagName === 'SCRIPT' && target.src){
        record('script-error', target.src);
      }else if(e.message){
        record('runtime-error', e.message);
      }
    }, true);

    window.addEventListener('unhandledrejection', function(e){
      var reason = e && e.reason;
      record('promise-error', reason && reason.message ? reason.message : 'unhandled rejection');
    });
  }

  function installDomGuard(){
    var critical = {
      'landingAudio': true,
      'musicBtn': true,
      'musicControlWrap': true,
      'musicControlMenu': true,
      'musicPlayPause': true,
      'musicVolume': true,
      'musicTrackOption0': true,
      'musicTrackOption1': true
    };

    var observer = new MutationObserver(function(mutations){
      for(var i=0;i<mutations.length;i++){
        var m = mutations[i];
        if(m.type === 'childList'){
          for(var j=0;j<m.addedNodes.length;j++){
            var n = m.addedNodes[j];
            if(n.nodeType === 1){
              if(n.tagName === 'SCRIPT' && n.src && !allowedScript(n.src)){
                record('dom-script-injection', n.src);
                try{ n.remove(); }catch(e){}
              }
              if(n.tagName === 'AUDIO' && !n.id){
                record('unexpected-audio', 'anonymous audio element');
              }
            }
          }
        }
        if(m.type === 'attributes' && m.target && critical[m.target.id]){
          if(m.attributeName === 'src' && m.target.id === 'landingAudio'){
            record('audio-src-change', m.target.getAttribute('src') || '');
          }
        }
      }
      enforceSingleAudio();
    });

    try{
      observer.observe(document.documentElement, {
        subtree:true,
        childList:true,
        attributes:true,
        attributeFilter:['src']
      });
    }catch(e){}
  }

  function init(){
    var state = safeRead();
    state.bootCount = Number(state.bootCount || 0) + 1;
    safeWrite(state);

    scanScripts();
    installErrorMonitor();
    installAudioGuard();
    installDomGuard();

    var snapshot = criticalSnapshot();
    digest(snapshot).then(function(hash){
      var current = safeRead();
      if(current.integrity && current.integrity !== hash){
        record('integrity-drift', 'critical UI structure changed');
      }
      current.integrity = hash;
      safeWrite(current);
      security.integrity = hash;
    });

    security.version = '1.0.0';
    security.startedAt = bootAt;
    security.record = record;
    security.getState = safeRead;
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
})();
