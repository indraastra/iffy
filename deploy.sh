#!/bin/bash

# Simple deployment script for manual GitHub Pages deployment

echo "Building for GitHub Pages..."
npm run build:gh-pages

echo "Deploying to gh-pages branch..."

# Create a temporary directory for the gh-pages branch
TEMP_DIR=$(mktemp -d)
cp -r dist/* "$TEMP_DIR"

# Switch to gh-pages branch (create if it doesn't exist)
git checkout gh-pages 2>/dev/null || git checkout --orphan gh-pages

# Clear the working directory and copy the built files
git rm -rf . 2>/dev/null || true
cp -r "$TEMP_DIR"/* .

# Add a .nojekyll file to prevent Jekyll processing
touch .nojekyll

# Commit and push
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages

# Switch back to main branch
git checkout main

# Clean up
rm -rf "$TEMP_DIR"

echo "Deployment complete! Site should be available at:"
echo "https://indraastra.github.io/iffy/"