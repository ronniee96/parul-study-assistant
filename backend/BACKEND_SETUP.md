# Backend Setup Instructions

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Git (for version control)

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd StudyAssistant/backend
   ```

2. **Create a virtual environment** (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:
   Create a `.env` file in the backend directory with your API keys:
   ```bash
   cp .env.example .env
   # Then edit .env to add your actual API keys
   ```

   Example `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

   > 💡 **Note**: The application will work without API keys using mock responses,
   > but for actual AI-powered summarization and question generation, you'll need
   > to obtain API keys from OpenAI and/or Anthropic.

5. **Run the development server**:
   ```bash
   python main.py
   ```

   The API will be available at:
   - Local: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Alternative Docs: http://localhost:8000/redoc

## API Endpoints

### File Upload
- `POST /api/v1/upload` - Upload study materials (PDF, PPT, DOC, TXT, images)

### Document Processing
- `POST /api/v1/process` - Process uploaded document and optionally generate summaries/questions

### Summarization
- `POST /api/v1/summarize` - Generate summary from text

### Question Generation
- `POST /api/v1/generate-questions` - Generate practice questions from text

### Health Check
- `GET /api/v1/health` - Check service status

## Supported File Types

- **Documents**: PDF, PPT/PPTX, DOC/DOCX, TXT
- **Images**: JPG, JPEG, PNG, BMP, TIFF (uses OCR for text extraction)

## Ethical Guidelines

This backend is designed to work ONLY with materials you have legitimate access to:
- Materials provided by your professors/instructors
- Textbooks and resources you've purchased
- Your own class notes and recordings
- Materials shared explicitly for study purposes
- Public domain educational resources

**Never use this tool to:**
- Circumvent paywalls or access restrictions
- Copy or distribute copyrighted materials without permission
- Violate academic integrity policies
- Access materials you don't have legitimate rights to use

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | Optional (mock responses used if not provided) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features | Optional (mock responses used if not provided) |

## Development

- The server runs with auto-reload enabled during development
- API documentation is automatically generated and available at `/docs`
- All endpoints include proper error handling and validation

## Production Deployment

For production deployment, consider:
- Using a proper WSGI server like Gunicorn
- Setting up environment variables securely
- Implementing rate limiting and authentication
- Using a process manager like PM2 or systemd
- Setting up proper logging and monitoring

## Troubleshooting

1. **Module not found errors**: Ensure you're in the virtual environment and have installed requirements
2. **Port already in use**: Change the port in `main.py` or stop the existing process
3. **API key issues**: Verify your API keys are correct and have sufficient credits
4. **File processing issues**: Ensure the file is not corrupted and is in a supported format

## License

MIT License - See the root LICENSE file for details.