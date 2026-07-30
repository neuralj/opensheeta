# Opensheeta 任务计划

> 项目进度梳理与详细任务规划

## 当前状态评估

### 已完成的核心功能

#### 后端 (src/)
- [x] 四层架构实现 (Scheduler → Endpoint → Handler → Adapter)
- [x] Task Queue 单任务运行 (1s 轮询)
- [x] Cooldown Manager (rate limit 检测 + ping 探活)
- [x] Pipeline Runner (多阶段顺序编排)
- [x] Recurring Scheduler (5 字段 cron + 60s tick)
- [x] EventBus (内部事件 → WebSocket 广播)
- [x] REST API (28+ 路由)
- [x] WebSocket 实时事件推送
- [x] SQLite 存储 (tasks/inbox/conversations/memory)
- [x] SSE → EventBridge (OpenCode 事件翻译)
- [x] 审批流 (human-in-the-loop)
- [x] Task Chain 自动迭代 (on_success/on_failure)
- [x] AutomationScheduler 集成
- [x] PersonaHandler 集成
- [x] MCP Servers (connector + memory)
- [x] WebSocket 消息处理 (9 种消息类型)

#### 前端 (frontend/)
- [x] Vue 3 + Element Plus + Pinia + Vue Router
- [x] 6 个核心页面 (Dashboard, Tasks, TaskDetail, Pipelines, Recurring, Queue)
- [x] WebSocket 实时更新
- [x] API 封装 (useAPI composable)
- [x] 3 个基础组件 (StatCard, StatusTag, StageProgress)
- [x] Sessions 页面 (列表/创建/删除)
- [x] SessionChat 页面 (消息发送 + 流式响应 + 工具调用)
- [x] Inbox 页面 (权限审批 + 通知管理)
- [x] Automations 页面 (定时任务管理)
- [x] Agents 页面 (Agent/Persona 列表)
- [x] Dashboard 增强 (健康状态/连接状态/会话概览)
- [x] 3 个新组件 (ToolCallCard, ApprovalDialog, ConnectionBadge)

#### Dashboard (dashboard/)
- [x] SvelteKit 5 项目初始化
- [x] Tailwind CSS 4 + 暗色主题
- [x] 6 个核心页面 (Overview, Architecture, Memory, Timeline, Health, Services)
- [x] 6 个分析引擎 (repo, architecture, health, memory, timeline, state)
- [x] 6 个 API 端点 (/api/state, /api/architecture, /api/health, /api/memory, /api/timeline, /api/context)
- [x] Sidebar 导航
- [x] Mermaid 依赖图可视化

#### 基础设施
- [x] 服务管理脚本 (scripts/services)
- [x] launchd plist 配置 (daemon + dashboard)
- [x] 日志目录 (logs/)
- [x] 部署配置 (deploy/)
- [x] GitHub Actions CI/CD (.github/workflows/)
- [x] 测试覆盖 (8 个测试文件, 43 个测试用例)

### 当前问题

#### 未提交的工作
- 大量修改和新增文件未提交到 git
- 包括：前端新页面、组件、stores、后端集成、测试、dashboard 等

#### 待完善的功能
- 部分 WebSocket 消息类型未完全实现
- 前端某些页面功能不完整
- 测试覆盖率仍需提升
- 文档需要更新

---

## 详细任务计划

### Phase 0: 代码整理与提交 (优先级: P0, 预计: 1-2 小时)

#### 目标
整理当前未提交的工作，确保代码库干净、可追溯。

#### 任务清单
- [ ] 0.1 运行类型检查确保无错误
  ```bash
  npm run typecheck
  cd frontend && npm run check
  cd dashboard && npm run check
  ```

- [ ] 0.2 运行测试确保全部通过
  ```bash
  npm test
  ```

- [ ] 0.3 审查未提交的修改
  - 检查每个修改文件的变更内容
  - 确保没有遗留的调试代码或临时注释
  - 验证所有新增功能是否完整

- [ ] 0.4 组织提交
  - 按功能模块分组提交
  - 编写清晰的提交信息
  - 建议的提交顺序：
    1. `feat: integrate automation and persona handlers`
    2. `feat: add WebSocket message handling for all types`
    3. `feat: add sessions and inbox pages`
    4. `feat: add automations and agents pages`
    5. `feat: enhance dashboard with health and connection status`
    6. `feat: add living repository dashboard`
    7. `feat: add service management with launchd`
    8. `test: improve test coverage`

- [ ] 0.5 推送到远程仓库
  ```bash
  git push origin main
  ```

#### 验收标准
- [ ] 所有类型检查通过
- [ ] 所有测试通过
- [ ] 代码库干净 (git status 无未提交文件)
- [ ] 远程仓库同步

---

### Phase 1: 功能完善 (优先级: P1, 预计: 8-12 小时)

#### 目标
补全所有已规划但未完全实现的功能。

#### 任务清单

##### 1.1 WebSocket 消息处理完善 (2-3 小时)
- [ ] 1.1.1 审查 `src/daemon.ts` 中的 WebSocket 消息处理
  - 确认 9 种消息类型全部实现
  - 检查错误处理和日志记录
  
- [ ] 1.1.2 完善 `frontend/src/composables/useWebSocket.ts`
  - 确认所有事件类型都有对应的处理逻辑
  - 添加缺失的事件处理
  
- [ ] 1.1.3 测试 WebSocket 消息流
  - 创建测试场景验证消息传递
  - 检查前端是否正确响应

##### 1.2 前端页面功能补全 (4-6 小时)
- [ ] 1.2.1 Sessions 页面
  - 验证列表、创建、删除功能
  - 检查错误处理和加载状态
  
- [ ] 1.2.2 SessionChat 页面
  - 验证消息发送和接收
  - 检查流式响应渲染
  - 验证工具调用卡片显示
  - 测试审批对话框
  
- [ ] 1.2.3 Inbox 页面
  - 验证 inbox 项目列表
  - 测试审批/拒绝操作
  - 检查实时更新
  
- [ ] 1.2.4 Automations 页面
  - 验证 CRUD 操作
  - 测试执行历史查看
  
- [ ] 1.2.5 Agents 页面
  - 验证 agent 和 persona 列表
  - 检查详情展示

##### 1.3 Dashboard 功能完善 (2-3 小时)
- [ ] 1.3.1 Overview 页面
  - 验证所有统计卡片数据正确
  - 检查最近决策和时间线显示
  
- [ ] 1.3.2 Architecture 页面
  - 验证 Mermaid 图正确渲染
  - 检查模块依赖分析
  
- [ ] 1.3.3 Memory 页面
  - 验证 CRUD 操作
  - 测试搜索功能
  
- [ ] 1.3.4 Timeline 页面
  - 验证时间线显示
  - 检查过滤功能
  
- [ ] 1.3.5 Health 页面
  - 验证健康度分析
  - 检查维度详情展示
  
- [ ] 1.3.6 Services 页面
  - 验证服务状态显示
  - 测试日志查看

#### 验收标准
- [ ] 所有页面功能完整且可用
- [ ] 无控制台错误
- [ ] 用户体验流畅
- [ ] 错误处理完善

---

### Phase 2: 测试与质量保证 (优先级: P1, 预计: 6-8 小时)

#### 目标
提升测试覆盖率，确保代码质量。

#### 任务清单

##### 2.1 后端测试补全 (3-4 小时)
- [ ] 2.1.1 Queue Processor 测试
  - 任务入队/出队
  - 状态转换
  - 错误处理
  
- [ ] 2.1.2 Pipeline Runner 测试
  - 阶段推进
  - 会话共享
  - 错误恢复
  
- [ ] 2.1.3 Recurring Scheduler 测试
  - Cron 表达式解析
  - 任务触发
  - 时区处理
  
- [ ] 2.1.4 Event Bridge 测试
  - 事件转换
  - 增量文本处理
  - 工具调用事件
  
- [ ] 2.1.5 REST API 测试
  - 关键端点测试
  - 错误响应验证

##### 2.2 前端测试 (2-3 小时)
- [ ] 2.2.1 组件测试
  - StatCard
  - StatusTag
  - StageProgress
  - ToolCallCard
  - ApprovalDialog
  
- [ ] 2.2.2 Store 测试
  - tasks store
  - queue store
  - pipelines store
  - sessions store
  - inbox store
  
- [ ] 2.2.3 Composable 测试
  - useAPI
  - useWebSocket

##### 2.3 Dashboard 测试 (1-2 小时)
- [ ] 2.3.1 分析引擎测试
  - architecture analyzer
  - health analyzer
  - memory store
  - timeline extractor
  
- [ ] 2.3.2 API 端点测试
  - 所有 /api/* 端点

##### 2.4 集成测试 (1-2 小时)
- [ ] 2.4.1 端到端流程测试
  - 任务创建 → 执行 → 完成
  - Pipeline 创建 → 阶段推进 → 完成
  - 会话创建 → 消息发送 → 接收响应

#### 验收标准
- [ ] 测试覆盖率达到 70%+
- [ ] 所有测试通过
- [ ] 关键路径都有测试覆盖
- [ ] 测试文档完整

---

### Phase 3: 文档与知识管理 (优先级: P2, 预计: 4-6 小时)

#### 目标
完善项目文档，建立知识库。

#### 任务清单

##### 3.1 README 更新 (1-2 小时)
- [ ] 3.1.1 更新项目概述
  - 明确项目定位 (AI Agent Daemon)
  - 说明核心功能
  
- [ ] 3.1.2 完善快速开始指南
  - 安装步骤
  - 配置说明
  - 启动方式
  
- [ ] 3.1.3 添加架构说明
  - 四层架构详解
  - 数据流图
  - 模块关系
  
- [ ] 3.1.4 补充 API 文档
  - REST API 端点列表
  - WebSocket 消息格式
  - 示例请求/响应

##### 3.2 开发文档 (2-3 小时)
- [ ] 3.2.1 架构设计文档
  - 设计决策记录
  - 技术选型理由
  - 架构图
  
- [ ] 3.2.2 模块说明文档
  - Scheduler 模块详解
  - Endpoint 模块详解
  - Handler 模块详解
  - Adapter 模块详解
  
- [ ] 3.2.3 开发指南
  - 代码规范
  - 提交规范
  - 测试指南
  - 部署流程

##### 3.3 用户文档 (1-2 小时)
- [ ] 3.3.1 前端使用指南
  - 各页面功能说明
  - 操作示例
  
- [ ] 3.3.2 Dashboard 使用指南
  - 各分析维度说明
  - 如何解读数据
  
- [ ] 3.3.3 服务管理指南
  - launchd 配置说明
  - 常用命令
  - 故障排查

##### 3.4 API 文档 (1 小时)
- [ ] 3.4.1 生成 OpenAPI/Swagger 文档
  - 使用工具自动生成
  - 手动补充说明
  
- [ ] 3.4.2 WebSocket 事件文档
  - 事件类型列表
  - 数据格式
  - 使用示例

#### 验收标准
- [ ] README 完整且准确
- [ ] 开发文档覆盖所有模块
- [ ] 用户文档易于理解
- [ ] API 文档完整

---

### Phase 4: 性能优化 (优先级: P2, 预计: 4-6 小时)

#### 目标
优化系统性能，提升用户体验。

#### 任务清单

##### 4.1 后端性能优化 (2-3 小时)
- [ ] 4.1.1 数据库查询优化
  - 添加必要的索引
  - 优化查询语句
  - 减少 N+1 查询
  
- [ ] 4.1.2 内存使用优化
  - 检查内存泄漏
  - 优化大对象处理
  - 实现对象池（如需要）
  
- [ ] 4.1.3 并发处理优化
  - 优化任务队列处理
  - 改进 WebSocket 连接管理
  - 优化 SSE 事件处理

##### 4.2 前端性能优化 (2-3 小时)
- [ ] 4.2.1 代码分割
  - 路由级别懒加载
  - 组件按需加载
  
- [ ] 4.2.2 渲染优化
  - 虚拟滚动（长列表）
  - 防抖/节流（频繁更新）
  - 避免不必要的重渲染
  
- [ ] 4.2.3 资源优化
  - 图片压缩
  - 代码压缩
  - Tree shaking

##### 4.3 Dashboard 性能优化 (1-2 小时)
- [ ] 4.3.1 分析引擎优化
  - 缓存分析结果
  - 增量更新
  - 异步处理
  
- [ ] 4.3.2 前端优化
  - 代码分割
  - 懒加载
  - 优化 Mermaid 渲染

#### 验收标准
- [ ] 响应时间 < 200ms (API)
- [ ] 页面加载时间 < 2s
- [ ] 内存使用稳定
- [ ] 无性能瓶颈

---

### Phase 5: 安全加固 (优先级: P2, 预计: 3-4 小时)

#### 目标
确保系统安全，防止常见攻击。

#### 任务清单

##### 5.1 输入验证 (1-2 小时)
- [ ] 5.1.1 REST API 输入验证
  - 所有端点参数验证
  - 类型检查
  - 长度限制
  
- [ ] 5.1.2 WebSocket 消息验证
  - 消息格式验证
  - 权限检查
  
- [ ] 5.1.3 文件路径验证
  - 防止路径遍历攻击
  - 限制访问范围

##### 5.2 认证与授权 (1-2 小时)
- [ ] 5.2.1 实现认证机制
  - Token 认证
  - 会话管理
  
- [ ] 5.2.2 权限控制
  - 角色定义
  - 权限检查
  - 敏感操作保护

##### 5.3 数据安全 (1 小时)
- [ ] 5.3.1 敏感数据保护
  - 密码/密钥加密存储
  - 日志脱敏
  
- [ ] 5.3.2 SQL 注入防护
  - 参数化查询
  - 输入转义

##### 5.4 安全审计 (1 小时)
- [ ] 5.4.1 依赖安全检查
  ```bash
  npm audit
  ```
  
- [ ] 5.4.2 代码安全扫描
  - 使用安全扫描工具
  - 修复发现的问题

#### 验收标准
- [ ] 所有输入都有验证
- [ ] 认证机制完善
- [ ] 无已知安全漏洞
- [ ] 安全审计通过

---

### Phase 6: 部署与运维 (优先级: P3, 预计: 4-6 小时)

#### 目标
完善部署流程，确保生产环境稳定。

#### 任务清单

##### 6.1 部署脚本完善 (2-3 小时)
- [ ] 6.1.1 生产构建脚本
  - 一键构建所有组件
  - 版本号管理
  - 构建产物打包
  
- [ ] 6.1.2 部署脚本
  - 自动化部署流程
  - 回滚机制
  - 健康检查
  
- [ ] 6.1.3 环境配置管理
  - 开发/测试/生产环境配置
  - 敏感信息管理
  - 配置验证

##### 6.2 监控与告警 (2-3 小时)
- [ ] 6.2.1 日志系统完善
  - 结构化日志
  - 日志级别控制
  - 日志轮转
  
- [ ] 6.2.2 监控指标
  - 系统指标 (CPU, 内存, 磁盘)
  - 应用指标 (请求数, 响应时间, 错误率)
  - 业务指标 (任务数, 成功率)
  
- [ ] 6.2.3 告警机制
  - 错误告警
  - 性能告警
  - 告警通知渠道 (邮件/Slack/钉钉)

##### 6.3 备份与恢复 (1-2 小时)
- [ ] 6.3.1 数据备份策略
  - SQLite 数据库备份
  - 配置文件备份
  - 备份周期和保留策略
  
- [ ] 6.3.2 灾难恢复计划
  - 恢复流程文档
  - 恢复演练
  - RTO/RPO 目标

#### 验收标准
- [ ] 部署流程自动化
- [ ] 监控指标完整
- [ ] 告警机制有效
- [ ] 备份恢复可行

---

### Phase 7: 高级功能 (优先级: P3, 预计: 12-16 小时)

#### 目标
实现高级功能，提升产品竞争力。

#### 任务清单

##### 7.1 知识图谱 (4-6 小时)
- [ ] 7.1.1 概念提取
  - 从代码中提取概念
  - 建立概念关系
  
- [ ] 7.1.2 图谱存储
  - 选择图数据库 (Neo4j/ArangoDB)
  - 设计数据模型
  
- [ ] 7.1.3 图谱查询
  - 实现查询 API
  - 前端可视化

##### 7.2 执行时间线增强 (3-4 小时)
- [ ] 7.2.1 详细步骤记录
  - 读取文件记录
  - 修改文件记录
  - 测试执行记录
  
- [ ] 7.2.2 时间线可视化
  - 甘特图展示
  - 步骤详情
  
- [ ] 7.2.3 时间线分析
  - 耗时分析
  - 效率优化建议

##### 7.3 仓库健康度增强 (3-4 小时)
- [ ] 7.3.1 代码质量分析
  - 复杂度分析
  - 重复代码检测
  - 代码风格检查
  
- [ ] 7.3.2 依赖风险分析
  - 过时依赖检测
  - 安全漏洞扫描
  - 许可证合规检查
  
- [ ] 7.3.3 架构债务分析
  - 循环依赖检测
  - 耦合度分析
  - 架构违规检测

##### 7.4 Agent 市场 (2-3 小时)
- [ ] 7.4.1 Agent 定义规范
  - Agent 配置格式
  - Agent 元数据
  
- [ ] 7.4.2 Agent 管理界面
  - Agent 列表
  - Agent 详情
  - Agent 安装/卸载

#### 验收标准
- [ ] 知识图谱可用
- [ ] 时间线详细准确
- [ ] 健康度分析全面
- [ ] Agent 市场功能完整

---

## 时间线规划

### 短期 (1-2 周)
- Phase 0: 代码整理与提交
- Phase 1: 功能完善

### 中期 (3-4 周)
- Phase 2: 测试与质量保证
- Phase 3: 文档与知识管理
- Phase 4: 性能优化

### 长期 (5-8 周)
- Phase 5: 安全加固
- Phase 6: 部署与运维
- Phase 7: 高级功能

---

## 风险管理

### 技术风险
1. **WebSocket 连接稳定性**
   - 风险：连接断开、消息丢失
   - 缓解：实现重连机制、消息确认
   
2. **数据库性能**
   - 风险：SQLite 在大数据量下性能下降
   - 缓解：定期归档、考虑迁移到 PostgreSQL
   
3. **前端性能**
   - 风险：大量实时更新导致卡顿
   - 缓解：虚拟滚动、防抖节流、代码分割

### 项目风险
1. **需求变更**
   - 风险：功能需求频繁变更
   - 缓解：敏捷开发、快速迭代
   
2. **人员变动**
   - 风险：关键人员离开
   - 缓解：完善文档、知识共享
   
3. **时间延误**
   - 风险：任务估时不准确
   - 缓解：预留缓冲时间、定期评估进度

---

## 成功标准

### 功能标准
- [ ] 所有核心功能完整实现
- [ ] 用户体验流畅
- [ ] 错误处理完善

### 质量标准
- [ ] 测试覆盖率 > 70%
- [ ] 无严重 bug
- [ ] 代码质量良好

### 性能标准
- [ ] API 响应时间 < 200ms
- [ ] 页面加载时间 < 2s
- [ ] 系统稳定运行

### 文档标准
- [ ] README 完整
- [ ] API 文档完整
- [ ] 开发文档完善

---

## 下一步行动

### 立即执行 (今天)
1. 运行类型检查和测试
2. 审查未提交的修改
3. 组织并提交代码

### 本周完成
1. Phase 0: 代码整理与提交
2. Phase 1: 功能完善 (至少完成 1.1 和 1.2)

### 下周完成
1. Phase 1: 功能完善 (剩余部分)
2. Phase 2: 测试与质量保证 (开始)

---

## 附录

### 相关文档
- [实施计划](./IMPLEMENTATION_PLAN.md)
- [架构文档](../../docs/architecture.md)
- [后端分析](../../docs/backend-analysis.md)
- [事件映射](../../docs/event-mapping.md)

### 参考项目
- [openlaputa](../openlaputa) - 基础设施管理参考
- OpenCode - AI 编码助手
- Hono - Web 框架
- SvelteKit - Dashboard 框架

### 联系方式
- 项目仓库: https://github.com/neuralj/opensheeta
- 问题反馈: GitHub Issues
