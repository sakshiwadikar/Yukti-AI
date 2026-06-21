# Docker DNS Configuration for Hugging Face API

## Problem

When running Yukti AI inside Docker, you may encounter:

```
getaddrinfo ENOTFOUND api-inference.huggingface.co
```

or similar DNS resolution failures. This happens because Docker containers
use an isolated DNS resolver that may not have access to your host's DNS
configuration.

## Solution

### docker-compose.yml

Add explicit DNS servers to your service definition:

```yaml
version: '3.8'

services:
  server:
    build: ./server
    ports:
      - '5000:5000'
    env_file:
      - ./server/.env
    dns:
      - 8.8.8.8        # Google Public DNS
      - 1.1.1.1        # Cloudflare DNS
      - 8.8.4.4        # Google Public DNS (secondary)
    # Optional: also set in the network config
    networks:
      - yukti-network

networks:
  yukti-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.host_binding_ipv4: '0.0.0.0'
```

### Dockerfile (alternative)

If you're not using docker-compose, pass DNS at runtime:

```bash
docker run --dns 8.8.8.8 --dns 1.1.1.1 -p 5000:5000 yukti-ai-server
```

### Docker daemon-level fix (all containers)

Edit `/etc/docker/daemon.json` (Linux) or Docker Desktop settings:

```json
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
```

Then restart Docker:

```bash
sudo systemctl restart docker
```

## Troubleshooting

### Verify DNS resolution inside the container

```bash
# Enter the running container
docker exec -it <container_id> /bin/sh

# Test DNS resolution
nslookup huggingface.co
ping -c 1 huggingface.co

# Test the Hugging Face health check endpoint
curl http://localhost:5000/api/image/health
```

### Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ENOTFOUND` on all domains | No DNS access | Add `dns:` to docker-compose |
| `ENOTFOUND` on HF only | DNS filtering/firewall | Use `8.8.8.8` or check corporate proxy |
| `ETIMEDOUT` | Network isolation | Check Docker network mode, try `--network host` |
| Works locally, fails in Docker | Missing env vars | Ensure `.env` is mounted or `env_file:` is set |

### Test the health check

The server exposes a health check endpoint that diagnoses connectivity:

```bash
curl http://localhost:5000/api/image/health
```

This returns a JSON object showing the status of DNS, internet, Hugging Face
API, and authentication.
