"use strict";

const { createCanvas, loadImage } = require("canvas");

class RobustHexScanner {
    /**
     * @param {Object} options
     * @param {number} options.eccLevel 
     * 1 = Raw (High Cap)
     * 2 = Standard (3x Vote - Default)
     * 3 = Max Security (5x Vote)
     */
    constructor(options = {}) {
        this.size = 500; 
        this.step = 12;  
        // MUST match the Generator's setting!
        this.eccLevel = options.eccLevel || 2; 
    }

    getPointHash(x, y) {
        let h = Math.imul(x, 374761393);
        h = Math.imul(h ^ y, 668265263);
        h = Math.imul(h ^ (h >>> 15), 2246822519);
        h = h ^ (h >>> 13);
        return h >>> 0; 
    }

    // Standard grid generator (Unrotated)
    getRawGrid() {
        const grid = [];
        const cx = this.size / 2;
        const cy = this.size / 2;
        const radius = this.size * 0.40;
        
        // HEX PACKING CONSTANTS
        const rowHeight = this.step * 0.866; 
        let rowCount = 0;

        for (let y = 0; y < this.size; y += rowHeight) {
            const xOffset = (rowCount % 2 === 0) ? 0 : (this.step / 2);
            
            for (let x = -this.step; x < this.size + this.step; x += this.step) {
                const actualX = x + xOffset;
                const dist = Math.sqrt((actualX - cx) ** 2 + (y - cy) ** 2);
                
                if (dist < radius) {
                    grid.push({ x: actualX, y: y });
                }
            }
            rowCount++;
        }

        grid.sort((a, b) => {
            return this.getPointHash(a.x, a.y) - this.getPointHash(b.x, b.y);
        });

        return grid;
    }


    detectRotation(ctx) {
        const cx = this.size / 2;
        const cy = this.size / 2;
        const imageData = ctx.getImageData(0, 0, this.size, this.size);
        
        // Scan a "Donut" area where anchors live
        const rMin = this.size * 0.41; // 205px
        const rMax = this.size * 0.49; // 245px

        const blobs = [];
        const visited = new Int8Array(this.size * this.size);

       
        const isBright = (x, y) => {
            const idx = (y * this.size + x) * 4;
            const r = imageData.data[idx];
            const g = imageData.data[idx+1];
            const b = imageData.data[idx+2];
            return ((r + g + b) / 3) > 50; 
        };

      
        for (let y = 0; y < this.size; y += 2) {
            for (let x = 0; x < this.size; x += 2) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx*dx + dy*dy);

                
                if (dist > rMin && dist < rMax && !visited[y*this.size+x] && isBright(x, y)) {
                    
                    // Found a bright spot! Start Flood Fill to find size.
                    let count = 0;
                    let sumX = 0, sumY = 0;
                    const stack = [{x, y}];
                    visited[y*this.size+x] = 1;

                    while(stack.length) {
                        const p = stack.pop();
                        sumX += p.x; 
                        sumY += p.y; 
                        count++;
                        
                        // Check neighbors (Up/Down/Left/Right)
                        const neighbors = [[2,0],[-2,0],[0,2],[0,-2]];
                        for (let n of neighbors) {
                            const nx = p.x + n[0];
                            const ny = p.y + n[1];
                            
                            if (nx > 0 && ny > 0 && nx < this.size && ny < this.size && !visited[ny*this.size+nx]) {
                                const d2 = Math.sqrt((nx-cx)**2 + (ny-cy)**2);
                                if (d2 > rMin && d2 < rMax && isBright(nx, ny)) {
                                    visited[ny*this.size+nx] = 1;
                                    stack.push({x: nx, y: ny});
                                }
                            }
                        }
                    }

                    // If it's big enough, it's an anchor
                    if (count > 50) {
                        blobs.push({
                            x: sumX / count,
                            y: sumY / count,
                            mass: count
                        });
                    }
                }
            }
        }

        if (blobs.length === 0) {
            console.log("[Scanner] Warning: Anchor not found. Assuming 0°.");
            return 0;
        }

        // The Red Anchor is always the LARGEST (Solid Line = Most Mass)
        blobs.sort((a, b) => b.mass - a.mass);
        const redAnchor = blobs[0];

        // Calculate Angle
        const currentAngle = Math.atan2(redAnchor.y - cy, redAnchor.x - cx);
        const targetAngle = (225 * Math.PI) / 180; 

        return currentAngle - targetAngle;
    }

    
    decodeBinary(bits) {
       
        if (this.eccLevel === 1) {
            return this.binToText(bits);
        }

        
        if (this.eccLevel === 3) {
            let cleanBits = "";
            for (let i = 0; i < bits.length; i += 5) {
                const chunk = bits.substring(i, i + 5);
                let ones = 0;
                for (let c of chunk) if(c==='1') ones++;
                
                cleanBits += (ones >= 3) ? "1" : "0";
            }
            return this.binToText(cleanBits);
        }

        
        let cleanBits = "";
        for (let i = 0; i < bits.length; i += 3) {
            const chunk = bits.substring(i, i + 3);
            let ones = 0;
            if (chunk[0] === '1') ones++;
            if (chunk[1] === '1') ones++;
            if (chunk[2] === '1') ones++;
            
            cleanBits += (ones >= 2) ? "1" : "0";
        }
        return this.binToText(cleanBits);
    }

    binToText(bits) {
        let text = "";
        for (let i = 0; i < bits.length; i += 8) {
            const byte = bits.substring(i, i + 8);
            if (byte.length < 8) break;
            const val = parseInt(byte, 2);
            if (val === 0) break; 
            if (val >= 32 && val <= 126) {
                text += String.fromCharCode(val);
            }
        }
        return text;
    }

    async decodeFromBuffer(buffer) {
        try {
            const img = await loadImage(buffer);
            const canvas = createCanvas(this.size, this.size);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, this.size, this.size);

            
            const rotationRad = this.detectRotation(ctx);

       
            const rawGrid = this.getRawGrid();
            const cos = Math.cos(rotationRad);
            const sin = Math.sin(rotationRad);
            const cx = this.size / 2;
            const cy = this.size / 2;
            const grid = rawGrid.map(p => {
                const dx = p.x - cx;
                const dy = p.y - cy;
                return {
                    x: dx * cos - dy * sin + cx,
                    y: dx * sin + dy * cos + cy
                };
            });

            const imageData = ctx.getImageData(0, 0, this.size, this.size);
            let bits = "";

            for (let p of grid) {
                if (p.x < 0 || p.x >= this.size || p.y < 0 || p.y >= this.size) {
                    bits += "0"; 
                    continue;
                }

                const idx = (Math.round(p.y) * this.size + Math.round(p.x)) * 4;
                const r = imageData.data[idx]; 
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];
                const brightness = (r + g + b) / 3;
                bits += (brightness > 80) ? "1" : "0";
            }
            const text = this.decodeBinary(bits);

            return {
                success: true,
                payload: text,
                meta: { method: "smart_blob_voting", rotation: rotationRad, ecc: this.eccLevel }
            };

        } catch (err) {
            console.error("Scanner Error:", err);
            return { success: false, reason: err.message };
        }
    }
}

module.exports = RobustHexScanner;