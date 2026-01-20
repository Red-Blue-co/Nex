"use strict";

const { createCanvas } = require("canvas");

class HexGenerator {
    /**
     * @param {Object} options Configuration object
     * @param {string} options.shape 'cir' (default), 'sq', or 'hex'
     * @param {number} options.eccLevel 
     * 1 = Raw (High Cap - 1 dot per trit)
     * 2 = Standard (3x Vote - 3 dots per trit - Default)
     * 3 = Max Security (5x Vote - 5 dots per trit)
     */
    constructor(options = {}) {
        this.size = 500;
        
       
        this.shape = options.shape || 'cir'; 
        this.eccLevel = options.eccLevel || 2; 
        
       
        this.step = 12;
        this.dotRadius = 4; 

        this.ANCHORS = [
            { color: "#ef4444", start: 200, end: 250, type: "solid" },   
            { color: "#3b82f6", start: 290, end: 340, type: "dotted" },
            { color: "#22c55e", start: 20,  end: 70,  type: "dashed" },
            { color: "#facc15", start: 110, end: 160, type: "double" }
        ];
    }
    estimateCapacity() {
        const gridLength = this.getGrid().length;
        const reservedTrits = 5; 
        const usableDots = gridLength - reservedTrits;

        
        let divider = 1;
        if (this.eccLevel === 2) divider = 3;
        if (this.eccLevel === 3) divider = 5;
        const maxTrits = Math.floor(usableDots / divider);
        const maxChars = Math.floor(maxTrits / 5);
        return maxChars;
    }

    textToTrits(text) {
        const rawTrits = text.split('')
            .map(c => {
                let val = c.charCodeAt(0);
                return val.toString(3).padStart(5, '0');
            })
            .join('');
        let eccTrits = "";
        const repeats = (this.eccLevel === 1) ? 1 : (this.eccLevel === 3 ? 5 : 3);

        for (let t of rawTrits) {
            eccTrits += t.repeat(repeats);
        }
        return eccTrits;
    }

    getPointHash(x, y) {
        let h = Math.imul(x, 374761393);
        h = Math.imul(h ^ y, 668265263);
        h = Math.imul(h ^ (h >>> 15), 2246822519);
        h = h ^ (h >>> 13);
        return h >>> 0; 
    }

    getGrid() {
        const grid = [];
        const cx = this.size / 2;
        const cy = this.size / 2;
        const radius = this.size * 0.40;
    
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

    drawAnchors(ctx) {
        const cx = this.size / 2;
        const cy = this.size / 2;
        const anchorRadius = this.size * 0.45;
        const borderRadius = this.size * 0.425;

        ctx.beginPath();
        ctx.arc(cx, cy, borderRadius, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.lineCap = "round";

        for (let a of this.ANCHORS) {
            ctx.save();
            ctx.strokeStyle = a.color;
            const start = (a.start * Math.PI) / 180;
            const end = (a.end * Math.PI) / 180;

            ctx.beginPath();
            if (a.type === "double") {
                ctx.lineWidth = 3; 
                ctx.setLineDash([]);
                ctx.arc(cx, cy, anchorRadius - 3.5, start, end);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx, cy, anchorRadius + 3.5, start, end);
            } 
            else {
                ctx.lineWidth = 10;
                if (a.type === "dotted") ctx.setLineDash([0, 15]);
                else if (a.type === "dashed") ctx.setLineDash([15, 15]);
                else ctx.setLineDash([]);
                ctx.arc(cx, cy, anchorRadius, start, end);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    // --- UPDATED DRAW DOT (3 STATES) ---
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x 
     * @param {number} y 
     * @param {string} val '0' (Empty), '1' (Hollow), '2' (Full)
     */
    drawDot(ctx, x, y, val) {
        if (val === '0') return; // Empty = Background

        ctx.beginPath();
        if (this.shape === 'sq') {
            const d = this.dotRadius * 2;
            ctx.rect(x - this.dotRadius, y - this.dotRadius, d, d);
        } 
        else if (this.shape === 'hex') {
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const px = x + this.dotRadius * Math.cos(angle);
                const py = y + this.dotRadius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        } 
        else {
            ctx.arc(x, y, this.dotRadius, 0, Math.PI * 2);
        }

        if (val === '2') {
          
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();
        } else if (val === '1') {
        
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 1.5;        
            ctx.stroke();
        }
    }

    async generateImageBuffer(text) {
        try {
            const canvas = createCanvas(this.size, this.size);
            const ctx = canvas.getContext("2d");

            
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(0, 0, this.size, this.size);

            this.drawAnchors(ctx);

            
            const trits = this.textToTrits(text) + "00000"; 
            const grid = this.getGrid();

            const maxChars = this.estimateCapacity();
            console.log(`[HexGen] Level: ${this.eccLevel} | Usage: ${text.length} / ${maxChars} chars | Mode: Ternary`);

            if (trits.length > grid.length) {
                console.warn("⚠️ Data too long! It will be truncated.");
            }

            for (let i = 0; i < grid.length; i++) {
                const p = grid[i];
                const val = (i < trits.length) ? trits[i] : '0';
                
                this.drawDot(ctx, p.x, p.y, val);
            }

            return canvas.toBuffer("image/png");

        } catch (err) {
            console.error("Generator Error:", err);
            throw err;
        }
    }
}

module.exports = HexGenerator;