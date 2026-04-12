<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=System%20Utilities&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">High-speed cryptographic hashers, date formatters, and logic gates.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=METHODS&fontColor=f8fafc&fontSize=30" />

### Fast String Interactions
`SystemUtils` provides pure synchronous calculation modules that would otherwise clutter your application code.

#### Password Verification
`sv-nex` assumes high-security paradigms for user states.

```javascript
const { SystemUtils } = require('sv-nex');

// Convert raw user passwords to secure scrambled DB hashes
const hash = SystemUtils.hashPassword("my_secret_pass");

// Checking logins (returns boolean)
const isMatch = SystemUtils.verifyPassword("my_secret_pass", userDatabaseHash);
```

#### Generators and Dates
Need a randomized transaction ID, UUID, or a strictly formatted date string for a SQL column? 

```javascript
const { SystemUtils } = require('sv-nex');

// Generates a 32 character randomized safe character string
const ticketId = SystemUtils.generateRandomId(32); 

// Formatting dates globally for MySQL TIMESTAMP columns safely
const formattedTime = SystemUtils.formatDateForDb(new Date()); 
```

> The utility belt prevents reinventing standard cryptographic interactions project-after-project. Look through `SystemUtils` whenever confronted with standard string modifications!

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
