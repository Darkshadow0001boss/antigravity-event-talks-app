# BigQuery Release Notes Explorer 🚀

A sleek, responsive web application that fetches Google BigQuery's latest release notes, allows you to search and filter them by category, and integrates a customized composer to share updates on Twitter/X with smart character count limits.

## ✨ Features

- **Live RSS Fetching**: Dynamically fetches the official Google BigQuery release notes XML feed.
- **Granular Updates**: Splits multi-update entries into distinct, shareable cards.
- **Beautiful Dashboard**: Glassmorphic, dark-mode design with real-time statistics.
- **Filtering & Search**: Instant keyword search and category filters (Features, Changes, Deprecations, Fixes, etc.).
- **Twitter/X Share Integration**: Pre-populated tweet template with smart character count, progress circle, and direct intent sharing.

## 🛠️ Tech Stack

- **Backend**: Python, Flask, Requests
- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Flexbox/Grid), JavaScript (ES6)
- **Icons & Fonts**: FontAwesome 6, Google Fonts (Outfit & Inter)

## 🚀 Getting Started

### Prerequisites

- Python 3.9+ installed on your system.

### Installation & Run

1. Clone or download this repository.
2. Initialize and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate   # Windows
   source venv/bin/activate  # macOS/Linux
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Flask application:
   ```bash
   python app.py
   ```
5. Open your browser and navigate to `http://127.0.0.1:5000`.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
