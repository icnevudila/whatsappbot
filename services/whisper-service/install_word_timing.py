"""Install timing support into the audited existing service, with a hash guard."""
import argparse
import ast
import hashlib
from pathlib import Path
import shutil


def patched_source(source):
    tree = ast.parse(source)
    function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "transcribe")
    protected = next(n for n in function.body if isinstance(n, ast.Try))
    first = next(n for n in protected.body if isinstance(n, ast.Assign)
                 and isinstance(n.targets[0], ast.Tuple)
                 and [t.id for t in n.targets[0].elts] == ["segments", "info"])
    last = next(n for n in protected.body if isinstance(n, ast.Return)
                and n.lineno > first.lineno)
    lines = source.splitlines(keepends=True)
    replacement = (
        "        from word_timing import transcribe_with_evidence\n"
        "        return transcribe_with_evidence(\n"
        "            model, tmp_path, language=lang_arg,\n"
        "            word_timestamps=data.get('word_timestamps') is True,\n"
        "        )\n"
    )
    result = ''.join(lines[:first.lineno - 1]) + replacement + ''.join(lines[last.end_lineno:])
    ast.parse(result)
    return result


def install(path, expected_sha):
    original = path.read_bytes()
    actual = hashlib.sha256(original).hexdigest()
    if actual != expected_sha:
        raise RuntimeError("Service source changed; refusing installation")
    result = patched_source(original.decode('utf-8'))
    backup = path.with_name(path.name + '.before-word-timing-' + actual[:12])
    with backup.open('xb') as f:
        f.write(original)
    module = Path(__file__).with_name('word_timing.py')
    target = path.with_name('word_timing.py')
    if target.exists():
        raise RuntimeError("Existing timing module requires explicit review")
    shutil.copyfile(module, target)
    temporary = path.with_name(path.name + '.word-timing-new')
    with temporary.open('x', encoding='utf-8') as f:
        f.write(result)
    shutil.copymode(path, temporary)
    temporary.replace(path)
    print(hashlib.sha256(path.read_bytes()).hexdigest())


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--path', type=Path, required=True)
    parser.add_argument('--expected-sha', required=True)
    args = parser.parse_args()
    install(args.path, args.expected_sha)
