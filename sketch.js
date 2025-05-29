let mic, fft;
let lasers = [];
let threshold = 0.1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  mic = new p5.AudioIn();
  mic.start();

  fft = new p5.FFT(0.8, 1024);
  fft.setInput(mic);

  background(0);
}

function draw() {
  background(0, 20); // weiches Ausfaden

  let spectrum = fft.analyze();
  let vol = mic.getLevel();

  if (vol > threshold) {
    let i = findDominantFreqIndex(spectrum);
    let freq = indexToFreq(i, spectrum.length);
    let angle = map(i, 0, spectrum.length, 0, TWO_PI);
    let len = map(vol, 0, 1, 50, 400);

    let pos = createVector(random(width), random(height));
    let dir = p5.Vector.fromAngle(angle).mult(len);

    lasers.push({
      x: pos.x,
      y: pos.y,
      dx: dir.x,
      dy: dir.y,
      hue: map(freq, 100, 10000, 0, 360)
    });
  }

  // Zeige alle Laserstrahlen
  for (let l of lasers) {
    stroke(l.hue, 80, 100);
    strokeWeight(2);
    line(l.x, l.y, l.x + l.dx, l.y + l.dy);
  }

  // Optional: begrenze die Anzahl Laser
  if (lasers.length > 200) {
    lasers.splice(0, 1);
  }
}

function findDominantFreqIndex(spectrum) {
  let maxAmp = 0;
  let index = 0;
  for (let i = 0; i < spectrum.length; i++) {
    if (spectrum[i] > maxAmp) {
      maxAmp = spectrum[i];
      index = i;
    }
  }
  return index;
}
 
function indexToFreq(index, bins) {
  let nyquist = sampleRate() / 2;
  return index * (nyquist / bins);
}

function touchStarted() {
  // Für Browser-Sicherheitsrichtlinien auf mobilen Geräten
  getAudioContext().resume();
}
