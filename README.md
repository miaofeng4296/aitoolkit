# AI智能工具箱

免费在线AI工具集合网站，提供PSD在线切图、AI去背景等多种实用工具。

## 功能特点

- 🎨 **PSD在线切图**：上传PSD文件，在线解析图层结构，一键导出PNG/JPG素材
- 🖼️ **AI去背景**：智能识别图片主体，一键去除背景
- 🌙 **暗色模式**：支持亮色/暗色主题切换
- 📱 **响应式设计**：完美适配PC和手机端
- ⚡ **无需注册**：即开即用，操作简单

## 项目结构

```
AI工具网站/
├── index.html              # 首页
├── css/
│   └── style.css           # 自定义样式
├── js/
│   └── main.js             # 首页交互逻辑
├── tools/
│   ├── psd-cutter.html     # PSD切图工具页
│   ├── psd-cutter.js       # PSD切图前端逻辑
│   ├── remove-bg.html       # AI去背景工具页
│   └── remove-bg.js        # 去背景前端逻辑
├── api/
│   ├── remove-bg.py        # 去背景API (Vercel Serverless)
│   └── psd-parse.py        # PSD解析API (Vercel Serverless)
├── images/                 # 静态图片资源
├── ads/
│   └── ad-placeholder.html # 广告位模板
├── vercel.json             # Vercel部署配置
├── package.json            # 项目配置
├── requirements.txt         # Python依赖
└── README.md               # 项目说明
```

## 本地开发

### 前端（无需构建）

1. 克隆项目
```bash
git clone <repository-url>
cd AI工具网站
```

2. 直接在浏览器中打开 `index.html` 预览

### 后端API（可选）

如需本地测试API功能：

1. 安装Python依赖
```bash
pip install -r requirements.txt
```

2. 安装Vercel CLI
```bash
npm install -g vercel
```

3. 登录Vercel
```bash
vercel login
```

4. 本地运行API
```bash
vercel dev
```

## 部署指南

### 前端部署（Cloudflare Pages）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Pages → Create a project
3. 连接Git仓库或直接上传文件
4. 设置构建命令（为空）和输出目录（为根目录）
5. 点击 Deploy

### 后端部署（Vercel）

1. 登录 [Vercel](https://vercel.com/)
2. Import Project
3. 设置项目：
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: pip install -r requirements.txt
4. 添加环境变量：
   - `REMOVE_BG_API_KEY`: remove.bg API密钥
5. Deploy

### 域名绑定

1. **Cloudflare Pages**: 在项目设置 → Custom domains 中添加域名
2. **Vercel**: 在项目设置 → Domains 中添加域名

## API配置

### remove.bg API

1. 访问 [remove.bg](https://www.remove.bg/) 注册账号
2. 获取API密钥
3. 在Vercel环境变量中设置 `REMOVE_BG_API_KEY`

注意：免费账号每月50张额度，如需更多额度请购买付费套餐。

### PSD解析

PSD解析使用 `psd-tools` 库，无需额外API密钥，但需要注意：

- Vercel Serverless Function 有10秒超时限制
- PSD文件建议不超过50MB
- 大文件可能需要更长的处理时间

## 广告接入

### Google AdSense

1. 访问 [Google AdSense](https://adsense.google.com/)
2. 注册账号并添加网站
3. 获取广告代码
4. 替换 `ad-placeholder.html` 中的占位符

### 百度联盟

1. 访问 [百度联盟](https://union.baidu.com/)
2. 申请加入
3. 获取代码
4. 替换广告位代码

### 广告位规格

| 位置 | 尺寸 | 说明 |
|------|------|------|
| 顶部横幅 | 728x90 | 首页顶部 |
| 侧边栏 | 300x250 | 工具页侧边 |
| 底部横幅 | 728x90 | 首页底部、工具页底部 |

## 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **样式**: Tailwind CSS (CDN)
- **图标**: Font Awesome (CDN)
- **后端**: Python + Vercel Serverless Functions
- **PSD解析**: psd-tools
- **部署**: Cloudflare Pages + Vercel

## 注意事项

1. **文件大小限制**:
   - PSD文件: 最大50MB
   - 图片文件: 最大10MB

2. **免费额度**:
   - remove.bg: 每月50张
   - Vercel: 100GB带宽/月，100小时运行时/月

3. **性能优化**:
   - 静态资源使用CDN加速
   - 图片懒加载
   - 广告延迟加载

## 后续规划

- [ ] AI换背景功能
- [ ] AI证件照生成
- [ ] AI头像生成
- [ ] AI表情包制作
- [ ] AI文案改写/润色
- [ ] 用户系统与历史记录
- [ ] 付费高级功能

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT License
