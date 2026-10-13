const { BrowserWindow, app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SIZE = 512;
const PROJECT_DIRECTORY = path.join(__dirname, '..');
const DATA_URL_PREFIX = 'data:image/png;base64,';

app.whenReady().then(async () => {
  const svgText = fs.readFileSync(path.join(PROJECT_DIRECTORY, 'icon.svg'), 'utf8');
  const iconWindow = new BrowserWindow({ show: false });
  await iconWindow.loadURL('data:text/html,<canvas></canvas>');
  const dataUrl = await iconWindow.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.querySelector('canvas');
        canvas.width = ${SIZE};
        canvas.height = ${SIZE};
        canvas.getContext('2d').drawImage(image, 0, 0, ${SIZE}, ${SIZE});
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('SVG failed to load'));
      image.src = 'data:image/svg+xml;base64,' + btoa(${JSON.stringify(svgText)});
    })
  `);
  fs.writeFileSync(
    path.join(PROJECT_DIRECTORY, 'icon.png'),
    Buffer.from(dataUrl.slice(DATA_URL_PREFIX.length), 'base64'),
  );
  app.quit();
});
