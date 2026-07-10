import type { TrainingPlanMaterial } from "@/features/training/trainingTypes";

export function isImageMaterial(material: TrainingPlanMaterial | null): boolean {
  if (!material) return false;

  return (
    material.type.toLowerCase() === "image" ||
    material.mimeType.toLowerCase().startsWith("image/")
  );
}

export function isVideoMaterial(material: TrainingPlanMaterial | null): boolean {
  if (!material) return false;

  return (
    material.type.toLowerCase() === "video" ||
    material.mimeType.toLowerCase().startsWith("video/")
  );
}

export function isPdfMaterial(material: TrainingPlanMaterial | null): boolean {
  if (!material) return false;

  return (
    material.type.toLowerCase() === "pdf" ||
    material.mimeType.toLowerCase() === "application/pdf"
  );
}

export type VideoViewerMessage = {
  kind: "video";
  positionPct: number;
  watchedPct: number;
  ended: boolean;
};

export type PdfViewerMessage = {
  kind: "pdf";
  maxPage: number;
  numPages: number;
  readSeconds: number;
};

export type ViewerMessage = VideoViewerMessage | PdfViewerMessage;

export type PdfWatermarkIdentity = {
  email: string;
  name: string;
};

const VIEWER_MESSAGE_SOURCE = "zhao-training-viewer";

export function parseViewerMessage(rawData: string): ViewerMessage | null {
  try {
    const data = JSON.parse(rawData) as Record<string, unknown>;

    if (data.source !== VIEWER_MESSAGE_SOURCE) return null;

    if (data.kind === "video") {
      return {
        kind: "video",
        positionPct: Number(data.positionPct) || 0,
        watchedPct: Number(data.watchedPct) || 0,
        ended: data.ended === true,
      };
    }

    if (data.kind === "pdf") {
      return {
        kind: "pdf",
        maxPage: Number(data.maxPage) || 0,
        numPages: Number(data.numPages) || 0,
        readSeconds: Number(data.readSeconds) || 0,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// The tracking script only counts small timeupdate deltas as watched time, so
// seeking ahead does not inflate the watched percentage.
export function buildVideoPlayerHtml(
  videoFileUri: string,
  startPct: number,
): string {
  return `<!DOCTYPE html>
<html style="height:100%">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0}
html,body{height:100%;background:#000;overflow:hidden}
body{display:flex;align-items:center;justify-content:center}
video{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain}
</style>
</head>
<body>
<video controls autoplay playsinline webkit-playsinline disablePictureInPicture src="${videoFileUri}"></video>
<script>
(function(){
  var video=document.querySelector('video');
  var watchedSeconds=0,lastTime=null,maxPosition=0,duration=0,lastReportedPct=-1;
  function post(ended){
    if(!window.ReactNativeWebView||!duration)return;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      source:${JSON.stringify(VIEWER_MESSAGE_SOURCE)},
      kind:'video',
      positionPct:Math.min(100,Math.round(maxPosition/duration*100)),
      watchedPct:Math.min(100,Math.round(watchedSeconds/duration*100)),
      ended:!!ended
    }));
  }
  video.addEventListener('loadedmetadata',function(){
    duration=video.duration||0;
    var startPct=${JSON.stringify(startPct)};
    if(duration&&startPct>0&&startPct<95){video.currentTime=duration*startPct/100;}
    post(false);
  });
  video.addEventListener('timeupdate',function(){
    if(!duration&&video.duration){duration=video.duration;}
    var t=video.currentTime;
    if(lastTime!==null){var delta=t-lastTime;if(delta>0&&delta<2){watchedSeconds+=delta;}}
    lastTime=t;
    if(t>maxPosition)maxPosition=t;
    var pct=duration?Math.floor(watchedSeconds/duration*100):0;
    if(pct>=lastReportedPct+5){lastReportedPct=pct;post(false);}
  });
  video.addEventListener('seeked',function(){lastTime=video.currentTime;});
  video.addEventListener('pause',function(){post(false);});
  video.addEventListener('ended',function(){post(true);});
})();
</script>
</body>
</html>`;
}

// Both platforms render PDFs with pdf.js: the Android System WebView can't
// render PDFs inline, and the iOS native <embed> viewer gives no way to track
// reading position. The PDF bytes are injected as base64 and decoded
// in-memory — the document never leaves the device; only the (public) pdf.js
// library is fetched.
const PDFJS_VERSION = "3.11.174";
const PDFJS_LIB_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export function buildPdfViewerHtml(
  base64Data: string,
  watermarkIdentity: PdfWatermarkIdentity,
): string {
  const serializeForInlineScript = (value: string): string =>
    JSON.stringify(value).replace(/</g, "\\u003c");
  const serializedWatermarkName = serializeForInlineScript(watermarkIdentity.name);
  const serializedWatermarkEmail = serializeForInlineScript(
    watermarkIdentity.email,
  );

  return `<!DOCTYPE html>
<html style="height:100%">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=4,minimum-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{min-height:100%;background:#525659}
#pages{display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px}
.page{position:relative;max-width:100%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.4)}
.page canvas{display:block;max-width:100%;height:auto}
.watermark{position:absolute;left:50%;display:flex;flex-direction:column;align-items:center;gap:4px;color:rgba(96,38,38,.5);font-family:sans-serif;pointer-events:none;transform:translate(-50%,-50%) rotate(-32deg);white-space:nowrap}
.watermark--top{top:18%}.watermark--middle{top:50%}.watermark--bottom{top:82%}
.watermark-name{font-size:18px;font-weight:600;letter-spacing:2px}.watermark-email{font-size:16px;font-weight:500;letter-spacing:1px}
#err{display:none;color:#fff;font-family:sans-serif;font-size:14px;line-height:1.5;padding:24px;text-align:center}
</style>
</head>
<body>
<div id="pages"></div>
<div id="err"></div>
<script src="${PDFJS_LIB_URL}"></script>
<script>
(function(){
  var maxPage=0,numPages=0,readSeconds=0,lastSent='';
  function send(){
    if(!window.ReactNativeWebView||!numPages)return;
    var message=JSON.stringify({
      source:${JSON.stringify(VIEWER_MESSAGE_SOURCE)},
      kind:'pdf',
      maxPage:maxPage,
      numPages:numPages,
      readSeconds:readSeconds
    });
    if(message===lastSent)return;
    lastSent=message;
    window.ReactNativeWebView.postMessage(message);
  }
  setInterval(function(){
    readSeconds++;
    send();
  },1000);
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      var page=Number(entry.target.getAttribute('data-page'))||0;
      if(page>maxPage){maxPage=page;send();}
    });
  },{threshold:0.4});
  function showError(message){
    var el=document.getElementById('err');
    el.textContent=message;
    el.style.display='block';
  }
  window.onerror=function(m){showError('PDF error: '+m);return true;};
  try{
    if(!window.pdfjsLib){showError('PDF library failed to load (check network).');return;}
    pdfjsLib.GlobalWorkerOptions.workerSrc=${JSON.stringify(PDFJS_WORKER_URL)};
    var raw=atob(${JSON.stringify(base64Data)});
    var bytes=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++){bytes[i]=raw.charCodeAt(i);}
    var dpr=window.devicePixelRatio||1;
    var maxWidth=Math.min(window.innerWidth-16,1000);
    pdfjsLib.getDocument({data:bytes}).promise.then(function(pdf){
      numPages=pdf.numPages;
      send();
      var container=document.getElementById('pages');
      var chain=Promise.resolve();
      for(var p=1;p<=pdf.numPages;p++){
        (function(pageNum){
          chain=chain.then(function(){
            return pdf.getPage(pageNum).then(function(page){
              var base=page.getViewport({scale:1});
              var viewport=page.getViewport({scale:maxWidth/base.width});
              var pageElement=document.createElement('div');
              pageElement.className='page';
              pageElement.style.width=viewport.width+'px';
              pageElement.style.height=viewport.height+'px';
              pageElement.setAttribute('data-page',String(pageNum));
              var canvas=document.createElement('canvas');
              var ctx=canvas.getContext('2d');
              canvas.width=Math.floor(viewport.width*dpr);
              canvas.height=Math.floor(viewport.height*dpr);
              canvas.style.width=viewport.width+'px';
              canvas.style.height=viewport.height+'px';
              pageElement.appendChild(canvas);
              ['top','middle','bottom'].forEach(function(position){
                var watermark=document.createElement('div');
                watermark.className='watermark watermark--'+position;
                var watermarkName=document.createElement('span');
                watermarkName.className='watermark-name';
                watermarkName.textContent=${serializedWatermarkName};
                var watermarkEmail=document.createElement('span');
                watermarkEmail.className='watermark-email';
                watermarkEmail.textContent=${serializedWatermarkEmail};
                watermark.appendChild(watermarkName);
                watermark.appendChild(watermarkEmail);
                pageElement.appendChild(watermark);
              });
              ctx.scale(dpr,dpr);
              container.appendChild(pageElement);
              observer.observe(pageElement);
              return page.render({canvasContext:ctx,viewport:viewport}).promise;
            });
          });
        })(p);
      }
      return chain;
    }).catch(function(e){showError('Cannot render PDF: '+(e&&e.message?e.message:e));});
  }catch(e){showError('Cannot open PDF: '+(e&&e.message?e.message:e));}
})();
</script>
</body>
</html>`;
}
