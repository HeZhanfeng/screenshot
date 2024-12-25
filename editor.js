// 常量配置
const CONFIG = {
  FONT: '16px Arial',
  COLORS: {
    TEXT: '#ff0000',
    SELECTION: '#0066ff'
  },
  LINE_WIDTH: {
    DRAW: 2,
    SELECTION: 1
  }
};

// 状态管理
class EditorState {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.currentTool = 'select';
    this.startX = 0;
    this.startY = 0;
    this.addedTexts = [];
    this.selectedArea = null;
	// 专门用于裁剪的区域
	this.cropArea = null;  
  }
}

const state = new EditorState();


// 文本输入管理
class TextInputManager {
  constructor() {
    this.input = this.createTextInput();
    this.cursorInterval = null;
  }

  createTextInput() {
    const input = document.createElement('input');
    Object.assign(input.style, {
      position: 'absolute',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      font: CONFIG.FONT,
      color: CONFIG.COLORS.TEXT,
      display: 'none'
    });
    document.body.appendChild(input);
    return input;
  }

  show(x, y) {
    this.input.style.left = `${x}px`;
    this.input.style.top = `${y}px`;
    this.input.style.display = 'block';
    this.input.focus();
  }

  hide() {
    this.input.style.display = 'none';
    this.input.value = '';
  }

  setupTextInputHandler(onTextEntered) {
    this.input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const text = this.input.value;
        if (text) {
          onTextEntered(text);
        }
        this.hide();
      }
    };
  }
}

// 在文件开头，state 定义之后添加
const textManager = new TextInputManager();

// 绘图功能
class DrawingManager {
  static drawSelectionBox(ctx, x1, y1, x2, y2) {
    const [left, right] = [Math.min(x1, x2), Math.max(x1, x2)];
    const [top, bottom] = [Math.min(y1, y2), Math.max(y1, y2)];
    
    ctx.strokeStyle = CONFIG.COLORS.SELECTION;
    ctx.lineWidth = CONFIG.LINE_WIDTH.SELECTION;
    
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.lineTo(left, top);
    ctx.stroke();
  }

  static redrawCanvas(ctx, img, texts) {
    ctx.drawImage(img, 0, 0);
    texts.forEach(({text, x, y, font, color}) => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    });
  }
}

// 添加裁剪相关的处理函数
function handleCropStart(e) {
  if (state.currentTool !== 'crop') return;
  
  state.isDrawing = true;
  const coords = getCanvasCoordinates(e);
  state.startX = coords.x;
  state.startY = coords.y;
}

function handleCropMove(e) {
  if (!state.isDrawing || state.currentTool !== 'crop') return;

  const coords = getCanvasCoordinates(e);
  const x = coords.x;
  const y = coords.y;

  chrome.storage.local.get(['screenshotData'], result => {
    if (result.screenshotData) {
      const img = new Image();
      img.onload = () => {
        // 清除画布
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        // 重绘原始图像
        state.ctx.drawImage(img, 0, 0);
        // 绘制裁剪框和遮罩
        drawCropOverlay(state.startX, state.startY, x, y);
      };
      img.src = result.screenshotData;
    }
  });
}

function handleCropEnd(e) {
  if (state.currentTool !== 'crop') return;
  
  state.isDrawing = false;
  const coords = getCanvasCoordinates(e);
  const endX = coords.x;
  const endY = coords.y;

  // 保存裁剪区域
  const width = Math.abs(state.startX - endX);
  const height = Math.abs(state.startY - endY);
  const x = Math.min(state.startX, endX);
  const y = Math.min(state.startY, endY);

  if (width > 0 && height > 0) {
    state.cropArea = { x, y, width, height };
    showCropConfirmDialog();
  }
}

// 添加显示尺寸的函数
function drawSizeInfo(x, y, width, height) {
  const padding = 5;
  const sizeText = `${Math.round(width)} × ${Math.round(height)}`;
  
  // 设置文本样式
  state.ctx.font = '12px Arial';
  state.ctx.fillStyle = '#ffffff';
  state.ctx.textBaseline = 'top';
  
  // 计算文本位置（在选区上方）
  const textWidth = state.ctx.measureText(sizeText).width;
  const textX = x + (width - textWidth) / 2;
  const textY = y - 20; // 在选区上方20像素
  
  // 绘制背景
  state.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  state.ctx.fillRect(
    textX - padding,
    textY - padding,
    textWidth + padding * 2,
    20 + padding
  );
  
  // 绘制文本
  state.ctx.fillStyle = '#ffffff';
  state.ctx.fillText(sizeText, textX, textY);
}

// 绘制裁剪遮罩和框
function drawCropOverlay(startX, startY, endX, endY) {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  // 保存当前画布内容
  const imageData = state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);

  // 创建半透明遮罩
  state.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

  // 恢复选中区域的原始图像
  state.ctx.putImageData(
    imageData, 
    0, 
    0, 
    x, 
    y, 
    width, 
    height
  );

  // 绘制白色边框
  state.ctx.strokeStyle = '#ffffff';
  state.ctx.lineWidth = 2;
  state.ctx.strokeRect(x, y, width, height);

  // 添加四角标记
  const cornerSize = 10;
  state.ctx.beginPath();
  // 左上角
  state.ctx.moveTo(x, y + cornerSize);
  state.ctx.lineTo(x, y);
  state.ctx.lineTo(x + cornerSize, y);
  // 右上角
  state.ctx.moveTo(x + width - cornerSize, y);
  state.ctx.lineTo(x + width, y);
  state.ctx.lineTo(x + width, y + cornerSize);
  // 右下角
  state.ctx.moveTo(x + width, y + height - cornerSize);
  state.ctx.lineTo(x + width, y + height);
  state.ctx.lineTo(x + width - cornerSize, y + height);
  // 左下角
  state.ctx.moveTo(x + cornerSize, y + height);
  state.ctx.lineTo(x, y + height);
  state.ctx.lineTo(x, y + height - cornerSize);
  
  state.ctx.strokeStyle = '#ffffff';
  state.ctx.lineWidth = 2;
  state.ctx.stroke();

  // 显示尺寸信息
  drawSizeInfo(x, y, width, height);
}

// 显示裁剪确认对话框
function showCropConfirmDialog() {
  // 移除可能存在的旧对话框
  const oldDialog = document.getElementById('cropDialog');
  if (oldDialog) {
    document.body.removeChild(oldDialog);
  }

  const dialog = document.createElement('div');
  dialog.id = 'cropDialog';
  
  // 基础样式
  dialog.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.8);
    padding: 8px;
    border-radius: 8px;
    z-index: 1000;
    display: flex;
    gap: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
  `;

  // 创建确认按钮（对号）
  const confirmBtn = document.createElement('button');
  confirmBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M20 6L9 17L4 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  confirmBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #4CAF50;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `;
  confirmBtn.onmouseover = () => confirmBtn.style.background = 'rgba(76, 175, 80, 0.2)';
  confirmBtn.onmouseout = () => confirmBtn.style.background = 'transparent';

  // 创建取消按钮（错号）
  const cancelBtn = document.createElement('button');
  cancelBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  cancelBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #FF5252;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `;
  cancelBtn.onmouseover = () => cancelBtn.style.background = 'rgba(255, 82, 82, 0.2)';
  cancelBtn.onmouseout = () => cancelBtn.style.background = 'transparent';

  confirmBtn.title = '确认裁剪';
  cancelBtn.title = '取消裁剪';

  dialog.appendChild(confirmBtn);
  dialog.appendChild(cancelBtn);

  // 计算对话框位置
  function positionDialog() {
    const rect = state.canvas.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const cropArea = state.cropArea;
    
    // 获取视口尺寸
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // 计算选区在画布中的实际位置
    const scaleX = rect.width / state.canvas.width;
    const scaleY = rect.height / state.canvas.height;
    
    const cropRight = rect.left + (cropArea.x + cropArea.width) * scaleX;
    const cropBottom = rect.top + (cropArea.y + cropArea.height) * scaleY;
    const cropTop = rect.top + cropArea.y * scaleY;

    // 默认位置（右下角）
    let left = cropRight + 10;
    let top = cropBottom + 10;

    // 检查是否会超出视口右边界
    if (left + dialogRect.width > viewportWidth) {
      left = cropRight - dialogRect.width - 10;
    }

    // 检查是否会超出视口底部
    if (top + dialogRect.height > viewportHeight) {
      // 如果底部放不下，尝试放在选区上方
      top = cropTop - dialogRect.height - 10;
    }

    // 确保不会超出视口左边界
    left = Math.max(10, left);

    // 确保不会超出视口顶部
    top = Math.max(10, top);

    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
  }

  // 添加到页面并定位
  document.body.appendChild(dialog);
  positionDialog();

  // 添加事件监听
  const cleanup = () => {
    document.removeEventListener('keydown', handleKeyPress);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      performCrop();
      document.body.removeChild(dialog);
      cleanup();
    } else if (e.key === 'Escape') {
      cancelCrop();
      document.body.removeChild(dialog);
      cleanup();
    }
  };

  confirmBtn.onclick = () => {
    performCrop();
    document.body.removeChild(dialog);
    cleanup();
  };

  cancelBtn.onclick = () => {
    cancelCrop();
    document.body.removeChild(dialog);
    cleanup();
  };

  document.addEventListener('keydown', handleKeyPress);

  // 监听窗口大小变化，重新定位对话框
  window.addEventListener('resize', positionDialog);
}

// 执行裁剪
function performCrop() {
  if (!state.cropArea) return;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  // 设置临时画布的大小为裁剪区域的大小
  tempCanvas.width = state.cropArea.width;
  tempCanvas.height = state.cropArea.height;

  chrome.storage.local.get(['screenshotData'], result => {
    if (result.screenshotData) {
      const img = new Image();
      img.onload = () => {
        // 将裁剪区域的内容绘制到临时画布
        tempCtx.drawImage(
          img,
          state.cropArea.x,
          state.cropArea.y,
          state.cropArea.width,
          state.cropArea.height,
          0,
          0,
          state.cropArea.width,
          state.cropArea.height
        );

        // 设置主画布大小为裁剪区域的大小
        state.canvas.width = state.cropArea.width;
        state.canvas.height = state.cropArea.height;

        // 将裁剪后的图像绘制到主画布，保持原始大小
        state.ctx.drawImage(tempCanvas, 0, 0);

        // 更新存储中的截图数据
        chrome.storage.local.set({
          screenshotData: state.canvas.toDataURL('image/png')
        });

        // 更新画布样式以保持原始大小显示
        state.canvas.style.width = state.cropArea.width + 'px';
        state.canvas.style.height = state.cropArea.height + 'px';

        // 重置裁剪状态
        state.cropArea = null;
        state.currentTool = 'select';
        updateToolButtons();
      };
      img.src = result.screenshotData;
    }
  });
}

// 取消裁剪
function cancelCrop() {
  state.cropArea = null;
  chrome.storage.local.get(['screenshotData'], result => {
    if (result.screenshotData) {
      const img = new Image();
      img.onload = () => {
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        state.ctx.drawImage(img, 0, 0);
        state.currentTool = 'select';
        updateToolButtons();
      };
      img.src = result.screenshotData;
    }
  });
}

// 更新工具按钮状态
function updateToolButtons() {
  const buttons = document.querySelectorAll('.tool-button');
  buttons.forEach(button => {
    button.classList.remove('active');
    if (button.id === `${state.currentTool}Tool`) {
      button.classList.add('active');
    }
  });
}

// 添加 handleStopDrawing 函数
function handleStopDrawing(e) {
  state.isDrawing = false;
  
  const coords = getCanvasCoordinates(e);
  const endX = coords.x;
  const endY = coords.y;
  
  if (state.currentTool === 'select') {
    const width = Math.abs(state.startX - endX);
    const height = Math.abs(state.startY - endY);
    const x = Math.min(state.startX, endX);
    const y = Math.min(state.startY, endY);
    
    state.selectedArea = {
      x: x,
      y: y,
      width: width,
      height: height
    };
  }
}

// 添加一个辅助函数来获取真实坐标
function getCanvasCoordinates(e) {
  const rect = state.canvas.getBoundingClientRect();
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// 事件处理
function handleStartDrawing(e) {
  state.isDrawing = true;
  const coords = getCanvasCoordinates(e);
  state.startX = coords.x;
  state.startY = coords.y;

  if (state.currentTool === 'draw') {
    state.ctx.beginPath();
    state.ctx.moveTo(state.startX, state.startY);
  } else if (state.currentTool === 'text') {
    // 显示文本输入框在点击位置
    const rect = state.canvas.getBoundingClientRect();
    const scaleX = rect.width / state.canvas.width;
    const scaleY = rect.height / state.canvas.height;
    
    // 计算显示位置
    const displayX = e.clientX;
    const displayY = e.clientY;
    
    textManager.show(displayX, displayY);
    
    textManager.setupTextInputHandler((text) => {
      state.addedTexts.push({
        text,
        x: state.startX,
        y: state.startY,
        font: CONFIG.FONT,
        color: CONFIG.COLORS.TEXT
      });
      
      // 绘制文本
      state.ctx.font = CONFIG.FONT;
      state.ctx.fillStyle = CONFIG.COLORS.TEXT;
      state.ctx.fillText(text, state.startX, state.startY);
    });
  }
}

function handleDraw(e) {
  if (!state.isDrawing) return;

  const coords = getCanvasCoordinates(e);
  const x = coords.x;
  const y = coords.y;

  switch (state.currentTool) {
    case 'draw':
      state.ctx.lineTo(x, y);
      state.ctx.strokeStyle = CONFIG.COLORS.TEXT;
      state.ctx.lineWidth = CONFIG.LINE_WIDTH.DRAW;
      state.ctx.stroke();
      break;
    case 'select':
      state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
      chrome.storage.local.get(['screenshotData'], result => {
        if (result.screenshotData) {
          const img = new Image();
          img.onload = () => {
            DrawingManager.redrawCanvas(state.ctx, img, state.addedTexts);
            DrawingManager.drawSelectionBox(state.ctx, state.startX, state.startY, x, y);
          };
          img.src = result.screenshotData;
        }
      });
      break;
  }
}

// 初始化
// 然后修改 initEditor 函数，移除在其中创建 TextInputManager 的代码
function initEditor() {
  state.canvas = document.getElementById('imageCanvas');
  state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });
  
  // 加载截图并设置画布尺寸
  chrome.storage.local.get(['screenshotData'], function(result) {
    if (result.screenshotData) {
      const img = new Image();
      img.onload = function() {
        state.canvas.width = img.width;
        state.canvas.height = img.height;
        state.canvas.style.width = '100%';
        state.canvas.style.height = 'auto';
        state.canvas.style.maxWidth = '100%';
        state.ctx.drawImage(img, 0, 0, img.width, img.height);
      };
      img.src = result.screenshotData;
    }
  });

  // 工具选择事件监听
  document.getElementById('selectTool').onclick = () => state.currentTool = 'select';
  document.getElementById('textTool').onclick = () => state.currentTool = 'text';
  document.getElementById('drawTool').onclick = () => state.currentTool = 'draw';
  document.getElementById('save').onclick = saveImage;
  
  // 添加裁剪工具按钮事件
  document.getElementById('cropTool').onclick = () => {
    state.currentTool = 'crop';
    updateToolButtons();
  };
  
  // 更新事件监听器
  state.canvas.addEventListener('mousedown', (e) => {
    if (state.currentTool === 'crop') {
      handleCropStart(e);
    } else {
      handleStartDrawing(e);
    }
  });
  
  state.canvas.addEventListener('mousemove', (e) => {
    if (state.currentTool === 'crop') {
      handleCropMove(e);
    } else {
      handleDraw(e);
    }
  });
  
  state.canvas.addEventListener('mouseup', (e) => {
    if (state.currentTool === 'crop') {
      handleCropEnd(e);
    } else {
      handleStopDrawing(e);
    }
  });

  // 画布事件监听
  state.canvas.addEventListener('mousedown', handleStartDrawing);
  state.canvas.addEventListener('mousemove', handleDraw);
  state.canvas.addEventListener('mouseup', handleStopDrawing);
}

// 保存功能
function saveImage() {
  const filename = `screenshot-${new Date().toISOString().replace(/[:.]/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}.png`;
  chrome.downloads.download({
    url: state.canvas.toDataURL('image/png'),
    filename,
    saveAs: true
  });
}

document.addEventListener('DOMContentLoaded', initEditor); 