#!/bin/zsh

set -u

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
STATE_DIR="$HOME/Library/Application Support/OpenClawWatchdog"
FLAG_FILE="$STATE_DIR/openclaw-down.flag"
STATUS_SNAPSHOT="$STATE_DIR/last-status.txt"
WATCHDOG_LOG="$STATE_DIR/watchdog.log"
OPENCLAW_BIN="/opt/homebrew/bin/openclaw"
OSASCRIPT_BIN="/usr/bin/osascript"

mkdir -p "$STATE_DIR"

log_line() {
  local message="$1"
  /bin/date '+%Y-%m-%d %H:%M:%S' | {
    read -r now
    printf '%s %s\n' "$now" "$message" >> "$WATCHDOG_LOG"
  }
}

show_alert() {
  local title="$1"
  local message="$2"
  local subtitle="$3"

  "$OSASCRIPT_BIN" \
    -e 'on run argv' \
    -e 'set alertTitle to item 1 of argv' \
    -e 'set alertMessage to item 2 of argv' \
    -e 'set alertSubtitle to item 3 of argv' \
    -e 'display notification alertSubtitle with title alertTitle' \
    -e 'display alert alertTitle message alertMessage as critical giving up after 20' \
    -e 'end run' \
    "$title" "$message" "$subtitle" >/dev/null 2>&1 || true
}

check_openclaw() {
  local output
  local code

  if [[ ! -x "$OPENCLAW_BIN" ]]; then
    output="OpenClaw binary not found at $OPENCLAW_BIN"
    code=127
  else
    output="$("$OPENCLAW_BIN" gateway status 2>&1)"
    code=$?
  fi

  printf '%s\n' "$output" > "$STATUS_SNAPSHOT"

  if [[ $code -eq 0 && "$output" == *"RPC probe: ok"* && "$output" == *"Listening:"* ]]; then
    if [[ -f "$FLAG_FILE" ]]; then
      /bin/rm -f "$FLAG_FILE"
      log_line "OpenClaw recovered"
    fi
    return 0
  fi

  if [[ ! -f "$FLAG_FILE" ]]; then
    : > "$FLAG_FILE"
    log_line "OpenClaw down detected"
    show_alert \
      "OpenClaw 已断开" \
      "OpenClaw 网关检测失败。请运行 'openclaw gateway status' 检查。状态快照已写入：$STATUS_SNAPSHOT" \
      "已记录故障快照，登录后请处理。"
  fi

  log_line "Health check failed"
  return 1
}

run_test_alert() {
  log_line "Manual test alert triggered"
  show_alert \
    "OpenClaw 测试弹窗" \
    "这是一条测试告警。以后如果 OpenClaw 掉线，会弹出类似的提示。" \
    "OpenClaw Watchdog 测试通知"
}

case "${1:-}" in
  --test-alert)
    run_test_alert
    ;;
  *)
    check_openclaw
    ;;
esac
