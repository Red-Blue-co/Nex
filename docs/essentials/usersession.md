<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=User%20Session&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Secure JSON Web Tokens handling for stateless API infrastructures.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=AUTHENTICATION&fontColor=f8fafc&fontSize=30" />

### JWT Implementation Details
`UserSessions_Helper` handles cryptographic signing, expiring, tracking, and verifying JSON Web Tokens silently.

When `npx sv-nex` generates the environment payloads, it injects robust hidden hex-secrets for JWT signing. This module retrieves those secrets magically at runtime.

#### Generating a Login Session Token
When a user hits your login route with valid passwords, generate a secure token instantly:

```javascript
const { UserSessions_Helper } = require('sv-nex');

app.post('/api/login', async (req, res) => {
    // ... verified password logic

    // Sign ID into a stateful token 
    const sessionToken = await UserSessions_Helper.createToken({ 
        userId: 1, 
        role: "user" 
    });

    res.json({ token: sessionToken });
});
```

#### Verifying Protected Routes as Middleware
You can drop this helper straight into an Express route to ensure it acts as a firewall. 
When applied to global endpoints, it extracts standard `Authorization: Bearer <TOKEN>` Headers automatically!

```javascript
// A protected endpoint requiring a valid token natively
app.get('/api/dashboard', UserSessions_Helper.verifySession, (req, res) => {
    // If we land here, the Token was legally signed and hasn't expired
    
    // The decoded token contents are appended globally to the request:
    const userRole = req.decodedSessionData.role; 

    res.send({ accessed: true, role: userRole });
});
```

*(Invalid tokens natively trigger a 401 Unauthorized via `ApplicationError` gracefully).*

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
