// --- 1. [❗️สำคัญมาก❗️] แก้ไข URL นี้ ---
//
//    ให้คุณ "วาง" Invoke URL ของ API Gateway (ที่ได้จาก Phase 1.4)
//    ลงใน "" นี้
//    (มันจะหน้าตาประมาณ: [https://xxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod](https://xxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod))
//
const API_BASE_URL = "https://tlx6g1els4.execute-api.us-east-1.amazonaws.com/prod"; // <--- ❗️❗️ วาง URL ของคุณที่นี่ (ไม่ต้องมี / ต่อท้าย)


// --- 2. สร้าง Endpoint URLs ---
const WEATHER_API_URL = `${API_BASE_URL}/weather`;   // POST
const TRENDING_API_URL = `${API_BASE_URL}/trending`; // GET
const FORECAST_API_URL = `${API_BASE_URL}/forecast`; // GET

// --- 3. เชื่อมต่อกับ HTML Elements ---
document.addEventListener('DOMContentLoaded', () => {
    // หา Elements ทั้งหมด
    const cityInput = document.getElementById('city-input');
    const searchButton = document.getElementById('search-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultsContainer = document.getElementById('results-container');
    const weatherResults = document.getElementById('weather-results');
    const trendingTags = document.getElementById('trending-tags');
    const forecastContainer = document.getElementById('forecast-container');

    // --- 4. เรียก "เมืองยอดฮิต" (Trending) ทันทีเมื่อหน้าโหลด ---
    fetchTrendingCities();

    // --- 5. ตั้งค่า Event Listeners ---
    searchButton.addEventListener('click', handleSearch);
    cityInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });

    // --- 6. ฟังก์ชันควบคุมหลัก (เมื่อกดค้นหา) ---
    async function handleSearch() {
        const city = cityInput.value.trim();
        const resultsContainer = document.getElementById("results-container");

        if (!city) {
            alert("กรุณาพิมพ์ชื่อเมือง");
            return;
        }

        // 1. เตรียม UI
        resultsContainer.style.display = 'none'; // ซ่อนผลลัพธ์เก่า
        loadingSpinner.style.display = 'block'; // โชว์ Spinner
        searchButton.disabled = true;

        // 2. เรียก API ทั้งสองตัวพร้อมกัน
        // เราจะเรียก fetchWeather ก่อน และถ้าสำเร็จ ค่อยเรียก fetchForecast
        try {
            // 2.1 เรียกอากาศปัจจุบัน
            const weatherData = await fetchWeather(city);
            displayWeather(weatherData.data, weatherData.is_from_cache);

            // 2.2 ถ้าสำเร็จ, เรียกพยากรณ์อากาศ
            // (เราส่ง city ไปใน query string)
            const forecastData = await fetchForecast(city);
            displayForecast(forecastData.data);

            // 2.3 อัปเดต "เมืองยอดฮิต" (Trending)
            // (ทำหลังจากค้นหาสำเร็จ)
            await fetchTrendingCities();

            // 2.4 แสดงผลลัพธ์
            resultsContainer.style.display = 'flex'; // โชว์ผลลัพธ์

        } catch (error) {
            console.error("Search error:", error);
            const resultsContainer = document.getElementById("results-container");
            resultsContainer.style.display = "flex";
            displayError("❌ ไม่พบประเทศหรือเมืองที่คุณค้นหา กรุณาลองใหม่อีกครั้ง", resultsContainer);
        }
        finally {
            // 3. คืนค่า UI (เสมอ)
            loadingSpinner.style.display = 'none'; // ซ่อน Spinner
            searchButton.disabled = false; // เปิดปุ่ม
        }
    }

    // --- 7. ฟังก์ชันดึง "อากาศปัจจุบัน" (POST /weather) ---
    async function fetchWeather(city) {
        const requestBody = { city: city };

        const response = await fetch(WEATHER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json(); // อ่าน body เสมอ

        if (!response.ok || (result.data && result.data.toString().toLowerCase().includes("city not found"))) {
            const resultsContainer = document.getElementById("results-container");
            resultsContainer.style.display = "flex"; // โชว์ container เพื่อให้เห็น error
            displayError("❌ ไม่พบประเทศหรือเมืองที่คุณค้นหา กรุณาลองใหม่อีกครั้ง", resultsContainer);
            throw new Error("City not found");
        }

        return result; // คืนค่า { data: {...}, is_from_cache: ... }
    }

    // --- 8. ฟังก์ชันดึง "พยากรณ์อากาศ" (GET /forecast) ---
    async function fetchForecast(city) {
        // ส่ง 'city' เป็น Query String Parameter
        const urlWithQuery = `${FORECAST_API_URL}?city=${encodeURIComponent(city)}`;

        const response = await fetch(urlWithQuery, {
            method: 'GET'
        });

        const result = await response.json(); // อ่าน body เสมอ

        if (!response.ok) {
            throw new Error(result.data || `เกิดข้อผิดพลาด (Forecast): ${response.status}`);
        }

        return result; // คืนค่า { data: [...] }
    }

    // --- 9. ฟังก์ชันดึง "เมืองยอดฮิต" (GET /trending) ---
    async function fetchTrendingCities() {
        try {
            const response = await fetch(TRENDING_API_URL, { method: 'GET' });
            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.data || `เกิดข้อผิดพลาด (Trending): ${response.status}`);
            }
            const result = await response.json();
            displayTrending(result.data);

        } catch (error) {
            console.error("Trending error:", error);
            displayTrending(null, error.message); // แสดง Error ที่ส่วน Trending
        }
    }

    // --- 10. ฟังก์ชันแสดงผล "อากาศปัจจุบัน" ---
    function displayWeather(data, isFromCache) {
        const weather = data.weather;
        const weatherMain = weather.weather[0].main.toLowerCase();
        const city = weather.name;

        // 🎯 สร้างชุดคำแนะนำพร้อมลิงก์จริง
        const adviceByWeather = {
            clear: [
                {
                    tip: "อากาศดีขนาดนี้ เหมาะกับการเดินเล่นหรือถ่ายรูปพระอาทิตย์ตก!",
                    place: "click!!",
                    link: "https://aroundbkk.com/30-bangkok-photo-spots/"
                },
                {
                    tip: "ท้องฟ้าแจ่มใส เหมาะกับการปีนเขา ชมวิว หรือปั่นจักรยาน!",
                    place: "click!!",
                    link: "https://travel.trueid.net/detail/zr48yEA8Ln6"
                },
                {
                    tip: "วันดีๆ แบบนี้ หา Rooftop Café ชิล ๆ ได้เลย ☕",
                    place: "Rooftop Café",
                    link: "https://www.wongnai.com/restaurants?q=Rooftop%20Caf%C3%A9&cregion=58"
                }
            ],
            clouds: [
                {
                    tip: "ฟ้าครึ้มแบบนี้ นั่งชิลร้านกาแฟสวย ๆ ก็ดีไม่น้อย",
                    place: "Cafe",
                    link: "https://www.wongnai.com/restaurants?categoryGroupId=10&_pd=eyJzcGF0aWFsSW5mby5jb29yZGluYXRlLmxhdGl0dWRlIjoxMy43MjYxODYyNDY3MDkyNTgsInNwYXRpYWxJbmZvLmNvb3JkaW5hdGUubG9uZ2l0dWRlIjoxMDAuNzcwMzIyNzM2MzgwMTUsInNwYXRpYWxJbmZvLnJhZGl1cyI6NTB9"
                },
                {
                    tip: "อากาศเย็นหน่อย ลองเดินเล่นริมแม่น้ำรับลมสบาย ๆ",
                    place: "สวนสาธารณะ",
                    link: "https://www.wongnai.com/nearby/businesses?categories=4418&domain=4"
                }
            ],
            rain: [
                {
                    tip: "ฝนตกเบา ๆ แบบนี้ แนะนำหาที่อุ่น ๆ จิบโกโก้ดู Netflix ☔",
                    place: "Home",
                    link: "https://www.netflix.com/th/"
                },
                {
                    tip: "ฝนตกหนักอย่าออกข้างนอกนะ! หาอะไรอร่อย ๆ มากินที่บ้านกัน 🍜",
                    place: "Home",
                    link: "https://www.grab.com/th/"
                }
            ],
            thunderstorm: [
                {
                    tip: "ฟ้าร้องแบบนี้ อยู่ในที่ปลอดภัยไว้ก่อน ⚡",
                    place: "-",
                    link: "https://"
                }
            ],
            snow: [
                {
                    tip: "หิมะตกแบบนี้ อุ่นใจด้วยช็อกโกแลตร้อนสักแก้ว 🍫",
                    place: "ร้าน Café Kitsuné Tokyo",
                    link: "https://www.google.com/"
                }
            ]
        };

        const defaultAdvice = [
            {
                tip: "พักผ่อนให้เพียงพอ แล้วออกไปสนุกกับวันใหม่ 💪",
                place: "คาเฟ่ใกล้บ้าน หรือสวนสาธารณะ",
                link: "https://www.google.com/"
            }
        ];

        const selectedCategory = adviceByWeather[weatherMain] || defaultAdvice;
        const randomAdvice = selectedCategory[Math.floor(Math.random() * selectedCategory.length)];

        const iconCode = weather.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

        const cacheStatus = isFromCache
            ? '<p class="text-sm text-center text-green-700 font-semibold">(ข้อมูลจาก Cache)</p>'
            : '<p class="text-sm text-center text-blue-700 font-semibold">(ข้อมูลสดใหม่)</p>';

        // วันและเวลาปัจจุบัน (ตาม Timezone ของเครื่องผู้ใช้)
        const now = new Date();
        const formattedDate = now.toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = now.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const weatherHTML = `
            <div class="p-6 rounded-lg text-center">
                ${cacheStatus}
                <h2 class="mt-1 text-3xl font-bold text-gray-800">${weather.name}, ${weather.sys.country}</h2>
                <p class="text-sm text-gray-600 mt-1">${formattedDate} เวลา ${formattedTime}</p>
                <div class="flex items-center justify-center -my-4">
                    <img src="${iconUrl}" alt="${weather.weather[0].description}" class="h-40">
                    <p class="text-5xl font-bold text-gray-900">${Math.round(weather.main.temp)}°C</p>
                </div>
                <p class="text-xl text-gray-700 capitalize -mt-4">${weather.weather[0].description}</p>
                <p class="text-lg text-gray-600 mt-2">
                    รู้สึกเหมือน: ${Math.round(weather.main.feels_like)}°C
                </p>
            </div>
            <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg shadow space-y-2">
                <p class="text-lg font-bold">💡 คำแนะนำสำหรับวันนี้ :</p>
                <p>${randomAdvice.tip}</p>
                <p class="text-sm text-gray-700">📍 สถานที่แนะนำ : 
                    <a href="${randomAdvice.link}" target="_blank" class="text-indigo-600 font-semibold underline hover:text-indigo-800 transition">
                        ${randomAdvice.place}
                    </a>
                </p>
            </div>

            <div class="grid grid-cols-2 gap-4 text-center">
                <div class="bg-white p-4 rounded-lg">
                    <p class="text-gray-500">ความชื้น</p>
                    <p class="text-2xl font-bold">${weather.main.humidity}%</p>
                </div>
                <div class="bg-white p-4 rounded-lg">
                    <p class="text-gray-500">ความเร็วลม</p>
                    <p class="text-2xl font-bold">${weather.wind.speed} m/s</p>
                </div>
            </div>
        `;

        weatherResults.innerHTML = weatherHTML;
    }

    // --- 11. ฟังก์ชันแสดงผล "พยากรณ์อากาศ" ---
    function displayForecast(forecastList) {
        // กรองเอาเฉพาะ 5 วันถัดไป (ไม่รวมวันนี้)
        const today = new Date().toISOString().split('T')[0];
        const next5Days = forecastList.filter(item => item.date !== today).slice(0, 5);

        if (next5Days.length === 0) {
            forecastContainer.innerHTML = '<p class="text-center text-gray-500">ไม่พบข้อมูลพยากรณ์อากาศล่วงหน้า</p>';
            return;
        }

        let forecastHTML = '<h3 class="text-2xl font-bold text-gray-800 mb-4 text-center">พยากรณ์อากาศ 5 วันข้างหน้า</h3>';
        forecastHTML += '<div class="flex flex-col gap-3">';

        next5Days.forEach(day => {
            const iconUrl = `https://openweathermap.org/img/wn/${day.weather_icon}@2x.png`;
            forecastHTML += `
                <div class="flex items-center justify-between bg-white/70 p-2 rounded-lg">
                    <div class="flex items-center gap-3">
                        <p class="font-bold text-lg text-gray-800">${day.day_name}</p>
                        <img src="${iconUrl}" alt="${day.description}" class="w-16 h-16 mx-auto">
                    </div>
                    <div class="text-right">
                        <p class="text-xl font-bold text-gray-900">${Math.round(day.temp_max)}°</p>
                        <p class="text-gray-600">${Math.round(day.temp_min)}°</p>
                    </div>
                </div>
                <hr>
            `;
        });

        forecastHTML += '</div>';
        forecastContainer.innerHTML = forecastHTML;
    }

    // --- 12. ฟังก์ชันแสดงผล "เมืองยอดฮิต" ---
    function displayTrending(trendingList, error = null) {
        if (error) {
            trendingTags.innerHTML = `<p class="text-red-500 text-sm">ไม่สามารถโหลดเมืองยอดฮิตได้</p>`;
            return;
        }

        if (!trendingList || trendingList.length === 0) {
            trendingTags.innerHTML = `<p class="text-gray-500 text-sm">ยังไม่มีข้อมูลการค้นหา</p>`;
            return;
        }

        trendingTags.innerHTML = trendingList.map(item => {
            return `<button class="trending-tag bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-indigo-200 transition">
                        ${item.city_name}
                    </button>`;
        }).join('');

        // เพิ่ม Event Listeners ให้กับแท็กที่เพิ่งสร้าง
        document.querySelectorAll('.trending-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                // ดึงชื่อเมือง (ตัดวงเล็บออก)
                const city = tag.innerText.split(' (')[0];
                cityInput.value = city; // ใส่ในช่องค้นหา
                handleSearch(); // ค้นหาเลย
            });
        });
    }

    // --- 13. ฟังก์ชันแสดง Error (ทั่วไป) ---
    function displayError(message, element) {
        const errorHTML = `
            <div class="flex items-center justify-center w-full">
                <div class="bg-red-100 border-l-4 border-red-500 text-red-800 p-6 rounded-xl shadow-lg text-center max-w-xl">
                    <p class="text-lg font-bold mb-2">เกิดข้อผิดพลาด!</p>
                    <p>${message}</p>
                </div>
            </div>
        `;
        element.innerHTML = errorHTML;
    }
});

