const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('customPluginAPI', {
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
});