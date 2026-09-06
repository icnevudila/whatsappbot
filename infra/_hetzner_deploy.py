import os
import sys
import time
import paramiko

host = os.environ["HETZNER_HOST"]
user = os.environ["HETZNER_USER"]
pw = os.environ["HETZNER_PASSWORD"]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pw, timeout=45)


def run(cmd: str, timeout: int = 600) -> int:
    print(f"\n==> {cmd}", flush=True)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    while True:
        line = stdout.readline()
        if not line:
            break
        print(line, end="", flush=True)
    err = stderr.read().decode("utf-8", errors="replace")
    if err.strip():
        print(err, file=sys.stderr, flush=True)
    code = stdout.channel.recv_exit_status()
    print(f"[exit {code}]", flush=True)
    return code


# Find repo
code, out, _ = 0, "", ""
stdin, stdout, stderr = client.exec_command(
    "ls -d /opt/whatsappbot /root/whatsappbot 2>/dev/null | head -1", timeout=30
)
repo = stdout.read().decode().strip()
if not repo:
    print("Repo path not found", file=sys.stderr)
    sys.exit(1)
print("REPO", repo)

cmds = [
    f"cd {repo} && git fetch origin && git reset --hard origin/main && git log -1 --oneline",
    f"cd {repo} && docker compose -f infra/docker-compose.yml --profile small up -d --build --force-recreate",
]

for cmd in cmds:
    if run(cmd) != 0:
        client.close()
        sys.exit(1)

# Health wait
deadline = time.time() + 180
ok = False
while time.time() < deadline:
    stdin, stdout, stderr = client.exec_command(
        "curl -fsS http://127.0.0.1:8080/ready && echo READY", timeout=20
    )
    body = stdout.read().decode("utf-8", errors="replace")
    if "READY" in body or stdout.channel.recv_exit_status() == 0 and body.strip():
        print(body)
        ok = True
        break
    time.sleep(5)

client.close()
sys.exit(0 if ok else 2)
