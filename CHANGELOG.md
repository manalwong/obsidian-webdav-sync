# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-18

### Fixed
- **文件夹重复创建问题**: 修复了每次同步都尝试创建已存在远程文件夹的问题
  - 问题原因: `src/fs/remote-webdav.ts` 中路径格式处理不一致
  - `statsMap` 的 key 使用原始 path（无前导斜杠，可能有尾部斜杠）
  - 而查找时使用规范化后的 path（有前导斜杠，无尾部斜杠）
  - 修复方案: 统一规范化 `statsMap` 的 key，并在路径处理循环中移除尾部斜杠

### Changed
- 移除调试日志，减少控制台输出

## [1.0.0] - 2026-04-17

### Initial Release
- Fork from [nutstore/obsidian-nutstore-sync](https://github.com/nutstore/obsidian-nutstore-sync)
- 移除坚果云特定 API 依赖，支持通用 WebDAV 协议
- 支持坚果云、群晖 NAS、Nextcloud、ownCloud 等任意 WebDAV 服务器
- 实现双向同步功能
- 支持冲突解决策略
- 支持文件大小限制过滤
- 支持 glob 模式过滤文件

### Fixed
- 修复 esbuild 配置，确保插件能被 Obsidian 正确加载
- 修复 WebDAV 响应解析错误（propstat/prop 缺失处理）
- 修复 404 错误处理，避免同步中断
- 修复路径编码问题，支持空格和中文路径

### Changed
- 简化项目结构，移除 webdav-explorer 子包
- 重构目录浏览器，使用 Obsidian Modal API
- 更新项目名称为 Obsidian WebDAV Sync
- 添加 AGPL-3.0 许可证合规文件
