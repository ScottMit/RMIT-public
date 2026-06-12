/* =====================================================================
   EDIT THIS LIST — one entry per sketch.

   src options:
     - Local file:      "sketches/your-folder/index.html"
     - OpenProcessing:  "https://openprocessing.org/sketch/XXXXXX/embed/"
                         (use the embed URL, not the regular sketch URL)

   Put local sketch folders inside a "sketches" folder next to this
   index.html file, each with their own index.html / p5 files.
   ===================================================================== */

const SKETCHES = [
  {
    title: "Earth",
    artist: "Benjamin Carter",
    desc: "A simulation exploring the randomness of birth and its influances on life outcomes.",
    src: "sketches/sketch-01/index.html"
  },
  {
    title: "Pattern Generator",
    artist: "Ned Cohen",
    desc: "An interactive, rule-based digital environment that creates geometric patterns for use in CAD and additive manufacturing workflows.",
    src: "sketches/sketch-02/index.html"
  },
  {
    title: "Keepy Uppy",
    artist: "John Cornwell",
    desc: "A reproduction of the childhood game 'keepy uppy' through the use of machine-learning hand tracking.",
    src: "sketches/sketch-03/index.html"
  },
  {
    title: "Slime Mold Agents",
    artist: "Hugh Hanrahan",
    desc: "Using slime mold agents to create an optimized path around the 3D mesh.",
    src: "sketches/sketch-04/index.html"
  },
  // 5 Jack Harman fuzzy map?
  {
    title: "Interactive Ocean",
    artist: "Fergus Lavery",
    desc: "Using ml5.js and handPose to identify and track hand gestures and influence the state of a generated ocean.",
    src: "sketches/sketch-06/index.html"
  },
  // 7 TJ dog pose video?
  {
    title: "Penny Drop",
    artist: "Will Murrary",
    desc: "A digital version of the Penny Drop game using matter.js.",
    src: "sketches/sketch-08/index.html"
  },
  {
    title: "Newton Cradle & Vineyard",
    artist: "Cheuk Yue Or",
    desc: "A diptych scene exploring the matter.js physics engine — Newton's Cradle on the left, a vineyard of hanging chains on the right.",
    src: "sketches/sketch-09-10/index.html"
  },
  {
    title: "Flocking Sim",
    artist: "Riley Pascoe",
    desc: "Connecting a p5js flocking simulation to TouchDesigner.",
    src: "sketches/sketch-11/Flocking sim video.mp4"
  },
  // {
  //   title: "Knife Alert",
  //   artist: "Leila Rekic",
  //   desc: "Knife Alert — recording of the code in action.",
  //   src: "sketches/sketch-12/Recording of Code.mp4"
  // },
  {
    title: "Rainbow Trails",
    artist: "Charlotte Roberts",
    desc: "Gesture tracking with Rainbow Trails.",
    src: "sketches/sketch-13/index.html"
  },
  {
    title: "Flow",
    artist: "Danaisha Shetty",
    desc: "Exploring flow fields.",
    src: "sketches/sketch-14/index.html"
  },
  {
    title: "Membrane",
    artist: "Zac Ure",
    desc: "A Spring-Mass Cloth Simulation.",
    src: "sketches/sketch-15/index.html"
  },
  {
    title: "Cymatic Mirror",
    artist: "Finlay White",
    desc: "Cymatic patterns that respond to facial expression.",
    src: "sketches/sketch-16/index.html"
  },
  {
    title: "Digital Kaleidoscope",
    artist: "Ben Yardley",
    desc: "A digital kaleidoscope with finger tracking control.",
    src: "sketches/sketch-17/index.html"
  },
  {
    title: "Outlast the Cubes",
    artist: "Felix Zylinski",
    desc: "An endless runner game controlled by body pose.",
    src: "sketches/sketch-18/index.html"
  }
];

/* ===================================================================== */

const nav = document.getElementById('nav');
const stage = document.getElementById('stage');
const plaque = document.getElementById('plaque');
const plaqueTitle = document.getElementById('plaque-title');
const plaqueArtist = document.getElementById('plaque-artist');
const plaqueDesc = document.getElementById('plaque-desc');

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v'];

function isVideo(src){
  const lower = src.toLowerCase().split('?')[0];
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function loadSketch(index){
  const item = SKETCHES[index];

  // Clear and rebuild stage with the right element for the media type
  stage.innerHTML = '';

  if (isVideo(item.src)) {
    const video = document.createElement('video');
    video.src = item.src;
    video.title = item.title;
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;       // required for autoplay in most browsers
    video.playsInline = true;
    stage.appendChild(video);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = item.src;
    iframe.title = item.title;
    iframe.setAttribute('allow', 'autoplay; fullscreen');
    stage.appendChild(iframe);
  }

  plaqueTitle.textContent = item.title;
  plaqueArtist.textContent = item.artist;
  plaqueDesc.textContent = item.desc || '';
  plaque.style.display = 'flex';

  [...nav.children].forEach((btn,i) => btn.classList.toggle('active', i === index));
}

SKETCHES.forEach((item, i) => {
  const btn = document.createElement('button');
  btn.innerHTML = '<span class="title">' + item.title + '</span><span class="artist">' + item.artist + '</span>';
  btn.addEventListener('click', () => loadSketch(i));
  nav.appendChild(btn);
});

// Auto-load the first sketch
if (SKETCHES.length) loadSketch(0);

// ── FULLSCREEN TOGGLE ─────────────────────────────────────────
const fullscreenBtn   = document.getElementById('fullscreen-btn');
const fullscreenLabel = document.getElementById('fullscreen-label');

function inFullscreen(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function toggleFullscreen(){
  if (inFullscreen()) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  }
}

fullscreenBtn.addEventListener('click', toggleFullscreen);

// Keep the label in sync if the user exits fullscreen via Esc or system controls
function syncFullscreenLabel(){
  fullscreenLabel.textContent = inFullscreen() ? 'Exit Fullscreen' : 'Fullscreen';
}
document.addEventListener('fullscreenchange', syncFullscreenLabel);
document.addEventListener('webkitfullscreenchange', syncFullscreenLabel);
