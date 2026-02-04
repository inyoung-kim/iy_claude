#!/bin/bash

# HVAC Insights Daily Scheduler Setup Script
# This script creates a macOS LaunchAgent to run the analysis daily

PLIST_NAME="com.hvac-insights.daily"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
PROJECT_DIR="$HOME/Desktop/iy_claude/hvac-insights"

# Default run time: 9:00 AM
HOUR=${1:-9}
MINUTE=${2:-0}

echo "🔧 Setting up HVAC Insights Daily Scheduler..."
echo "   Run time: ${HOUR}:${MINUTE} daily"

# Create LaunchAgent plist
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/npm</string>
        <string>run</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>${HOUR}</integer>
        <key>Minute</key>
        <integer>${MINUTE}</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${PROJECT_DIR}/logs/daily.log</string>
    <key>StandardErrorPath</key>
    <string>${PROJECT_DIR}/logs/daily-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

# Load the LaunchAgent
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo "✅ Scheduler installed successfully!"
echo ""
echo "Commands:"
echo "  Start now:  launchctl start ${PLIST_NAME}"
echo "  Stop:       launchctl unload ${PLIST_PATH}"
echo "  View logs:  tail -f ${PROJECT_DIR}/logs/daily.log"
echo ""
echo "The analysis will run daily at ${HOUR}:${MINUTE}"
