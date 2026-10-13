// Keeps installed copies up to date from this repository's GitHub Releases, using the latest.yml (Windows
// installer) and latest-linux.yml (AppImage) files the release workflow uploads next to the downloads.
// An update is downloaded in the background, then installed when the user restarts from the menu or quits.
const { BrowserWindow, app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const UPDATE_URL_PATTERN = /^(https:\/\/|http:\/\/127\.0\.0\.1[:/])/;

let status = { currentVersion: app.getVersion(), state: 'idle' };

function setStatus(change) {
  status = { ...status, ...change };
  BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('app:update-status', status));
}

// Only the Windows installer and the AppImage can replace themselves; running from source never updates.
function canUpdate() {
  const isAppImage = process.platform === 'linux' && Boolean(process.env.APPIMAGE);

  return app.isPackaged && (process.platform === 'win32' || isAppImage);
}

function checkForUpdates() {
  if (status.state === 'idle') {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('Update check failed', { error });
    });
  }
}

function setupAutoUpdate() {
  ipcMain.handle('app:update-status', () => status);
  ipcMain.handle('app:install-update', () => {
    if (status.state === 'ready') {
      autoUpdater.quitAndInstall();
    }
  });
  if (!canUpdate()) {
    return;
  }

  const override = process.env.DRY_RUN_UPDATE_URL;
  if (override && UPDATE_URL_PATTERN.test(override)) {
    autoUpdater.setFeedURL({ provider: 'generic', url: override });
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (info) => {
    setStatus({ percent: 0, state: 'downloading', version: info.version });
  });
  autoUpdater.on('download-progress', (progress) => {
    setStatus({ percent: Math.floor(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    setStatus({ state: 'ready', version: info.version });
  });
  autoUpdater.on('error', (error) => {
    console.error('Update failed', { error });
    if (status.state === 'downloading') {
      setStatus({ state: 'idle' });
    }
  });
  checkForUpdates();
  setInterval(checkForUpdates, CHECK_INTERVAL_MS);
}

module.exports = { setupAutoUpdate };
