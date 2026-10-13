const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('practice', {
  list: () => ipcRenderer.invoke('app:list'),
  open: (id) => ipcRenderer.invoke('app:open', id),
  reset: (id) => ipcRenderer.invoke('app:reset', id),
  run: (payload) => ipcRenderer.invoke('app:run', payload),
  runCustom: (payload) => ipcRenderer.invoke('app:run-custom', payload),
  save: (payload) => ipcRenderer.invoke('app:save', payload),
});
