# 🔄 Obsidian WebDAV Sync

> 一个通用的 WebDAV 同步插件，支持坚果云、Nextcloud、ownCloud、群晖 NAS 等任意 WebDAV 服务器。

---

## 📌 项目说明

本项目 fork 自 [nutstore/obsidian-nutstore-sync](https://github.com/nutstore/obsidian-nutstore-sync)，感谢原项目的优秀实现。

与原项目相比，本插件移除了对坚果云特定 API 的依赖，使其能够兼容**任意支持 WebDAV 协议的服务器**，包括但不限于：
- 坚果云
- Nextcloud
- ownCloud
- 群晖 NAS (Synology)
- Alist
- 其他 WebDAV 服务

---

## ✨ 主要功能

### 🔄 双向同步
- 本地与远程 WebDAV 服务器的双向文件同步
- 自动检测新增、修改、删除的文件
- 智能处理文件冲突

### ⚡ 增量同步
- 仅传输变更的文件，大幅提升同步速度
- 支持大型笔记库（数千文件）的高效同步
- 基于文件哈希的差异检测

### 📁 远程目录浏览器
- 内置可视化目录选择器
- 支持浏览和选择远程 WebDAV 服务器上的同步目录

### 🔀 冲突解决策略
- **智能合并**：字符级差异比较，自动合并非冲突更改
- **时间戳优先**：以最新修改时间为准
- **手动选择**：保留本地或远程版本

### 🚀 性能优化
- **宽松同步模式**：针对大型仓库优化，跳过不必要的校验
- **大文件过滤**：可设置文件大小上限，跳过大文件
- **并发控制**：限制同时进行的文件操作数量

### 📊 同步状态追踪
- 实时显示同步进度
- 详细的操作日志
- 错误提示和诊断信息

### 💾 缓存机制
- 远程文件列表缓存，减少重复请求
- 可手动清除缓存刷新状态

---

## 📁 项目结构

```
obsidian-webdav-sync/
├── src/
│   ├── api/
│   │   ├── webdav.ts              # WebDAV API 封装
│   │   └── nutstore-oauth.ts      # 坚果云 OAuth（保留兼容）
│   ├── i18n/                      # 国际化
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── zh.json            # 简体中文
│   │       ├── zh-tw.json         # 繁体中文
│   │       └── en.json            # 英文
│   ├── modules/
│   │   ├── sync/                  # 同步核心模块
│   │   │   ├── conflict-resolve/  # 冲突解决
│   │   │   ├── database/          # 本地数据库
│   │   │   ├── diff/              # 差异比较
│   │   │   ├── file-adaptor/      # 文件适配器
│   │   │   ├── file-encryptor/    # 文件加密
│   │   │   ├── local-file-stats/  # 本地文件统计
│   │   │   ├── remote-graph/      # 远程文件图谱
│   │   │   ├── remote-stat/       # 远程状态管理
│   │   │   ├── sync-decision/     # 同步决策
│   │   │   ├── sync-files/        # 文件同步
│   │   │   └── sync-record/       # 同步记录
│   │   └── settings/              # 设置模块
│   ├── settings.ts                # 设置界面
│   ├── stub/                      # 存根实现
│   │   └── webdav-explorer.ts     # WebDAV 目录浏览器
│   ├── utils/                     # 工具函数
│   │   ├── traverse-webdav.ts     # WebDAV 目录遍历
│   │   └── ...
│   └── main.ts                    # 插件入口
├── dist/                          # 构建输出
├── esbuild.config.mjs             # 构建配置
├── manifest.json                  # 插件清单
├── package.json                   # 项目配置
├── styles.css                     # 插件样式
├── tsconfig.json                  # TypeScript 配置
└── README.md                      # 本文件
```

---

## 🛠️ 技术栈

- **TypeScript** - 主要开发语言
- **esbuild** - 构建工具
- **webdav** - WebDAV 客户端库
- **diff-match-patch** - 文本差异比较
- **hash-wasm** - WebAssembly 哈希计算
- **i18next** - 国际化框架
- **rxjs** - 响应式编程

---

## 📖 使用方法

### 安装

1. 下载最新版本的 `main.js`、`manifest.json` 和 `styles.css`
2. 放入你的 Obsidian Vault 的 `.obsidian/plugins/obsidian-webdav-sync/` 目录
3. 在 Obsidian 设置中启用插件

### 配置

1. 打开插件设置页面
2. 选择认证方式：
   - **WebDAV 账号密码**：输入 WebDAV 地址、用户名和密码
   - **坚果云 OAuth**（可选）：使用坚果云账号授权
3. 点击 📁 按钮选择远程同步目录
4. 点击「同步」按钮开始同步

### 设置选项

| 选项 | 说明 |
|------|------|
| 同步间隔 | 自动同步的时间间隔（分钟） |
| 大文件限制 | 超过此大小的文件将被跳过（MB） |
| 宽松模式 | 提升大型仓库的同步性能 |
| 冲突策略 | 选择冲突时的处理方式 |

---

## 🔧 构建开发

### 环境要求

- Node.js v18+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run dev
```

### 生产构建

```bash
pnpm run build
```

---

## 🐛 已知问题与限制

1. **路径编码**：某些 WebDAV 服务器对特殊字符（空格、中文）的处理可能有差异
2. **大文件**：超大文件（>100MB）同步可能受服务器限制
3. **并发**：部分服务器对并发连接数有限制，如遇问题可降低并发数

---

## 📜 许可证与版权

本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)** 许可证。

### 版权声明

```
Copyright (C) 2024-2025 坚果云 (Nutstore) - 原作者
Copyright (C) 2025 Manal Wong - 修改者

本程序是自由软件：您可以在遵守 GNU Affero 通用公共许可证（AGPL）第3版
或（根据您的选择）任何后续版本的前提下，重新分发和/或修改本程序。

本程序的发布是希望它能有所作用，但没有任何担保；甚至没有对适销性或
适用于特定用途的默示保证。更多详情请参阅 GNU Affero 通用公共许可证。

您应该已经随本程序收到一份 GNU Affero 通用公共许可证的副本。如果没有，
请参阅 <https://www.gnu.org/licenses/>。
```

### Fork 声明

本项目是 [nutstore/obsidian-nutstore-sync](https://github.com/nutstore/obsidian-nutstore-sync) 的 Fork，
根据 AGPL-3.0 许可证第5条的要求，我们在本仓库中保留了原始版权声明。

### 修改说明

相较于原项目，本 Fork 的主要修改包括：
- 移除了对坚果云特定 API 的依赖，支持通用 WebDAV 服务器
- 修复了路径编码问题，提升与群晖 NAS 等服务的兼容性
- 简化了项目结构，移除了不必要的依赖和构建配置
- 使用 Obsidian Modal API 重构了目录浏览器

---

## 🙏 致谢

- 感谢 [nutstore/obsidian-nutstore-sync](https://github.com/nutstore/obsidian-nutstore-sync) 提供的优秀基础
- 感谢 [WebDAV](https://github.com/perry-mitchell/webdav-client) 客户端库的作者
- 感谢所有开源社区的贡献者
