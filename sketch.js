let mic, fft;
let lasers = [];
let mouseTrail = [];
let threshold = 0.001;
let minIndex = 10;
let maxIndex = 200;

// UI Elemente
let settingsPanel, toggleButton;
let hueSlider;
let lineWeightSlider, lineLengthSlider, fadeOutSlider, fireworkCountSlider;
let useFreqColorCheckbox, randomPositionCheckbox;
let hoverModeSelector;
let resetButton;
let fireworkCountLabel;
let linePreview, previewImg;

let hoverModes = ['Kein Effekt', 'Anziehen', 'Abstoßen', 'Funken'];
let hoverModeButtons = [];

let currentMode = 'Kein Effekt';
let dragging = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(0);

  mic = new p5.AudioIn();
  mic.start();

  // Warte kurz, dann prüfe ob das Mikro aktiviert wurde
  setTimeout(() => {
    if (!mic.enabled) {
      alert("⚠️ Bitte erlaube den Mikrofonzugriff im Browser, damit das Audio-Feuerwerk funktioniert.");
    }
  }, 1000); // 1 Sekunde Verzögerung

  fft = new p5.FFT(0.8, 1024);
  fft.setInput(mic);

  setupUI();
  
}

function keyPressed() {
  if (key === 'S' || key === 's') {
    saveCanvas('firework_screenshot', 'png');
  }
}

function draw() {
  let fadeVal = map(fadeOutSlider.value(), 1, 50, 50, 1);
  background(0, 0, 0, fadeVal);

  let spectrum = fft.analyze();
  let vol = mic.getLevel();

 

  if (vol > threshold) {
    let index = findDominantFreqIndex(spectrum);

    if (index >= minIndex && index <= maxIndex) {
      let freq = indexToFreq(index, spectrum.length);
      let angle = random(TWO_PI);
      let len = lineLengthSlider.value();
      let dir = p5.Vector.fromAngle(angle).mult(2);

      let origins = [];

      if (randomPositionCheckbox.checked()) {
        let count = fireworkCountSlider.value();
        for (let i = 0; i < count; i++) {
          origins.push(createVector(random(width), random(height)));
        }
      } else {
        let count = fireworkCountSlider.value();
        if (count === 1) {
          origins.push(createVector(width / 2, height / 2));
        } else if (count === 2) {
          origins.push(createVector(width * 0.25, height * 0.25));
          origins.push(createVector(width * 0.75, height * 0.75));
        } else if (count === 3) {
          origins.push(createVector(width / 2, height / 2));
          origins.push(createVector(width * 0.25, height * 0.25));
          origins.push(createVector(width * 0.75, height * 0.75));
        } else if (count === 4) {
          origins.push(createVector(width * 0.25, height * 0.25));
          origins.push(createVector(width * 0.75, height * 0.75));
          origins.push(createVector(width * 0.75, height * 0.25));
          origins.push(createVector(width * 0.25, height * 0.75));
        } else if (count === 5) {
          origins.push(createVector(width / 2, height / 2));
          origins.push(createVector(width * 0.25, height * 0.25));
          origins.push(createVector(width * 0.75, height * 0.75));
          origins.push(createVector(width * 0.75, height * 0.25));
          origins.push(createVector(width * 0.25, height * 0.75));
        }
      }

      for (let origin of origins) {
        let hueVal = useFreqColorCheckbox.checked()
                     ? map(freq, 100, 8000, hueSlider.value(), hueSlider.value() + 60) % 360
                     : random(hueSlider.value(), hueSlider.value() + 60);

                     let weightVal = randomWeightCheckbox.checked() ? random(1, 10) : lineWeightSlider.value();
                     let lengthVal = randomLengthCheckbox.checked() ? random(50, 400) : lineLengthSlider.value();
                     
                     lasers.push({
                       pos1: origin.copy(),
                       pos2: p5.Vector.add(origin, p5.Vector.fromAngle(angle).mult(lengthVal)),
                       dir: p5.Vector.fromAngle(angle).mult(2),
                       hue: hueVal,
                       alpha: 100,
                       weight: weightVal,
                       burst: false,
                       burstFragments: []
                     });
                     
      }
    }
  }

  // --- MAUS-TRAIL und MOUSE-BLITZ ---
  // Statt: let mouseMode = hoverModeSelector.value();
let mouseMode = currentMode;


  if (mouseMode !== 'Kein Effekt') {
    noCursor(); // Verstecke den System-Cursor
  
    // Trail hinzufügen
    const smoothFactor = 0.4;
    let last = mouseTrail[mouseTrail.length - 1];
    let newX = mouseX;
    let newY = mouseY;
    if (last) {
      newX = lerp(last.x, mouseX, smoothFactor);
      newY = lerp(last.y, mouseY, smoothFactor);
    }
    mouseTrail.push({ x: newX, y: newY });
  
    // Nur sehr kurzer Trail
    if (mouseTrail.length > 10) {
      mouseTrail.shift();
    }
  
    // Trail zeichnen
    noFill();
    for (let i = 0; i < mouseTrail.length - 1; i++) {
      let pt1 = mouseTrail[i];
      let pt2 = mouseTrail[i + 1];
      let t = i / mouseTrail.length;
  
      let weight = lerp(2, 0.5, t);
      let alpha = lerp(80, 0, t);
  
      strokeWeight(weight);
      stroke(0, 0, 100, alpha); // Weiß in HSB
      line(pt1.x, pt1.y, pt2.x, pt2.y);
    }
  
    // Optional: Dezenter Mauspunkt
    fill(0, 0, 100, 5); // sehr transparentes Weiß
    noStroke();
    circle(mouseX, mouseY, 6);
  
  } else {
    cursor(); // Standard-Cursor wieder anzeigen
    mouseTrail = []; // Trail zurücksetzen, wenn Modus deaktiviert ist
  }
  
  

  

// --- LASER ZEICHNUNG ---
for (let l of lasers) {
  let shouldHighlight = false;

  // Abstand Maus zu Laserlinie (vereinfacht mit Linie Mitte)
  let midX = (l.pos1.x + l.pos2.x) / 2;
  let midY = (l.pos1.y + l.pos2.y) / 2;
  let distance = dist(mouseX, mouseY, midX, midY);

  let mode = currentMode; // Statt hoverModeSelector.value()


  // Laser Highlight bei Mausnähe (wenn Modus aktiv)
  if (mode !== 'Kein Effekt' && distance < 30) {
    shouldHighlight = true;
  }

  if (shouldHighlight) {
    strokeWeight(l.weight * 2);
    stroke(l.hue, 100, 100, 80); // Glow-Schein
    line(l.pos1.x, l.pos1.y, l.pos2.x, l.pos2.y);
  
  } else {
    blendMode(BLEND);       // Zurücksetzen auf Standardmodus
    strokeWeight(l.weight);
    stroke(l.hue, 80, 100, l.alpha);
  }
  

  beginShape();
  let mid = p5.Vector.add(l.pos1, l.pos2).div(2);
  let control = mid.copy();
  let d = dist(mid.x, mid.y, mouseX, mouseY);

  if (d < 100 && (mode === 'Anziehen' || mode === 'Abstoßen')) {
    let offset = createVector(mouseX - mid.x, mouseY - mid.y);
    let strength = map(d, 0, 100, 50, 0);
    if (mode === 'Abstoßen') offset.mult(-1);
    offset.setMag(strength);
    control.add(offset);
  }

  bezier(l.pos1.x, l.pos1.y, control.x, control.y, control.x, control.y, l.pos2.x, l.pos2.y);
  endShape();

  // Bewegung & Alpha
  l.pos1.add(l.dir);
  l.pos2.add(l.dir);
  l.alpha -= 1;

  // Zerbersten
  if (mode === 'Funken' && !l.burst && distance < 20) {
    l.burst = true;
    let fragCount = int(random(5, 12));
    for (let i = 0; i < fragCount; i++) {
      let angle = random(TWO_PI);
      let speed = random(1, 5);
      let fragDir = p5.Vector.fromAngle(angle).mult(speed);
      let start = createVector(midX, midY);
      let end = p5.Vector.add(start, fragDir.copy().mult(10));
      l.burstFragments.push({
        pos1: start,
        pos2: end,
        dir: fragDir,
        alpha: 100,
        hue: l.hue,
        weight: l.weight - 0.5
      });
    }
  }

  // Anziehen/Abstoßen Verhalten
  if (mode === 'Anziehen' || mode === 'Abstoßen') {
    if (distance < 700) {
      let tipToMouse = createVector(mouseX - l.pos2.x, mouseY - l.pos2.y);
      let tipForce = tipToMouse.copy();
      tipForce.setMag(map(distance, 0, 700, 1.5, 0.1));

      if (mode === 'Anziehen') {
        l.pos2.add(tipForce.mult(0.3));
      } else {
        l.pos2.sub(tipForce.mult(0.3));
      }
    } else {
      let desired = p5.Vector.add(l.pos1, l.dir.copy().setMag(p5.Vector.dist(l.pos1, l.pos2)));
      l.pos2 = p5.Vector.lerp(l.pos2, desired, 0.05);
    }
  }
}

// --- EXPLOSIONS-ZEICHNUNG ---
for (let l of lasers) {
  if (l.burst) {
    for (let f of l.burstFragments) {
      let fadeProgress = constrain(map(f.alpha, 100, 0, 0, 1), 0, 1);
      let lerpedHue = f.hue;
      let lerpedSat = lerp(0, 80, fadeProgress); // von Weiß (0 Sättigung) zu Farbe
      let lerpedBri = 100; // bleibt leuchtend
      let lerpedAlpha = f.alpha;

      // Optionaler Glow-Schein
      strokeWeight(f.weight * 2.5);
      stroke(lerpedHue, lerpedSat, lerpedBri, lerpedAlpha * 0.2);
      line(f.pos1.x, f.pos1.y, f.pos2.x, f.pos2.y);

      // Hauptlinie mit Farbverlauf
      strokeWeight(f.weight);
      stroke(lerpedHue, lerpedSat, lerpedBri, lerpedAlpha);
      line(f.pos1.x, f.pos1.y, f.pos2.x, f.pos2.y);

      f.pos1.add(f.dir);
      f.pos2.add(f.dir);
      f.alpha -= 3;
    }
  }
}


// --- CLEANUP ---
lasers = lasers.filter(l => l.alpha > 0);
lasers = lasers.filter(l => {
  if (l.burst) {
    l.burstFragments = l.burstFragments.filter(f => f.alpha > 0);
    return l.burstFragments.length > 0;
  }
  return l.alpha > 0;
});

  
  
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
  getAudioContext().resume();
}

function setupUI() {
  toggleButton = createButton('⚙️ Einstellungen');
  toggleButton.position(20, 20);
  toggleButton.id('toggleButton');
  toggleButton.mousePressed(toggleSettings);

  settingsPanel = createDiv();
  settingsPanel.id('settingsPanel');
  settingsPanel.style('background', '#121212');
  settingsPanel.style('padding', '15px');
  settingsPanel.style('border-radius', '12px');
  settingsPanel.style('position', 'absolute');
  settingsPanel.style('top', '60px');
  settingsPanel.style('left', '20px');
  settingsPanel.style('maxHeight', '80vh');
  settingsPanel.style('overflowY', 'auto');
  settingsPanel.hide();

  // Titel: Farbraum Auswahl
  settingsPanel.child(createP('Auswahl des Farbraums'));

  // Gradient Preview + Slider
  let hueSliderContainer = createDiv();
  let huePreview = createDiv();
  huePreview.style('width', '100%');
  huePreview.style('height', '10px');
  huePreview.style('background', 'linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))');
  hueSliderContainer.child(huePreview);

  hueSlider = createSlider(0, 360, 0);
  hueSlider.class('hue-slider');
  hueSlider.style('width', '100%');
  hueSliderContainer.child(hueSlider);
  settingsPanel.child(hueSliderContainer);

  useFreqColorCheckbox = createCheckbox('Farbabstufungen durch Frequenz bestimmen', false);

  // Checkbox und Text in einer Zeile ausrichten
  useFreqColorCheckbox.style('display', 'inline-flex');
  useFreqColorCheckbox.style('align-items', 'baseline');  // vertikale Zentrierung
  useFreqColorCheckbox.style('margin-top', '4px');
  
  settingsPanel.child(useFreqColorCheckbox);
  

  // Leichte graue Trennlinie
  function createSeparator() {
    let sep = createDiv();
    sep.style('height', '1px');
    sep.style('background-color', '#CCC');
    sep.style('opacity', '0.2'); // noch dezenter
    sep.style('margin', '12px 0');
    return sep;
  }
    settingsPanel.child(createSeparator());
  
    // Zwei Spalten nebeneinander: Linienlänge links, Liniendicke rechts
    let lineSettingsRow = createDiv();
    lineSettingsRow.style('display', 'flex');
    lineSettingsRow.style('gap', '20px');
    lineSettingsRow.style('justify-content', 'space-between');
  
// Container für alles (Spalte)
let lengthCol = createDiv();
lengthCol.style('flex', '1');
lengthCol.style('display', 'flex');
lengthCol.style('flex-direction', 'column');
lengthCol.style('gap', '6px');

// Erste Zeile: Überschrift + Checkbox + Label
let lengthHeader = createDiv();
lengthHeader.style('display', 'flex');
lengthHeader.style('align-items', 'baseline'); // vertikale Zentrierung
lengthHeader.style('gap', '2px');

// Überschrift
let lengthLabel = createP('Linienlänge');
lengthLabel.style('margin', '0');
lengthLabel.style('font-weight', '600');
lengthLabel.style('margin-right', '16px');
lengthHeader.child(lengthLabel);

// Checkbox ohne Text
randomLengthCheckbox = createCheckbox('', false);
randomLengthCheckbox.style('transform', 'scale(0.8)');
lengthHeader.child(randomLengthCheckbox);

// Text "Zufällig" als separates Element
let randomLabel = createP('Zufällig');
randomLabel.style('margin', '0');
randomLabel.style('color', '#FFF');
lengthHeader.child(randomLabel);

// Erste Zeile an die Spalte anhängen
lengthCol.child(lengthHeader);

// Slider unter der ersten Zeile
lineLengthSlider = createSlider(50, 400, 100);
lineLengthSlider.style('width', '100%');
lengthCol.child(lineLengthSlider);

// ... Hier weiter mit deinem Container
lineSettingsRow.child(lengthCol);

// --- Rechts: Liniendicke ---
let weightCol = createDiv();
weightCol.style('flex', '1');
weightCol.style('display', 'flex');
weightCol.style('flex-direction', 'column');
weightCol.style('gap', '6px');

// Erste Zeile: Überschrift + Checkbox + Label
let weightHeader = createDiv();
weightHeader.style('display', 'flex');
weightHeader.style('align-items', 'baseline'); // vertikale Zentrierung
weightHeader.style('gap', '2px');

// Überschrift
let weightLabel = createP('Liniendicke');
weightLabel.style('margin', '0');
weightLabel.style('font-weight', '600');
weightLabel.style('margin-right', '16px'); // ➤ größerer Abstand zur Checkbox
weightHeader.child(weightLabel);

// Checkbox ohne Text
randomWeightCheckbox = createCheckbox('', false);
randomWeightCheckbox.style('transform', 'scale(0.8)');
weightHeader.child(randomWeightCheckbox);

// Text "Zufällig" als separates Element
let randomWeightLabel = createP('Zufällig');
randomWeightLabel.style('margin', '0');
randomWeightLabel.style('color', '#FFF');
weightHeader.child(randomWeightLabel);

// Erste Zeile an die Spalte anhängen
weightCol.child(weightHeader);

// Hier optional der Slider für Dicke:
lineWeightSlider = createSlider(1, 10, 3);
lineWeightSlider.style('width', '100%');
weightCol.child(lineWeightSlider);

// …dann weightCol zu deinem Hauptcontainer hinzufügen
lineSettingsRow.child(weightCol);


settingsPanel.child(lineSettingsRow);

// Linienvorschau Label
let previewLabel = createP('Linienvorschau');
previewLabel.style('margin-top', '15px');
previewLabel.style('font-weight', '600');
settingsPanel.child(previewLabel);

// Linienvorschau Container
let previewDiv = createDiv();
previewDiv.style('display', 'flex');
previewDiv.style('justify-content', 'center');
settingsPanel.child(previewDiv);

linePreview = createGraphics(200, 20);
previewImg = createImg('', '');
previewImg.style('display', 'block');
previewImg.style('margin', 'auto');
previewDiv.child(previewImg);

// Trennlinie
settingsPanel.child(createSeparator());

// Fade-Out Label + Slider
settingsPanel.child(createP('Fade-Out'));
fadeOutSlider = createSlider(1, 50, 10);
fadeOutSlider.style('width', '100%');
settingsPanel.child(fadeOutSlider);

// Trennlinie
settingsPanel.child(createSeparator());

// --- Anzahl Feuerwerke + Zufällige Linien Checkbox ---
let countRow = createDiv();
countRow.style('display', 'flex');
countRow.style('align-items', 'baseline'); // für optisch saubere vertikale Ausrichtung
countRow.style('gap', '2px');
countRow.style('margin-top', '15px');

// Überschrift / Label
fireworkCountLabel = createP('Anzahl Feuerwerke: 1');
fireworkCountLabel.style('margin', '0');
fireworkCountLabel.style('font-weight', '600');
fireworkCountLabel.style('margin-right', '16px'); // Abstand zur Checkbox
countRow.child(fireworkCountLabel);

// Checkbox ohne Text
randomPositionCheckbox = createCheckbox('', false);
randomPositionCheckbox.style('transform', 'scale(0.8)');
countRow.child(randomPositionCheckbox);

// Separates Text-Label
let randomPositionLabel = createP('Zufällige Linien');
randomPositionLabel.style('margin', '0');
randomPositionLabel.style('color', '#FFF');
countRow.child(randomPositionLabel);

// In Panel einfügen
settingsPanel.child(countRow);


fireworkCountSlider = createSlider(1, 5, 1);
fireworkCountSlider.style('width', '100%');
settingsPanel.child(fireworkCountSlider);

fireworkCountSlider.input(() => {
  let value = fireworkCountSlider.value();
  fireworkCountLabel.html('Anzahl Feuerwerke: ' + value);
});
  
// Trennlinie
settingsPanel.child(createSeparator());

    // Maus-Effekte Label
let mouseEffectLabel = createP('');
mouseEffectLabel.style('font-weight', '600');
mouseEffectLabel.style('margin-top', '15px');
settingsPanel.child(mouseEffectLabel);

// Container für Hover-Mode Buttons
let hoverModeContainer = createDiv();
hoverModeContainer.style('margin-top', '12px');
hoverModeContainer.child(createP('Hover-Effekt auswählen'));

// Buttons anlegen
hoverModes.forEach(mode => {
  let btn = createButton(mode);
  btn.style('margin-right', '6px');
  btn.mousePressed(() => {
    currentMode = mode;
    updateButtonStyles();
  });
  hoverModeButtons.push(btn);
  hoverModeContainer.child(btn);
});

settingsPanel.child(hoverModeContainer);

updateButtonStyles(); // Style beim Start setzen

    // Reset Button unten links
    resetButton = createButton('Zurücksetzen');
    resetButton.style('margin-top', '20px');
    resetButton.style('float', 'right');
    resetButton.mousePressed(resetSettings);
    settingsPanel.child(resetButton);

    // Reset-Button Event: Einstellungen zurücksetzen
  resetButton.mousePressed(() => {
    resetSettings();
  });


  function updateButtonStyles() {
    for (let i = 0; i < hoverModeButtons.length; i++) {
      const btn = hoverModeButtons[i];
      if (hoverModes[i] === currentMode) {
        btn.style('background-color', '#555');
        btn.style('color', '#fff');
      } else {
        btn.style('background-color', '#222');
        btn.style('color', '#ccc');
      }
    }
  }
  
  
// Input-Events: Slider & Checkbox-Verhalten
lineWeightSlider.input(updateLinePreview);
lineLengthSlider.input(updateLinePreview);
hueSlider.input(updateLinePreview);

// Funktion zum Ein-/Ausblenden der Slider je nach Checkbox-Zustand
function toggleSlider(checkbox, slider, label) {
  if (checkbox.checked()) {
    slider.style('display', 'none');
    if (label) label.style('display', 'none');
  } else {
    slider.style('display', '');
    if (label) label.style('display', '');
  }
}

// Checkbox-Änderungen mit Slider-Ein/Ausblenden verknüpfen
randomWeightCheckbox.changed(() => {
  toggleSlider(randomWeightCheckbox, lineWeightSlider);
  updateLinePreview();
});

randomLengthCheckbox.changed(() => {
  toggleSlider(randomLengthCheckbox, lineLengthSlider);
  updateLinePreview();
});

randomPositionCheckbox.changed(() => {
  const isRandom = randomPositionCheckbox.checked();

  // Slider ein/ausblenden wie bisher
  toggleSlider(randomPositionCheckbox, fireworkCountSlider);

  // Label-Farbe ändern (hier z.B. grau, wenn Checkbox aktiviert)
  if (isRandom) {
    fireworkCountLabel.style('color', '#888');  // dezentes Grau
  } else {
    fireworkCountLabel.style('color', '#FFF');  // Standardfarbe (schwarz)
  }

  updateLinePreview();
});



function updatePreviewVisibility() {
  if (randomWeightCheckbox.checked() && randomLengthCheckbox.checked()) {
    previewDiv.style('display', 'none');
    previewLabel.style('display', 'none');
  } else {
    previewDiv.style('display', 'flex');
    previewLabel.style('display', 'flex');
  }
}


randomWeightCheckbox.changed(() => {
  toggleSlider(randomWeightCheckbox, lineWeightSlider);
  updateLinePreview();
  updatePreviewVisibility();
});

randomLengthCheckbox.changed(() => {
  toggleSlider(randomLengthCheckbox, lineLengthSlider);
  updateLinePreview();
  updatePreviewVisibility();
});

  


  let saveHint = createP('Drücke "S" zum Speichern als PNG');
  saveHint.style('position', 'fixed');
  saveHint.style('bottom', '10px');
  saveHint.style('right', '20px');
  saveHint.style('color', '#fff');
  saveHint.style('font-size', '16px');
  saveHint.style('font-family', 'Arial, sans-serif');
  saveHint.style('user-select', 'none');
  saveHint.style('pointer-events', 'none');
  saveHint.style('z-index', '1000');

 // 👇 Klick außerhalb schließt das Panel
 document.addEventListener('click', function (event) {
  const panel = document.getElementById('settingsPanel');
  const button = document.getElementById('toggleButton');
  if (!panel || panel.style.display === 'none') return;

  // Wenn Klick außerhalb von Panel und Button, dann verstecken
  if (!panel.contains(event.target) && !button.contains(event.target)) {
    panel.style.display = 'none';
  }
});

  



let exportButton;


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  exportButton.position(windowWidth - 140, windowHeight - 50);
}

function updateLinePreview() {
  linePreview.colorMode(HSB, 360, 100, 100, 100);
  linePreview.clear();
  let weight = lineWeightSlider.value();
  let length = lineLengthSlider.value();
  let hueVal = hueSlider.value();

  // Länge skalieren, damit sie immer ins Canvas passt
  let scaledLength = map(length, 50, 400, 50, 180);
  let x1 = (200 - scaledLength) / 2;
  let x2 = (200 + scaledLength) / 2;

  linePreview.stroke(hueVal, 100, 100);
  linePreview.strokeWeight(weight * 0.7); // Dicke optisch angleichen
  linePreview.line(x1, 10, x2, 10);

  previewImg.elt.src = linePreview.canvas.toDataURL();
}

function toggleSettings() {
  if (settingsPanel.elt.style.display === 'none') {
    settingsPanel.show();
  } else {
    settingsPanel.hide();
  }
}

function resetSettings() {
  // Werte zurücksetzen
  hueSlider.value(0);
  lineLengthSlider.value(100);
  lineWeightSlider.value(2);
  fadeOutSlider.value(10);
  fireworkCountSlider.value(1);
  fireworkCountLabel.html('Anzahl Feuerwerke: 1');

  // Checkboxen zurücksetzen
  useFreqColorCheckbox.checked(false);
  randomLengthCheckbox.checked(false);
  randomWeightCheckbox.checked(false);
  randomPositionCheckbox.checked(false);

  currentMode = 'Kein Effekt';

  // Slider und Labels wieder einblenden
  lineWeightSlider.style('display', '');
  lineLengthSlider.style('display', '');
  fireworkCountSlider.style('display', '');
  fireworkCountLabel.style('color', '#FFF');

  // Update Preview und UI
  updateLinePreview();
  updatePreviewVisibility();
  updateButtonStyles();
}
}
