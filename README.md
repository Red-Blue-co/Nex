<div align="center">

<!-- STATIC HEADING WITH DARK‑NEON FLOATING STYLE -->
<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Nex%20(Node%20Helper)&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<!-- BADGES (SIGNATURE ORDER) -->
<p>
  <img src="https://img.shields.io/badge/Node.js-3b82f6?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Website-sherin.fun-eab308?style=for-the-badge&logo=firefox&logoColor=white" />
</p>

<strong style="color:#94a3b8;">Robust utility classes and functions to streamline Node.js development workflows.</strong>

<br/>

</div>

---

<!-- ABOUT -->
<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=ABOUT%20NEX&fontColor=f8fafc&fontSize=30" />

**Nex** (formerly `node_helper`) is a comprehensive backend utility library designed to simplify common Node.js tasks.  
It provides a unified interface for handling:

- Multi‑database connections  
- HTTP & WebSocket servers  
- Email dispatching  
- File uploads  
- Error handling  
- Authentication & sessions  
- QR code generation & scanning  
- Common utility functions  

Built for developers who want **clean, modular, scalable backend architecture**.

---

<!-- FEATURES -->
<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=FEATURES&fontColor=f8fafc&fontSize=30" />

### 🚀 Core Features

- **Multi‑Database Support**  
  MySQL, MongoDB, and MSSQL wrappers with unified access patterns.

- **HTTP & WebSocket Server**  
  Express + Socket.io for real‑time and REST APIs.

- **Global Error Handling**  
  Centralized `ApplicationError` system for consistent responses.

- **Authentication & Sessions**  
  JWT utilities + session tracking.

- **File Uploads**  
  Simplified file handling via `multer`.

- **Email Services**  
  SMTP wrapper using `nodemailer`.

- **QR Code Tools**  
  Generate and decode QR codes.

- **Utility Helpers**  
  Encryption, hashing, date tools, and more.

---

<!-- INSTALLATION -->
<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=INSTALLATION&fontColor=f8fafc&fontSize=30" />

```bash
# Install globally or locally via NPM
npm install @sherinv/nexs

# Or scaffold a fresh project instantly
npx @sherinv/nexs
```

---

<!-- USAGE -->
<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=USAGE&fontColor=f8fafc&fontSize=30" />

### 1. The Automated CLI Wizard (Recommended)

Forget configuring database variables manually! The framework ships with a powerful interactive command-line utility. Just spin up an empty folder and run:

```bash
npx @sherinv/nexs
```

**The wizard instantly performs the followering heavy lifting:**
1. Generates `package.json` configurations and connects your entry paths.
2. Triggers an Interactive Prompt asking for your preferred **Database Engine** (MySQL, Mongo, or MsSQL).
3. Securely establishes your network ports and database credentials dynamically.
4. Generates a `.conf` environment payload invisibly without hardcoding passwords into JavaScript.
5. Scaffolds a functioning HTTP routing structure (`/routes/ping`) testing the Express connection directly out of the box!

Once the bootstrap completes, simply type:
```bash
npm start
```
Your server will instantly spin up natively mapping all databases instantly.

### 2. Manual Integration (Non-CLI)

If you're hooking Nexs into a pre-existing project instead of making a new one, you can integrate it manually using the standard `Implementation_Manager`:

```javascript
const { Implementation_Manager } = require('@sherinv/nexs');

// 1. Define your custom app routing logic
const routes = (app) => {
  app.get('/', (req, res) => res.send('Nexs Framework is deeply connected!'));
};

(async () => {
    // 2. Initialize databases, caches, and read configs dynamically
    await Implementation_Manager.initializeImplementation();

    // 3. Boot HTTP server mapping the routes directly 
    Implementation_Manager.initializeHttpAndStartServer(routes);
})();
```

---

<!-- MODULES -->
<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=MODULES&fontColor=f8fafc&fontSize=30" />

| Module | Description |
| :--- | :--- |
| **`ApplicationError`** | Standardized error classes and log levels. |
| **`Implementation_Manager`** | Initializes DBs and starts HTTP/WebSocket servers. |
| **`NE_EmailHelper`** | SMTP email sending wrapper. |
| **`UploadHelper`** | File upload management. |
| **`UserSessions_Helper`** | Session and login state tracking. |
| **`MySQL / Mongo / MsSQL`** | Database helpers for queries and connections. |
| **`HexGenerator` / `RobustHexScanner`** | QR code generation and decoding tools. |

---
<!-- LICENSE -->
<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=LICENSE&fontColor=f8fafc&fontSize=30" />

This project is licensed under the **Red-Blue-co License**.

---

<div align="center">

<img src="https://img.shields.io/badge/Built%20with%20❤️%20by-Sherin%20Varghese-ef4444?style=flat-square" />

<!-- FOOTER -->
<img src="https://capsule-render.vercel.app/api?type=waving&height=160&section=footer&animation=fadeIn&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Red%20Blue%20Co%20Signature&fontSize=26&fontColor=f8fafc" />

</div>
