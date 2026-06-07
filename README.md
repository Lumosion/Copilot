# 多内容追踪站（前端 MVP）

一个可追踪多类型内容的轻量网站，当前支持：
- 🎬 电影（TMDB）
- 📺 剧集（TMDB，支持剧/季/集页面）
- 🌸 番剧（TMDB + RSS 追番）
- 🎮 游戏（Steam AppID 抓取）
- 🎵 音乐（网易云批量导入）

## 功能概览

- 顶层 TAB 分类：电影 / 剧集 / 番剧 / 游戏 / 音乐
- 全局搜索（标题、标签、平台、演员、剧情）
- 列表页 / 详情页 / 编辑页 / 订阅中心 / 剧集页
- 影视匹配与详情回填：
  - 电影与剧集分开搜索（TMDB movie/tv）
  - 中文优先 + 英文兜底
  - 影视记录 ID 统一以 TMDB 为准（`tmdb:movie:{id}` / `tmdb:tv:{id}`）
- 关系页能力（详情页内）：同系列 / 同演员 / 同标签 / 同平台
- 番剧 RSS 订阅：添加、刷新、查看更新条目
- 音乐网易云批量导入：按行 `歌名 - 歌手`
- 游戏 Steam 抓取：通过 AppID 自动回填
- 本地数据管理：导入 JSON、导出 JSON、删除全部

## 技术栈

- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage
- TMDB API
- Steam Store API
- RSS (XML) 解析

## 本地运行

```bash
cd /tmp/workspace/Lumosion/Copilot
python3 -m http.server 8080
```

浏览器访问：`http://localhost:8080`

## API 配置

请在 `/tmp/workspace/Lumosion/Copilot/script.js` 中配置：

- `TMDB_API_KEY`（必填）

说明：
- 未配置 TMDB Key 时，影视自动匹配与季集详情不可用。
- RSS 与 Steam 抓取可能受浏览器跨域策略影响。

## 数据结构说明

核心记录字段：
- `id`：影视为 TMDB 规范 ID，其它类型为 UUID
- `category`：movie / series / anime / game / music
- `media`：来源相关结构（tmdb/steam/netease）

当前为前端本地存储实现，后续可平滑替换为后端 API。
