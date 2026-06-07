# 多内容记录站（前端 MVP）

一个可记录多种内容的轻量网站，支持记录：
- 💻 电脑
- 📺 电视剧
- 🌸 番剧
- 🎵 音乐
- 🎮 游戏

当前版本优先实现前端，数据使用本地示例 + localStorage 持久化，并提供影视内容的 TMDB / IMDb 自动匹配回填能力。

## 功能概览

- 统一信息结构：列表页 / 详情页 / 新增编辑页 / 搜索筛选
- 多分类内容记录与本地 CRUD
- 关键词搜索、分类 Tab 筛选、排序
- TMDB / IMDb 自动匹配（电视剧/番剧）并回填标题、年份、评分、简介、标签、封面
- 前端数据工具：导入 JSON、导出 JSON、删除全部记录
- 状态覆盖：加载中、空结果、多结果、网络失败、限流提示
- 响应式布局与基础可访问性（表单标签、状态播报）

## 技术栈

- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage
- OMDb API（IMDb 数据来源）
- TMDB API（可选，用于额外自动匹配）

## 本地运行

```bash
cd /tmp/workspace/Lumosion/Copilot
python3 -m http.server 8080
```

浏览器访问：`http://localhost:8080`

## TMDB / IMDb 查询说明

项目默认使用示例 API Key：`thewdb`（来自 OMDb 公共示例）。

如需长期稳定使用，请在 `/tmp/workspace/Lumosion/Copilot/script.js` 中替换：

- `OMDB_API_KEY`
- `OMDB_ENDPOINT`（如有私有代理）
- `TMDB_API_KEY`（可选，不配置时会自动仅使用 IMDb）

## 数据层设计

`ContentService` 统一封装：
- `list` / `getById` / `save` / `remove`
- `searchMediaMatch` / `getMediaDetail`

前端 UI 仅调用 service，不直接依赖存储细节，后续可平滑替换为后端 API。

## 后续阶段（建议）

- 接入后端持久化与用户体系
- 分类字段按业务进一步细分
- TMDB / IMDb 导入结果缓存
- 增加自动化测试与 CI
