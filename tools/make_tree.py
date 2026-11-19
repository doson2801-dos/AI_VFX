"""Tạo lại cây thư mục của project trên máy khác.

    python -I tools/make_tree.py            # tạo các thư mục còn thiếu theo bảng (an toàn, chạy lại được)
    python -I tools/make_tree.py --export   # quét cây hiện tại, ghi lại bảng
    python -I tools/make_tree.py --dry-run  # chỉ liệt kê thư mục sẽ tạo

Bảng: Docs/VFX/_Library/folder_tree.csv (một dòng một thư mục, đường dẫn tương đối, dấu /).
Bỏ qua thư mục sinh tự động: Library, Temp, obj, Logs, UserSettings, .vs, .git, __pycache__, tmp_gen.
Chỉ tạo thư mục, không đụng file. Chạy --export sau khi thêm / đổi thư mục rồi commit bảng.
"""
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
MANIFEST = REPO / 'Docs' / 'VFX' / '_Library' / 'folder_tree.csv'
SKIP = {'Library', 'Temp', 'obj', 'Logs', 'UserSettings', '.vs', '.git', '__pycache__', 'tmp_gen', 'node_modules'}


def scan():
    out = []
    def walk(d):
        for p in sorted(d.iterdir()):
            if p.is_dir() and not p.is_symlink() and p.name not in SKIP:
                out.append(p.relative_to(REPO).as_posix())
                walk(p)
    walk(REPO)
    return out


def main():
    args = set(sys.argv[1:])
    if '--export' in args:
        dirs = scan()
        MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST.write_text('\n'.join(dirs) + '\n', encoding='utf-8', newline='\n')
        print(f'Đã ghi {len(dirs)} thư mục -> {MANIFEST.relative_to(REPO)}')
        return
    if not MANIFEST.exists():
        sys.exit(f'Thiếu bảng {MANIFEST}. Chạy --export trên máy gốc trước.')
    made = 0
    for line in MANIFEST.read_text(encoding='utf-8').splitlines():
        rel = line.strip()
        if not rel or rel.startswith('#') or '..' in rel.split('/') or rel.startswith('/'):
            continue
        p = REPO / rel
        if not p.exists():
            made += 1
            if '--dry-run' in args:
                print('sẽ tạo', rel)
            else:
                p.mkdir(parents=True, exist_ok=True)
    print(f'{"Sẽ tạo" if "--dry-run" in args else "Đã tạo"} {made} thư mục mới.')


main()
