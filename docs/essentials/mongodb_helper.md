<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=Mongo%20DB%20Helper&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Abstracted Mongoose schema routing and NoSQL caching.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=NOSQL%20POOLS&fontColor=f8fafc&fontSize=30" />

### Mongoose Connection Wrapping
The `NE_MongoDb` module is automatically hydrated by the `Implementation_Manager` if your Configuration Wizard selected MongoDB as the primary engine. 

While SQL variants use direct raw query helper strings in `sv-nex`, the Mongo helper prefers the structural rigidity of standard Mongoose schemas. Therefore, `NE_MongoDb` handles the exact moment of connection, connection tracking, and authentication parsing.

#### Checking Operational State
If you are running multi-database structures where you expect Mongo to be offline occasionally, check connections locally before parsing heavy logic:

```javascript
const { NE_MongoDb } = require('sv-nex');

if (!NE_MongoDb.isConnected()) {
    console.warn("Mongo is actively degraded or disconnected!");
}
```

Once connected during boot, import your models natively:

```javascript
const UserModel = require('../models/user');

const data = await UserModel.find({ rank: 'admin' });
```

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
