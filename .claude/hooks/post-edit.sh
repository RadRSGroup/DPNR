#!/bin/bash

# Post-edit hook for DPNR Course Platform
# This hook runs after files are edited

# Get the edited file path
FILE_PATH="$1"

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

echo "🔄 Post-edit check for: $FILE_PATH"

# Check if we're in the dpnr-course-platform directory
if [[ "$FILE_PATH" == *"dpnr-course-platform"* ]] && [ ! -d "dpnr-course-platform" ]; then
    cd dpnr-course-platform 2>/dev/null || true
fi

# 1. Auto-format TypeScript/JavaScript files
if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
    echo "🎨 Formatting TypeScript/JavaScript file..."
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
fi

# 2. Check for TypeScript errors in the edited file
if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    echo "🔧 Checking TypeScript types..."
    npx tsc --noEmit --skipLibCheck "$FILE_PATH" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "⚠️  TypeScript errors detected in $FILE_PATH"
    fi
fi

# 3. If a React component was edited, check for missing imports
if [[ "$FILE_PATH" =~ \.(tsx)$ ]]; then
    # Check for common missing imports
    grep -q "useState\|useEffect\|useMemo\|useCallback\|useRef" "$FILE_PATH"
    if [ $? -eq 0 ]; then
        grep -q "import.*from ['\"]react['\"]" "$FILE_PATH"
        if [ $? -ne 0 ]; then
            echo "⚠️  React hooks used but React not imported in $FILE_PATH"
        fi
    fi
fi

# 4. If Prisma schema was edited, validate it
if [[ "$FILE_PATH" == *"schema.prisma" ]]; then
    echo "📊 Validating Prisma schema..."
    cd packages/database 2>/dev/null || cd dpnr-course-platform/packages/database 2>/dev/null
    npx prisma validate
    if [ $? -eq 0 ]; then
        echo "✅ Prisma schema is valid"
        echo "💡 Remember to run 'npm run prisma:generate' to update the client"
    fi
fi

# 5. Check for unused imports (optional, can be slow)
if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    # Quick check for potentially unused imports
    IMPORTS=$(grep "^import" "$FILE_PATH" | sed 's/import \(.*\) from.*/\1/' | tr -d '{}' | tr ',' '\n' | xargs)
    for import in $IMPORTS; do
        import_name=$(echo $import | xargs | cut -d' ' -f1)
        # Check if the import is used in the file (excluding the import line itself)
        grep -v "^import" "$FILE_PATH" | grep -q "$import_name"
        if [ $? -ne 0 ]; then
            echo "💡 Potentially unused import: $import_name in $FILE_PATH"
        fi
    done
fi

exit 0