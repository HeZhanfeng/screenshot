# Screenshot

一个功能强大的Chrome截图扩展程序，支持截图编辑、裁剪和保存功能。

## 功能特点

- 🔥 快捷键截图（Windows: Ctrl+Shift+S / Mac: Command+Shift+S）
- ✂️ 灵活的裁剪功能
- ✏️ 丰富的编辑工具：
  - 选择区域
  - 添加文字
  - 自由绘画
  - 裁剪工具
- 💾 便捷的保存功能
- 🎨 现代化的用户界面
- 🌗 清晰的编辑界面

## 安装说明

1. 下载源代码或克隆仓库
2. 打开Chrome浏览器，进入扩展程序页面（chrome://extensions/）
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 使用方法

### 方式一：使用快捷键
- Windows: 按下 `Ctrl + Shift + S`
- Mac: 按下 `Command + Shift + S`

### 方式二：通过扩展图标
1. 点击浏览器工具栏中的扩展图标
2. 点击"Take Screenshot"按钮

### 编辑功能
截图后会自动打开编辑界面，提供以下功能：
- **选择区域**：框选特定区域
- **添加文字**：在截图上添加文本注释
- **画笔工具**：自由绘制
- **裁剪工具**：裁剪图片大小
- **保存**：将编辑后的截图保存到本地

## 技术栈

- HTML5 Canvas
- Chrome Extension API
- JavaScript ES6+
- CSS3

## 权限说明

本扩展需要以下权限：
- `activeTab`: 获取当前标签页信息
- `tabs`: 操作标签页
- `downloads`: 下载截图
- `storage`: 存储截图数据

## 开发说明

如需进行开发，请确保了解：
1. Chrome扩展开发基础
2. Canvas API的使用
3. Chrome存储API
4. 现代JavaScript语法

## 常见问题

1. **快捷键不响应**
   - 确保没有其他扩展占用相同快捷键
   - 检查系统快捷键设置

2. **截图黑屏**
   - 确保给予扩展足够权限
   - 刷新页面后重试

## 贡献指南

欢迎提交 Pull Request 或创建 Issue。

## 许可证

[MIT License](LICENSE)