<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=160&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=QR%20Code%20Generator&fontSize=48&fontColor=f8fafc&fontAlign=50&fontAlignY=55" />

<strong style="color:#94a3b8;">Programmatically draw, style, and export physical QR logic instantly.</strong>

<br/>

</div>

---

<img src="https://capsule-render.vercel.app/api?type=rect&height=120&color=0:0f0505,25:1a0a0a,50:ef4444,75:3b82f6,100:000000&text=GENERATION&fontColor=f8fafc&fontSize=30" />

### Dynamically creating Data Blocks
The `HexGenerator` securely processes data strings, links, or JSON fragments and seamlessly renders them into Base64 format images or directly into the file system.

This avoids relying on slow third-party REST API QR generators that possess rate limits. 

#### Creating an encoded Base64 QR Image
Perfect for streaming an image straight to the browser React/Vue frontend:

```javascript
const { HexGenerator } = require('sv-nex');

const createTicket = async () => {
    const hiddenData = JSON.stringify({ eventId: 10, userId: 777 });
    
    // Generates the image string in milliseconds
    const imageString = await HexGenerator.generateBase64(hiddenData);
    
    return imageString; // Usually formatted as 'data:image/png;base64,...'
};
```

This utility natively handles pixel scaling and error-correction levels depending on the dataset density passed.

---

<div align="center">
<a href="../index.md">← Back to Reference</a>
</div>
