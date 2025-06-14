#!/bin/bash

echo "🚀 Starting deployment process..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Build files are in the 'dist' directory"
    echo "🌐 Ready for deployment to Vercel"
    echo ""
    echo "To deploy to Vercel:"
    echo "1. Commit and push your changes to GitHub"
    echo "2. Vercel will automatically deploy from the main branch"
    echo ""
    echo "Or deploy manually with: vercel --prod"
else
    echo "❌ Build failed!"
    exit 1
fi 