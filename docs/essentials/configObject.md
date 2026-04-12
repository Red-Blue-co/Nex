<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=ConfigObject&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">System configuration payload management and extraction.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=OVERVIEW&fontColor=f8fafc&fontSize=30" />

### The Global State Map
While pure Node variables use `process.env`, `sv-nex` relies on the `global.env` / `NE_ConfigObject` ecosystem. This is critical because the CLI Wizard parses a structured `.conf` file and injects complex JSON configurations securely out of harm's way.

If you ever need to retrieve system-level settings, connection strings, or variables explicitly loaded by the framework boot process, you interface with this configuration module.

#### Standard Retrieval
```javascript
const { NE_ConfigObject } = require('sv-nex');

const retrieveTokens = () => {
   // Retrieves parsed configuration blocks without touching file systems
   const securitySettings = NE_ConfigObject.get('SECURITY_TOKENS');
   const mainDbString = NE_ConfigObject.get('MONGO_URI');
   
   return securitySettings.activeKey;
};
```

> **Warning:** Do not modify the `NE_ConfigObject` structure dynamically at runtime in production, as it acts as the singular source of truth for the Database and Auth classes.

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
