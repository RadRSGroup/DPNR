#!/bin/bash

# Pre-read hook for DPNR Course Platform
# This hook runs before reading files

FILE_PATH="$1"

# 1. Check if reading a large file
if [ -f "$FILE_PATH" ]; then
    FILE_SIZE=$(wc -c < "$FILE_PATH")
    # Warn if file is larger than 100KB
    if [ $FILE_SIZE -gt 100000 ]; then
        echo "⚠️  Large file warning: $(( FILE_SIZE / 1024 ))KB - Consider reading with offset/limit"
    fi
fi

# 2. If reading node_modules, warn
if [[ "$FILE_PATH" == *"node_modules"* ]]; then
    echo "⚠️  Reading from node_modules - Consider reading package.json instead"
fi

# 3. If reading a built file, suggest source
if [[ "$FILE_PATH" == *".next"* ]] || [[ "$FILE_PATH" == *"dist"* ]] || [[ "$FILE_PATH" == *"build"* ]]; then
    echo "💡 Reading compiled/built file - Consider reading the source file instead"
fi

# 4. If reading .env file with secrets, warn
if [[ "$FILE_PATH" == *".env" ]] && [[ "$FILE_PATH" != *".example" ]]; then
    echo "🔐 Reading environment file - Be careful not to expose secrets"
fi

exit 0