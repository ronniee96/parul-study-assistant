# Ethical MBA Study Assistant

A modern, ethical study assistant designed specifically designed for MBA students to enhance learning from legitimate study materials. Features adaptive learning, personalized recommendations, and a clean, interactive interface with smooth animations.

## ✨ Features

- **Ethical by Design**: Works only with materials you have legitimate access to
- **Adaptive Learning**: Personalized recommendations based on your performance (requires consent)
- **Smart Summarization**: AI-powered summarization of your study materials
- **Practice Questions**: Generate custom quizzes for self-assessment
- **Personalized Study Plans**: Tailored study timelines based on your materials
- **Learning Analytics**: Insights into your study patterns and progress
- **Modern UI**: Smooth scrolling, animations, and interactive elements
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Styling**: Custom Tailwind configuration with professional color scheme
- **State Management**: React hooks for clean, efficient state handling
- **Animations**: CSS transitions and transforms for smooth user experience
- **Icons**: Heroicons for clean, professional visuals

## 📁 Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── App.jsx          # Main application component
│   ├── App.css          # Component-specific styles
│   ├── index.css        # Tailwind base styles
│   ├── main.jsx         # Application entry point
│   └── assets/          # Images and icons
├── .gitignore           # Git ignore rules
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind CSS configuration
├── vite.config.js       # Vite configuration
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16.0 or higher
- npm (comes with Node.js) or yarn/pnpm
- Git (for version control)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd StudyAssistant/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   Create a `.env` file in the frontend directory:
   ```bash
   VITE_API_URL=http://localhost:8000/api/v1
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at http://localhost:5173

### Available Scripts

- `npm run dev` - Starts the development server
- `npm run build` - Creates optimized production build
- `npm run preview` - Previews the production build locally
- `npm run lint` - Runs ESLint for code quality

## 🎯 Core Features Explained

### Ethical Foundation
Every feature begins with an ethical reminder: you must confirm you have legitimate access to any study materials you upload. This tool enhances learning from authorized materials only.

### Adaptive Learning System
- **Consent-Based**: All personalization requires explicit user consent
- **Performance Tracking**: Records your question responses to understand your learning patterns
- **Personalized Recommendations**: Suggests focus areas based on your performance
- **Adaptive Difficulty**: Adjusts question difficulty based on your recent performance
- **Privacy First**: Your data stays private and is used solely to improve your learning

### Interactive Interface
- **Smooth Scrolling**: Native smooth scroll behavior for pleasant navigation
- **Micro-interactions**: Subtle animations on buttons, cards, and form elements
- **Visual Feedback**: Immediate response to user actions with loading states and success indicators
- **Clean Typography**: Professional, readable fonts optimized for long study sessions
- **Color Psychology**: Calming blues for focus, energizing greens for progress and success

## 💡 How to Use

1. **Upload Materials**: Go to the Upload tab and select your legitimate study materials (PDF, PPT, DOC, TXT, images)
2. **Process Content**: Visit Summarize & Notes to generate summaries and extract key points
3. **Test Yourself**: Use Practice Questions to create quizzes and track your progress
4. **Get Personalized**: Visit Adaptive Learning to give consent and receive personalized recommendations
5. **Plan Your Study**: Check Study Plan for a customized study timeline

## 📱 Responsive Design

The application adapts seamlessly to different screen sizes:
- **Desktop**: Full-featured experience with sidebar navigation
- **Tablet**: Optimized layout with collapsible sections
- **Mobile**: Touch-friendly controls and vertical stacking

## 🔒 Privacy & Security

- **Consent Required**: No personalization without explicit permission
- **Local Storage Option**: Learning data can be stored locally in your browser
- **Transparent Usage**: Clear explanations of how your data is used
- **Data Control**: Ability to withdraw consent and delete your learning data
- **No Tracking**: No third-party analytics or tracking scripts

## 🎨 Design Philosophy

Inspired by modern educational platforms, the design focuses on:
- **Cognitive Load Reduction**: Clean layouts that minimize distractions
- **Progress Visualization**: Clear indicators of your learning journey
- **Immediate Feedback**: Responsive interactions that reinforce learning
- **Accessibility**: Proper color contrast and keyboard navigation
- **Professional Aesthetic**: Trustworthy appearance suitable for academic settings

## 🤝 Contributing

This project welcomes contributions that align with its ethical mission. Please ensure any contributions:
1. Maintain the commitment to legitimate use only
2. Enhance rather than replace the learning process
3. Respect user privacy and data protection
4. Follow the existing code style and conventions

## 📄 License

MIT License - See the LICENSE file in the root directory for details.

## 🙏 Acknowledgments

Built with React, Vite, and Tailwind CSS. Inspired by the need for ethical study aids that respect academic integrity while leveraging technology to enhance learning outcomes.

---

*Developed with a commitment to academic integrity and ethical technology use.*