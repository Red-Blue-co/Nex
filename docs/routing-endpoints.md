<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Routing%20%26%20Endpoints&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Declutter Express with scalable, intelligent endpoint modularity.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=MANAGING%20EXPRESS&fontColor=f8fafc&fontSize=30" />

### 🔀 Connecting the Request Bus
Instead of burying `app.use()` and `app.get()` inside monolithic files, `sv-nex` separates concerns entirely via the `Implementation_Manager.initializeHttpAndStartServer()` hook.

By isolating the routes block, your `index.js` stays clean and acts purely as an enforcer.

#### 1. Define the Global Router Function
When `sv-nex` runs the HTTP server, it requests a callback containing the active `app` instance. You just inject your endpoints directly inside:

```javascript
// index.js

const { Implementation_Manager } = require('sv-nex');

const serverRoutes = (app) => {
    
    // Core Health Check
    app.get('/ping', (req, res) => {
        res.status(200).json({ system: 'Operational' });
    });

    // Delegate deep modular controllers
    app.use('/api/v1/users', require('./controllers/userController'));
    app.use('/api/v1/auth', require('./controllers/authController'));
};
```

#### 2. Execute via Implementation Engine
Simply pass the method reference into the orchestrator:

```javascript
(async () => {
    // Spin up databases via the `.conf` configuration layer internally
    await Implementation_Manager.initializeImplementation();
    
    // Connect HTTP and WebSocket routing simultaneously
    Implementation_Manager.initializeHttpAndStartServer(serverRoutes);
})();
```

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=INTELLIGENT%20HANDLERS&fontColor=f8fafc&fontSize=30" />

### 🌐 Secure Endpoint Patterns
Now that routing is connected, your individual controller logic requires reliable formatting. `sv-nex` provides **`NE_HttpHelper`** and **`global.error`** native mapping.

Notice how errors and responses are completely destructured away from the endpoint:

```javascript
// userController.js
const express = require('express');
const router = express.Router();
const { NE_HttpHelper, ApplicationError } = require('sv-nex');

router.post('/create', async (req, res, next) => {
    try {
        const payload = req.body;

        if (!payload.email) {
             // Let sv-nex standardized exception handling deal with formatting
            throw new ApplicationError("Email is critically missing", 400);
        }

        // Return a perfectly structured JWT response globally 
        NE_HttpHelper.send_SuccessResponse(
            "Account generated dynamically", 
            { userId: 124 }, 
            res
        );

    } catch (err) {
        NE_HttpHelper.send_ErrorResponse(err, res);
    }
});

module.exports = router;
```

> **Security Note:** Wrapping failures in `send_ErrorResponse()` intrinsically blocks stack-trace leakage to clients across production domains.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=160&section=footer&animation=fadeIn&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Route%20Faster.%20Code%20Smarter.&fontSize=26&fontColor=f8fafc" />

<a href="./index.md">← Back to Reference</a>

</div>
