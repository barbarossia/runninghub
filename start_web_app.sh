#!/bin/bash

# RunningHub Web Application Launcher

echo "🚀 Starting RunningHub Web Application..."

# Check if we're in the correct directory
if [ ! -d "web_app" ]; then
    echo "❌ Error: Please run this script from the runninghub directory"
    echo "   Expected structure: runninghub/start_web_app.sh"
    exit 1
fi

# Change to web app directory
cd web_app

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -q Flask Flask-CORS python-dotenv

# Check if .env exists in parent directory
if [ ! -f "../.env" ]; then
    echo "❌ Error: .env file not found in parent directory"
    echo "   Please create .env file with your RunningHub configuration:"
    echo "   RUNNINGHUB_API_KEY=your_api_key_here"
    echo "   RUNNINGHUB_WORKFLOW_ID=your_workflow_id_here"
    exit 1
fi

echo "✅ Configuration found"
echo "🌐 Starting web application..."
echo "📱 Open http://localhost:8080 in your browser"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the web application
python app.py