// Erzeugt den QR-Code zur Seminar-App als SVG (assets/img/qr-app.svg)
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const URL = 'https://edekafoodacademy.github.io/food-academy-seminar-app/';
QRCode.toString(URL, { type: 'svg', errorCorrectionLevel: 'H', margin: 0, color: { dark: '#1d1d1b', light: '#0000' } })
  .then((svg) => {
    fs.writeFileSync(path.join(__dirname, '..', 'assets', 'img', 'qr-app.svg'), svg);
    console.log('QR-Code geschrieben für', URL);
  });
