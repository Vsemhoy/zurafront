#!/bin/sh
set -eu
cd /tmp/zuratax-monitoring-release
id host-metrics >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin host-metrics
install -d -m 755 /opt/host-metrics
install -d -o root -g host-metrics -m 750 /etc/host-metrics
if [ ! -f /etc/host-metrics/token ]; then
    umask 077
    openssl rand -hex 32 > /etc/host-metrics/token
fi
chown root:host-metrics /etc/host-metrics/token
chmod 640 /etc/host-metrics/token
install -o root -g www-data -m 640 /etc/host-metrics/token /var/www/zuratax/shared/host-metrics.token
install -m 644 scripts/host-metrics/server.py /opt/host-metrics/server.py
install -m 644 scripts/host-metrics/host-metrics.service /etc/systemd/system/host-metrics.service
systemctl daemon-reload
systemctl enable --now host-metrics
systemctl restart host-metrics
systemctl is-active host-metrics
