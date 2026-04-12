<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Database%20Connections&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Harness dynamic multi-engine database pooling loops.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=OVERVIEW&fontColor=f8fafc&fontSize=30" />

### 🛡️ Why Use the Framework's DB Wrappers?
Managing SQL pools or NoSQL schemas manually introduces memory leaks, unhandled driver exceptions, and scaling pain. `sv-nex` fixes this by abstracting MongoDB, MySQL, and Microsoft SQL into secure, auto-reconnecting helper configurations.

When you run the setup wizard (`npx sv-nex`), the orchestrator generates a configuration payload holding your DB dialect securely. When the application boots, `Implementation_Manager` detects the payload and automatically bootstraps the correct database engine globally.

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=DATABASE%20ENGINES&fontColor=f8fafc&fontSize=30" />

### MongoDB (`NE_MongoDb`)
If your `.conf` specifies MongoDB, you must establish Mongoose schemas. The framework hooks directly into standard Mongoose models but monitors the connection health centrally.

```javascript
// models/userModel.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    userId: String,
    email: String
});

module.exports = mongoose.model('Users', schema);
```

### MySQL (`NE_MySqlDb`)
For classic relational MySQL databases, bypass `pool.query` manually and use the internal wrapped executor for guaranteed promise resolutions and error trapping:

```javascript
const { NE_MySqlDb } = require('sv-nex');

const fetchUsers = async () => {
    const rawSql = "SELECT * FROM users WHERE active = 1";
    // Leverages the global pool initialized by Implementation_Manager
    const results = await NE_MySqlDb.executeQuery(rawSql);
    return results;
};
```

### Microsoft SQL (`NE_MSSqlDb`)
Connecting to heavy enterprise MS SQL servers is simplified drastically.

```javascript
const { NE_MSSqlDb } = require('sv-nex');

const lookupAccount = async (accountId) => {
    // Escaping and request execution is inherently wrapped safely
    const data = await NE_MSSqlDb.executeStoredProcedure('sp_GetAccount', { id: accountId });
    return data;
};
```

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=160&section=footer&animation=fadeIn&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Secure%20Your%20Data.&fontSize=26&fontColor=f8fafc" />

<a href="./index.md">← Back to Reference</a>

</div>
