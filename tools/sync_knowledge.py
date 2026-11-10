#!/usr/bin/env python
"""Đồng bộ KIẾN THỨC lên git (art lead 2026-11-10).

Quy tắc nhánh:
  - `main`   = kiến thức (skill, luật, .md, cấu hình dùng chung). Có trên GitHub, mục đích: đổi máy / đổi nền tảng vẫn còn thông tin.
  - `master` = nhánh làm việc ở máy, chứa cả tài nguyên (Assets, builder...). CHỈ Ở MÁY, không bao giờ push (hook pre-push chặn).

Script chạy khi đang đứng ở `master` (không đổi nhánh, không đụng thư mục làm việc):
  1. commit mọi thay đổi trong phạm vi kiến thức lên `master`;
  2. chép từng commit đó sang `main` (chỉ phần phạm vi kiến thức, bằng index tạm + commit-tree), giữ lịch sử từng commit;
  3. push `main` lên GitHub.
Đứng ở `main` thì commit thẳng + pull --rebase + push như bản cũ.

Gọi từ: hook `Stop` (.claude/settings.json, sau mỗi lượt Claude), Task Scheduler 17:30 (tools/auto_commit.ps1, phòng khi sửa ngoài Claude), hoặc tay:
    python -I tools/sync_knowledge.py [--dry-run] [--hook]
  --dry-run: chỉ in việc sẽ làm. --hook: im lặng, push chạy nền để không chặn Claude.
Log: tools/auto_commit.log
"""
import datetime
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LOG = REPO / 'tools' / 'auto_commit.log'
LOCK = REPO / 'tools' / '.sync.lock'
SYNC_REF = 'refs/vfxlib/synced-master'

# Phạm vi kiến thức (cùng bộ với CLAUDE.md mục Git)
PATHSPECS = [
    'CLAUDE.md', 'MAP.md', 'SPEC.md', 'AGENTS.md', '.gitignore', '.mcp.json', '.worktreeinclude',
    'contexte', '.claude/rules', '.claude/skills', '.claude/settings.json', '.claude/launch.json',
    'tools/sync_knowledge.py', 'tools/auto_commit.ps1',
    ':(glob)Docs/**/*.md', ':(glob)Docs/VFX/_Library/*.csv',
]
SCOPE_RE = re.compile(
    r'^(CLAUDE\.md|MAP\.md|SPEC\.md|AGENTS\.md|\.gitignore|\.mcp\.json|\.worktreeinclude|\.claude/settings\.json|\.claude/launch\.json'
    r'|tools/sync_knowledge\.py|tools/auto_commit\.ps1|Docs/VFX/_Library/[^/]+\.csv)$'
    r'|^(contexte|\.claude/rules|\.claude/skills)/|^Docs/.*\.md$')

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding='utf-8', errors='replace')   # console Windows mặc định cp1252, log có tiếng Việt
    except (AttributeError, ValueError):
        pass

DRY = '--dry-run' in sys.argv
HOOK = '--hook' in sys.argv


def log(msg):
    line = '{:%Y-%m-%d %H:%M:%S}  {}'.format(datetime.datetime.now(), msg)
    if not HOOK:
        print(line)
    try:
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except OSError:
        pass


def git(*args, env=None, inp=None, check=False):
    e = dict(os.environ)
    if env:
        e.update(env)
    p = subprocess.run(['git', '-c', 'core.quotepath=false', *args], cwd=REPO, env=e, input=inp,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and p.returncode != 0:
        raise RuntimeError('git %s: %s' % (' '.join(args), p.stderr.decode('utf-8', 'replace').strip()))
    return p


def out(p):
    return p.stdout.decode('utf-8', 'replace').strip()


def existing_pathspecs():
    return [p for p in PATHSPECS if p.startswith(':(') or (REPO / p).exists()]


def acquire_lock():
    try:
        if LOCK.exists() and (datetime.datetime.now().timestamp() - LOCK.stat().st_mtime) > 300:
            LOCK.unlink()
        fd = os.open(str(LOCK), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        return True
    except OSError:
        return False


def release_lock():
    try:
        LOCK.unlink()
    except OSError:
        pass


def commit_scope_on_current():
    """Commit thay đổi trong phạm vi lên nhánh đang đứng. Trả về số file, hoặc -1 nếu lỗi."""
    specs = existing_pathspecs()
    if DRY:
        p = git('add', '--dry-run', '-A', '--', *specs)
        log('DryRun: file sẽ được commit:\n' + out(p))
        return 0
    p = git('add', '-A', '--', *specs)
    if p.returncode != 0 and b'index.lock' in p.stderr:
        log('index.lock đang bị giữ (git khác đang chạy), bỏ qua lượt này.')
        return -1
    files = out(git('diff', '--cached', '--name-status', '--', *specs)).splitlines()
    if not files:
        return 0
    msg = 'Tự động {:%Y-%m-%d %H:%M}: kiến thức / skill / tài liệu ({} file)\n\n{}\n'.format(
        datetime.datetime.now(), len(files), '\n'.join(files))
    fd, mf = tempfile.mkstemp(suffix='.txt')
    os.write(fd, msg.encode('utf-8'))
    os.close(fd)
    try:
        p = git('commit', '-q', '-F', mf, '--', *specs)
    finally:
        os.unlink(mf)
    if p.returncode != 0:
        log('Commit lỗi: ' + p.stderr.decode('utf-8', 'replace').strip())
        return -1
    log('Đã commit %d file lên %s.' % (len(files), out(git('rev-parse', '--abbrev-ref', 'HEAD'))))
    return len(files)


def tree_with_scope_from(base_ref, source_commit):
    """Cây của base_ref, trong đó phần thuộc phạm vi được thay bằng phần của source_commit."""
    fd, idx = tempfile.mkstemp(suffix='.index')
    os.close(fd)
    os.unlink(idx)  # git tạo lại
    env = {'GIT_INDEX_FILE': idx}
    try:
        git('read-tree', base_ref, env=env, check=True)
        cur = git('ls-files', '-z', env=env, check=True).stdout.split(b'\0')
        rm = [f for f in cur if f and SCOPE_RE.match(f.decode('utf-8', 'replace'))]
        if rm:
            git('update-index', '--force-remove', '-z', '--stdin', env=env, inp=b'\0'.join(rm) + b'\0', check=True)
        entries = git('ls-tree', '-r', '-z', '--full-tree', source_commit, check=True).stdout.split(b'\0')
        add = []
        for e in entries:
            if not e:
                continue
            meta, path = e.split(b'\t', 1)
            mode, typ, sha = meta.decode().split()
            if typ == 'blob' and SCOPE_RE.match(path.decode('utf-8', 'replace')):
                add.append(('%s %s\t' % (mode, sha)).encode() + path)
        if add:
            git('update-index', '-z', '--index-info', env=env, inp=b'\0'.join(add) + b'\0', check=True)
        return out(git('write-tree', env=env, check=True))
    finally:
        if os.path.exists(idx):
            os.unlink(idx)


def transplant_to_main():
    """Chép các commit mới của master sang main (chỉ phần kiến thức). Trả về True nếu main đổi."""
    if git('rev-parse', '--verify', '-q', 'refs/heads/main').returncode != 0:
        log('Không có nhánh main ở máy, bỏ qua bước chép.')
        return False
    f = git('fetch', '-q', 'origin', 'main')
    if f.returncode != 0:
        log('Fetch lỗi (mạng?): ' + f.stderr.decode('utf-8', 'replace').strip()[:200])
    elif out(git('rev-parse', 'main')) != out(git('rev-parse', 'origin/main')) \
            and git('merge-base', '--is-ancestor', 'main', 'origin/main').returncode == 0:
        # origin/main đi trước main ở máy = có commit từ máy / phiên khác (main ở máy chỉ do script này tiến, và đã push).
        # Không dùng "origin/main là tổ tiên của master": commit đã chép sang main có mã băm khác commit trên master.
        # Kéo về master trước.
        if DRY:
            log('DryRun: origin/main có commit mới, sẽ merge vào master.')
        else:
            m = git('merge', '--no-edit', 'origin/main')
            if m.returncode != 0:
                git('merge', '--abort')
                log('Merge origin/main vào master lỗi (xung đột). Cần xử lý tay; chưa chép sang main.')
                return False
            log('Đã merge commit mới của origin/main vào master.')
    elif out(git('rev-parse', 'main')) != out(git('rev-parse', 'origin/main')) \
            and git('merge-base', '--is-ancestor', 'origin/main', 'main').returncode != 0:
        log('main ở máy và origin/main đã rẽ nhánh (không bên nào là tổ tiên của bên kia). Cần xử lý tay; chưa chép sang main.')
        return False
    # main phải đi theo origin/main (nếu origin/main đi trước và main là tổ tiên thì tua nhanh)
    if git('rev-parse', '--verify', '-q', 'origin/main').returncode == 0 \
            and git('merge-base', '--is-ancestor', 'main', 'origin/main').returncode == 0 \
            and out(git('rev-parse', 'main')) != out(git('rev-parse', 'origin/main')) and not DRY:
        git('update-ref', 'refs/heads/main', 'origin/main', check=True)

    synced = git('rev-parse', '--verify', '-q', SYNC_REF)
    base = out(synced) if synced.returncode == 0 else out(git('merge-base', 'master', 'main'))
    commits = out(git('rev-list', '--reverse', '--first-parent', base + '..master')).split()
    changed = False
    for c in commits:
        old = out(git('rev-parse', 'main'))
        tree = tree_with_scope_from('main', c)
        if tree != out(git('rev-parse', 'main^{tree}')):
            subj = out(git('log', '-1', '--format=%s', c))
            if DRY:
                log('DryRun: sẽ chép %s (%s) sang main.' % (c[:8], subj))
            else:
                msg = git('log', '-1', '--format=%B', c, check=True).stdout
                fd, mf = tempfile.mkstemp(suffix='.txt')
                os.write(fd, msg)
                os.close(fd)
                try:
                    new = out(git('commit-tree', tree, '-p', old, '-F', mf, check=True))
                finally:
                    os.unlink(mf)
                git('update-ref', 'refs/heads/main', new, old, check=True)
                log('Chép %s (%s) sang main -> %s.' % (c[:8], subj, new[:8]))
                changed = True
        if not DRY:
            git('update-ref', SYNC_REF, c, check=True)
    return changed


def push_main():
    if DRY:
        return
    if out(git('rev-parse', 'main')) == out(git('rev-parse', '-q', '--verify', 'origin/main') or 'x'):
        return
    if HOOK:
        # chạy nền: không chặn Claude; kết quả vào log qua lần chạy sau (so sánh main với origin/main)
        flags = 0x00000008 | 0x08000000 if os.name == 'nt' else 0  # DETACHED_PROCESS | CREATE_NO_WINDOW
        subprocess.Popen(['git', 'push', '-q', 'origin', 'main'], cwd=REPO, creationflags=flags,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
        log('Đã gọi push main (chạy nền).')
        return
    p = git('push', '-q', 'origin', 'main')
    if p.returncode != 0:
        log('Push lỗi: ' + p.stderr.decode('utf-8', 'replace').strip()[:300] + ' (commit vẫn ở máy).')
    else:
        log('Đã push main lên origin.')


def main():
    if not acquire_lock():
        return 0
    try:
        cur = out(git('rev-parse', '--abbrev-ref', 'HEAD'))
        n = commit_scope_on_current()
        if n < 0:
            return 1
        if cur == 'master':
            transplant_to_main()
            push_main()
        elif cur == 'main':
            if not DRY:
                git('pull', '-q', '--rebase', '--autostash', 'origin', 'main')
                push_main()
        else:
            log('Đang ở nhánh %s: chỉ commit local, không chép sang main.' % cur)
        if n == 0 and not DRY and not HOOK:
            log('Không có thay đổi kiến thức mới.')
        return 0
    except Exception as e:  # noqa: BLE001
        log('LỖI: %s' % e)
        return 1
    finally:
        release_lock()


if __name__ == '__main__':
    sys.exit(main())
