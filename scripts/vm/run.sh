#!/usr/bin/env bash
# プロジェクトの作業用コピーで npm スクリプトを実行する。
#
#   使い方: bash scripts/vm/run.sh <npmスクリプト名> [引数...]
#   例:     bash scripts/vm/run.sh check
#
# なぜ作業用コピーか:
#   - このフォルダは OneDrive の中にあり、node_modules（数千ファイル）を置くと同期が重くなる。
#   - 接続フォルダの上では削除に許可が要るなどの制限があり、npm が失敗することがある。
#   そこで、ソースと履歴の正本はこのフォルダ、依存とビルドは作業用コピー、と分ける。
#   作業用コピーは毎回このフォルダから作り直すので、正本は常にこのフォルダ側。
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIRROR="${IDLE_MIRROR:-$HOME/idle-game-work}"

if [ $# -lt 1 ]; then
  echo "使い方: bash scripts/vm/run.sh <npmスクリプト名> [引数...]" >&2
  exit 2
fi

mkdir -p "$MIRROR"

# 1. 正本 → 作業用コピー（node_modules と依存の目印だけ残して作り直す）
find "$MIRROR" -mindepth 1 -maxdepth 1 ! -name node_modules ! -name .deps-hash -exec rm -rf {} +
tar -C "$SRC" \
  --exclude=./node_modules --exclude=./dist --exclude=./.git --exclude=./art/inbox \
  -cf - . | tar -C "$MIRROR" -xf -

# 2. 依存の導入（package-lock.json が変わったときだけ）
if [ ! -f "$SRC/package-lock.json" ]; then
  (cd "$MIRROR" && npm install --no-audit --no-fund >/dev/null)
  cp "$MIRROR/package-lock.json" "$SRC/package-lock.json"
  echo "package-lock.json を作成しました。"
fi
HASH="$(sha256sum "$SRC/package-lock.json" | cut -d' ' -f1)"
if [ ! -d "$MIRROR/node_modules" ] || [ "$(cat "$MIRROR/.deps-hash" 2>/dev/null || true)" != "$HASH" ]; then
  (cd "$MIRROR" && npm ci --no-audit --no-fund >/dev/null)
  echo "$HASH" > "$MIRROR/.deps-hash"
fi

# 3. 実行（git の操作は正本のリポジトリに対して行う）
export IDLE_SRC="$SRC"
cd "$MIRROR"
set +e
npm run --silent "$@"
CODE=$?
set -e

# 4. 生成物を正本へ戻す（どちらも .gitignore 済み）
#    削除の許可がない場合でも止まらないよう、消せなければ上書きだけ行う。
for d in dist reports; do
  if [ -d "$MIRROR/$d" ]; then
    rm -rf "${SRC:?}/$d" 2>/dev/null || true
    mkdir -p "$SRC/$d"
    cp -rf "$MIRROR/$d/." "$SRC/$d/" || echo "注意: $d をこのフォルダへ戻せませんでした。" >&2
  fi
done

exit $CODE
