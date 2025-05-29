let mic, fft;
let threshold = 0.1; // Lautstärkeschwelle
let lasers = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  mic = new p5.AudioIn();
  mic.start();

  fft = new p5.FFT();
  fft.setInput(mic);

  background(0);
}

function draw() {
  background(0, 20); // leicht transparent, um Spuren zu erzeugen

  let spectrum = fft.analyze();
  let vol = mic.getLevel();

  if (vol > threshold) {
    let freqIndex = findDominantFreqIndex(spectrum);
    let freq = freqIndexToFreq(freqIndex);
    let angle = map(freqIndex, 0, spectrum.length, 0, TWO_PI);
    let len = map(vol, 0, 1, 50, 400);
    
    let x = random(width);
    let y = random(height);
    let dir = p5.Vector.fromAngle(angle).mult(len);

    lasers.push({
      x: x,
      y: y,
      dx: dir.x,
      dy: dir.y,
      col: color(map(freq, 100, 10000, 0, 360), 100, 100)
    });
  }

  // Zeichne alle Laser
  colorMode(HSB, 360, 100, 100, 100);
  for (let l of lasers) {
    stroke(l.col);
    strokeWeight(2);
    line(l.x, l.y, l.x + l.dx, l.y + l.dy);
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

function freqIndexToFreq(index) {
  let nyquist = sampleRate() / 2;
  return index * (nyquist / spectrum.length);
}
