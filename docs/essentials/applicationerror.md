<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=ApplicationError&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Format, log, and propagate API errors reliably.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=USAGE&fontColor=f8fafc&fontSize=30" />

### Global Exception Modeling
The `ApplicationError` class extends native Node errors, injecting HTTP status codes, customized message tracking, and operational validation.

Import it everywhere you throw exceptions to ensure `sv-nex` intercepts it elegantly.

#### Instantiation
```javascript
const { ApplicationError } = require('sv-nex');

// Simulating a route failing auth
function verifyPermission(user) {
    if (!user.isAdmin) {
        // Param 1: Secure User Message | Param 2: HTTP Status Code
        throw new ApplicationError("Insufficient elevation privileges.", 403);
    }
}
```

By mapping exceptions with this wrapper, your HTTP controller catch blocks can safely dump the error straight to the `NE_HttpHelper` and the client will dynamically receive a cleanly formatted JSON response rather than a broken raw NodeJS stack trace string!

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
