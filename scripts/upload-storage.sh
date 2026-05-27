#!/bin/bash
# Upload dos 285 arquivos do backup Base44 → bucket público-assets do Supabase próprio
# Estratégia: tudo vai pro bucket "public-assets" preservando o path
# "public/68d536db3c26ff51f79c4137/XXXX" pra URL ficar fácil de mapear nas tabelas.

set -e
URL="https://gezvviyegtxytnwjkrjv.supabase.co"
KEY="sb_publishable_wZOM37qN_CPxoZnE-OvrAA_m6MWCG4r"
SRC="$HOME/Leilonozap-backup-2026-05-26/storage"
LOG="$HOME/Leilonozap-backup-2026-05-26/storage/_upload.log"
: > "$LOG"

upload_one() {
  local src="$1"
  # path no bucket: tudo após /storage/{base44-files|supabase-storage}/
  local rel
  if [[ "$src" == *"/base44-files/"* ]]; then
    rel="${src##*/base44-files/}"
  else
    rel="${src##*/supabase-storage/}"
  fi
  # Detect mime type
  local mime
  case "$rel" in
    *.png|*.PNG) mime="image/png";;
    *.jpg|*.jpeg|*.JPG|*.JPEG) mime="image/jpeg";;
    *.webp) mime="image/webp";;
    *.avif) mime="image/avif";;
    *.gif) mime="image/gif";;
    *.svg) mime="image/svg+xml";;
    *.pdf) mime="application/pdf";;
    *) mime="application/octet-stream";;
  esac

  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
    "$URL/storage/v1/object/public-assets/$rel" \
    -H "apikey: $KEY" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: $mime" \
    -H "x-upsert: true" \
    --data-binary @"$src")
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    echo "OK  $rel" >> "$LOG"
    return 0
  else
    echo "FAIL $code $rel" >> "$LOG"
    return 1
  fi
}

export -f upload_one
export URL KEY LOG

count=0
total=$(find "$SRC" -type f ! -name '_*' | wc -l | tr -d ' ')
ok=0
fail=0
echo "Iniciando upload de $total arquivos..."

while IFS= read -r f; do
  count=$((count+1))
  if upload_one "$f"; then ok=$((ok+1)); else fail=$((fail+1)); fi
  # progresso a cada 50
  if (( count % 50 == 0 )); then
    echo "  $count/$total ($ok OK, $fail FAIL)"
  fi
done < <(find "$SRC" -type f ! -name '_*')

echo ""
echo "=== Final ==="
echo "Total: $total"
echo "OK:    $ok"
echo "FAIL:  $fail"
echo ""
echo "Top 5 erros:"
grep '^FAIL' "$LOG" | head -5
