// ---------------------------
// server.js
// ---------------------------
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// โหลดค่าจาก .env
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// สำหรับเสิร์ฟหน้าเว็บ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "Main.html"));
});

// ✅ Route หลัก รับข้อมูลจาก app.js (ซึ่งดึงมาจาก Lambda)
app.post("/weather", async (req, res) => {
    try {
        // app.js จะส่ง JSON ทั้งก้อนมาทาง body เช่น { data: { city, weather: {...} } }
        const weatherData = req.body.data?.weather;
        // ดึงชื่อเมืองให้ครอบคลุมทุกกรณี
        const city =
            req.body.data?.city ||
            req.body.city ||
            req.body.data?.weather?.name ||
            "ไม่ทราบชื่อเมือง";

        if (!weatherData) {
            return res.status(400).json({ message: "ไม่พบข้อมูลอากาศใน request body" });
        }

        // 📍 ดึงค่าจากข้อมูลอากาศที่ app.js ส่งมา
        const condition = weatherData.weather[0].description;
        const temp = weatherData.main.temp;
        const humidity = weatherData.main.humidity;
        const wind = weatherData.wind.speed;

        // 1️⃣ สร้าง Prompt สำหรับส่งให้ OpenAI
        const prompt = `
        เมือง: ${city}
        สภาพอากาศ: ${condition}
        อุณหภูมิ: ${temp}°C
        ความชื้น: ${humidity}%
        ความเร็วลม: ${wind} m/s
        กรุณาเขียนคำแนะนำกิจกรรม สถานที่ท่องเที่ยวหรือการเตรียมตัวให้เหมาะกับสภาพอากาศ (ไม่เกิน 50 คำ)
        แนบลิ้งค์สถานที่ที่แนะนำในบริเวณดังกล่าวถ้ามี แต่ถ้าไม่มีลิงค์ให้ข้ามไปไม่ต้องใส่ก็ได้
        ตอบเป็นภาษาไทย
        `;

        // เรียกใช้ Gemini API
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                }),
            }
        );

        const geminiData = await geminiRes.json();

        console.log("🌐 Gemini response:", JSON.stringify(geminiData, null, 2));

        // ถ้ามีข้อความจาก Gemini
        let advice =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

        // แปลงรูปแบบ Markdown ของ Gemini
        if (advice) {
            // ลบ bullet
            advice = advice.replace(/\n\s*\*/g, " •"); // เปลี่ยน * เป็น •
            advice = advice.replace(/\*\s*/g, ""); // ลบ * หน้าข้อความถ้ามี

            // แปลง Markdown link
            advice = advice.replace(
                /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
                '<a href="$2" target="_blank" class="text-blue-600 underline">$1</a>'
            );

            // แปลงกรณีที่เป็น [https://example.com] → <a href="...">...</a>
            advice = advice.replace(
                /\[(https?:\/\/[^\s\]]+)\]/g,
                '<a href="$1" target="_blank" class="text-blue-600 underline">$1</a>'
            );

            // จัดเว้นบรรทัดระหว่างเนื้อหาและรายการแนะนำ
            advice = advice.replace(/\n+/g, " "); // รวมทุกบรรทัดให้เป็นบรรทัดเดียว
            advice = advice.replace(/\s{2,}/g, " "); // ลบช่องว่างเกิน
        }

        // ------------------------------
        // fallback
        // ------------------------------
        if (!advice) {
            const lower = condition.toLowerCase();
            if (condition.includes("ฝน") || lower.includes("rain")) {
                advice = "วันนี้ฝนตก เหมาะกับกิจกรรมในร่ม และอย่าลืมพกร่มก่อนออกไปข้างนอกด้วยล่ะ";
            } else if (condition.includes("เมฆ") || lower.includes("cloud")) {
                advice = "อากาศครึ้ม ถ้าจะออกไปข้างนอกก็พกร่มติดตัวไว้สักหน่อยก็ดีนะ";
            } else if (lower.includes("clear")) {
                advice = "อากาศแจ่มใส เหมาะกับการเดินเล่น ถ่ายรูป หรือชมวิวกลางแจ้ง";
            } else if (temp > 30) {
                advice = "อากาศร้อน แนะนำเที่ยวห้างหรือคาเฟ่ติดแอร์และอย่าลืมหาอะไรเย็นๆ กินนะ";
            } else if (temp < 20) {
                advice = "อากาศเย็น เหมาะกับการไปเที่ยวภูเขาหรือร้านกาแฟบรรยากาศดี และอย่าลืมทำร่างการให้อุ่นด้วยนะ";
            } else {
                advice = "อากาศวันนี้ปกติ ขอให้วันนี้เป็นวันที่ดีนะ!";
            }
        }

        // ส่งผลลัพธ์กลับไปยังเว็บ
        res.json({
            data: { city, weather: weatherData, advice },
            is_from_cache: false,
        });
    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// ---------------------------
// Start Server
// ---------------------------
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
