document.addEventListener('DOMContentLoaded', () => {
    let allData = [];
    let map, tileLayer, markerLayerGroup;
    let isDarkMode = false;

    const HQ_LAT = 37.5167791;
    const HQ_LNG = 127.0320472;
    const DEFAULT_ZOOM = 16;

    const TILE_URLS = {
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    };
    const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    const screens = document.querySelectorAll('.screen');
    const startBtn = document.getElementById('start-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const goToBestiaryBtn = document.getElementById('go-to-bestiary-btn');
    const goToRandomizerBtn = document.getElementById('go-to-randomizer-btn');
    const backToMapFromBestiaryBtn = document.getElementById('back-to-map-from-bestiary-btn');
    const backToMapFromRandomizerBtn = document.getElementById('back-to-map-from-randomizer-btn');
    const drawBtn = document.getElementById('draw-btn');
    const bestiaryModal = document.getElementById('bestiary-modal');
    const modalCloseBtn = bestiaryModal.querySelector('.close-btn');
    const typeBtnContainer = document.getElementById('type-btn-group');
    const resultsContainer = document.getElementById('random-results');

    function showScreen(screenId) {
        document.body.classList.toggle('on-map', screenId === 'map-screen');
        screens.forEach(screen => screen.classList.remove('active'));
        const nextScreen = document.getElementById(screenId);
        if (nextScreen) {
            nextScreen.classList.add('active');
            if (screenId === 'map-screen' && map) {
                setTimeout(() => map.invalidateSize(), 300);
            }
        }
    }

    function initMap() {
        if (map) return;
        map = L.map('map', { zoomControl: false }).setView([HQ_LAT, HQ_LNG], DEFAULT_ZOOM);
        tileLayer = L.tileLayer(TILE_URLS.light, { attribution: TILE_ATTRIBUTION }).addTo(map);
        markerLayerGroup = L.layerGroup().addTo(map);
        const hqIcon = L.divIcon({
            className: 'hq-marker-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
        L.marker([HQ_LAT, HQ_LNG], { icon: hqIcon }).addTo(map)
            .bindPopup('<b>HQ 🛡️ 학동 본부</b><br>출정 준비 완료!');
    }

    function updateDisplayBasedOnMode() {
        const categoryToDisplay = isDarkMode ? 2 : 1;
        const filteredData = allData.filter(item => item.category === categoryToDisplay);

        if (tileLayer) tileLayer.setUrl(isDarkMode ? TILE_URLS.dark : TILE_URLS.light);

        updateUITexts(isDarkMode);
        displayMapMarkers(filteredData);
        displayBestiaryList(filteredData);
        setupRandomizerOptions(filteredData);
        resultsContainer.innerHTML = '';
    }

    function updateUITexts(isDark) {
        document.getElementById('splash-title').textContent = isDark ? "밤의 유흥을 즐겨라!" : "밥 먹고 레벨업! 학동 맛집!";
        document.getElementById('splash-subtitle').textContent = isDark ? "퇴근 후 퀘스트를 시작하라!" : "점심 퀘스트를 시작하라!";
        document.getElementById('splash-quest-msg').textContent = isDark ? "용사여, 지갑을 들고 밤의 던전으로 떠나라!" : "용사여, 숟가락 무기 들고 던전으로 떠나 전리품을 획득하라!";
        document.getElementById('mode-text').textContent = isDark ? "DARK" : "LIGHT";
        document.getElementById('map-title').textContent = isDark ? "학동 술집" : "학동 맛집";
        document.getElementById('map-subtitle').textContent = isDark ? "(밤의 탐색 준비 완료!)" : "(던전 탐색 준비 완료!)";
        document.getElementById('bestiary-title').textContent = isDark ? "📖 밤의 도감" : "📖 몬스터 도감";
        document.getElementById('bestiary-subtitle').textContent = isDark ? "(학동 밤 던전 출몰 리스트)" : "(학동 던전 출몰 몬스터 리스트)";
        document.getElementById('randomizer-title').textContent = isDark ? "🎲 오늘의 목적지 찾기!" : "🎲 오늘의 보스 몬스터 찾기!";
        document.getElementById('randomizer-option-title').textContent = isDark ? "유흥 타입 선택" : "몬스터 타입 선택";
    }

    function displayMapMarkers(data) {
        if (!markerLayerGroup) return;
        markerLayerGroup.clearLayers();
        data.forEach(item => {
            const iconClass = `icon-${item.type.replace(/&/g, '').replace(/ /g, '')}`;
            const pixelIcon = L.divIcon({
                className: `pixel-marker-icon ${iconClass}`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });
            const marker = L.marker([item.lat, item.lng], { icon: pixelIcon });
            marker.bindPopup(`<b>${item.name} (${item.type})</b><br>평점: ${'⭐'.repeat(item.rating)}<br>시간: ${item.distance_desc}`);
            markerLayerGroup.addLayer(marker);
        });
    }

    function displayBestiaryList(data) {
        const bestiaryList = document.getElementById('bestiary-list');
        bestiaryList.innerHTML = '';
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'bestiary-card';
            card.innerHTML = `
                <img src="${item.photo}" alt="${item.name} 이미지" onerror="this.src='https://placehold.co/180x100/222/fff?text=?';">
                <h3>No.${item.id} ${item.name}</h3>
                <div class="stats">
                    <span class="type">🍻 타입: ${item.type}</span>
                    <span class="exp">✨ 평점: ${'⭐'.repeat(item.rating)}</span>
                </div>
            `;
            card.addEventListener('click', () => showBestiaryDetail(item));
            bestiaryList.appendChild(card);
        });
    }

    function showBestiaryDetail(item) {
        const modalBody = document.getElementById('modal-body');
        const difficultyIcon = item.cleanliness >= 4 ? '🟢 (쉬움)' : item.cleanliness >= 3 ? '🟡 (보통)' : '🔴 (어려움)';
        const menuHtml = item.menu.map(menuItem => {
            const price = String(menuItem.price || '').replace(/[^0-9]/g, '');
            const priceText = price ? `${parseInt(price, 10).toLocaleString()} GOLD` : '변동';
            return `<div class="modal-menu-item"><span class="menu-name">${menuItem.name}</span><span class="menu-price">${priceText}</span></div>`;
        }).join('');
        const reviewsHtml = item.reviews && item.reviews.length > 0 ? `
            <div class="modal-reviews"><h4>⚔️ 용사들의 후기</h4>${item.reviews.map(review => `<div class="modal-review-item">${review}</div>`).join('')}</div>` : '';

        modalBody.innerHTML = `
            <h3>No.${item.id} ${item.name}</h3>
            <img src="${item.photo}" alt="${item.name} 이미지" onerror="this.src='https://placehold.co/400x150/222/fff?text=?';">
            <div class="modal-info">
                <span>🍻 타입: ${item.type}</span>
                <span>✨ 평점: ${'⭐'.repeat(item.rating)}</span>
                <span>⏰ 퀘스트 시간: ${item.distance_desc}</span>
                <span>⚔️ 난이도: ${difficultyIcon}</span>
            </div>
            ${item.menu.length > 0 ? `<div class="modal-menu"><h4>📜 대표 전리품 (메뉴)</h4>${menuHtml}</div>` : ''}
            ${reviewsHtml}`;
        bestiaryModal.classList.add('active');
    }

    function setupRandomizerOptions(data) {
        const uniqueTypes = [...new Set(data.map(item => item.type))];
        typeBtnContainer.innerHTML = '<button class="type-btn" data-type="all">전체</button>';
        uniqueTypes.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'type-btn';
            btn.dataset.type = type;
            btn.textContent = type;
            typeBtnContainer.appendChild(btn);
        });
    }

    function handleDraw() {
        const categoryToDisplay = isDarkMode ? 2 : 1;
        const currentData = allData.filter(item => item.category === categoryToDisplay);
        const selectedTypes = Array.from(typeBtnContainer.querySelectorAll('.type-btn.active:not([data-type="all"])')).map(btn => btn.dataset.type);
        const listToDraw = selectedTypes.length > 0 ? currentData.filter(r => selectedTypes.includes(r.type)) : currentData;
        const shuffledList = [...listToDraw].sort(() => 0.5 - Math.random());
        const top3 = shuffledList.slice(0, 3);
        
        resultsContainer.innerHTML = '';
        if (top3.length > 0) {
            const medals = ['🥇 1st LEGENDARY!', '🥈 2nd EPIC!', '🥉 3rd RARE!'];
            top3.forEach((item, index) => {
                resultsContainer.innerHTML += `<div class="result-item"><span class="medal">${medals[index]}</span><span class="name">${item.name} (${item.type})</span><span class="exp-gold">✨ ${'⭐'.repeat(item.rating)}</span></div>`;
            });
        } else {
            resultsContainer.innerHTML = `<p class="exp-gold">퀘스트 실패! 해당 타입이 없습니다.</p>`;
        }
    }

    function handleSwipe() {
        let touchStartX = 0, touchEndX = 0, touchStartY = 0, touchEndY = 0;
        const swipeScreens = ['map-screen', 'bestiary-screen', 'randomizer-screen'];

        function onTouchStart(e) {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }

        function onTouchEnd(e) {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            processSwipe(e);
        }

        function processSwipe(e) {
            const activeScreen = document.querySelector('.screen.active');
            if (!activeScreen || activeScreen.id === 'splash-screen' || bestiaryModal.classList.contains('active') || e.target.closest('#map')) return;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            if (Math.abs(deltaX) < Math.abs(deltaY) || Math.abs(deltaX) < 50) return;

            const currentIndex = swipeScreens.indexOf(activeScreen.id);
            if (currentIndex === -1) return;

            const nextIndex = deltaX < 0 ? (currentIndex + 1) % swipeScreens.length : (currentIndex - 1 + swipeScreens.length) % swipeScreens.length;
            showScreen(swipeScreens[nextIndex]);
        }

        document.body.addEventListener('touchstart', onTouchStart, { passive: true });
        document.body.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    // --- Initialize ---
    startBtn.addEventListener('click', () => showScreen('map-screen'));
    darkModeToggle.addEventListener('change', (e) => {
        isDarkMode = e.target.checked;
        document.body.classList.toggle('dark-mode', isDarkMode);
        updateDisplayBasedOnMode();
    });

    goToBestiaryBtn.addEventListener('click', () => showScreen('bestiary-screen'));
    goToRandomizerBtn.addEventListener('click', () => showScreen('randomizer-screen'));
    backToMapFromBestiaryBtn.addEventListener('click', () => showScreen('map-screen'));
    backToMapFromRandomizerBtn.addEventListener('click', () => showScreen('map-screen'));
    modalCloseBtn.addEventListener('click', () => bestiaryModal.classList.remove('active'));
    bestiaryModal.addEventListener('click', (e) => {
        if (e.target === bestiaryModal) bestiaryModal.classList.remove('active');
    });

    typeBtnContainer.addEventListener('click', (e) => {
        if (!e.target.matches('.type-btn')) return;
        const clickedBtn = e.target;
        const allBtn = typeBtnContainer.querySelector('[data-type="all"]');
        const otherButtons = Array.from(typeBtnContainer.querySelectorAll('.type-btn:not([data-type="all"])'));
        if (clickedBtn.dataset.type === 'all') {
            const isActive = allBtn.classList.toggle('active');
            otherButtons.forEach(btn => btn.classList.toggle('active', isActive));
        } else {
            clickedBtn.classList.toggle('active');
            allBtn.classList.toggle('active', otherButtons.every(btn => btn.classList.contains('active')));
        }
    });
    drawBtn.addEventListener('click', handleDraw);
    
    fetch('db.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text(); // Get response as text first to check for issues
        })
        .then(text => {
            try {
                return JSON.parse(text); // Manually parse the text
            } catch (e) {
                console.error('JSON 파싱 오류:', e);
                console.error('받은 텍스트:', text);
                throw new Error('Invalid JSON format');
            }
        })
        .then(data => {
            allData = data;
            initMap();
            updateDisplayBasedOnMode();
            handleSwipe();
        })
        .catch(error => {
            console.error('데이터 로딩 또는 처리 오류:', error);
            document.body.innerHTML = `<div style="color:white; text-align:center; padding: 50px; font-size: 1.2em;">데이터 파일(db.json)을 로드하거나 처리하는 데 실패했습니다. 콘솔을 확인해주세요.</div>`;
        });
    
    showScreen('splash-screen');
});

