#!/bin/bash
#
# Initial VPS Setup Script
# Run once on a fresh VPS to install dependencies and configure nginx
#
# Usage: ./deploy/setup-vps.sh yourdomain.com
#

set -e

DOMAIN=${1:-}

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 chess.example.com"
    exit 1
fi

echo "=== Chess App VPS Setup ==="
echo "Domain: $DOMAIN"
echo ""

# Update system
echo ">>> Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker (if not present)
if ! command -v docker &> /dev/null; then
    echo ">>> Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "NOTE: Log out and back in for docker group to take effect"
else
    echo ">>> Docker already installed"
fi

# Install Nginx (if not present)
if ! command -v nginx &> /dev/null; then
    echo ">>> Installing Nginx..."
    sudo apt install -y nginx
    sudo systemctl enable nginx
else
    echo ">>> Nginx already installed"
fi

# Install Certbot (if not present)
if ! command -v certbot &> /dev/null; then
    echo ">>> Installing Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
else
    echo ">>> Certbot already installed"
fi

# Setup Nginx config
echo ">>> Configuring Nginx..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NGINX_CONF="$SCRIPT_DIR/nginx-chess-app.conf"

# Replace domain placeholders (both @ and www)
sed -e "s/yourdomain.com/$DOMAIN/g" -e "s/www.yourdomain.com/www.$DOMAIN/g" "$NGINX_CONF" | sudo tee /etc/nginx/sites-available/chess-app > /dev/null

# Enable site
sudo ln -sf /etc/nginx/sites-available/chess-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

echo ">>> Nginx configured for $DOMAIN"

# Setup SSL
echo ">>> Setting up SSL certificate for $DOMAIN and www.$DOMAIN..."
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN" || {
    echo "Certbot failed. You may need to run manually:"
    echo "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
}

# Verify auto-renewal
echo ">>> Verifying certbot auto-renewal..."
sudo certbot renew --dry-run || echo "Auto-renewal test failed, check certbot config"

# Setup firewall
echo ">>> Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Log out and back in (for docker group)"
echo "  2. Create .env file with SESSION_SECRET"
echo "  3. Run: ./deploy/deploy.sh"
echo ""
