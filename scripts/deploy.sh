#!/bin/bash
set -e

# opensheeta 版本部署脚本
# 从 GitHub Releases 下载并部署到目标机器

VERSION=${1:-latest}
TARGET_HOST=${2:-basic}
INSTALL_DIR="/opt/opensheeta"
DATA_DIR="/var/lib/opensheeta"

echo "=========================================="
echo "部署 opensheeta ${VERSION} 到 ${TARGET_HOST}"
echo "=========================================="
echo ""

# 检查 SSH 连接
echo "[1/6] 检查 SSH 连接..."
ssh -o ConnectTimeout=5 ${TARGET_HOST} "echo 'SSH 连接成功'" || {
    echo "错误: 无法连接到 ${TARGET_HOST}"
    exit 1
}

# 下载 release
echo ""
echo "[2/6] 下载 release..."
if [ "$VERSION" = "latest" ]; then
    DOWNLOAD_URL=$(curl -s https://api.github.com/repos/neuralj/opensheeta/releases/latest | grep "browser_download_url.*tar.gz" | cut -d '"' -f 4)
    if [ -z "$DOWNLOAD_URL" ]; then
        echo "错误: 未找到最新 release"
        exit 1
    fi
else
    DOWNLOAD_URL="https://github.com/neuralj/opensheeta/releases/download/${VERSION}/opensheeta-${VERSION}.tar.gz"
fi

echo "下载地址: ${DOWNLOAD_URL}"
curl -L -o /tmp/opensheeta.tar.gz "$DOWNLOAD_URL"

# 传输到目标机器
echo ""
echo "[3/6] 传输到 ${TARGET_HOST}..."
scp /tmp/opensheeta.tar.gz ${TARGET_HOST}:/tmp/

# 部署
echo ""
echo "[4/6] 部署新版本..."
ssh ${TARGET_HOST} << 'EOF'
set -e

# 停止服务
echo "停止 opensheeta 服务..."
sudo systemctl stop opensheeta 2>/dev/null || true

# 备份当前版本
if [ -d /opt/opensheeta/dist ]; then
    BACKUP_NAME="dist.backup.$(date +%s)"
    echo "备份当前版本到 ${BACKUP_NAME}..."
    sudo mv /opt/opensheeta/dist /opt/opensheeta/${BACKUP_NAME}
fi

# 解压新版本
echo "解压新版本..."
sudo mkdir -p /opt/opensheeta
sudo tar -xzf /tmp/opensheeta.tar.gz -C /opt/opensheeta/
sudo chown -R travis:travis /opt/opensheeta

# 安装生产依赖
echo "安装依赖..."
cd /opt/opensheeta
npm install --production

# 确保数据目录存在
sudo mkdir -p /var/lib/opensheeta
sudo chown travis:travis /var/lib/opensheeta

# 清理
rm /tmp/opensheeta.tar.gz

echo "部署完成"
EOF

# 启动服务
echo ""
echo "[5/6] 启动服务..."
ssh ${TARGET_HOST} << 'EOF'
sudo systemctl start opensheeta
sleep 2
sudo systemctl status opensheeta --no-pager
EOF

# 验证
echo ""
echo "[6/6] 验证部署..."
sleep 3
ssh ${TARGET_HOST} "curl -s http://127.0.0.1:8765/health" | grep -q "ok" && {
    echo "✓ 服务健康检查通过"
} || {
    echo "✗ 服务健康检查失败"
    exit 1
}

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "访问地址: https://sheeta.neuralj.com"
echo ""
