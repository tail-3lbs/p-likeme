# P-LikeMe - Web Development Learning Project

This is a **personal learning project** where I am practicing web development skills by studying and recreating the visual style of [PatientsLikeMe](https://www.patientslikeme.com).

## Disclaimer

**This project is for educational purposes only.**

- I am a beginner learning HTML, CSS, and JavaScript
- I am studying the design patterns and layout techniques used by PatientsLikeMe
- I do not own, nor do I claim any rights to, the original design, branding, or content of PatientsLikeMe
- This project is not affiliated with, endorsed by, or connected to PatientsLikeMe in any way
- No proprietary code, assets, or content from PatientsLikeMe are used in this project

## Important Notice

If you are a representative of PatientsLikeMe or believe this project infringes on any rights, **please contact me immediately** and I will:

1. Remove this repository
2. Delete all related code and assets
3. Comply with any reasonable requests

**Contact**: Please open an issue on this repository or reach out through GitHub.

## How to Run

### Prerequisites

- Node.js (v16 or higher)

### Installation & Setup

1. Clone the repository and navigate to the project folder:
   ```bash
   cd p-likeme
   ```

2. Install dependencies:
   ```bash
   cd server
   npm install
   ```

3. Start the server:
   ```bash
   node server.js
   ```

4. Open your browser and visit:
   ```
   http://localhost:3000
   ```

### Restart the Server

If you need to restart the server (e.g., after code changes):

```bash
# Kill existing server and start fresh
lsof -ti:3000 | xargs kill -9; node server.js
```

If using PM2:
```bash
pm2 restart p-likeme
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed origins for CORS (comma-separated for multiple) | `http://localhost:3000,http://47.99.111.141:3000` |
| `JWT_SECRET` | Secret key for JWT tokens | (built-in default) |
| `PORT` | Server port | `3000` |

Example for custom CORS origin:
```bash
# Single origin
CORS_ORIGIN=http://your-server-ip:3000 node server.js

# Multiple origins
CORS_ORIGIN=http://localhost:3000,http://192.168.1.100:3000 node server.js
```

## What This Project Contains

- My own HTML/CSS/JS code written while learning
- Approximate visual recreations for study purposes
- No actual PatientsLikeMe data, user information, or proprietary assets

## License

This project's code is under the MIT License (see LICENSE file). However, this license applies **only to my original code** - it does not grant any rights to PatientsLikeMe's designs, trademarks, or intellectual property.

---

*This is a learning exercise. Please respect intellectual property rights.*
