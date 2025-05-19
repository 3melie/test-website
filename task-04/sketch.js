let audio;
let amp;
let fft;

function preload() {
  // audio = loadSound("doorbell.mp3");
}

function setup() {
  createCanvas(400, 400);

  getAudioContext().suspend();
  userStartAudio();

  audio = new p5.AudioIn();
  audio.start();

  amp = new p5.Amplitude();
  amp.setInput(audio);

  fft = new p5.FFT();
  fft.setInput(audio);
}

function draw() {
  background("black");

  

  fill("white")
  const level = amp.getLevel() * 8000;
  //console.log (level);
  circle(width/2, height/2, level, level); 

  let spectrum = fft.analyze();
  noStroke();
  fill(255, 0, 255);
  for (let i = 0; i < spectrum.length; i++){
    let x = map(i, 0, spectrum.length, 0, width);
    let h = -height + map(spectrum[i], 0, 255, height, 0);
    rect(x*60, height, width / spectrum.length * 60, h )
  }

  fft.analyze(1024)
  let waveform = fft.waveform();
  noFill();
  beginShape();
  stroke(255, 0, 0);
  for (let i = 0; i < waveform.length; i++){
    let x = map(i, 0, waveform.length, 0, width);
    let y = map( waveform[i], -1, 1, 0, height);
    vertex(x,y);
  }
  endShape();
 
}

function keyReleased(){
  //audio.play();
}