#!/bin/bash

echo "=== Tico Market Main Flow Tests ==="
echo "Starting at: $(date)"
echo ""

# Test 1: Check if dev server starts
echo "Test 1: Starting dev server..."
timeout 10 npm run dev > /tmp/tico-dev.log 2>&1 &
DEV_PID=$!
sleep 3

if ps -p $DEV_PID > /dev/null; then
    echo "✓ Dev server started successfully"
    kill $DEV_PID 2>/dev/null
else
    echo "✗ Dev server failed to start"
    cat /tmp/tico-dev.log
    exit 1
fi

echo ""

# Test 2: Check project structure
echo "Test 2: Project structure validation..."
MISSING_FILES=0

# Check key files
for file in "src/app/page.tsx" "src/app/layout.tsx" "src/components" "src/lib/supabase.ts"; do
    if [ -e "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo "✓ All key files present"
else
    echo "✗ $MISSING_FILES files missing"
fi

echo ""

# Test 3: Check API routes
echo "Test 3: API routes check..."
API_ROUTES=$(find src/app/api -name "route.ts" | wc -l)
echo "Found $API_ROUTES API routes"

# List all API routes
echo "API Routes:"
find src/app/api -name "route.ts" | sed 's|src/app/||' | while read route; do
    echo "  - $route"
done

echo ""

# Test 4: Check dependencies
echo "Test 4: Dependencies check..."
if [ -f "package.json" ]; then
    echo "✓ package.json exists"
    
    # Check for required dependencies
    for dep in "next" "react" "@supabase/supabase-js" "tailwindcss"; do
        if grep -q "\"$dep\"" package.json; then
            echo "✓ $dep dependency present"
        else
            echo "✗ $dep dependency missing"
        fi
    done
else
    echo "✗ package.json missing"
fi

echo ""

# Test 5: TypeScript compilation (basic)
echo "Test 5: TypeScript check..."
if [ -f "tsconfig.json" ]; then
    echo "✓ TypeScript configured"
    
    # Check a few key TypeScript files
    for file in "src/types/index.ts" "src/lib/database.types.ts"; do
        if [ -f "$file" ]; then
            echo "✓ $file exists"
        fi
    done
else
    echo "✗ TypeScript not configured"
fi

echo ""

# Test 6: Environment configuration
echo "Test 6: Environment check..."
if [ -f ".env.local" ]; then
    echo "✓ .env.local exists"
    
    # Check for Supabase config
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo "✓ Supabase configuration present"
    else
        echo "✗ Supabase configuration missing"
    fi
else
    echo "✗ .env.local missing (using .env.example)"
    if [ -f ".env.example" ]; then
        echo "✓ .env.example exists as template"
    fi
fi

echo ""
echo "=== Test Summary ==="
echo "All structural tests completed."
echo "Next steps:"
echo "1. Run 'npm run dev' to start development server"
echo "2. Open http://localhost:3000 in browser"
echo "3. Test user flows:"
echo "   - Browse listings"
echo "   - User registration/login"
echo "   - Create listing"
echo "   - Send message to seller"
echo "   - Checkout process"