#!/bin/bash
# opensheeta basic 机器初始化脚本
# 在 basic 机器上以 travis 用户运行: bash setup-basic.sh

set -e

echo "=========================================="
echo "opensheeta basic 机器初始化"
echo "=========================================="
echo ""

# 检查是否在 basic 机器上
if ! hostname | grep -q "basic"; then
    echo "警告: 当前主机不是 basic，是否继续？(y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "[1/10] 安装 Node.js 22..."
if command -v node &> /dev/null && node --version | grep -q "v22"; then
    echo "  ✓ Node.js 22 已安装: $(node --version)"
else
    echo "  安装 Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "  ✓ Node.js 安装完成: $(node --version)"
fi

echo ""
echo "[2/10] 安装 OpenCode..."
if command -v opencode &> /dev/null; then
    echo "  ✓ OpenCode 已安装: $(opencode --version)"
else
    echo "  安装 OpenCode..."
    curl -fsSL https://opencode.ai/install | bash
    echo "  ✓ OpenCode 安装完成"
fi

echo ""
echo "[3/10] 安装 nginx..."
if command -v nginx &> /dev/null; then
    echo "  ✓ nginx 已安装: $(nginx -v 2>&1)"
else
    echo "  安装 nginx..."
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    echo "  ✓ nginx 安装完成"
fi

echo ""
echo "[4/10] 创建目录结构..."
sudo mkdir -p /opt/opensheeta
sudo mkdir -p /var/lib/opensheeta
sudo mkdir -p /var/log/opensheeta
sudo mkdir -p /etc/nginx/ssl

sudo chown travis:travis /opt/opensheeta
sudo chown travis:travis /var/lib/opensheeta
sudo chown travis:travis /var/log/opensheeta
sudo chown root:root /etc/nginx/ssl
sudo chmod 755 /etc/nginx/ssl

echo "  ✓ 目录创建完成"

echo ""
echo "[5/10] 安装 SSL 证书..."
# 证书需要从 pro 机器复制，这里创建占位文件
if [ -f /etc/nginx/ssl/sheeta.neuralj.com.crt ]; then
    echo "  ✓ SSL 证书已存在"
else
    echo "  ⚠ SSL 证书未找到"
    echo "  请从 pro 机器复制证书:"
    echo "    scp pro:/home/travis/neuralj/a-bulletin/ops/nginx/ssl/fullchain.pem /tmp/sheeta.crt"
    echo "    scp pro:/home/travis/neuralj/a-bulletin/ops/nginx/ssl/privkey.pem /tmp/sheeta.key"
    echo "    sudo mv /tmp/sheeta.crt /etc/nginx/ssl/sheeta.neuralj.com.crt"
    echo "    sudo mv /tmp/sheeta.key /etc/nginx/ssl/sheeta.neuralj.com.key"
    echo "    sudo chmod 644 /etc/nginx/ssl/sheeta.neuralj.com.crt"
    echo "    sudo chmod 600 /etc/nginx/ssl/sheeta.neuralj.com.key"
fi

echo ""
echo "[6/10] 安装 nginx 配置..."
if [ -f /etc/nginx/conf.d/sheeta.conf ]; then
    echo "  ✓ nginx 配置已存在"
else
    echo "  ⚠ nginx 配置未找到"
    echo "  请复制配置文件:"
    echo "    从 opensheeta 仓库复制 deploy/nginx/sheeta.conf 到 /etc/nginx/conf.d/"
fi

echo ""
echo "[7/10] 安装 systemd 服务..."
if [ -f /etc/systemd/system/opensheeta.service ]; then
    echo "  ✓ systemd 服务已存在"
else
    echo "  ⚠ systemd 服务未找到"
    echo "  请复制服务文件:"
    echo "    从 opensheeta 仓库复制 deploy/opensheeta.service 到 /etc/systemd/system/"
    echo "    sudo systemctl daemon-reload"
    echo "    sudo systemctl enable opensheeta"
fi

echo ""
echo "[8/10] 安装 logrotate 配置..."
if [ -f /etc/logrotate.d/opensheeta ]; then
    echo "  ✓ logrotate 配置已存在"
else
    echo "  ⚠ logrotate 配置未找到"
    echo "  请复制配置文件:"
    echo "    从 opensheeta 仓库复制 deploy/opensheeta.logrotate 到 /etc/logrotate.d/"
fi

echo ""
echo "[9/10] 配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "  ✓ 防火墙规则已添加 (22, 80, 443)"
else
    echo "  ⚠ ufw 未安装，跳过防火墙配置"
fi

echo ""
echo "[10/10] 验证安装..."
echo "  Node.js: $(node --version 2>/dev/null || echo '未安装')"
echo "  npm: $(npm --version 2>/dev/null || echo '未安装')"
echo "  nginx: $(nginx -v 2>&1 | head -1 || echo '未安装')"
echo "  OpenCode: $(command -v opencode &>/dev/null && echo '已安装' || echo '未安装')"

echo ""
echo "=========================================="
echo "初始化完成！"
echo "=========================================="
echo ""
echo "下一步操作："
echo ""
echo "1. 从 Mac 复制 SSL 证书（如果还没复制）:"
echo "   scp pro:/home/travis/neuralj/a-bulletin/ops/nginx/ssl/fullchain.pem /tmp/sheeta.crt"
echo "   scp pro:/home/travis/neuralj/a-bulletin/ops/nginx/ssl/privkey.pem /tmp/sheeta.key"
echo "   sudo mv /tmp/sheeta.crt /etc/nginx/ssl/sheeta.neuralj.com.crt"
echo "   sudo mv /tmp/sheeta.key /etc/nginx/ssl/sheeta.neuralj.com.key"
echo "   sudo chmod 644 /etc/nginx/ssl/sheeta.neuralj.com.crt"
echo "   sudo chmod 600 /etc/nginx/ssl/sheeta.neuralj.com.key"
echo ""
echo "2. 从 Mac 复制配置文件（如果还没复制）:"
echo "   scp mac:~/Developer/repos/neuralj/opensheeta/deploy/nginx/sheeta.conf /tmp/"
echo "   sudo mv /tmp/sheeta.conf /etc/nginx/conf.d/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "   scp mac:~/Developer/repos/neuralj/opensheeta/deploy/opensheeta.service /tmp/"
echo "   sudo mv /tmp/opensheeta.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload && sudo systemctl enable opensheeta"
echo ""
echo "   scp mac:~/Developer/repos/neuralj/opensheeta/deploy/opensheeta.logrotate /tmp/"
echo "   sudo mv /tmp/opensheeta.logrotate /etc/logrotate.d/"
echo ""
echo "3. 在 Mac 上更新 /etc/hosts:"
echo "   sudo sed -i '' 's/192.168.31.233.*sheeta.neuralj.com/192.168.31.38 sheeta.neuralj.com/' /etc/hosts"
echo "   sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder"
echo ""
echo "4. 在 Mac 上部署应用:"
echo "   cd ~/Developer/repos/neuralj/opensheeta"
echo "   ./scripts/deploy.sh v0.2.0 basic"
echo ""
echo "5. 访问: https://sheeta.neuralj.com"
echo ""
