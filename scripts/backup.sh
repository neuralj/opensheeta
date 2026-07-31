#!/bin/bash
# Opensheeta 数据库备份脚本
# 用法: scripts/backup.sh [backup_dir]

set -e

BACKUP_DIR="${1:-/var/backups/opensheeta}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

echo "Starting Opensheeta backup at $(date)"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 获取数据目录
DATA_DIR="${OS_DATA_DIR:-data}"

# 备份数据库文件
DATABASES=(
    "tasks.db"
    "inbox.db"
    "conversations.db"
    "memory.db"
)

for db in "${DATABASES[@]}"; do
    src="$DATA_DIR/$db"
    dst="$BACKUP_DIR/${db%.db}_$DATE.db"
    
    if [ -f "$src" ]; then
        cp "$src" "$dst"
        echo "✓ Backed up $db"
    else
        echo "⚠ Database not found: $src"
    fi
done

# 备份配置文件
if [ -f ".env" ]; then
    cp ".env" "$BACKUP_DIR/env_$DATE"
    echo "✓ Backed up .env"
fi

# 备份 personas
if [ -d "personas" ]; then
    mkdir -p "$BACKUP_DIR/personas_$DATE"
    cp -r personas/*.md "$BACKUP_DIR/personas_$DATE/" 2>/dev/null || true
    echo "✓ Backed up personas"
fi

# 清理旧备份
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.db" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "env_*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -type d -name "personas_*" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

# 显示备份大小
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "Backup completed successfully!"
echo "Location: $BACKUP_DIR"
echo "Total size: $BACKUP_SIZE"
echo "Timestamp: $DATE"
