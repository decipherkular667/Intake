#!/bin/bash
set -e

echo "🚀 Starting production deployment..."

# Run database migration
echo "🔄 Running database migration..."
npm run db:push:prod || {
  echo "⚠️  Migration failed, but continuing with server start..."
}

# Start the server
echo "🌐 Starting server..."
npm run start
