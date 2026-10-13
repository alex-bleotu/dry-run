const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('practice', {
  installUpdate: () => ipcRenderer.invoke('app:install-update'),
  list: () => ipcRenderer.invoke('app:list'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('app:update-status', (event, status) => callback(status));
    ipcRenderer.invoke('app:update-status').then(callback);
  },
  open: (id) => ipcRenderer.invoke('app:open', id),
  reset: (id) => ipcRenderer.invoke('app:reset', id),
  run: (payload) => ipcRenderer.invoke('app:run', payload),
  runCustom: (payload) => ipcRenderer.invoke('app:run-custom', payload),
  save: (payload) => ipcRenderer.invoke('app:save', payload),
  syncProblems: () => ipcRenderer.invoke('app:sync-problems'),
});
