// Electron API mock for testing
const electronMock = {
  // IPC 모듈 mock
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
  },
  
  ipcRenderer: {
    invoke: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
  },
  
  // BrowserWindow mock
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    loadURL: jest.fn(),
    on: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
    },
  })),
  
  // App mock
  app: {
    on: jest.fn(),
    quit: jest.fn(),
    getPath: jest.fn(() => '/mock/path'),
    whenReady: jest.fn(() => Promise.resolve()),
  },
  
  // Dialog mock
  dialog: {
    showOpenDialog: jest.fn(() => Promise.resolve({
      canceled: false,
      filePaths: ['/mock/selected/path']
    })),
    showSaveDialog: jest.fn(() => Promise.resolve({
      canceled: false,
      filePath: '/mock/save/path'
    })),
    showMessageBox: jest.fn(() => Promise.resolve({
      response: 0
    })),
  },
  
  // Shell mock
  shell: {
    openPath: jest.fn(() => Promise.resolve('')),
    openExternal: jest.fn(() => Promise.resolve()),
  },
  
  // Menu mock
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn(),
  },
}

module.exports = electronMock