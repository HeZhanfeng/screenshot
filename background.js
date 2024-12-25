chrome.commands.onCommand.addListener((command) => {
  if (command === "take_screenshot") {
    captureAndEdit();
  }
});

async function captureAndEdit() {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const screenshot = await chrome.tabs.captureVisibleTab();
    
    // 创建新标签页显示截图编辑界面
    chrome.tabs.create({
      url: 'editor.html',
      active: true
    }, (newTab) => {
      // 使用 storage 传递截图数据给编辑页面
      chrome.storage.local.set({
        screenshotData: screenshot
      });
    });
  } catch (err) {
    console.error("Failed to capture screenshot:", err);
  }
}

// 获取文件 URL
//const editorHtml = chrome.runtime.getURL('editor.html');
//const editorJs = chrome.runtime.getURL('editor.js');
// 创建编辑器页面的Blob URL
//const editorHtmlBlob = new Blob([editorHtml], {type: 'text/html'});
//const editorHtmlUrl = URL.createObjectURL(editorHtmlBlob);

// 创建编辑器脚本的Blob URL
//const editorJsBlob = new Blob([editorJs], {type: 'text/javascript'});
//const editorJsUrl = URL.createObjectURL(editorJsBlob);

const editorHtmlUrl = chrome.runtime.getURL('editor.html');
const editorJsUrl = chrome.runtime.getURL('editor.js');

// 修改使用 storage 的代码
function openEditor(screenshotData) {
  chrome.windows.create({
    url: editorHtmlUrl,
    type: 'popup', 
    width: 800,
    height: 600
  }, (window) => {
    chrome.tabs.query({windowId: window.id}, (tabs) => {
      const editorTab = tabs[0];
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === editorTab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          // 使用安全的存储方法
          safeStorageSet({
            screenshotData: screenshotData
          });
          chrome.tabs.sendMessage(editorTab.id, {
            type: 'init'
          });
        }
      });
    });
  });
}

// 使用 chrome.storage.local 前检查是否存在
function safeStorageSet(data) {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set(data);
  } else {
    console.error('Storage API not available');
    // 可以使用备选方案,比如 sessionStorage
    sessionStorage.setItem('screenshotData', data.screenshotData);
  }
}

// 安全的存储方法
function safeStorageSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}