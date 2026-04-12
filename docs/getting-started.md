<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Getting%20Started&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Scaffold, execute, and launch your sv-nex infrastructure in under 60 seconds.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=INSTALLATION&fontColor=f8fafc&fontSize=30" />

### 📦 Global or Local Node Package
Because `sv-nex` implements fully automated build/obfuscation configurations inside NPM, the package is exceptionally lightweight. 

To download it dynamically inside an existing project:
```bash
npm install sv-nex
```

To install the framework binaries globally so you can instantiate databases instantly on any hard drive volume:
```bash
npm install -g sv-nex
```

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=THE%20CLI%20WIZARD&fontColor=f8fafc&fontSize=30" />

### ⚡ Rapid Bootstrapping
Rather than spending hours writing `config`, `routes`, `app.js`, and `.env` logic manually, `sv-nex` builds it natively through interactive terminal prompts.

Navigate to an empty project folder and simply invoke the initialization binary:

```bash
npx sv-nex
```

> **Note:** The bootstrapper requires the terminal interface, as it will prompt you for server ports, database selection (Mongo/SQL), and credentials.

#### What Happens Under the Hood?
The framework automatically constructs the following environment securely:

1. **`conf` Module:** Creates an encrypted or securely parsed configuration payload without risking typical `.env` commits.
2. **`package.json` Setup:** Installs Express, Multer, Socket, Mongoose, and internal libraries silently.
3. **`index.js` Controller:** Scaffolds the runtime orchestrator pointing directly to:
   ```javascript
   const { Implementation_Manager } = require('sv-nex');
   await Implementation_Manager.initializeImplementation(); 
   ```
4. **`routesLoader.js`:** Prepares a `/routers` mapping array natively bypassing monolithic express structures.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=160&section=footer&animation=fadeIn&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Ready%20to%20Build!&fontSize=26&fontColor=f8fafc" />

<a href="./index.md">← Back to Reference</a>

</div>
