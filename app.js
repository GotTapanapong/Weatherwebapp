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
        if (!city) {
            alert("กรุณาพิมพ์ชื่อเมือง");
            return;
        }

        // 1. เตรียม UI
        resultsContainer.style.display = 'none'; // ซ่อนผลลัพธ์เก่า
        loadingSpinner.style.display = 'block'; // โชว์ Spinner
        searchButton.disabled = true;

        // 2. เรียก API ทั้งสองตัวพร้อมกัน (ถ้าทำได้)
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
            resultsContainer.style.display = 'block'; // โชว์ผลลัพธ์

        } catch (error) {
            console.error("Search error:", error);
            displayError(error.message, weatherResults); // แสดง Error ที่ส่วนหลัก
        } finally {
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

        if (!response.ok) {
            // ถ้า API Gateway ส่ง Error กลับมา
            throw new Error(result.data || `เกิดข้อผิดพลาด (Weather): ${response.status}`);
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
        const weather = data.weather; // ข้อมูลอากาศดิบ
        const recommendation = data.recommendation; // คำแนะนำ

        const iconCode = weather.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

        const cacheStatus = isFromCache 
            ? '<p class="text-sm text-center text-green-700 font-semibold">(ข้อมูลจาก Cache ⚡️)</p>'
            : '<p class="text-sm text-center text-blue-700 font-semibold">(ข้อมูลสดใหม่ ☁️)</p>';

        const weatherHTML = `
            <div class="bg-blue-50 p-6 rounded-lg shadow-inner text-center">
                ${cacheStatus}
                <h2 class="text-3xl font-bold text-gray-800">${weather.name}, ${weather.sys.country}</h2>
                <div class="flex items-center justify-center -my-4">
                    <img src="${iconUrl}" alt="${weather.weather[0].description}" class="w-40 h-40">
                    <p class="text-5xl font-bold text-gray-900">${Math.round(weather.main.temp)}°C</p>
                </div>
                <p class="text-xl text-gray-700 capitalize -mt-4">${weather.weather[0].description}</p>
                <p class="text-lg text-gray-600 mt-2">
                    รู้สึกเหมือน: ${Math.round(weather.main.feels_like)}°C
                </p>
            </div>
            <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg shadow">
                <p class="text-lg font-bold">💡 คำแนะนำ:</p>
                <p>${recommendation}</p>
            </div>
            <div class="grid grid-cols-2 gap-4 text-center">
                <div class="bg-white p-4 rounded-lg shadow-sm">
                    <p class="text-gray-500">ความชื้น</p>
                    <p class="text-2xl font-bold">${weather.main.humidity}%</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm">
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
        forecastHTML += '<div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">';

        next5Days.forEach(day => {
            const iconUrl = `https://openweathermap.org/img/wn/${day.weather_icon}@2x.png`;
            forecastHTML += `
                <div class="bg-white/70 p-3 rounded-lg shadow-sm">
                    <p class="font-bold text-lg text-gray-800">${day.day_name}</p>
                    <img src="${iconUrl}" alt="${day.description}" class="w-16 h-16 mx-auto">
                    <p class="text-xl font-bold text-gray-900">${Math.round(day.temp_max)}°</p>
                    <p class="text-gray-600">${Math.round(day.temp_min)}°</p>
                </div>
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
                        ${item.city_name} (${item.search_count})
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
            <div class="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-lg shadow">
                <p class="font-bold">เกิดข้อผิดพลาด!</p>
                <p>${message}</p>
            </div>
        `;
        element.innerHTML = errorHTML;
    }
});

