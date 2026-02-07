#!/bin/bash

# Hackathon Quick Setup Script

echo "🚀 Setting up your hackathon project..."
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Initialize database
echo "💾 Initializing database..."
npm run db:push

# Make pre-commit hook executable
chmod +x .husky/pre-commit

echo ""
echo "✅ Setup complete! Your project is ready to go."
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' to start the development server"
echo "  2. Open http://localhost:3000 in your browser"
echo "  3. Read QUICKSTART.md for a quick guide"
echo ""
echo "Happy hacking! 🎉"
