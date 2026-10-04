"""Linux process/lock primitives; no provider retry or recovery decisions."""
import errno
import os
import selectors
import signal
import subprocess
import time


class OwnedFileLock:
    def __init__(self, path):
        self.path = path
        self.fd = None

    def acquire(self, timeout=120):
        import fcntl
        deadline = time.monotonic() + timeout
        fd = os.open(self.path, os.O_CREAT | os.O_RDWR, 0o600)
        try:
            while True:
                try:
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    self.fd = fd
                    return
                except OSError as error:
                    if error.errno not in (errno.EACCES, errno.EAGAIN):
                        raise
                    if time.monotonic() >= deadline:
                        raise TimeoutError('Account lock acquisition deadline exceeded')
                    time.sleep(min(0.05, max(0, deadline - time.monotonic())))
        except BaseException:
            os.close(fd)
            raise

    def release(self):
        if self.fd is not None:
            import fcntl
            fd, self.fd = self.fd, None
            try:
                fcntl.flock(fd, fcntl.LOCK_UN)
            finally:
                os.close(fd)


def bounded_lines(proc, timeout, grace=2, max_line_bytes=65536):
    """Nonblocking stdout with a deadline including children retaining the pipe."""
    deadline = time.monotonic() + timeout
    selector = selectors.DefaultSelector()
    fd = proc.stdout.fileno()
    os.set_blocking(fd, False)
    selector.register(fd, selectors.EVENT_READ)
    pending = b''
    eof = False
    try:
        while not (eof and proc.poll() is not None):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError('Flow subprocess wall deadline exceeded; invocation outcome requires reconciliation')
            if eof:
                time.sleep(min(0.05, remaining))
                continue
            for _, _ in selector.select(min(0.1, remaining)):
                chunk = os.read(fd, 8192)
                if not chunk:
                    eof = True
                    selector.unregister(fd)
                    break
                pending += chunk
                while b'\n' in pending or len(pending) >= max_line_bytes:
                    newline = pending.find(b'\n')
                    end = newline + 1 if 0 <= newline < max_line_bytes else max_line_bytes
                    yield pending[:end].decode('utf-8', errors='replace')
                    pending = pending[end:]
        if pending:
            yield pending.decode('utf-8', errors='replace')
    finally:
        selector.close()
        # Also kill descendants after a parent exits while retaining stdout.
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            proc.wait(timeout=grace)
        except subprocess.TimeoutExpired:
            pass
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait(timeout=grace)
        proc.stdout.close()
