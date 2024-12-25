document.getElementById('captureBtn').addEventListener('click', async () => {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // Capture visible area
    const screenshot = await chrome.tabs.captureVisibleTab();
    
    // Download the screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.png`;
    
    chrome.downloads.download({
      url: screenshot,
      filename: filename,
      saveAs: true
    });
  } catch (err) {
    console.error('Failed to capture screenshot:', err);
  }
});

// Add keyboard shortcut listener
chrome.commands.onCommand.addListener((command) => {
  if (command === 'take_screenshot') {
    captureScreenshot();
  }
});

// 修改文件名生成方式,避免特殊字符
function generateFilename() {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')  // 替换冒号和点
    .replace(/[^a-zA-Z0-9-]/g, ''); // 只保留字母数字和横线
  return `screenshot-${timestamp}.png`;
}

// 更新相关代码中的文件名生成
function captureScreenshot() {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const screenshot = await chrome.tabs.captureVisibleTab();
    
    const filename = generateFilename();
    
    chrome.downloads.download({
      url: screenshot,
      filename: filename,
      saveAs: true
    });
  } catch (err) {
    console.error('Failed to capture screenshot:', err);
  }
}