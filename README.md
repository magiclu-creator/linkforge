# 🔗 LinkForge - 智能短链 & 二维码生成器

> 一个人独立开发的SaaS工具，可以快速变现。

## 🚀 功能特性

- **URL缩短**: 一键生成短链接，支持自定义短码
- **二维码生成**: 自动生成二维码，支持自定义颜色和尺寸
- **点击统计**: 追踪点击来源、设备、地理位置
- **RESTful API**: 可集成到任何工作流
- **暗色主题**: 现代化UI设计

## 📦 快速开始

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 开发模式（自动重启）
npm run dev
```

访问 http://localhost:3456

## 📡 API文档

### 创建短链
```bash
POST /api/links
Content-Type: application/json

{
  "url": "https://example.com/long-url",
  "title": "My Link",
  "customCode": "my-link"  // 可选
}
```

### 获取统计
```bash
GET /api/links/:code/stats
```

### 生成二维码
```bash
GET /api/qr/:code?size=300&format=png
```

### 列出所有链接
```bash
GET /api/links?page=1&limit=20
```

### 删除链接
```bash
DELETE /api/links/:code
```

## 💰 变现策略

### 免费版
- 每月100条短链
- 基础点击统计
- 标准二维码

### 基础版 ¥29/月
- 5,000条短链/月
- 详细统计分析
- 自定义短码
- 高清二维码

### 专业版 ¥99/月
- 无限短链
- API访问
- 自定义域名
- 批量生成
- 数据导出

## 🚀 部署

### Vercel (推荐，免费)
1. Push到GitHub
2. 在Vercel中导入项目
3. 自动部署

### Railway
1. 连接GitHub仓库
2. 选择Node.js环境
3. 设置PORT环境变量

### 自有服务器
```bash
# PM2进程管理
npm install -g pm2
pm2 start src/server.js --name linkforge
```

## 📁 项目结构

```
linkforge/
├── src/
│   ├── server.js          # Express服务器
│   ├── routes/links.js     # API路由
│   ├── models/database.js  # 数据存储
│   └── utils/helpers.js    # 工具函数
├── public/index.html       # 首页
├── views/dashboard.html    # 仪表盘
├── data/                   # 数据文件
└── package.json
```

## 📄 License

MIT
