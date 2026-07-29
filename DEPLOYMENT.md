# opensheeta 部署快速指南

## 当前状态

✅ **已完成**: 所有部署文件已创建在本地仓库中

📋 **待执行**: 需要手动在 basic 机器上执行部署步骤（因为 SSH 需要密码认证）

## 已创建的文件

```
opensheeta/
├── .github/workflows/build.yml          # GitHub Actions 自动构建
├── deploy/
│   ├── nginx/sheeta.conf                # nginx 反向代理配置
│   ├── opensheeta.service               # systemd 服务定义
│   └── opensheeta.logrotate             # 日志轮转配置
└── scripts/
    ├── setup-basic.sh                   # basic 机器初始化脚本
    └── deploy.sh                        # 版本部署脚本
```

## 快速部署步骤

### 1. 提交代码并创建 Release

```bash
cd ~/Developer/repos/neuralj/opensheeta

# 提交部署配置
git add .
git commit -m "Add deployment configuration for basic machine"
git push origin main

# 创建版本标签（触发 GitHub Actions 构建）
git tag v0.2.0
git push origin v0.2.0
```

等待 GitHub Actions 完成构建（在 GitHub Actions 标签页查看进度）。

### 2. 初始化 basic 机器

```bash
# 复制初始化脚本到 basic
scp scripts/setup-basic.sh basic:/tmp/

# SSH 到 basic 并运行
ssh basic
bash /tmp/setup-basic.sh
```

脚本会自动安装 Node.js 22、OpenCode、nginx，并创建目录结构。

### 3. 安装 SSL 证书

```bash
# 从 Mac 复制证书（从 pro 获取）
scp pro:/home/travis/neuralj/a-bulletin/ops/nginx/ssl/fullchain.pem /tmp/sheeta.crt
scp pro:/home/travis/neuralj/a-bulletin/ops/nginx/ssl/privkey.pem /tmp/sheeta.key

# 传输到 basic
scp /tmp/sheeta.crt basic:/tmp/
scp /tmp/sheeta.key basic:/tmp/

# 在 basic 上安装
ssh basic
sudo mv /tmp/sheeta.crt /etc/nginx/ssl/sheeta.neuralj.com.crt
sudo mv /tmp/sheeta.key /etc/nginx/ssl/sheeta.neuralj.com.key
sudo chmod 644 /etc/nginx/ssl/sheeta.neuralj.com.crt
sudo chmod 600 /etc/nginx/ssl/sheeta.neuralj.com.key
```

### 4. 安装配置文件

```bash
# 从 Mac 复制配置
scp deploy/nginx/sheeta.conf basic:/tmp/
scp deploy/opensheeta.service basic:/tmp/
scp deploy/opensheeta.logrotate basic:/tmp/

# 在 basic 上安装
ssh basic
sudo mv /tmp/sheeta.conf /etc/nginx/conf.d/
sudo mv /tmp/opensheeta.service /etc/systemd/system/
sudo mv /tmp/opensheeta.logrotate /etc/logrotate.d/

# 重新加载配置
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl daemon-reload
sudo systemctl enable opensheeta
```

### 5. 更新 Mac /etc/hosts

```bash
# 在 Mac 上执行（需要 sudo 密码）
echo "jjjj" | sudo -S sh -c 'sed -i "" "s/192.168.31.233.*sheeta.neuralj.com/192.168.31.38 sheeta.neuralj.com/" /etc/hosts'
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# 验证
grep sheeta.neuralj.com /etc/hosts
# 应该显示: 192.168.31.38 sheeta.neuralj.com
```

### 6. 部署应用

```bash
# 从 Mac 部署
./scripts/deploy.sh v0.2.0 basic
```

### 7. 验证部署

```bash
# 检查服务状态
ssh basic "sudo systemctl status opensheeta"
ssh basic "sudo systemctl status nginx"

# 测试 HTTPS
curl https://sheeta.neuralj.com/health | jq

# 在浏览器中打开
open https://sheeta.neuralj.com
```

## 架构概览

```
GitHub Actions (构建)
    ↓ 下载 release
basic (nginx + opensheeta + OpenCode)
    ↓ HTTPS (443)
Mac (https://sheeta.neuralj.com)
```

- **nginx**: 反向代理，SSL 终止，WebSocket 升级
- **opensheeta**: 绑定 127.0.0.1:8765/8766，nginx 处理外部访问
- **SSL**: mkcert 通配符证书 `*.neuralj.com`（有效期到 2028）
- **数据**: `/var/lib/opensheeta/` (SQLite)
- **日志**: `/var/log/opensheeta/` (自动轮转)

## 故障排除

### 服务无法启动

```bash
# 查看日志
ssh basic "journalctl -u opensheeta -n 50"
ssh basic "tail -f /var/log/opensheeta/stdout.log"
```

### nginx 配置错误

```bash
# 测试配置
ssh basic "sudo nginx -t"

# 查看错误日志
ssh basic "tail -f /var/log/nginx/sheeta.error.log"
```

### SSL 证书问题

```bash
# 检查证书
ssh basic "openssl x509 -in /etc/nginx/ssl/sheeta.neuralj.com.crt -noout -subject -dates"
```

### 回滚到上一版本

```bash
# 在 basic 上
ssh basic
sudo systemctl stop opensheeta
sudo mv /opt/opensheeta/dist.backup.TIMESTAMP /opt/opensheeta/dist
sudo systemctl start opensheeta
```

## 后续更新

部署新版本：

```bash
# 创建新版本
git tag v0.3.0
git push origin v0.3.0

# 等待构建完成后部署
./scripts/deploy.sh v0.3.0 basic
```

## 相关文档

- 完整部署计划: `~/.local/share/opencode/plans/mellow-sparking-pigeon.md`
- 项目 README: `README.md`
- 架构文档: `docs/architecture.md`
