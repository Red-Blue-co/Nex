<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=MySQL%20DB%20Helper&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">High performance, auto-reconnecting MySQL connection pooling.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=POOL%20MANAGEMENT&fontColor=f8fafc&fontSize=30" />

### Why `NE_MySqlDb`?
When connecting Node to MySQL, lost connections and "pool exhausted" errors are notorious. The `NE_MySqlDb` helper utilizes the highly-optimized `mysql2` underlying driver natively wrapped in an auto-healing connection pool manager.

It strictly utilizes standard Promises so you never have to deal with legacy query callbacks.

#### 1. Checking State
Ensure the server didn't silently drop the database before executing massive routines:

```javascript
const { NE_MySqlDb } = require('sv-nex');

if (!NE_MySqlDb.isConnected()) {
    throw new Error("Critical MySQL disconnection detected.");
}
```

#### 2. Querying Safely
Execute perfectly standard raw MySQL statements natively:

```javascript
const lookupUser = async (email) => {
    // Escaping must be handled by parameterized queries internally or via the query string securely
    const dynamicQuery = `SELECT * FROM tbl_users WHERE email = '${email}' LIMIT 1`;
    
    // Automatically uses a freed connection from the pool, then releases it
    const row = await NE_MySqlDb.executeQuery(dynamicQuery);
    return row;
};
```

#### Security Considerations
`NE_MySqlDb` operates optimally. However, because it accepts raw formatted SQL command strings, it is crucial that developers explicitly sanitize client-provided data (like the `email` variable inside the example above) to avoid SQL injection attacks before passing it to `executeQuery`.

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
