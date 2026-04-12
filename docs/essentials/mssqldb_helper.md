<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=MS%20SQL%20Helper&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Microsoft SQL Server optimized procedure abstractions.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=ENTERPRISE%20DB&fontColor=f8fafc&fontSize=30" />

### Executing Advanced Transacts
The `NE_MSSqlDb` module interfaces with the `mssql` npm driver heavily. It simplifies connecting to localized instances or massive clustered MSSQL environments.

#### Stored Procedures (Recommended)
`sv-nex` is geared heavily towards utilizing MS SQL stored procedures natively. It transforms complex mapping down to single-line destructures:

```javascript
const { NE_MSSqlDb } = require('sv-nex');

// Notice the automated mapping parsing
const result = await NE_MSSqlDb.executeStoredProcedure('proc_ProcessBilling', {
    clientId: 4059,
    amount: 15.99
});

console.dir(result); // Outputs exact recordset mapping
```

#### Raw Executions 
Additionally, for non-procedure logic:
```javascript
const directSelect = await NE_MSSqlDb.executeQuery("SELECT * FROM Logs WHERE err_code = 404");
```

> **Performance Check:** Like the other DB helpers, MS SQL configuration is entirely handled invisibly within `.conf` dynamically allowing password swapping securely in CI/CD without touching code.

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
