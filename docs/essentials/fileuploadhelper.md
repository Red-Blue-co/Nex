<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=File%20Uploads&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Handle multipart form data cleanly with managed streams.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=IMPLEMENTATION&fontColor=f8fafc&fontSize=30" />

### Bypassing Multipart Headaches
File uploading inherently breaks basic JSON routing because of `multipart/form-data`. `sv-nex` packages a highly tuned `UploadHelper` leveraging NodeJS `multer` perfectly formatted for memory safety and storage delegation.

#### Route Level Injection
Instead of processing streams manually in endpoints, apply the helper as Express middleware directly on the route.

```javascript
const express = require('express');
const router = express.Router();
const { UploadHelper, NE_HttpHelper } = require('sv-nex');

// Instruct the unified helper to parse EXACTLY one file field named 'avatar'
router.post('/profile/picture', UploadHelper.single('avatar'), async (req, res) => {
    try {
        // The parsed object stream is attached safely to the request
        const fileData = req.file;
        
        if (!fileData) {
            return NE_HttpHelper.send_ErrorResponse(new Error("File missing"), res);
        }

        console.log(`Saved automatically to internal cache path: ${fileData.path}`);
        
        NE_HttpHelper.send_SuccessResponse("Profile picture updated", fileData.filename, res);
    } catch (err) {
        NE_HttpHelper.send_ErrorResponse(err, res);
    }
});

module.exports = router;
```

#### Supported Middleware Hooks
The internal wrapper exports standard stream parameters:
* `UploadHelper.single('fieldname')`: Handles single file.
* `UploadHelper.array('fieldname', 5)`: Handles array batches up to N files.
* `UploadHelper.fields([{ name: 'avatar', maxCount: 1 }])`: Handles multi-field maps.

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
