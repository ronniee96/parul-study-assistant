# Frontend Setup Instructions

## Prerequisites

- Node.js 16.0 or higher
- npm (comes with Node.js) or yarn/pnpm
- Git (for version control)

## Installation

1. **Navigate to the frontend directory**:
   ```bash
   cd StudyAssistant/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

   This will install:
   - React 18
   - Vite (development server)
   - Tailwind CSS (for styling)
   - Other necessary dependencies

## Environment Setup

Create a `.env` file in the frontend directory to configure the API connection:

```bash
# Frontend/.env
VITE_API_URL=http://localhost:8000/api/v1
```

> 💡 **Note**: If your backend runs on a different port or host, adjust the URL accordingly.

## Available Scripts

In the frontend directory, you can run:

### Development
```bash
npm run dev
```
Starts the development server at http://localhost:5173
Features:
- Hot Module Replacement (HMR)
- Fast refresh
- Error overlay

### Build for Production
```bash
npm run build
```
Creates an optimized production build in the `dist` directory

### Preview Production Build
```bash
npm run preview
```
Locally previews the production build

### Linting
```bash
npm run lint
```
Runs ESLint to check for code issues

## Features

### User Interface
- Modern, responsive design using Tailwind CSS
- Dark/light mode support
- Intuitive tab-based navigation
- Ethical use reminders and guidelines
- File upload with validation and feedback
- Processing status indicators
- Results display with summaries, key points, and practice questions

### Core Functionality
- **Upload Tab**: Upload your legitimate study materials (PDF, PPT, DOC, TXT, images)
- **Summarize Tab**: Generate summaries and extract key points from your materials
- **Questions Tab**: Create practice questions for self-assessment
- **Study Plan Tab**: Get personalized study recommendations based on your materials

### Ethical Guidelines Built-In
- Clear reminders about legitimate use only
- Validation that users confirm they have access to materials
- Focus on enhancing learning from authorized materials
- No features that facilitate copyright infringement

## Component Structure

```
src/
├── App.jsx           # Main application component
├── index.css         # Tailwind CSS base styles
├── main.jsx          # Application entry point
└── components/
    ├── UploadTab.jsx
    ├── SummarizeTab.jsx
    ├── QuestionsTab.jsx
    └── StudyPlanTab.jsx
```

## Styling

The application uses Tailwind CSS with a custom configuration:
- Primary color: Blue theme (professional, trustworthy)
- Secondary color: Green theme (success, growth)
- Responsive design for mobile and desktop
- Dark mode support
- Subtle animations and transitions
- Card-based layout for better organization

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000/api/v1` |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (responsive design)

## Development Guidelines

1. **Always work in a feature branch** for new features
2. **Write clear, descriptive commit messages**
3. **Follow the existing code style and conventions**
4. **Test changes in both development and production builds**
5. **Consider accessibility (WCAG) guidelines**
6. **Keep bundle size reasonable for good performance**

## Troubleshooting

1. **Dependency issues**: Try `npm ci` to reinstall from lockfile
2. **Port conflicts**: Change the port in `vite.config.js` or stop existing processes
3. **CSS not updating**: Ensure Tailwind CSS is properly configured and running
4. **Build failures**: Check for syntax errors and missing dependencies
5. **API connection issues**: Verify the backend is running and `VITE_API_URL` is correct

## Production Deployment

For deploying the frontend:
- **Vercel**: Connect your GitHub repository
- **Netlify**: Connect your GitHub repository or drag-and-drop the `dist` folder
- **AWS Amplify**: Connect your repository
- **Traditional hosting**: Upload the contents of the `dist` folder

Remember to set the `VITE_API_URL` environment variable to point to your deployed backend.

## Accessibility Features

- Semantic HTML structure
- Proper color contrast ratios
- Keyboard navigable interface
- Focus management
- ARIA labels where appropriate
- Responsive design for various screen sizes

## License

MIT License - See the root LICENSE file for details.