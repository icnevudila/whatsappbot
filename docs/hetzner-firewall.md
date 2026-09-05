# Hetzner Cloud Firewall (console veya CLI)

UFW sunucuda zaten: **22 + 9443**. Cloud Firewall ikinci katman:

## Console
1. Firewalls → Create  
2. Inbound: TCP 22, TCP 9443 (kaynak: Anywhere veya kendi IP)  
3. Apply to server `ubuntu-4gb-fsn1-3`

## CLI (`hcloud`)
```bash
export HCLOUD_TOKEN=...
hcloud firewall create --name filo-wa \
  --rules-file - <<'EOF'
[
  {"direction":"in","protocol":"tcp","port":"22","source_ips":["0.0.0.0/0","::/0"]},
  {"direction":"in","protocol":"tcp","port":"9443","source_ips":["0.0.0.0/0","::/0"]}
]
EOF
hcloud firewall apply-to-resource filo-wa --type server --server ubuntu-4gb-fsn1-3
```

8080 / 9090 **açma**.
