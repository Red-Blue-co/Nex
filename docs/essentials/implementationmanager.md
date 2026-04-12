<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Implementation%20Manager&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">The central engine powering the entire sv-nex framework lifecycle.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=INITIALIZATION&fontColor=f8fafc&fontSize=30" />

### The Framework Core
`Implementation_Manager` is the master orchestrator. When your backend process boots, it controls the order of operations, ensuring `.conf` payloads decrypt, global databases mount, and external API variables become globally accessible.

#### `initializeImplementation()`
This is universally called first in any `sv-nex` project.
```javascript
const { Implementation_Manager } = require('sv-nex');

await Implementation_Manager.initializeImplementation(); 
// At this stage, all SQL/Mongo loops are bound internally
```

#### `initializeHttpAndStartServer(routesCallback)`
Called immediately after the implementation resolves. It accepts a callback carrying the native Express `app` object so you can map standard endpoints natively.

```javascript
Implementation_Manager.initializeHttpAndStartServer((app) => {
    app.post('/custom-webhook', (req, res) => {
        res.send("Webhook connected.");
    });
});
```

### Automatic Websocket Injection
Under the hood, `initializeHttpAndStartServer()` automatically wraps your Express payload in `http.createServer()` and injects `Socket.io` concurrently! Because of this manager, you never have to manually wire WebSockets to Express connections again.

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
