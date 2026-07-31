# Opensheeta 部署指南

## 概述

本文档介绍如何在生产环境中部署和运维 Opensheeta 系统。

## 系统要求

### 最低要求
- **操作系统**: macOS 12+ (开发) / Linux (生产)
- **Node.js**: 22.x LTS
- **内存**: 2GB RAM
- **磁盘**: 1GB 可用空间
- **网络**: 端口 8765 (REST API), 8766 (WebSocket), 3000 (Dashboard)

### 推荐配置
- **内存**: 4GB RAM
- **磁盘**: 5GB 可用空间 (包含日志和数据库)
- **CPU**: 2+ 核心

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/neuralj/opensheeta.git
cd opensheeta
```

### 2. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend && npm install && cd ..

# 安装 Dashboard 依赖
cd dashboard && npm install && cd ..
```

### 3. 构建项目

```bash
# 构建所有组件
npm run build
```

### 4. 配置环境变量

创建 `.env` 文件（可选）：

```bash
# 服务配置
OS_PORT=8765
OS_HOST=0.0.0.0
OS_LOG_LEVEL=info

# OpenCode 配置 (如果使用)
OC_PORT=4096
OC_HOST=127.0.0.1

# 数据库路径
OS_TASKS_DB=data/tasks.db
OS_INBOX_DB=data/inbox.db
OS_CONV_DB=data/conversations.db
OW_MEMORY_DB=data/memory.db
```

## 服务管理

### macOS (launchd)

#### 启动服务

```bash
# 启动 daemon
scripts/services start opensheeta

# 启动 dashboard
scripts/services start opensheeta-dash

# 启动所有服务
scripts/services start
```

#### 停止服务

```bash
# 停止 daemon
scripts/services stop opensheeta

# 停止 dashboard
scripts/services stop opensheeta-dash

# 停止所有服务
scripts/services stop
```

#### 重启服务

```bash
scripts/services restart opensheeta
scripts/services restart opensheeta-dash
```

#### 查看状态

```bash
scripts/services status
```

#### 查看日志

```bash
# 查看 daemon 日志
scripts/services logs opensheeta

# 查看 dashboard 日志
scripts/services logs opensheeta-dash
```

### Linux (systemd)

#### 创建服务文件

创建 `/etc/systemd/system/opensheeta.service`：

```ini
[Unit]
Description=Opensheeta AI Agent Daemon
After=network.target

[Service]
Type=simple
User=opensheeta
WorkingDirectory=/opt/opensheeta
ExecStart=/usr/bin/node dist/daemon.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=OS_PORT=8765
Environment=OS_HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
```

创建 `/etc/systemd/system/opensheeta-dashboard.service`：

```ini
[Unit]
Description=Opensheeta Dashboard
After=network.target

[Service]
Type=simple
User=opensheeta
WorkingDirectory=/opt/opensheeta/dashboard
ExecStart=/usr/bin/node build/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

#### 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable opensheeta
sudo systemctl enable opensheeta-dashboard
sudo systemctl start opensheeta
sudo systemctl start opensheeta-dashboard
```

#### 查看状态

```bash
sudo systemctl status opensheeta
sudo systemctl status opensheeta-dashboard
```

#### 查看日志

```bash
sudo journalctl -u opensheeta -f
sudo journalctl -u opensheeta-dashboard -f
```

## 日志管理

### 日志位置

- **Daemon**: `logs/daemon.log`
- **Dashboard**: `logs/dashboard.log`

### 日志轮转

创建 `/etc/logrotate.d/opensheeta`：

```
/opt/opensheeta/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 opensheeta opensheeta
    postrotate
        systemctl reload opensheeta > /dev/null 2>&1 || true
        systemctl reload opensheeta-dashboard > /dev/null 2>&1 || true
    endscript
}
```

### 日志级别

通过环境变量 `OS_LOG_LEVEL` 设置：

- `debug`: 详细调试信息
- `info`: 一般信息 (默认)
- `warn`: 警告信息
- `error`: 错误信息

## 备份策略

### 数据库备份

创建备份脚本 `scripts/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/opensheeta"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
cp data/tasks.db $BACKUP_DIR/tasks_$DATE.db
cp data/inbox.db $BACKUP_DIR/inbox_$DATE.db
cp data/conversations.db $BACKUP_DIR/conversations_$DATE.db
cp data/memory.db $BACKUP_DIR/memory_$DATE.db

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.db" -mtime +7 -delete

echo "Backup completed: $DATE"
```

设置定时任务：

```bash
# 每天凌晨 2 点备份
0 2 * * * /opt/opensheeta/scripts/backup.sh
```

### 配置备份

```bash
# 备份配置文件
cp .env $BACKUP_DIR/env_$DATE
cp personas/*.md $BACKUP_DIR/
```

## 监控

### 健康检查

```bash
# 检查 daemon 健康状态
curl http://localhost:8765/health

# 检查 dashboard 健康状态
curl http://localhost:3000/api/health
```

### 性能监控

使用 Dashboard 的 Health 页面查看：
- Type Safety: TypeScript 编译状态
- Tests: 测试覆盖率
- Build: 构建状态
- Complexity: 代码复杂度
- Dependencies: 依赖风险
- Documentation: 文档完整度

### 告警配置

创建告警脚本 `scripts/alert.sh`：

```bash
#!/bin/bash
HEALTH=$(curl -s http://localhost:8765/health)

if [[ $HEALTH != *"ok"* ]]; then
    echo "Opensheeta daemon is unhealthy!" | mail -s "Alert" admin@example.com
fi
```

设置定时检查：

```bash
# 每 5 分钟检查一次
*/5 * * * * /opt/opensheeta/scripts/alert.sh
```

## 故障排查

### 服务无法启动

```bash
# 检查日志
scripts/services logs opensheeta

# 检查端口占用
lsof -i :8765
lsof -i :3000

# 检查权限
ls -la logs/
ls -la ~/.config/opensheeta/
```

### 数据库损坏

```bash
# 停止服务
scripts/services stop opensheeta

# 从备份恢复
cp /var/backups/opensheeta/tasks_latest.db data/tasks.db

# 启动服务
scripts/services start opensheeta
```

### 内存不足

```bash
# 检查内存使用
ps aux | grep opensheeta

# 重启服务释放内存
scripts/services restart opensheeta
```

### 性能问题

1. **检查缓存是否生效**
   - Dashboard 分析结果应该缓存 1 分钟
   - 查看日志确认缓存命中率

2. **优化数据库查询**
   - 检查慢查询日志
   - 添加必要的索引

3. **调整日志级别**
   - 生产环境使用 `info` 或 `warn`
   - 避免 `debug` 级别

## 升级指南

### 备份当前版本

```bash
# 停止服务
scripts/services stop

# 备份当前版本
cp -r /opt/opensheeta /opt/opensheeta.backup.$(date +%Y%m%d)
```

### 升级步骤

```bash
# 拉取最新代码
cd /opt/opensheeta
git pull origin main

# 安装新依赖
npm install
cd frontend && npm install && cd ..
cd dashboard && npm install && cd ..

# 重新构建
npm run build

# 启动服务
scripts/services start
```

### 回滚

```bash
# 停止服务
scripts/services stop

# 恢复备份
rm -rf /opt/opensheeta
mv /opt/opensheeta.backup.YYYYMMDD /opt/opensheeta

# 启动服务
scripts/services start
```

## 安全建议

1. **使用 HTTPS**
   - 配置反向代理 (nginx/caddy)
   - 使用 Let's Encrypt 证书

2. **限制访问**
   - 配置防火墙规则
   - 使用 VPN 或 IP 白名单

3. **定期更新**
   - 保持 Node.js 版本最新
   - 定期运行 `npm audit`
   - 及时应用安全补丁

4. **监控日志**
   - 定期检查异常访问
   - 监控错误率
   - 设置告警阈值

## 性能优化

1. **启用缓存**
   - Dashboard 分析结果自动缓存
   - 考虑添加 Redis 缓存层

2. **数据库优化**
   - 定期 VACUUM SQLite 数据库
   - 归档历史数据

3. **负载均衡**
   - 使用 nginx 负载均衡
   - 考虑水平扩展

4. **CDN**
   - 静态资源使用 CDN
   - 减少服务器负载

## 联系支持

如有问题，请：
1. 查看日志文件
2. 参考本文档的故障排查部分
3. 提交 GitHub Issue
