<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=QR%20Scanner&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Reverse-decode QR images programmatically backwards into string fragments.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=DECODING&fontColor=f8fafc&fontSize=30" />

### The `RobustHexScanner` Utility
While `HexGenerator` builds QR codes, the associated `RobustHexScanner` reads them. This is primarily useful when building endpoints that receive physical image uploads (like an attendance ticketing system or a receipt scanner) and you need the server to decipher what the printed code meant.

#### Reading raw image files
```javascript
const { RobustHexScanner } = require('sv-nex');

const processCheckIn = async (imageBufferPath) => {
    try {
        // Scans the flattened image map and reverses the graphic hash
        const decodedPayload = await RobustHexScanner.scan(imageBufferPath);
        
        console.log("The ticket contained this data:", decodedPayload);
    } catch (e) {
        console.error("The image was blurry, invalid, or contained no QR patterns.");
    }
}
```

> **Usage with `UploadHelper`:** The `RobustHexScanner` beautifully pairs with the `UploadHelper` middleware covered earlier. A client uploads an image, `UploadHelper` buffers it, and `RobustHexScanner` translates it linearly.

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
